ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS default_pomodoro_work_minutes integer NOT NULL DEFAULT 25;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS default_pomodoro_break_minutes integer NOT NULL DEFAULT 5;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_settings_default_pomodoro_work_minutes_check'
  ) THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_default_pomodoro_work_minutes_check
      CHECK (default_pomodoro_work_minutes BETWEEN 1 AND 180);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_settings_default_pomodoro_break_minutes_check'
  ) THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_default_pomodoro_break_minutes_check
      CHECK (default_pomodoro_break_minutes BETWEEN 1 AND 60);
  END IF;
END $$;
