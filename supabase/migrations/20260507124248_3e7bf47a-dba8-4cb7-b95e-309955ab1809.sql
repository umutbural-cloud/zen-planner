ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS frequency_type text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS frequency_days integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS time_of_day text NOT NULL DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'circle',
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.habits ALTER COLUMN project_id DROP NOT NULL;