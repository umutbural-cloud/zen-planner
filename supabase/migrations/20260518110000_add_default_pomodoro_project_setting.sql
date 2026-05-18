ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS default_pomodoro_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.enforce_user_settings_default_pomodoro_project_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.default_pomodoro_project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = NEW.default_pomodoro_project_id
      AND p.user_id = NEW.user_id
      AND p.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'user_settings.default_pomodoro_project_id must belong to same user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_user_settings_default_pomodoro_project_owner ON public.user_settings;
CREATE TRIGGER trg_enforce_user_settings_default_pomodoro_project_owner
BEFORE INSERT OR UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_settings_default_pomodoro_project_owner();
