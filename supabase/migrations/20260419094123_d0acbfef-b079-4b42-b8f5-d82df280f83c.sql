-- 1. Heybe (Backlog) tablosu
CREATE TYPE public.priority_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.urgency_level AS ENUM ('someday', 'this_week', 'today');

CREATE TABLE public.backlog_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority priority_level NOT NULL DEFAULT 'medium',
  urgency urgency_level NOT NULL DEFAULT 'someday',
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.backlog_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own backlog" ON public.backlog_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own backlog" ON public.backlog_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own backlog" ON public.backlog_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own backlog" ON public.backlog_tasks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_backlog_tasks_updated_at
  BEFORE UPDATE ON public.backlog_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Soft delete: tüm tablolara deleted_at
ALTER TABLE public.tasks ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.notes ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.journal_entries ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_tasks_deleted_at ON public.tasks(user_id, deleted_at);
CREATE INDEX idx_notes_deleted_at ON public.notes(user_id, deleted_at);
CREATE INDEX idx_projects_deleted_at ON public.projects(user_id, deleted_at);
CREATE INDEX idx_journal_deleted_at ON public.journal_entries(user_id, deleted_at);
CREATE INDEX idx_backlog_deleted_at ON public.backlog_tasks(user_id, deleted_at);

-- 3. projects.enabled_views jsonb
ALTER TABLE public.projects ADD COLUMN enabled_views JSONB NOT NULL DEFAULT '["notes","table"]'::jsonb;

-- 4. Otomatik 30 günlük temizleme: pg_cron + pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.purge_soft_deleted()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.tasks WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.notes WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.projects WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.journal_entries WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.backlog_tasks WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
END;
$$;

SELECT cron.schedule(
  'purge-soft-deleted-daily',
  '0 3 * * *',
  $$ SELECT public.purge_soft_deleted(); $$
);