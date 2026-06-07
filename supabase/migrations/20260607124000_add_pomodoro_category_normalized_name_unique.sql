-- Enforce normalized Pomodoro category names per user after PR10 cleanup and PR11 frontend idempotency.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.pomodoro_categories
    GROUP BY user_id, lower(btrim(name))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add pomodoro category normalized unique index: duplicate normalized names exist';
  END IF;
END $$;

ALTER TABLE public.pomodoro_categories
  ADD COLUMN IF NOT EXISTS normalized_name text
  GENERATED ALWAYS AS (lower(btrim(name))) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS pomodoro_categories_user_normalized_name_uidx
  ON public.pomodoro_categories (user_id, normalized_name);
