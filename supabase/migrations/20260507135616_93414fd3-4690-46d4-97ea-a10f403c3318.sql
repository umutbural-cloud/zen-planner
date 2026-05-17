ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS icon_color text;