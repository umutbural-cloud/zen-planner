-- Complete schema gaps found between the app code, generated types, and migrations.

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS reminder_minutes_before integer;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Istanbul',
  ADD COLUMN IF NOT EXISTS notify_tasks boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_habits boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_pomodoro boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiet_hours_start time,
  ADD COLUMN IF NOT EXISTS quiet_hours_end time;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_label text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_endpoint_uidx
  ON public.push_subscriptions (user_id, endpoint);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid,
  target_key text,
  slot_key text,
  trigger_type text NOT NULL,
  offset_minutes integer NOT NULL DEFAULT 0,
  absolute_time time,
  days_of_week integer[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  title text,
  body text,
  last_sent_at timestamptz,
  last_sent_for_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reminders_user_enabled
  ON public.reminders (user_id, enabled);

CREATE INDEX IF NOT EXISTS idx_reminders_target
  ON public.reminders (user_id, target_type, target_id);

DROP TRIGGER IF EXISTS reminders_set_updated_at ON public.reminders;
CREATE TRIGGER reminders_set_updated_at
BEFORE UPDATE ON public.reminders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'Users view own push subscriptions'
  ) THEN
    CREATE POLICY "Users view own push subscriptions"
    ON public.push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'Users create own push subscriptions'
  ) THEN
    CREATE POLICY "Users create own push subscriptions"
    ON public.push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'Users update own push subscriptions'
  ) THEN
    CREATE POLICY "Users update own push subscriptions"
    ON public.push_subscriptions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_subscriptions'
      AND policyname = 'Users delete own push subscriptions'
  ) THEN
    CREATE POLICY "Users delete own push subscriptions"
    ON public.push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reminders'
      AND policyname = 'Users view own reminders'
  ) THEN
    CREATE POLICY "Users view own reminders"
    ON public.reminders FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reminders'
      AND policyname = 'Users create own reminders'
  ) THEN
    CREATE POLICY "Users create own reminders"
    ON public.reminders FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reminders'
      AND policyname = 'Users update own reminders'
  ) THEN
    CREATE POLICY "Users update own reminders"
    ON public.reminders FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reminders'
      AND policyname = 'Users delete own reminders'
  ) THEN
    CREATE POLICY "Users delete own reminders"
    ON public.reminders FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'backlog_tasks_user_id_fkey') THEN
    ALTER TABLE public.backlog_tasks
      ADD CONSTRAINT backlog_tasks_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habit_categories_user_id_fkey') THEN
    ALTER TABLE public.habit_categories
      ADD CONSTRAINT habit_categories_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habit_completions_user_id_fkey') THEN
    ALTER TABLE public.habit_completions
      ADD CONSTRAINT habit_completions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habits_user_id_fkey') THEN
    ALTER TABLE public.habits
      ADD CONSTRAINT habits_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journal_entries_user_id_fkey') THEN
    ALTER TABLE public.journal_entries
      ADD CONSTRAINT journal_entries_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notebook_notes_user_id_fkey') THEN
    ALTER TABLE public.notebook_notes
      ADD CONSTRAINT notebook_notes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notebooks_user_id_fkey') THEN
    ALTER TABLE public.notebooks
      ADD CONSTRAINT notebooks_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pomodoro_categories_user_id_fkey') THEN
    ALTER TABLE public.pomodoro_categories
      ADD CONSTRAINT pomodoro_categories_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pomodoro_sessions_user_id_fkey') THEN
    ALTER TABLE public.pomodoro_sessions
      ADD CONSTRAINT pomodoro_sessions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quick_notes_user_id_fkey') THEN
    ALTER TABLE public.quick_notes
      ADD CONSTRAINT quick_notes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_user_id_fkey') THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habits_project_id_fkey') THEN
    ALTER TABLE public.habits
      ADD CONSTRAINT habits_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habits_category_id_fkey') THEN
    ALTER TABLE public.habits
      ADD CONSTRAINT habits_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.habit_categories(id) ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_category_id_fkey') THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.pomodoro_categories(id) ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_parent_block_id_fkey') THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_parent_block_id_fkey
      FOREIGN KEY (parent_block_id) REFERENCES public.tasks(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pomodoro_sessions_task_id_fkey') THEN
    ALTER TABLE public.pomodoro_sessions
      ADD CONSTRAINT pomodoro_sessions_task_id_fkey
      FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_habits_user_deleted_position
  ON public.habits (user_id, deleted_at, position);

CREATE INDEX IF NOT EXISTS idx_habit_categories_user_position
  ON public.habit_categories (user_id, position);

CREATE INDEX IF NOT EXISTS idx_pomodoro_categories_user_position
  ON public.pomodoro_categories (user_id, position);

CREATE INDEX IF NOT EXISTS idx_notebooks_user_deleted_position
  ON public.notebooks (user_id, deleted_at, position);

CREATE INDEX IF NOT EXISTS idx_notebook_notes_user_deleted_position
  ON public.notebook_notes (user_id, deleted_at, position);

CREATE INDEX IF NOT EXISTS idx_quick_notes_user_position
  ON public.quick_notes (user_id, position);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
  ON public.user_settings (user_id);
