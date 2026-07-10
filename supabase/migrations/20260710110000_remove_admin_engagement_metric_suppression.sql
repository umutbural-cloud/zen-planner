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
    'eligible_user_count', COALESCE(latest_row.eligible_user_count, 0),
    'suppressed', false,
    'suppression_reason', NULL,
    'presence_active_day_count', COALESCE(latest_row.presence_active_day_count, 0),
    'presence_active_day_count_suppressed', false,
    'presence_active_7d_count', COALESCE(latest_row.presence_active_7d_count, 0),
    'presence_active_7d_count_suppressed', false,
    'presence_active_30d_count', COALESCE(latest_row.presence_active_30d_count, 0),
    'presence_active_30d_count_suppressed', false,
    'meaningful_active_day_count', COALESCE(latest_row.meaningful_active_day_count, 0),
    'meaningful_active_day_count_suppressed', false,
    'meaningful_active_7d_count', COALESCE(latest_row.meaningful_active_7d_count, 0),
    'meaningful_active_7d_count_suppressed', false,
    'meaningful_active_30d_count', COALESCE(latest_row.meaningful_active_30d_count, 0),
    'meaningful_active_30d_count_suppressed', false,
    'task_completion_activity_7d', COALESCE(latest_row.task_completion_activity_7d, 0),
    'task_completion_activity_7d_suppressed', false,
    'manual_pomodoro_sessions_7d', COALESCE(latest_row.manual_pomodoro_sessions_7d, 0),
    'manual_pomodoro_sessions_7d_suppressed', false,
    'manual_pomodoro_minutes_7d', COALESCE(latest_row.manual_pomodoro_minutes_7d, 0),
    'manual_pomodoro_minutes_7d_suppressed', false,
    'habit_completion_activity_7d', COALESCE(latest_row.habit_completion_activity_7d, 0),
    'habit_completion_activity_7d_suppressed', false,
    'meaningful_streak_3d_count', COALESCE(latest_row.meaningful_streak_3d_count, 0),
    'meaningful_streak_3d_count_suppressed', false,
    'meaningful_streak_5d_count', COALESCE(latest_row.meaningful_streak_5d_count, 0),
    'meaningful_streak_5d_count_suppressed', false,
    'meaningful_streak_7d_count', COALESCE(latest_row.meaningful_streak_7d_count, 0),
    'meaningful_streak_7d_count_suppressed', false,
    'settings_adoption_proxy_7d_count', COALESCE(latest_row.settings_adoption_proxy_7d_count, 0),
    'settings_adoption_proxy_7d_count_suppressed', false
  )
  INTO latest_snapshot
  FROM latest_row;

  WITH series_source AS (
    SELECT
      *,
      (
        COALESCE(task_completion_activity_day, 0)
        + COALESCE(manual_pomodoro_sessions_day, 0)
        + COALESCE(habit_completion_activity_day, 0)
      ) AS total_meaningful_activity_day
    FROM public.admin_daily_engagement_snapshots
    WHERE metric_version = 'engagement_aggregate_v1'
      AND snapshot_date >= public.istanbul_local_date(now()) - normalized_days
    ORDER BY snapshot_date ASC
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'snapshot_date', series_source.snapshot_date,
        'eligible_user_count', COALESCE(series_source.eligible_user_count, 0),
        'suppressed', false,
        'meaningful_active_day_count', COALESCE(series_source.meaningful_active_day_count, 0),
        'meaningful_active_day_count_suppressed', false,
        'task_completion_activity_day', COALESCE(series_source.task_completion_activity_day, 0),
        'task_completion_activity_day_suppressed', false,
        'manual_pomodoro_sessions_day', COALESCE(series_source.manual_pomodoro_sessions_day, 0),
        'manual_pomodoro_sessions_day_suppressed', false,
        'manual_pomodoro_minutes_day', COALESCE(series_source.manual_pomodoro_minutes_day, 0),
        'manual_pomodoro_minutes_day_suppressed', false,
        'habit_completion_activity_day', COALESCE(series_source.habit_completion_activity_day, 0),
        'habit_completion_activity_day_suppressed', false,
        'total_meaningful_activity_day', COALESCE(series_source.total_meaningful_activity_day, 0),
        'total_meaningful_activity_day_suppressed', false,
        'meaningful_active_7d_count', COALESCE(series_source.meaningful_active_7d_count, 0),
        'meaningful_active_7d_count_suppressed', false,
        'task_completion_activity_7d', COALESCE(series_source.task_completion_activity_7d, 0),
        'task_completion_activity_7d_suppressed', false,
        'manual_pomodoro_sessions_7d', COALESCE(series_source.manual_pomodoro_sessions_7d, 0),
        'manual_pomodoro_sessions_7d_suppressed', false,
        'habit_completion_activity_7d', COALESCE(series_source.habit_completion_activity_7d, 0),
        'habit_completion_activity_7d_suppressed', false,
        'meaningful_streak_3d_count', COALESCE(series_source.meaningful_streak_3d_count, 0),
        'meaningful_streak_3d_count_suppressed', false
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

REVOKE EXECUTE ON FUNCTION public.admin_get_engagement_dashboard(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_engagement_dashboard(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_engagement_dashboard(integer) TO authenticated;
