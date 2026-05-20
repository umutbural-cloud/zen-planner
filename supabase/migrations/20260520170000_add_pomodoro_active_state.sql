-- Prepare server-backed Pomodoro active state without changing client behavior.
-- The active timer state is separate from pomodoro_sessions history.

CREATE TABLE IF NOT EXISTS public.pomodoro_active_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'idle' CHECK (phase IN ('idle', 'running', 'paused')),
  kind public.pomodoro_kind NOT NULL DEFAULT 'work',
  duration_seconds integer NOT NULL DEFAULT 1500 CHECK (duration_seconds > 0),
  work_duration_seconds integer NOT NULL DEFAULT 1500 CHECK (work_duration_seconds > 0),
  break_duration_seconds integer NOT NULL DEFAULT 300 CHECK (break_duration_seconds > 0),
  started_at timestamptz,
  ends_at timestamptz,
  paused_remaining_seconds integer CHECK (paused_remaining_seconds IS NULL OR paused_remaining_seconds >= 0),
  accumulated_elapsed_seconds integer NOT NULL DEFAULT 0 CHECK (accumulated_elapsed_seconds >= 0),
  active_session_token uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pomodoro_sessions
  ADD COLUMN IF NOT EXISTS active_session_token uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_active_token
  ON public.pomodoro_sessions(user_id, active_session_token)
  WHERE active_session_token IS NOT NULL;

DROP TRIGGER IF EXISTS update_pomodoro_active_state_updated_at ON public.pomodoro_active_state;
CREATE TRIGGER update_pomodoro_active_state_updated_at
BEFORE UPDATE ON public.pomodoro_active_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT now();
$$;

REVOKE ALL ON FUNCTION public.get_server_time() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_server_time() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_server_time() TO authenticated;

ALTER TABLE public.pomodoro_active_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pomodoro active state"
ON public.pomodoro_active_state
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users create own pomodoro active state"
ON public.pomodoro_active_state
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pomodoro active state"
ON public.pomodoro_active_state
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON TABLE public.pomodoro_active_state TO authenticated;
