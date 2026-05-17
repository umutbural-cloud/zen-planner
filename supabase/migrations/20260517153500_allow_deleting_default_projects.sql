-- Projects should be user-removable, including the starter/default project.
-- RLS still limits deletes and soft-deletes to rows owned by auth.uid().

DROP TRIGGER IF EXISTS protect_default_project_trigger ON public.projects;
DROP FUNCTION IF EXISTS public.protect_default_project();
