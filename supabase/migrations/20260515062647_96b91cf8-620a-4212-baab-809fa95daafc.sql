
-- Notebooks table
CREATE TABLE public.notebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text,
  icon_color text,
  parent_id uuid REFERENCES public.notebooks(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notebooks" ON public.notebooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own notebooks" ON public.notebooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notebooks" ON public.notebooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notebooks" ON public.notebooks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_notebooks_updated_at
BEFORE UPDATE ON public.notebooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notebook notes
CREATE TABLE public.notebook_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notebook_id uuid NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('quick','rich')),
  title text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  color text NOT NULL DEFAULT 'default',
  pinned boolean NOT NULL DEFAULT false,
  parent_note_id uuid REFERENCES public.notebook_notes(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notebook_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notebook notes" ON public.notebook_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own notebook notes" ON public.notebook_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notebook notes" ON public.notebook_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notebook notes" ON public.notebook_notes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_notebook_notes_notebook ON public.notebook_notes(notebook_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notebook_notes_parent ON public.notebook_notes(parent_note_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_notebook_notes_updated_at
BEFORE UPDATE ON public.notebook_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing knowledge projects to notebooks
INSERT INTO public.notebooks (id, user_id, name, icon, icon_color, parent_id, created_at)
SELECT id, user_id, name, icon, icon_color, parent_id, created_at
FROM public.projects
WHERE kind = 'knowledge' AND deleted_at IS NULL;

-- Ensure each user with quick_notes has at least one notebook
INSERT INTO public.notebooks (user_id, name, icon)
SELECT DISTINCT q.user_id, 'Defterim', 'book-open'
FROM public.quick_notes q
WHERE NOT EXISTS (
  SELECT 1 FROM public.notebooks n WHERE n.user_id = q.user_id AND n.deleted_at IS NULL
);

-- Migrate quick_notes into notebook_notes (first notebook per user)
WITH first_nb AS (
  SELECT DISTINCT ON (user_id) user_id, id AS notebook_id
  FROM public.notebooks
  WHERE deleted_at IS NULL
  ORDER BY user_id, created_at ASC
)
INSERT INTO public.notebook_notes (user_id, notebook_id, type, title, content, color, pinned, position, created_at, updated_at)
SELECT q.user_id, fn.notebook_id, 'quick', '',
       jsonb_build_object('text', q.content),
       q.color, q.pinned, q.position, q.created_at, q.updated_at
FROM public.quick_notes q
JOIN first_nb fn ON fn.user_id = q.user_id;
