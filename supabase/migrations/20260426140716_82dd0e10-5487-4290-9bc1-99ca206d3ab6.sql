ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_one_default_per_user
  ON public.projects (user_id) WHERE is_default = true AND deleted_at IS NULL;

INSERT INTO public.projects (user_id, name, emoji, is_default, enabled_views)
SELECT DISTINCT t.user_id, 'Yapılacaklar Listesi', '🚀', true, '["table","notes"]'::jsonb
FROM (
  SELECT user_id FROM public.projects
  UNION SELECT user_id FROM public.tasks
  UNION SELECT user_id FROM public.notes
  UNION SELECT user_id FROM public.backlog_tasks
  UNION SELECT user_id FROM public.journal_entries
) t
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.user_id = t.user_id AND p.is_default = true AND p.deleted_at IS NULL
);

CREATE OR REPLACE FUNCTION public.handle_new_user_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.projects (user_id, name, emoji, is_default, enabled_views)
  VALUES (NEW.id, 'Yapılacaklar Listesi', '🚀', true, '["table","notes"]'::jsonb)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.backlog_tasks (user_id, title, priority, urgency, position)
  VALUES (NEW.id, 'Örnek görev', 'medium'::priority_level, 'someday'::urgency_level, 1);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_defaults ON auth.users;
CREATE TRIGGER on_auth_user_created_defaults
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_defaults();

INSERT INTO public.backlog_tasks (user_id, title, priority, urgency, position)
SELECT DISTINCT u.user_id, 'Örnek görev', 'medium'::priority_level, 'someday'::urgency_level, 1
FROM (
  SELECT user_id FROM public.projects
  UNION SELECT user_id FROM public.tasks
  UNION SELECT user_id FROM public.notes
  UNION SELECT user_id FROM public.journal_entries
) u
WHERE NOT EXISTS (
  SELECT 1 FROM public.backlog_tasks b WHERE b.user_id = u.user_id
);

CREATE OR REPLACE FUNCTION public.protect_default_project()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_default = true THEN
    RAISE EXCEPTION 'Varsayılan proje silinemez';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_default = true AND NEW.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Varsayılan proje silinemez';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS protect_default_project_trigger ON public.projects;
CREATE TRIGGER protect_default_project_trigger
  BEFORE UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.protect_default_project();