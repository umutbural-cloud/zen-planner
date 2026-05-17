ALTER TABLE public.user_settings 
  ADD COLUMN IF NOT EXISTS module_labels jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS startup_page jsonb NOT NULL DEFAULT '{"type":"default"}'::jsonb;