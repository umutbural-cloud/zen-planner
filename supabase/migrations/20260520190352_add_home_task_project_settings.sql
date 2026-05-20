ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS home_task_project_ids uuid[] DEFAULT NULL;
