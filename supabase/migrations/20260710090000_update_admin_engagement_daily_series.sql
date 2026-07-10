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
    SELECT
      *,
      (
        task_completion_activity_day
        + manual_pomodoro_sessions_day
        + habit_completion_activity_day
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
        'eligible_user_count', series_source.eligible_user_count,
        'suppressed', series_source.eligible_user_count < min_cohort_size,
        'meaningful_active_day_count', CASE WHEN series_source.eligible_user_count < min_cohort_size OR series_source.meaningful_active_day_count BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE series_source.meaningful_active_day_count END,
        'meaningful_active_day_count_suppressed', series_source.eligible_user_count < min_cohort_size OR series_source.meaningful_active_day_count BETWEEN 1 AND min_cell_count - 1,
        'task_completion_activity_day', CASE WHEN series_source.eligible_user_count < min_cohort_size OR series_source.task_completion_activity_day BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE series_source.task_completion_activity_day END,
        'task_completion_activity_day_suppressed', series_source.eligible_user_count < min_cohort_size OR series_source.task_completion_activity_day BETWEEN 1 AND min_cell_count - 1,
        'manual_pomodoro_sessions_day', CASE WHEN series_source.eligible_user_count < min_cohort_size OR series_source.manual_pomodoro_sessions_day BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE series_source.manual_pomodoro_sessions_day END,
        'manual_pomodoro_sessions_day_suppressed', series_source.eligible_user_count < min_cohort_size OR series_source.manual_pomodoro_sessions_day BETWEEN 1 AND min_cell_count - 1,
        'manual_pomodoro_minutes_day', CASE WHEN series_source.eligible_user_count < min_cohort_size OR series_source.manual_pomodoro_minutes_day BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE series_source.manual_pomodoro_minutes_day END,
        'manual_pomodoro_minutes_day_suppressed', series_source.eligible_user_count < min_cohort_size OR series_source.manual_pomodoro_minutes_day BETWEEN 1 AND min_cell_count - 1,
        'habit_completion_activity_day', CASE WHEN series_source.eligible_user_count < min_cohort_size OR series_source.habit_completion_activity_day BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE series_source.habit_completion_activity_day END,
        'habit_completion_activity_day_suppressed', series_source.eligible_user_count < min_cohort_size OR series_source.habit_completion_activity_day BETWEEN 1 AND min_cell_count - 1,
        'total_meaningful_activity_day', CASE WHEN series_source.eligible_user_count < min_cohort_size OR series_source.total_meaningful_activity_day BETWEEN 1 AND min_cell_count - 1 THEN NULL ELSE series_source.total_meaningful_activity_day END,
        'total_meaningful_activity_day_suppressed', series_source.eligible_user_count < min_cohort_size OR series_source.total_meaningful_activity_day BETWEEN 1 AND min_cell_count - 1,
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

REVOKE EXECUTE ON FUNCTION public.admin_get_engagement_dashboard(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_engagement_dashboard(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_engagement_dashboard(integer) TO authenticated;
