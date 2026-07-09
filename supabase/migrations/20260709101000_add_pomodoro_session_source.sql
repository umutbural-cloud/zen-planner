ALTER TABLE public.pomodoro_sessions
  ADD COLUMN IF NOT EXISTS session_source text NOT NULL DEFAULT 'legacy';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pomodoro_sessions_session_source_check'
      AND conrelid = 'public.pomodoro_sessions'::regclass
  ) THEN
    ALTER TABLE public.pomodoro_sessions
      ADD CONSTRAINT pomodoro_sessions_session_source_check
      CHECK (session_source IN ('manual_timer', 'task_completion', 'manual_entry', 'legacy'));
  END IF;
END $$;

-- Production verification before/after backfill:
-- SELECT session_source, COUNT(*) FROM public.pomodoro_sessions GROUP BY session_source ORDER BY session_source;
-- SELECT
--   COUNT(*) FILTER (WHERE active_session_token IS NOT NULL) AS token_sessions,
--   COUNT(*) FILTER (WHERE active_session_token IS NULL) AS no_token_sessions,
--   COUNT(*) FILTER (WHERE task_id IS NOT NULL) AS task_linked_sessions
-- FROM public.pomodoro_sessions;

UPDATE public.pomodoro_sessions
SET session_source = 'manual_timer'
WHERE active_session_token IS NOT NULL
  AND session_source = 'legacy';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pomodoro_sessions'
      AND column_name = 'task_id'
  ) THEN
    UPDATE public.pomodoro_sessions
    SET session_source = 'task_completion'
    WHERE active_session_token IS NULL
      AND task_id IS NOT NULL
      AND session_source = 'legacy';
  END IF;
END $$;
