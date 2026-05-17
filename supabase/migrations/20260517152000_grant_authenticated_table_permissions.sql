-- Supabase PostgREST still requires table privileges in addition to RLS policies.
-- RLS policies keep rows user-scoped; these grants let authenticated users reach
-- the tables through the API.

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.projects,
  public.notes,
  public.tasks,
  public.habit_categories,
  public.habits,
  public.habit_completions,
  public.pomodoro_categories,
  public.pomodoro_sessions,
  public.backlog_tasks,
  public.journal_entries,
  public.quick_notes,
  public.user_settings,
  public.notebooks,
  public.notebook_notes,
  public.push_subscriptions,
  public.reminders
TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
