ALTER TABLE public.admin_audit_logs
  DROP CONSTRAINT IF EXISTS admin_audit_logs_action_check;

ALTER TABLE public.admin_audit_logs
  ADD CONSTRAINT admin_audit_logs_action_check
    CHECK (action IN (
      'membership.changed',
      'account.suspended',
      'account.reactivated',
      'account.deleted',
      'account.restored',
      'manager.granted',
      'manager.revoked',
      'engagement_snapshot.backfilled',
      'engagement_snapshot.force_recomputed',
      'release_event.created'
    ));

CREATE OR REPLACE FUNCTION public.write_admin_audit_log(
  action text,
  target_user_id uuid DEFAULT NULL,
  target_role text DEFAULT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_actor_id uuid := auth.uid();
  safe_metadata jsonb := COALESCE(metadata, '{}'::jsonb);
  inserted_audit_id uuid;
BEGIN
  IF current_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  IF action NOT IN (
    'membership.changed',
    'account.suspended',
    'account.reactivated',
    'account.deleted',
    'account.restored',
    'manager.granted',
    'manager.revoked',
    'engagement_snapshot.backfilled',
    'engagement_snapshot.force_recomputed',
    'release_event.created'
  ) THEN
    RAISE EXCEPTION 'Unsupported admin audit action: %', action;
  END IF;

  IF target_role IS NOT NULL
     AND target_role NOT IN ('manager', 'super_manager', 'beginner', 'plus') THEN
    RAISE EXCEPTION 'Unsupported admin audit target role: %', target_role;
  END IF;

  IF jsonb_typeof(safe_metadata) <> 'object' THEN
    RAISE EXCEPTION 'Admin audit metadata must be a JSON object';
  END IF;

  INSERT INTO public.admin_audit_logs (
    action,
    actor_user_id,
    target_user_id,
    target_role,
    success,
    metadata
  )
  VALUES (
    action,
    current_actor_id,
    target_user_id,
    target_role,
    true,
    safe_metadata
  )
  RETURNING id INTO inserted_audit_id;

  RETURN inserted_audit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_engagement_snapshot_internal(
  target_snapshot_date date DEFAULT NULL,
  requested_compute_mode text DEFAULT 'scheduled_final',
  actor_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  metric_version_value text := 'engagement_aggregate_v1';
  normalized_compute_mode text := COALESCE(NULLIF(btrim(requested_compute_mode), ''), 'scheduled_final');
  latest_final_snapshot_date date := public.istanbul_local_date(now()) - 1;
  resolved_snapshot_date date := COALESCE(target_snapshot_date, public.istanbul_local_date(now()) - 1);
  resolved_lag_days integer;
  lock_acquired boolean := false;
  snapshot_result record;
BEGIN
  IF normalized_compute_mode NOT IN ('scheduled_final', 'ops_backfill', 'ops_force_recompute') THEN
    RAISE EXCEPTION 'Unsupported compute mode: %', normalized_compute_mode;
  END IF;

  IF resolved_snapshot_date > latest_final_snapshot_date THEN
    RAISE EXCEPTION 'Only completed Istanbul days can be snapshotted';
  END IF;

  IF normalized_compute_mode = 'scheduled_final'
     AND resolved_snapshot_date <> latest_final_snapshot_date THEN
    RAISE EXCEPTION 'scheduled_final can only compute the latest completed Istanbul day';
  END IF;

  resolved_lag_days := public.istanbul_local_date(now()) - resolved_snapshot_date;

  IF resolved_lag_days < 1 THEN
    RAISE EXCEPTION 'computed_lag_days must be at least 1';
  END IF;

  lock_acquired := pg_try_advisory_xact_lock(
    hashtext('admin_engagement_snapshot'),
    hashtext(resolved_snapshot_date::text || ':' || metric_version_value)
  );

  IF NOT lock_acquired THEN
    RETURN jsonb_build_object(
      'snapshot_date', resolved_snapshot_date,
      'metric_version', metric_version_value,
      'snapshot_kind', 'daily_final',
      'compute_mode', normalized_compute_mode,
      'computed_lag_days', resolved_lag_days,
      'computed', false,
      'reason', 'locked'
    );
  END IF;

  WITH params AS (
    SELECT
      resolved_snapshot_date AS snapshot_date,
      resolved_snapshot_date - 6 AS start_7d,
      resolved_snapshot_date - 29 AS start_30d,
      public.istanbul_day_start_utc(resolved_snapshot_date - 29) AS window_30_start,
      public.istanbul_day_start_utc(resolved_snapshot_date + 1) AS window_end
  ),
  eligible_users AS (
    SELECT
      profiles.user_id,
      profiles.created_at,
      profiles.last_seen_at
    FROM public.profiles AS profiles
    JOIN public.user_memberships AS memberships
      ON memberships.user_id = profiles.user_id
    CROSS JOIN params
    WHERE profiles.account_status = 'active'
      AND memberships.status = 'active'
      AND memberships.membership IN ('beginner', 'plus')
      AND public.istanbul_local_date(profiles.created_at) <= params.snapshot_date
  ),
  date_spine_7d AS (
    SELECT generate_series(
      (SELECT start_7d FROM params),
      (SELECT snapshot_date FROM params),
      interval '1 day'
    )::date AS metric_date
  ),
  task_events AS (
    SELECT
      tasks.user_id,
      public.istanbul_local_date(tasks.completed_at) AS metric_date,
      COUNT(*)::integer AS task_completion_activity
    FROM public.tasks AS tasks
    JOIN eligible_users
      ON eligible_users.user_id = tasks.user_id
    CROSS JOIN params
    WHERE tasks.status = 'done'
      AND tasks.completed_at IS NOT NULL
      AND tasks.deleted_at IS NULL
      AND tasks.completed_at >= params.window_30_start
      AND tasks.completed_at < params.window_end
    GROUP BY tasks.user_id, public.istanbul_local_date(tasks.completed_at)
  ),
  pomodoro_events AS (
    SELECT
      sessions.user_id,
      public.istanbul_local_date(sessions.ended_at) AS metric_date,
      COUNT(*)::integer AS manual_pomodoro_sessions,
      COALESCE(SUM(FLOOR(sessions.duration_seconds / 60)), 0)::integer AS manual_pomodoro_minutes
    FROM public.pomodoro_sessions AS sessions
    JOIN eligible_users
      ON eligible_users.user_id = sessions.user_id
    CROSS JOIN params
    WHERE sessions.session_source = 'manual_timer'
      AND sessions.kind = 'work'
      AND sessions.ended_at IS NOT NULL
      AND sessions.deleted_at IS NULL
      AND sessions.duration_seconds BETWEEN 300 AND 7200
      AND sessions.ended_at >= params.window_30_start
      AND sessions.ended_at < params.window_end
    GROUP BY sessions.user_id, public.istanbul_local_date(sessions.ended_at)
  ),
  habit_events AS (
    SELECT
      completions.user_id,
      completions.completion_date AS metric_date,
      COUNT(*)::integer AS habit_completion_activity
    FROM public.habit_completions AS completions
    JOIN eligible_users
      ON eligible_users.user_id = completions.user_id
    CROSS JOIN params
    WHERE completions.completion_date BETWEEN params.start_30d AND params.snapshot_date
    GROUP BY completions.user_id, completions.completion_date
  ),
  meaningful_days AS (
    SELECT user_id, metric_date FROM task_events
    UNION
    SELECT user_id, metric_date FROM pomodoro_events
    UNION
    SELECT user_id, metric_date FROM habit_events
  ),
  user_day_matrix AS (
    SELECT
      eligible_users.user_id,
      date_spine_7d.metric_date,
      CASE WHEN meaningful_days.metric_date IS NULL THEN 0 ELSE 1 END AS is_meaningful
    FROM eligible_users
    CROSS JOIN date_spine_7d
    LEFT JOIN meaningful_days
      ON meaningful_days.user_id = eligible_users.user_id
     AND meaningful_days.metric_date = date_spine_7d.metric_date
  ),
  user_streaks AS (
    SELECT
      user_id,
      public.max_true_streak(array_agg(is_meaningful ORDER BY metric_date)) AS max_meaningful_streak_7d
    FROM user_day_matrix
    GROUP BY user_id
  ),
  aggregate_snapshot AS (
    SELECT
      (SELECT COUNT(*)::integer FROM eligible_users) AS eligible_user_count,

      (SELECT COUNT(*)::integer FROM eligible_users CROSS JOIN params WHERE public.istanbul_local_date(eligible_users.last_seen_at) = params.snapshot_date) AS presence_active_day_count,
      (SELECT COUNT(*)::integer FROM eligible_users CROSS JOIN params WHERE public.istanbul_local_date(eligible_users.last_seen_at) BETWEEN params.start_7d AND params.snapshot_date) AS presence_active_7d_count,
      (SELECT COUNT(*)::integer FROM eligible_users CROSS JOIN params WHERE public.istanbul_local_date(eligible_users.last_seen_at) BETWEEN params.start_30d AND params.snapshot_date) AS presence_active_30d_count,

      (SELECT COUNT(DISTINCT user_id)::integer FROM meaningful_days CROSS JOIN params WHERE meaningful_days.metric_date = params.snapshot_date) AS meaningful_active_day_count,
      (SELECT COUNT(DISTINCT user_id)::integer FROM meaningful_days CROSS JOIN params WHERE meaningful_days.metric_date BETWEEN params.start_7d AND params.snapshot_date) AS meaningful_active_7d_count,
      (SELECT COUNT(DISTINCT user_id)::integer FROM meaningful_days CROSS JOIN params WHERE meaningful_days.metric_date BETWEEN params.start_30d AND params.snapshot_date) AS meaningful_active_30d_count,

      (SELECT COALESCE(SUM(task_completion_activity), 0)::integer FROM task_events CROSS JOIN params WHERE task_events.metric_date = params.snapshot_date) AS task_completion_activity_day,
      (SELECT COALESCE(SUM(task_completion_activity), 0)::integer FROM task_events CROSS JOIN params WHERE task_events.metric_date BETWEEN params.start_7d AND params.snapshot_date) AS task_completion_activity_7d,
      (SELECT COALESCE(SUM(task_completion_activity), 0)::integer FROM task_events CROSS JOIN params WHERE task_events.metric_date BETWEEN params.start_30d AND params.snapshot_date) AS task_completion_activity_30d,

      (SELECT COALESCE(SUM(manual_pomodoro_sessions), 0)::integer FROM pomodoro_events CROSS JOIN params WHERE pomodoro_events.metric_date = params.snapshot_date) AS manual_pomodoro_sessions_day,
      (SELECT COALESCE(SUM(manual_pomodoro_sessions), 0)::integer FROM pomodoro_events CROSS JOIN params WHERE pomodoro_events.metric_date BETWEEN params.start_7d AND params.snapshot_date) AS manual_pomodoro_sessions_7d,
      (SELECT COALESCE(SUM(manual_pomodoro_sessions), 0)::integer FROM pomodoro_events CROSS JOIN params WHERE pomodoro_events.metric_date BETWEEN params.start_30d AND params.snapshot_date) AS manual_pomodoro_sessions_30d,

      (SELECT COALESCE(SUM(manual_pomodoro_minutes), 0)::integer FROM pomodoro_events CROSS JOIN params WHERE pomodoro_events.metric_date = params.snapshot_date) AS manual_pomodoro_minutes_day,
      (SELECT COALESCE(SUM(manual_pomodoro_minutes), 0)::integer FROM pomodoro_events CROSS JOIN params WHERE pomodoro_events.metric_date BETWEEN params.start_7d AND params.snapshot_date) AS manual_pomodoro_minutes_7d,
      (SELECT COALESCE(SUM(manual_pomodoro_minutes), 0)::integer FROM pomodoro_events CROSS JOIN params WHERE pomodoro_events.metric_date BETWEEN params.start_30d AND params.snapshot_date) AS manual_pomodoro_minutes_30d,

      (SELECT COALESCE(SUM(habit_completion_activity), 0)::integer FROM habit_events CROSS JOIN params WHERE habit_events.metric_date = params.snapshot_date) AS habit_completion_activity_day,
      (SELECT COALESCE(SUM(habit_completion_activity), 0)::integer FROM habit_events CROSS JOIN params WHERE habit_events.metric_date BETWEEN params.start_7d AND params.snapshot_date) AS habit_completion_activity_7d,
      (SELECT COALESCE(SUM(habit_completion_activity), 0)::integer FROM habit_events CROSS JOIN params WHERE habit_events.metric_date BETWEEN params.start_30d AND params.snapshot_date) AS habit_completion_activity_30d,

      (SELECT COUNT(*)::integer FROM user_streaks WHERE max_meaningful_streak_7d >= 3) AS meaningful_streak_3d_count,
      (SELECT COUNT(*)::integer FROM user_streaks WHERE max_meaningful_streak_7d >= 5) AS meaningful_streak_5d_count,
      (SELECT COUNT(*)::integer FROM user_streaks WHERE max_meaningful_streak_7d >= 7) AS meaningful_streak_7d_count,

      (SELECT COUNT(DISTINCT settings.user_id)::integer FROM public.user_settings AS settings JOIN eligible_users ON eligible_users.user_id = settings.user_id CROSS JOIN params WHERE settings.updated_at >= public.istanbul_day_start_utc(params.start_7d) AND settings.updated_at < params.window_end) AS settings_adoption_proxy_7d_count,
      (SELECT COUNT(DISTINCT settings.user_id)::integer FROM public.user_settings AS settings JOIN eligible_users ON eligible_users.user_id = settings.user_id CROSS JOIN params WHERE settings.updated_at >= params.window_30_start AND settings.updated_at < params.window_end) AS settings_adoption_proxy_30d_count
  ),
  upserted AS (
    INSERT INTO public.admin_daily_engagement_snapshots (
      snapshot_date,
      metric_version,
      timezone,
      window_model,
      snapshot_kind,
      compute_mode,
      computed_lag_days,
      eligible_user_count,
      presence_active_day_count,
      presence_active_7d_count,
      presence_active_30d_count,
      meaningful_active_day_count,
      meaningful_active_7d_count,
      meaningful_active_30d_count,
      task_completion_activity_day,
      task_completion_activity_7d,
      task_completion_activity_30d,
      manual_pomodoro_sessions_day,
      manual_pomodoro_sessions_7d,
      manual_pomodoro_sessions_30d,
      manual_pomodoro_minutes_day,
      manual_pomodoro_minutes_7d,
      manual_pomodoro_minutes_30d,
      habit_completion_activity_day,
      habit_completion_activity_7d,
      habit_completion_activity_30d,
      meaningful_streak_3d_count,
      meaningful_streak_5d_count,
      meaningful_streak_7d_count,
      settings_adoption_proxy_7d_count,
      settings_adoption_proxy_30d_count,
      computed_at,
      computed_by
    )
    SELECT
      resolved_snapshot_date,
      metric_version_value,
      'Europe/Istanbul',
      'istanbul_calendar_day',
      'daily_final',
      normalized_compute_mode,
      resolved_lag_days,
      aggregate_snapshot.eligible_user_count,
      aggregate_snapshot.presence_active_day_count,
      aggregate_snapshot.presence_active_7d_count,
      aggregate_snapshot.presence_active_30d_count,
      aggregate_snapshot.meaningful_active_day_count,
      aggregate_snapshot.meaningful_active_7d_count,
      aggregate_snapshot.meaningful_active_30d_count,
      aggregate_snapshot.task_completion_activity_day,
      aggregate_snapshot.task_completion_activity_7d,
      aggregate_snapshot.task_completion_activity_30d,
      aggregate_snapshot.manual_pomodoro_sessions_day,
      aggregate_snapshot.manual_pomodoro_sessions_7d,
      aggregate_snapshot.manual_pomodoro_sessions_30d,
      aggregate_snapshot.manual_pomodoro_minutes_day,
      aggregate_snapshot.manual_pomodoro_minutes_7d,
      aggregate_snapshot.manual_pomodoro_minutes_30d,
      aggregate_snapshot.habit_completion_activity_day,
      aggregate_snapshot.habit_completion_activity_7d,
      aggregate_snapshot.habit_completion_activity_30d,
      aggregate_snapshot.meaningful_streak_3d_count,
      aggregate_snapshot.meaningful_streak_5d_count,
      aggregate_snapshot.meaningful_streak_7d_count,
      aggregate_snapshot.settings_adoption_proxy_7d_count,
      aggregate_snapshot.settings_adoption_proxy_30d_count,
      now(),
      CASE WHEN normalized_compute_mode = 'scheduled_final' THEN NULL ELSE actor_user_id END
    FROM aggregate_snapshot
    ON CONFLICT (snapshot_date, metric_version)
    DO UPDATE SET
      timezone = EXCLUDED.timezone,
      window_model = EXCLUDED.window_model,
      snapshot_kind = EXCLUDED.snapshot_kind,
      compute_mode = EXCLUDED.compute_mode,
      computed_lag_days = EXCLUDED.computed_lag_days,
      eligible_user_count = EXCLUDED.eligible_user_count,
      presence_active_day_count = EXCLUDED.presence_active_day_count,
      presence_active_7d_count = EXCLUDED.presence_active_7d_count,
      presence_active_30d_count = EXCLUDED.presence_active_30d_count,
      meaningful_active_day_count = EXCLUDED.meaningful_active_day_count,
      meaningful_active_7d_count = EXCLUDED.meaningful_active_7d_count,
      meaningful_active_30d_count = EXCLUDED.meaningful_active_30d_count,
      task_completion_activity_day = EXCLUDED.task_completion_activity_day,
      task_completion_activity_7d = EXCLUDED.task_completion_activity_7d,
      task_completion_activity_30d = EXCLUDED.task_completion_activity_30d,
      manual_pomodoro_sessions_day = EXCLUDED.manual_pomodoro_sessions_day,
      manual_pomodoro_sessions_7d = EXCLUDED.manual_pomodoro_sessions_7d,
      manual_pomodoro_sessions_30d = EXCLUDED.manual_pomodoro_sessions_30d,
      manual_pomodoro_minutes_day = EXCLUDED.manual_pomodoro_minutes_day,
      manual_pomodoro_minutes_7d = EXCLUDED.manual_pomodoro_minutes_7d,
      manual_pomodoro_minutes_30d = EXCLUDED.manual_pomodoro_minutes_30d,
      habit_completion_activity_day = EXCLUDED.habit_completion_activity_day,
      habit_completion_activity_7d = EXCLUDED.habit_completion_activity_7d,
      habit_completion_activity_30d = EXCLUDED.habit_completion_activity_30d,
      meaningful_streak_3d_count = EXCLUDED.meaningful_streak_3d_count,
      meaningful_streak_5d_count = EXCLUDED.meaningful_streak_5d_count,
      meaningful_streak_7d_count = EXCLUDED.meaningful_streak_7d_count,
      settings_adoption_proxy_7d_count = EXCLUDED.settings_adoption_proxy_7d_count,
      settings_adoption_proxy_30d_count = EXCLUDED.settings_adoption_proxy_30d_count,
      computed_at = EXCLUDED.computed_at,
      computed_by = EXCLUDED.computed_by
    RETURNING *
  )
  SELECT *
  INTO snapshot_result
  FROM upserted;

  RETURN jsonb_build_object(
    'snapshot_date', snapshot_result.snapshot_date,
    'metric_version', snapshot_result.metric_version,
    'snapshot_kind', snapshot_result.snapshot_kind,
    'compute_mode', snapshot_result.compute_mode,
    'computed_lag_days', snapshot_result.computed_lag_days,
    'computed', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_engagement_dashboard(
  days_back integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_days integer := GREATEST(7, LEAST(COALESCE(days_back, 30), 90));
  min_cohort_size integer := 20;
  min_cell_count integer := 5;
  latest_snapshot jsonb := NULL;
  series_rows jsonb := '[]'::jsonb;
  release_rows jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  WITH latest_row AS (
    SELECT *
    FROM public.admin_daily_engagement_snapshots
    WHERE metric_version = 'engagement_aggregate_v1'
    ORDER BY snapshot_date DESC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'snapshot_date', latest_row.snapshot_date,
    'metric_version', latest_row.metric_version,
    'snapshot_kind', latest_row.snapshot_kind,
    'compute_mode', latest_row.compute_mode,
    'computed_lag_days', latest_row.computed_lag_days,
    'eligible_user_count', latest_row.eligible_user_count,
    'suppressed', latest_row.eligible_user_count < min_cohort_size,
    'suppression_reason', CASE WHEN latest_row.eligible_user_count < min_cohort_size THEN 'minimum_cohort_not_met' ELSE NULL END,
    'presence_active_day_count', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.presence_active_day_count BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.presence_active_day_count END,
    'presence_active_day_count_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.presence_active_day_count BETWEEN 1 AND min_cell_count - 1,
    'presence_active_7d_count', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.presence_active_7d_count BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.presence_active_7d_count END,
    'presence_active_7d_count_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.presence_active_7d_count BETWEEN 1 AND min_cell_count - 1,
    'presence_active_30d_count', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.presence_active_30d_count BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.presence_active_30d_count END,
    'presence_active_30d_count_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.presence_active_30d_count BETWEEN 1 AND min_cell_count - 1,
    'meaningful_active_day_count', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.meaningful_active_day_count BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.meaningful_active_day_count END,
    'meaningful_active_day_count_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.meaningful_active_day_count BETWEEN 1 AND min_cell_count - 1,
    'meaningful_active_7d_count', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.meaningful_active_7d_count BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.meaningful_active_7d_count END,
    'meaningful_active_7d_count_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.meaningful_active_7d_count BETWEEN 1 AND min_cell_count - 1,
    'meaningful_active_30d_count', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.meaningful_active_30d_count BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.meaningful_active_30d_count END,
    'meaningful_active_30d_count_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.meaningful_active_30d_count BETWEEN 1 AND min_cell_count - 1,
    'task_completion_activity_7d', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.task_completion_activity_7d BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.task_completion_activity_7d END,
    'task_completion_activity_7d_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.task_completion_activity_7d BETWEEN 1 AND min_cell_count - 1,
    'manual_pomodoro_sessions_7d', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.manual_pomodoro_sessions_7d BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.manual_pomodoro_sessions_7d END,
    'manual_pomodoro_sessions_7d_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.manual_pomodoro_sessions_7d BETWEEN 1 AND min_cell_count - 1,
    'manual_pomodoro_minutes_7d', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.manual_pomodoro_minutes_7d BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.manual_pomodoro_minutes_7d END,
    'manual_pomodoro_minutes_7d_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.manual_pomodoro_minutes_7d BETWEEN 1 AND min_cell_count - 1,
    'habit_completion_activity_7d', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.habit_completion_activity_7d BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.habit_completion_activity_7d END,
    'habit_completion_activity_7d_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.habit_completion_activity_7d BETWEEN 1 AND min_cell_count - 1,
    'meaningful_streak_3d_count', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.meaningful_streak_3d_count BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.meaningful_streak_3d_count END,
    'meaningful_streak_3d_count_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.meaningful_streak_3d_count BETWEEN 1 AND min_cell_count - 1,
    'meaningful_streak_5d_count', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.meaningful_streak_5d_count BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.meaningful_streak_5d_count END,
    'meaningful_streak_5d_count_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.meaningful_streak_5d_count BETWEEN 1 AND min_cell_count - 1,
    'meaningful_streak_7d_count', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.meaningful_streak_7d_count BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.meaningful_streak_7d_count END,
    'meaningful_streak_7d_count_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.meaningful_streak_7d_count BETWEEN 1 AND min_cell_count - 1,
    'settings_adoption_proxy_7d_count', CASE WHEN latest_row.eligible_user_count < min_cohort_size OR latest_row.settings_adoption_proxy_7d_count BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE latest_row.settings_adoption_proxy_7d_count END,
    'settings_adoption_proxy_7d_count_suppressed', latest_row.eligible_user_count < min_cohort_size OR latest_row.settings_adoption_proxy_7d_count BETWEEN 1 AND min_cell_count - 1
  )
  INTO latest_snapshot
  FROM latest_row;

  WITH series_source AS (
    SELECT *
    FROM public.admin_daily_engagement_snapshots
    WHERE metric_version = 'engagement_aggregate_v1'
      AND snapshot_date >= public.istanbul_local_date(now()) - normalized_days
    ORDER BY snapshot_date ASC
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'snapshot_date', series_source.snapshot_date,
        'eligible_user_count', series_source.eligible_user_count,
        'suppressed', series_source.eligible_user_count < min_cohort_size,
        'meaningful_active_7d_count', CASE WHEN series_source.eligible_user_count < min_cohort_size OR series_source.meaningful_active_7d_count BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE series_source.meaningful_active_7d_count END,
        'meaningful_active_7d_count_suppressed', series_source.eligible_user_count < min_cohort_size OR series_source.meaningful_active_7d_count BETWEEN 1 AND min_cell_count - 1,
        'task_completion_activity_7d', CASE WHEN series_source.eligible_user_count < min_cohort_size OR series_source.task_completion_activity_7d BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE series_source.task_completion_activity_7d END,
        'task_completion_activity_7d_suppressed', series_source.eligible_user_count < min_cohort_size OR series_source.task_completion_activity_7d BETWEEN 1 AND min_cell_count - 1,
        'manual_pomodoro_sessions_7d', CASE WHEN series_source.eligible_user_count < min_cohort_size OR series_source.manual_pomodoro_sessions_7d BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE series_source.manual_pomodoro_sessions_7d END,
        'manual_pomodoro_sessions_7d_suppressed', series_source.eligible_user_count < min_cohort_size OR series_source.manual_pomodoro_sessions_7d BETWEEN 1 AND min_cell_count - 1,
        'habit_completion_activity_7d', CASE WHEN series_source.eligible_user_count < min_cohort_size OR series_source.habit_completion_activity_7d BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE series_source.habit_completion_activity_7d END,
        'habit_completion_activity_7d_suppressed', series_source.eligible_user_count < min_cohort_size OR series_source.habit_completion_activity_7d BETWEEN 1 AND min_cell_count - 1,
        'meaningful_streak_3d_count', CASE WHEN series_source.eligible_user_count < min_cohort_size OR series_source.meaningful_streak_3d_count BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE series_source.meaningful_streak_3d_count END,
        'meaningful_streak_3d_count_suppressed', series_source.eligible_user_count < min_cohort_size OR series_source.meaningful_streak_3d_count BETWEEN 1 AND min_cell_count - 1
      )
      ORDER BY series_source.snapshot_date ASC
    ),
    '[]'::jsonb
  )
  INTO series_rows
  FROM series_source;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', release_events.id,
        'release_name', release_events.release_name,
        'release_type', release_events.release_type,
        'deployed_at', release_events.deployed_at
      )
      ORDER BY release_events.deployed_at DESC
    ),
    '[]'::jsonb
  )
  INTO release_rows
  FROM (
    SELECT id, release_name, release_type, deployed_at
    FROM public.admin_release_events
    ORDER BY deployed_at DESC
    LIMIT 20
  ) AS release_events;

  RETURN jsonb_build_object(
    'latest', latest_snapshot,
    'series', series_rows,
    'release_events', release_rows
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_release_engagement_comparison(
  release_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  min_cohort_size integer := 20;
  min_cell_count integer := 5;
  release_row record;
  release_local_date date;
  before_start date;
  before_end date;
  after_start date;
  after_end date;
  before_snapshot_count integer := 0;
  after_snapshot_count integer := 0;
  before_avg_eligible numeric := 0;
  after_avg_eligible numeric := 0;
  before_suppressed boolean := false;
  after_suppressed boolean := false;
  insufficient_data boolean := false;
  partial_after_window boolean := false;
  before_meaningful_active_7d integer;
  after_meaningful_active_7d integer;
  before_task_sum integer := 0;
  after_task_sum integer := 0;
  before_pomodoro_sum integer := 0;
  after_pomodoro_sum integer := 0;
  before_habit_sum integer := 0;
  after_habit_sum integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  IF release_id IS NULL THEN
    RAISE EXCEPTION 'release_id is required';
  END IF;

  SELECT id, release_name, release_type, deployed_at
  INTO release_row
  FROM public.admin_release_events
  WHERE id = release_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Release event not found';
  END IF;

  release_local_date := public.istanbul_local_date(release_row.deployed_at);
  before_start := release_local_date - 7;
  before_end := release_local_date - 1;
  after_start := release_local_date + 1;
  after_end := release_local_date + 7;

  SELECT
    COUNT(*)::integer,
    COALESCE(AVG(eligible_user_count), 0),
    COALESCE(SUM(task_completion_activity_day), 0)::integer,
    COALESCE(SUM(manual_pomodoro_sessions_day), 0)::integer,
    COALESCE(SUM(habit_completion_activity_day), 0)::integer
  INTO
    before_snapshot_count,
    before_avg_eligible,
    before_task_sum,
    before_pomodoro_sum,
    before_habit_sum
  FROM public.admin_daily_engagement_snapshots
  WHERE metric_version = 'engagement_aggregate_v1'
    AND snapshot_date BETWEEN before_start AND before_end;

  SELECT
    COUNT(*)::integer,
    COALESCE(AVG(eligible_user_count), 0),
    COALESCE(SUM(task_completion_activity_day), 0)::integer,
    COALESCE(SUM(manual_pomodoro_sessions_day), 0)::integer,
    COALESCE(SUM(habit_completion_activity_day), 0)::integer
  INTO
    after_snapshot_count,
    after_avg_eligible,
    after_task_sum,
    after_pomodoro_sum,
    after_habit_sum
  FROM public.admin_daily_engagement_snapshots
  WHERE metric_version = 'engagement_aggregate_v1'
    AND snapshot_date BETWEEN after_start AND after_end;

  SELECT meaningful_active_7d_count
  INTO before_meaningful_active_7d
  FROM public.admin_daily_engagement_snapshots
  WHERE metric_version = 'engagement_aggregate_v1'
    AND snapshot_date = before_end;

  SELECT meaningful_active_7d_count
  INTO after_meaningful_active_7d
  FROM public.admin_daily_engagement_snapshots
  WHERE metric_version = 'engagement_aggregate_v1'
    AND snapshot_date = after_end;

  before_suppressed := before_avg_eligible < min_cohort_size;
  after_suppressed := after_avg_eligible < min_cohort_size;
  insufficient_data := before_snapshot_count < 3 OR after_snapshot_count < 3;
  partial_after_window := after_snapshot_count < 7 OR after_meaningful_active_7d IS NULL;

  RETURN jsonb_build_object(
    'release', jsonb_build_object(
      'id', release_row.id,
      'release_name', release_row.release_name,
      'release_type', release_row.release_type,
      'deployed_at', release_row.deployed_at,
      'source', 'ops_entered_registry'
    ),
    'before', jsonb_build_object(
      'snapshot_count', before_snapshot_count,
      'suppressed', before_suppressed,
      'avg_eligible_user_count', CASE WHEN before_suppressed THEN NULL ELSE ROUND(before_avg_eligible, 2) END,
      'meaningful_active_7d_count', CASE WHEN before_suppressed OR before_meaningful_active_7d IS NULL OR before_meaningful_active_7d BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE before_meaningful_active_7d END,
      'meaningful_active_7d_count_suppressed', before_suppressed OR before_meaningful_active_7d IS NULL OR before_meaningful_active_7d BETWEEN 1 AND min_cell_count - 1,
      'task_completion_activity_sum', CASE WHEN before_suppressed OR before_task_sum BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE before_task_sum END,
      'task_completion_activity_sum_suppressed', before_suppressed OR before_task_sum BETWEEN 1 AND min_cell_count - 1,
      'manual_pomodoro_sessions_sum', CASE WHEN before_suppressed OR before_pomodoro_sum BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE before_pomodoro_sum END,
      'manual_pomodoro_sessions_sum_suppressed', before_suppressed OR before_pomodoro_sum BETWEEN 1 AND min_cell_count - 1,
      'habit_completion_activity_sum', CASE WHEN before_suppressed OR before_habit_sum BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE before_habit_sum END,
      'habit_completion_activity_sum_suppressed', before_suppressed OR before_habit_sum BETWEEN 1 AND min_cell_count - 1
    ),
    'after', jsonb_build_object(
      'snapshot_count', after_snapshot_count,
      'suppressed', after_suppressed,
      'avg_eligible_user_count', CASE WHEN after_suppressed THEN NULL ELSE ROUND(after_avg_eligible, 2) END,
      'meaningful_active_7d_count', CASE WHEN after_suppressed OR after_meaningful_active_7d IS NULL OR after_meaningful_active_7d BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE after_meaningful_active_7d END,
      'meaningful_active_7d_count_suppressed', after_suppressed OR after_meaningful_active_7d IS NULL OR after_meaningful_active_7d BETWEEN 1 AND min_cell_count - 1,
      'task_completion_activity_sum', CASE WHEN after_suppressed OR after_task_sum BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE after_task_sum END,
      'task_completion_activity_sum_suppressed', after_suppressed OR after_task_sum BETWEEN 1 AND min_cell_count - 1,
      'manual_pomodoro_sessions_sum', CASE WHEN after_suppressed OR after_pomodoro_sum BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE after_pomodoro_sum END,
      'manual_pomodoro_sessions_sum_suppressed', after_suppressed OR after_pomodoro_sum BETWEEN 1 AND min_cell_count - 1,
      'habit_completion_activity_sum', CASE WHEN after_suppressed OR after_habit_sum BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE after_habit_sum END,
      'habit_completion_activity_sum_suppressed', after_suppressed OR after_habit_sum BETWEEN 1 AND min_cell_count - 1
    ),
    'delta', jsonb_build_object(
      'meaningful_active_7d_pct', CASE
        WHEN insufficient_data OR before_suppressed OR after_suppressed
          OR before_meaningful_active_7d IS NULL OR after_meaningful_active_7d IS NULL
          OR before_meaningful_active_7d BETWEEN 1 AND min_cell_count - 1
          OR after_meaningful_active_7d BETWEEN 1 AND min_cell_count - 1
          OR before_meaningful_active_7d = 0 THEN NULL
        ELSE ROUND(((after_meaningful_active_7d - before_meaningful_active_7d)::numeric / before_meaningful_active_7d::numeric) * 100, 2)
      END,
      'task_completion_activity_sum_pct', CASE
        WHEN insufficient_data OR before_suppressed OR after_suppressed
          OR before_task_sum BETWEEN 1 AND min_cell_count - 1
          OR after_task_sum BETWEEN 1 AND min_cell_count - 1
          OR before_task_sum = 0 THEN NULL
        ELSE ROUND(((after_task_sum - before_task_sum)::numeric / before_task_sum::numeric) * 100, 2)
      END,
      'manual_pomodoro_sessions_sum_pct', CASE
        WHEN insufficient_data OR before_suppressed OR after_suppressed
          OR before_pomodoro_sum BETWEEN 1 AND min_cell_count - 1
          OR after_pomodoro_sum BETWEEN 1 AND min_cell_count - 1
          OR before_pomodoro_sum = 0 THEN NULL
        ELSE ROUND(((after_pomodoro_sum - before_pomodoro_sum)::numeric / before_pomodoro_sum::numeric) * 100, 2)
      END,
      'habit_completion_activity_sum_pct', CASE
        WHEN insufficient_data OR before_suppressed OR after_suppressed
          OR before_habit_sum BETWEEN 1 AND min_cell_count - 1
          OR after_habit_sum BETWEEN 1 AND min_cell_count - 1
          OR before_habit_sum = 0 THEN NULL
        ELSE ROUND(((after_habit_sum - before_habit_sum)::numeric / before_habit_sum::numeric) * 100, 2)
      END
    ),
    'partial_after_window', partial_after_window,
    'insufficient_data', insufficient_data,
    'suppressed', before_suppressed OR after_suppressed
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ops_compute_engagement_snapshot(
  target_snapshot_date date,
  reason_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_actor_id uuid := auth.uid();
  normalized_reason_code text := NULLIF(btrim(COALESCE(reason_code, '')), '');
  existing_snapshot boolean := false;
  selected_compute_mode text;
  audit_action text;
  compute_result jsonb;
  audit_id uuid;
BEGIN
  IF current_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_super_manager() THEN
    RAISE EXCEPTION 'Super manager privileges required';
  END IF;

  IF target_snapshot_date IS NULL THEN
    RAISE EXCEPTION 'target_snapshot_date is required';
  END IF;

  IF normalized_reason_code IS NULL THEN
    RAISE EXCEPTION 'reason_code is required';
  END IF;

  IF length(normalized_reason_code) > 64 THEN
    RAISE EXCEPTION 'reason_code must be 64 characters or less';
  END IF;

  IF normalized_reason_code !~ '^[a-z0-9_.-]+$' THEN
    RAISE EXCEPTION 'reason_code contains unsupported characters';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.admin_daily_engagement_snapshots
    WHERE snapshot_date = target_snapshot_date
      AND metric_version = 'engagement_aggregate_v1'
  )
  INTO existing_snapshot;

  selected_compute_mode := CASE WHEN existing_snapshot THEN 'ops_force_recompute' ELSE 'ops_backfill' END;
  audit_action := CASE WHEN existing_snapshot THEN 'engagement_snapshot.force_recomputed' ELSE 'engagement_snapshot.backfilled' END;

  compute_result := public.compute_engagement_snapshot_internal(
    target_snapshot_date,
    selected_compute_mode,
    current_actor_id
  );

  IF COALESCE((compute_result->>'computed')::boolean, false) THEN
    audit_id := public.write_admin_audit_log(
      audit_action,
      NULL,
      NULL,
      jsonb_build_object(
        'snapshot_date', target_snapshot_date,
        'metric_version', 'engagement_aggregate_v1',
        'compute_mode', selected_compute_mode,
        'reason_code', normalized_reason_code,
        'source', 'admin_ops_compute_engagement_snapshot'
      )
    );
  END IF;

  RETURN compute_result || jsonb_build_object('audit_id', audit_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_release_event(
  release_name text,
  release_type text DEFAULT 'product',
  deployed_at timestamptz DEFAULT now(),
  pr_numbers integer[] DEFAULT '{}',
  commit_sha text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_actor_id uuid := auth.uid();
  normalized_release_name text := NULLIF(btrim(COALESCE(release_name, '')), '');
  normalized_release_type text := NULLIF(btrim(COALESCE(release_type, '')), '');
  normalized_commit_sha text := NULLIF(btrim(COALESCE(commit_sha, '')), '');
  normalized_pr_numbers integer[] := COALESCE(pr_numbers, '{}'::integer[]);
  inserted_release record;
  audit_id uuid;
BEGIN
  IF current_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_super_manager() THEN
    RAISE EXCEPTION 'Super manager privileges required';
  END IF;

  IF normalized_release_name IS NULL THEN
    RAISE EXCEPTION 'release_name is required';
  END IF;

  IF length(normalized_release_name) > 120 THEN
    RAISE EXCEPTION 'release_name must be 120 characters or less';
  END IF;

  IF normalized_release_type NOT IN ('product', 'settings', 'pomodoro', 'habits', 'tasks', 'mobile', 'admin', 'other') THEN
    RAISE EXCEPTION 'Unsupported release_type: %', normalized_release_type;
  END IF;

  IF deployed_at IS NULL THEN
    RAISE EXCEPTION 'deployed_at is required';
  END IF;

  IF deployed_at > now() THEN
    RAISE EXCEPTION 'deployed_at cannot be in the future';
  END IF;

  IF array_position(normalized_pr_numbers, NULL) IS NOT NULL
     OR EXISTS (SELECT 1 FROM unnest(normalized_pr_numbers) AS pr_number(value) WHERE value <= 0) THEN
    RAISE EXCEPTION 'pr_numbers must contain only positive integers';
  END IF;

  IF normalized_commit_sha IS NOT NULL
     AND normalized_commit_sha !~ '^[0-9a-fA-F]{7,64}$' THEN
    RAISE EXCEPTION 'commit_sha format is invalid';
  END IF;

  INSERT INTO public.admin_release_events (
    release_name,
    release_type,
    deployed_at,
    pr_numbers,
    commit_sha,
    created_by
  )
  VALUES (
    normalized_release_name,
    normalized_release_type,
    deployed_at,
    normalized_pr_numbers,
    normalized_commit_sha,
    current_actor_id
  )
  RETURNING id, release_name, release_type, deployed_at
  INTO inserted_release;

  audit_id := public.write_admin_audit_log(
    'release_event.created',
    NULL,
    NULL,
    jsonb_build_object(
      'release_event_id', inserted_release.id,
      'release_name', inserted_release.release_name,
      'release_type', inserted_release.release_type,
      'deployed_at', inserted_release.deployed_at,
      'source', 'admin_create_release_event'
    )
  );

  RETURN jsonb_build_object(
    'id', inserted_release.id,
    'release_name', inserted_release.release_name,
    'release_type', inserted_release.release_type,
    'deployed_at', inserted_release.deployed_at,
    'audit_id', audit_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.write_admin_audit_log(text, uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.write_admin_audit_log(text, uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.write_admin_audit_log(text, uuid, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.write_admin_audit_log(text, uuid, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.compute_engagement_snapshot_internal(date, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.compute_engagement_snapshot_internal(date, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.compute_engagement_snapshot_internal(date, text, uuid) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_engagement_dashboard(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_engagement_dashboard(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_engagement_dashboard(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_release_engagement_comparison(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_release_engagement_comparison(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_release_engagement_comparison(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_ops_compute_engagement_snapshot(date, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_ops_compute_engagement_snapshot(date, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_ops_compute_engagement_snapshot(date, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_create_release_event(text, text, timestamptz, integer[], text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_create_release_event(text, text, timestamptz, integer[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_create_release_event(text, text, timestamptz, integer[], text) TO authenticated;

-- Cron is intentionally not scheduled in this migration.
-- After production cron timezone verification, use a separate ops migration or SQL procedure:
-- SELECT cron.schedule(
--   'admin-engagement-daily-final',
--   '<verified cron expression>',
--   $$ SELECT public.compute_engagement_snapshot_internal(); $$
-- );
