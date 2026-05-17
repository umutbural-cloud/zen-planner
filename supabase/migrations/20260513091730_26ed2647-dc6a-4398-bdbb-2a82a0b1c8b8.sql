ALTER TABLE public.pomodoro_sessions ADD COLUMN IF NOT EXISTS task_id uuid;
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id ON public.pomodoro_sessions(task_id);