
ALTER TABLE public.projects ADD COLUMN emoji TEXT NOT NULL DEFAULT '📁';
ALTER TABLE public.projects ADD COLUMN parent_id UUID REFERENCES public.projects(id) ON DELETE CASCADE DEFAULT NULL;
CREATE INDEX idx_projects_parent_id ON public.projects(parent_id);
