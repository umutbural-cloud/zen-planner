ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category_id UUID NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_block_id ON public.tasks(parent_block_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON public.tasks(category_id);