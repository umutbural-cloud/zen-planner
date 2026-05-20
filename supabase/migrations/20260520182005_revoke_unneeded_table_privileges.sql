-- Remove unnecessary table-level privileges from browser-facing roles.
-- Keep application-required SELECT/INSERT/UPDATE permissions intact.
REVOKE TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.pomodoro_active_state, public.pomodoro_sessions
FROM anon, authenticated;
