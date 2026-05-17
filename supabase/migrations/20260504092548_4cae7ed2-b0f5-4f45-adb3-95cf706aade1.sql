-- Color enum-like column (use text + check for flexibility)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'gray',
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'task',
  ADD COLUMN IF NOT EXISTS parent_block_id uuid;

ALTER TABLE public.backlog_tasks
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'gray';

-- Validation via trigger (CHECK with simple IN is fine and immutable)
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_color_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_color_check CHECK (color IN ('gray','yellow','red','blue','green'));

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_kind_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_kind_check CHECK (kind IN ('task','timebox'));

ALTER TABLE public.backlog_tasks
  DROP CONSTRAINT IF EXISTS backlog_tasks_color_check;
ALTER TABLE public.backlog_tasks
  ADD CONSTRAINT backlog_tasks_color_check CHECK (color IN ('gray','yellow','red','blue','green'));

CREATE INDEX IF NOT EXISTS idx_tasks_parent_block ON public.tasks(parent_block_id);