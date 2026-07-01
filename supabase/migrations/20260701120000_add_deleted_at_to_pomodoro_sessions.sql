ALTER TABLE public.pomodoro_sessions
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_deleted_at
  ON public.pomodoro_sessions(user_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_started_not_deleted
  ON public.pomodoro_sessions(user_id, started_at DESC)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.purge_soft_deleted()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.tasks WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.notes WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.projects WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.journal_entries WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.backlog_tasks WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.pomodoro_sessions WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
END;
$$;
