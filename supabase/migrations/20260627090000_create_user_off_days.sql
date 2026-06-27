CREATE TABLE public.user_off_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

ALTER TABLE public.user_off_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own off days"
ON public.user_off_days
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users create own off days"
ON public.user_off_days
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own off days"
ON public.user_off_days
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own off days"
ON public.user_off_days
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_user_off_days_user_day
ON public.user_off_days (user_id, day);

CREATE TRIGGER trg_user_off_days_updated_at
BEFORE UPDATE ON public.user_off_days
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_off_days TO authenticated;
