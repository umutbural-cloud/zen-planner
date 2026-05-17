-- 1) Bilgi Merkezi: projects tablosuna kind kolonu ekle
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'project';

CREATE INDEX IF NOT EXISTS idx_projects_kind ON public.projects(kind);

-- 2) Anlık Notlar tablosu
CREATE TABLE IF NOT EXISTS public.quick_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'default',
  pinned boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own quick notes"
ON public.quick_notes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users create own quick notes"
ON public.quick_notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own quick notes"
ON public.quick_notes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own quick notes"
ON public.quick_notes FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER quick_notes_set_updated_at
BEFORE UPDATE ON public.quick_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_quick_notes_user_id ON public.quick_notes(user_id);
