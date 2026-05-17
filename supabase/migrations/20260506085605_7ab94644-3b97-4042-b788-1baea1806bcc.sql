
-- Pomodoro categories
CREATE TABLE public.pomodoro_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'gray',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pomodoro_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pomodoro categories" ON public.pomodoro_categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own pomodoro categories" ON public.pomodoro_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pomodoro categories" ON public.pomodoro_categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pomodoro categories" ON public.pomodoro_categories
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER pomodoro_categories_updated_at
  BEFORE UPDATE ON public.pomodoro_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pomodoro_sessions
  ADD COLUMN category_id UUID REFERENCES public.pomodoro_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_pomodoro_sessions_category ON public.pomodoro_sessions(category_id);
