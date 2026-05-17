
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'projects','tasks','notes','notebooks','notebook_notes','quick_notes',
    'habits','habit_categories','habit_completions',
    'pomodoro_categories','pomodoro_sessions','backlog_tasks','journal_entries'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS stable_export_id uuid NOT NULL DEFAULT gen_random_uuid()',
      t
    );
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (user_id, stable_export_id)',
      t || '_user_stable_export_uidx', t
    );
  END LOOP;
END $$;
