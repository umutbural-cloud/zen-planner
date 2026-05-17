ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_task_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'done' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done') THEN
      NEW.completed_at := now();
    ELSIF NEW.status <> 'done' AND OLD.status = 'done' THEN
      NEW.completed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_set_completed_at ON public.tasks;
CREATE TRIGGER tasks_set_completed_at
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_task_completed_at();

-- Backfill: existing done tasks without completed_at -> use created_at as best-effort
UPDATE public.tasks
SET completed_at = COALESCE(completed_at, created_at)
WHERE status = 'done' AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_completed_at
  ON public.tasks (user_id, completed_at DESC)
  WHERE status = 'done' AND deleted_at IS NULL;