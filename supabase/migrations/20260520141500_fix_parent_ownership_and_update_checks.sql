-- Harden remaining parent ownership checks and make UPDATE RLS checks explicit.
-- This migration intentionally does not repair dirty data; it stops before
-- installing guards if existing parent links are orphaned or cross-user.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.projects child
    LEFT JOIN public.projects parent ON parent.id = child.parent_id
    WHERE child.parent_id IS NOT NULL
      AND parent.id IS NULL
  ) THEN
    RAISE EXCEPTION 'projects.parent_id has orphan rows';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.projects child
    JOIN public.projects parent ON parent.id = child.parent_id
    WHERE child.parent_id IS NOT NULL
      AND child.user_id <> parent.user_id
  ) THEN
    RAISE EXCEPTION 'projects.parent_id has cross-user rows';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notebooks child
    LEFT JOIN public.notebooks parent ON parent.id = child.parent_id
    WHERE child.parent_id IS NOT NULL
      AND parent.id IS NULL
  ) THEN
    RAISE EXCEPTION 'notebooks.parent_id has orphan rows';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notebooks child
    JOIN public.notebooks parent ON parent.id = child.parent_id
    WHERE child.parent_id IS NOT NULL
      AND child.user_id <> parent.user_id
  ) THEN
    RAISE EXCEPTION 'notebooks.parent_id has cross-user rows';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_ref_owner_projects_parent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'projects.parent_id cannot reference the same project';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.projects parent
    WHERE parent.id = NEW.parent_id
      AND parent.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'projects.parent_id must belong to same user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_ref_owner_projects_parent ON public.projects;
CREATE TRIGGER trg_enforce_ref_owner_projects_parent
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.enforce_ref_owner_projects_parent();

CREATE OR REPLACE FUNCTION public.enforce_ref_owner_notebooks_parent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'notebooks.parent_id cannot reference the same notebook';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.notebooks parent
    WHERE parent.id = NEW.parent_id
      AND parent.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'notebooks.parent_id must belong to same user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_ref_owner_notebooks_parent ON public.notebooks;
CREATE TRIGGER trg_enforce_ref_owner_notebooks_parent
BEFORE INSERT OR UPDATE ON public.notebooks
FOR EACH ROW EXECUTE FUNCTION public.enforce_ref_owner_notebooks_parent();

ALTER POLICY "Users can update own projects"
ON public.projects
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can update own tasks"
ON public.tasks
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can update own notes"
ON public.notes
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can update own habits"
ON public.habits
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- habit_completions has no UPDATE policy in the current migration history.

ALTER POLICY "update own habit categories"
ON public.habit_categories
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can update own pomodoro"
ON public.pomodoro_sessions
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can update own pomodoro categories"
ON public.pomodoro_categories
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can update own backlog"
ON public.backlog_tasks
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can update their own journal entries"
ON public.journal_entries
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users update own notebooks"
ON public.notebooks
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users update own notebook notes"
ON public.notebook_notes
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users update own quick notes"
ON public.quick_notes
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can update own settings"
ON public.user_settings
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
