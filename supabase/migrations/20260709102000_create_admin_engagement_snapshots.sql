CREATE TABLE IF NOT EXISTS public.admin_daily_engagement_snapshots (
  snapshot_date date NOT NULL,
  metric_version text NOT NULL DEFAULT 'engagement_aggregate_v1',

  timezone text NOT NULL DEFAULT 'Europe/Istanbul',
  window_model text NOT NULL DEFAULT 'istanbul_calendar_day',
  snapshot_kind text NOT NULL DEFAULT 'daily_final',
  compute_mode text NOT NULL DEFAULT 'scheduled_final',
  computed_lag_days integer NOT NULL DEFAULT 1,

  eligible_user_count integer NOT NULL DEFAULT 0,

  presence_active_day_count integer NOT NULL DEFAULT 0,
  presence_active_7d_count integer NOT NULL DEFAULT 0,
  presence_active_30d_count integer NOT NULL DEFAULT 0,

  meaningful_active_day_count integer NOT NULL DEFAULT 0,
  meaningful_active_7d_count integer NOT NULL DEFAULT 0,
  meaningful_active_30d_count integer NOT NULL DEFAULT 0,

  task_completion_activity_day integer NOT NULL DEFAULT 0,
  task_completion_activity_7d integer NOT NULL DEFAULT 0,
  task_completion_activity_30d integer NOT NULL DEFAULT 0,

  manual_pomodoro_sessions_day integer NOT NULL DEFAULT 0,
  manual_pomodoro_sessions_7d integer NOT NULL DEFAULT 0,
  manual_pomodoro_sessions_30d integer NOT NULL DEFAULT 0,

  manual_pomodoro_minutes_day integer NOT NULL DEFAULT 0,
  manual_pomodoro_minutes_7d integer NOT NULL DEFAULT 0,
  manual_pomodoro_minutes_30d integer NOT NULL DEFAULT 0,

  habit_completion_activity_day integer NOT NULL DEFAULT 0,
  habit_completion_activity_7d integer NOT NULL DEFAULT 0,
  habit_completion_activity_30d integer NOT NULL DEFAULT 0,

  meaningful_streak_3d_count integer NOT NULL DEFAULT 0,
  meaningful_streak_5d_count integer NOT NULL DEFAULT 0,
  meaningful_streak_7d_count integer NOT NULL DEFAULT 0,

  settings_adoption_proxy_7d_count integer NOT NULL DEFAULT 0,
  settings_adoption_proxy_30d_count integer NOT NULL DEFAULT 0,

  computed_at timestamptz NOT NULL DEFAULT now(),
  computed_by uuid,

  PRIMARY KEY (snapshot_date, metric_version),
  CONSTRAINT admin_daily_engagement_snapshots_metric_version_check
    CHECK (metric_version = 'engagement_aggregate_v1'),
  CONSTRAINT admin_daily_engagement_snapshots_timezone_check
    CHECK (timezone = 'Europe/Istanbul'),
  CONSTRAINT admin_daily_engagement_snapshots_window_model_check
    CHECK (window_model = 'istanbul_calendar_day'),
  CONSTRAINT admin_daily_engagement_snapshots_snapshot_kind_check
    CHECK (snapshot_kind IN ('daily_final')),
  CONSTRAINT admin_daily_engagement_snapshots_compute_mode_check
    CHECK (compute_mode IN ('scheduled_final', 'ops_backfill', 'ops_force_recompute')),
  CONSTRAINT admin_daily_engagement_snapshots_computed_lag_days_check
    CHECK (computed_lag_days >= 1),
  CONSTRAINT admin_daily_engagement_snapshots_nonnegative_counts_check
    CHECK (
      eligible_user_count >= 0
      AND presence_active_day_count >= 0
      AND presence_active_7d_count >= 0
      AND presence_active_30d_count >= 0
      AND meaningful_active_day_count >= 0
      AND meaningful_active_7d_count >= 0
      AND meaningful_active_30d_count >= 0
      AND task_completion_activity_day >= 0
      AND task_completion_activity_7d >= 0
      AND task_completion_activity_30d >= 0
      AND manual_pomodoro_sessions_day >= 0
      AND manual_pomodoro_sessions_7d >= 0
      AND manual_pomodoro_sessions_30d >= 0
      AND manual_pomodoro_minutes_day >= 0
      AND manual_pomodoro_minutes_7d >= 0
      AND manual_pomodoro_minutes_30d >= 0
      AND habit_completion_activity_day >= 0
      AND habit_completion_activity_7d >= 0
      AND habit_completion_activity_30d >= 0
      AND meaningful_streak_3d_count >= 0
      AND meaningful_streak_5d_count >= 0
      AND meaningful_streak_7d_count >= 0
      AND settings_adoption_proxy_7d_count >= 0
      AND settings_adoption_proxy_30d_count >= 0
    )
);

CREATE TABLE IF NOT EXISTS public.admin_release_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_name text NOT NULL,
  release_type text NOT NULL DEFAULT 'product',
  deployed_at timestamptz NOT NULL,
  pr_numbers integer[] NOT NULL DEFAULT '{}',
  commit_sha text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT admin_release_events_release_type_check
    CHECK (release_type IN ('product', 'settings', 'pomodoro', 'habits', 'tasks', 'mobile', 'admin', 'other')),
  CONSTRAINT admin_release_events_release_name_check
    CHECK (length(btrim(release_name)) > 0),
  CONSTRAINT admin_release_events_pr_numbers_positive_check
    CHECK (array_position(pr_numbers, NULL) IS NULL AND 0 < ALL (pr_numbers))
);

CREATE INDEX IF NOT EXISTS idx_admin_daily_engagement_snapshots_snapshot_date_desc
  ON public.admin_daily_engagement_snapshots (snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_admin_release_events_deployed_at_desc
  ON public.admin_release_events (deployed_at DESC);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_engagement_manual_timer
  ON public.pomodoro_sessions (user_id, ended_at DESC)
  WHERE session_source = 'manual_timer'
    AND kind = 'work'
    AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date
  ON public.habit_completions (user_id, completion_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at
  ON public.user_settings (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_active_last_seen
  ON public.profiles (account_status, last_seen_at DESC);

ALTER TABLE public.admin_daily_engagement_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_release_events ENABLE ROW LEVEL SECURITY;

-- Intentionally no broad RLS policies. Access is only through SECURITY DEFINER admin RPCs.
REVOKE ALL ON TABLE public.admin_daily_engagement_snapshots FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_daily_engagement_snapshots FROM anon;
REVOKE ALL ON TABLE public.admin_daily_engagement_snapshots FROM authenticated;

REVOKE ALL ON TABLE public.admin_release_events FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_release_events FROM anon;
REVOKE ALL ON TABLE public.admin_release_events FROM authenticated;
