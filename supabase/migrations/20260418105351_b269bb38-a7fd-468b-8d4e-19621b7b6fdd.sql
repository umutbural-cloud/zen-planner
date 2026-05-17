ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tasks_project_position ON public.tasks(project_id, position);

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) AS rn
  FROM public.tasks
)
UPDATE public.tasks t SET position = ranked.rn
FROM ranked WHERE t.id = ranked.id;