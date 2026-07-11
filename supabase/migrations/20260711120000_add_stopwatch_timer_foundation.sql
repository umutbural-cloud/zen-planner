-- Stopwatch timer foundation. This migration only adds schema metadata and safe backfills.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS preferred_timer_mode text NOT NULL DEFAULT 'pomodoro';

DO $$
DECLARE
  column_definition record;
  constraint_definition text;
BEGIN
  SELECT data_type, is_nullable, column_default
  INTO column_definition
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_settings'
    AND column_name = 'preferred_timer_mode';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'public.user_settings.preferred_timer_mode is missing';
  END IF;

  IF column_definition.data_type <> 'text'
     OR column_definition.is_nullable <> 'NO'
     OR column_definition.column_default IS DISTINCT FROM '''pomodoro''::text' THEN
    RAISE EXCEPTION 'public.user_settings.preferred_timer_mode has unexpected definition';
  END IF;

  SELECT pg_get_constraintdef(oid)
  INTO constraint_definition
  FROM pg_constraint
  WHERE conrelid = 'public.user_settings'::regclass
    AND conname = 'user_settings_preferred_timer_mode_check';

  IF constraint_definition IS NULL THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_preferred_timer_mode_check
      CHECK (preferred_timer_mode IN ('pomodoro', 'stopwatch'));
  ELSIF constraint_definition NOT ILIKE '%preferred_timer_mode%'
        OR constraint_definition NOT ILIKE '%pomodoro%'
        OR constraint_definition NOT ILIKE '%stopwatch%' THEN
    RAISE EXCEPTION 'public.user_settings preferred_timer_mode constraint has unexpected definition';
  END IF;
END $$;

ALTER TABLE public.pomodoro_active_state
  ADD COLUMN IF NOT EXISTS timer_mode text NOT NULL DEFAULT 'pomodoro';

ALTER TABLE public.pomodoro_active_state
  ADD COLUMN IF NOT EXISTS session_started_at timestamptz;

DO $$
DECLARE
  timer_mode_column record;
  session_started_at_column record;
  constraint_definition text;
  old_duration_constraint_name text;
BEGIN
  SELECT data_type, is_nullable, column_default
  INTO timer_mode_column
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'pomodoro_active_state'
    AND column_name = 'timer_mode';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'public.pomodoro_active_state.timer_mode is missing';
  END IF;

  IF timer_mode_column.data_type <> 'text'
     OR timer_mode_column.is_nullable <> 'NO'
     OR timer_mode_column.column_default IS DISTINCT FROM '''pomodoro''::text' THEN
    RAISE EXCEPTION 'public.pomodoro_active_state.timer_mode has unexpected definition';
  END IF;

  SELECT data_type, is_nullable, column_default
  INTO session_started_at_column
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'pomodoro_active_state'
    AND column_name = 'session_started_at';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'public.pomodoro_active_state.session_started_at is missing';
  END IF;

  IF session_started_at_column.data_type <> 'timestamp with time zone'
     OR session_started_at_column.is_nullable <> 'YES'
     OR session_started_at_column.column_default IS NOT NULL THEN
    RAISE EXCEPTION 'public.pomodoro_active_state.session_started_at has unexpected definition';
  END IF;

  SELECT pg_get_constraintdef(oid)
  INTO constraint_definition
  FROM pg_constraint
  WHERE conrelid = 'public.pomodoro_active_state'::regclass
    AND conname = 'pomodoro_active_state_timer_mode_check';

  IF constraint_definition IS NULL THEN
    ALTER TABLE public.pomodoro_active_state
      ADD CONSTRAINT pomodoro_active_state_timer_mode_check
      CHECK (timer_mode IN ('pomodoro', 'stopwatch'));
  ELSIF constraint_definition NOT ILIKE '%timer_mode%'
        OR constraint_definition NOT ILIKE '%pomodoro%'
        OR constraint_definition NOT ILIKE '%stopwatch%' THEN
    RAISE EXCEPTION 'public.pomodoro_active_state timer_mode constraint has unexpected definition';
  END IF;

  SELECT conname
  INTO old_duration_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.pomodoro_active_state'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) IN (
      'CHECK ((duration_seconds > 0))',
      'CHECK (duration_seconds > 0)'
    )
  LIMIT 1;

  IF old_duration_constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.pomodoro_active_state DROP CONSTRAINT %I',
      old_duration_constraint_name
    );
  END IF;

  SELECT pg_get_constraintdef(oid)
  INTO constraint_definition
  FROM pg_constraint
  WHERE conrelid = 'public.pomodoro_active_state'::regclass
    AND conname = 'pomodoro_active_state_duration_seconds_mode_check';

  IF constraint_definition IS NULL THEN
    ALTER TABLE public.pomodoro_active_state
      ADD CONSTRAINT pomodoro_active_state_duration_seconds_mode_check
      CHECK (
        (timer_mode = 'pomodoro' AND duration_seconds > 0)
        OR
        (timer_mode = 'stopwatch' AND duration_seconds >= 0)
      );
  ELSIF constraint_definition NOT ILIKE '%timer_mode%'
        OR constraint_definition NOT ILIKE '%duration_seconds%'
        OR constraint_definition NOT ILIKE '%pomodoro%'
        OR constraint_definition NOT ILIKE '%stopwatch%' THEN
    RAISE EXCEPTION 'public.pomodoro_active_state duration_seconds mode constraint has unexpected definition';
  END IF;
END $$;

UPDATE public.pomodoro_active_state
SET timer_mode = 'pomodoro'
WHERE timer_mode IS NULL;

UPDATE public.pomodoro_active_state
SET session_started_at = started_at
WHERE phase IN ('running', 'paused')
  AND session_started_at IS NULL
  AND started_at IS NOT NULL;

ALTER TABLE public.pomodoro_sessions
  ADD COLUMN IF NOT EXISTS timer_mode text;

DO $$
DECLARE
  column_definition record;
  constraint_definition text;
BEGIN
  SELECT data_type, is_nullable, column_default
  INTO column_definition
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'pomodoro_sessions'
    AND column_name = 'timer_mode';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'public.pomodoro_sessions.timer_mode is missing';
  END IF;

  IF column_definition.data_type <> 'text'
     OR column_definition.is_nullable <> 'YES'
     OR column_definition.column_default IS NOT NULL THEN
    RAISE EXCEPTION 'public.pomodoro_sessions.timer_mode has unexpected definition';
  END IF;

  SELECT pg_get_constraintdef(oid)
  INTO constraint_definition
  FROM pg_constraint
  WHERE conrelid = 'public.pomodoro_sessions'::regclass
    AND conname = 'pomodoro_sessions_timer_mode_check';

  IF constraint_definition IS NULL THEN
    ALTER TABLE public.pomodoro_sessions
      ADD CONSTRAINT pomodoro_sessions_timer_mode_check
      CHECK (timer_mode IS NULL OR timer_mode IN ('pomodoro', 'stopwatch'));
  ELSIF constraint_definition NOT ILIKE '%timer_mode%'
        OR constraint_definition NOT ILIKE '%pomodoro%'
        OR constraint_definition NOT ILIKE '%stopwatch%' THEN
    RAISE EXCEPTION 'public.pomodoro_sessions timer_mode constraint has unexpected definition';
  END IF;
END $$;

UPDATE public.pomodoro_sessions
SET timer_mode = 'pomodoro'
WHERE active_session_token IS NOT NULL
  AND timer_mode IS NULL;
