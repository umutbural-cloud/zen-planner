ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS deleted_by_parent_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_deleted_by_parent_id_fkey'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_deleted_by_parent_id_fkey
      FOREIGN KEY (deleted_by_parent_id)
      REFERENCES public.tasks(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_user_deleted_by_parent
  ON public.tasks (user_id, deleted_by_parent_id)
  WHERE deleted_by_parent_id IS NOT NULL;
