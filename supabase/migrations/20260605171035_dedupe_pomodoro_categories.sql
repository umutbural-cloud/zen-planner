-- Deduplicate pomodoro category rows created by repeated default-category inserts.
--
-- Safety summary:
-- - Duplicate records are merged into the earliest category per user + lower(trim(name)).
-- - pomodoro_sessions.category_id and tasks.category_id references are reassigned before deletion.
-- - No unique index or constraint is created in this migration.

WITH ranked_categories AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY user_id, lower(trim(name))
      ORDER BY created_at ASC, id ASC
    ) AS keep_id,
    row_number() OVER (
      PARTITION BY user_id, lower(trim(name))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.pomodoro_categories
),
duplicate_categories AS (
  SELECT id, keep_id
  FROM ranked_categories
  WHERE rn > 1
)
UPDATE public.pomodoro_sessions AS ps
SET category_id = duplicate_categories.keep_id
FROM duplicate_categories
WHERE ps.category_id = duplicate_categories.id;

WITH ranked_categories AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY user_id, lower(trim(name))
      ORDER BY created_at ASC, id ASC
    ) AS keep_id,
    row_number() OVER (
      PARTITION BY user_id, lower(trim(name))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.pomodoro_categories
),
duplicate_categories AS (
  SELECT id, keep_id
  FROM ranked_categories
  WHERE rn > 1
)
UPDATE public.tasks AS t
SET category_id = duplicate_categories.keep_id
FROM duplicate_categories
WHERE t.category_id = duplicate_categories.id;

WITH ranked_categories AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, lower(trim(name))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.pomodoro_categories
),
duplicate_categories AS (
  SELECT id
  FROM ranked_categories
  WHERE rn > 1
)
DELETE FROM public.pomodoro_categories AS pc
USING duplicate_categories
WHERE pc.id = duplicate_categories.id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.pomodoro_categories
    GROUP BY user_id, lower(trim(name))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate pomodoro_categories remain after cleanup';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pomodoro_sessions AS ps
    LEFT JOIN public.pomodoro_categories AS pc ON pc.id = ps.category_id
    WHERE ps.category_id IS NOT NULL
      AND pc.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Orphan pomodoro_sessions.category_id rows remain after cleanup';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.tasks AS t
    LEFT JOIN public.pomodoro_categories AS pc ON pc.id = t.category_id
    WHERE t.category_id IS NOT NULL
      AND pc.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Orphan tasks.category_id rows remain after cleanup';
  END IF;
END $$;
