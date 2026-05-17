-- Enforce same-user ownership across cross-table references.
-- This is defense-in-depth on top of RLS.

CREATE OR REPLACE FUNCTION public.enforce_ref_owner_tasks()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = NEW.project_id AND p.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'tasks.project_id must belong to same user';
  END IF;

  IF NEW.category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pomodoro_categories c
    WHERE c.id = NEW.category_id AND c.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'tasks.category_id must belong to same user';
  END IF;

  IF NEW.parent_block_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = NEW.parent_block_id AND t.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'tasks.parent_block_id must belong to same user';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_ref_owner_notes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = NEW.project_id AND p.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'notes.project_id must belong to same user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_ref_owner_habits()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = NEW.project_id AND p.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'habits.project_id must belong to same user';
  END IF;

  IF NEW.category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.habit_categories c
    WHERE c.id = NEW.category_id AND c.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'habits.category_id must belong to same user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_ref_owner_habit_completions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.habit_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.habits h
    WHERE h.id = NEW.habit_id AND h.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'habit_completions.habit_id must belong to same user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_ref_owner_pomodoro_sessions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.task_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = NEW.task_id AND t.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'pomodoro_sessions.task_id must belong to same user';
  END IF;

  IF NEW.category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pomodoro_categories c
    WHERE c.id = NEW.category_id AND c.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'pomodoro_sessions.category_id must belong to same user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_ref_owner_notebook_notes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.notebook_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.notebooks n
    WHERE n.id = NEW.notebook_id AND n.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'notebook_notes.notebook_id must belong to same user';
  END IF;

  IF NEW.parent_note_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.notebook_notes nn
    WHERE nn.id = NEW.parent_note_id AND nn.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'notebook_notes.parent_note_id must belong to same user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_ref_owner_tasks ON public.tasks;
CREATE TRIGGER trg_enforce_ref_owner_tasks
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.enforce_ref_owner_tasks();

DROP TRIGGER IF EXISTS trg_enforce_ref_owner_notes ON public.notes;
CREATE TRIGGER trg_enforce_ref_owner_notes
BEFORE INSERT OR UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.enforce_ref_owner_notes();

DROP TRIGGER IF EXISTS trg_enforce_ref_owner_habits ON public.habits;
CREATE TRIGGER trg_enforce_ref_owner_habits
BEFORE INSERT OR UPDATE ON public.habits
FOR EACH ROW EXECUTE FUNCTION public.enforce_ref_owner_habits();

DROP TRIGGER IF EXISTS trg_enforce_ref_owner_habit_completions ON public.habit_completions;
CREATE TRIGGER trg_enforce_ref_owner_habit_completions
BEFORE INSERT OR UPDATE ON public.habit_completions
FOR EACH ROW EXECUTE FUNCTION public.enforce_ref_owner_habit_completions();

DROP TRIGGER IF EXISTS trg_enforce_ref_owner_pomodoro_sessions ON public.pomodoro_sessions;
CREATE TRIGGER trg_enforce_ref_owner_pomodoro_sessions
BEFORE INSERT OR UPDATE ON public.pomodoro_sessions
FOR EACH ROW EXECUTE FUNCTION public.enforce_ref_owner_pomodoro_sessions();

DROP TRIGGER IF EXISTS trg_enforce_ref_owner_notebook_notes ON public.notebook_notes;
CREATE TRIGGER trg_enforce_ref_owner_notebook_notes
BEFORE INSERT OR UPDATE ON public.notebook_notes
FOR EACH ROW EXECUTE FUNCTION public.enforce_ref_owner_notebook_notes();
