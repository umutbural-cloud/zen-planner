
-- Habit categories
CREATE TABLE public.habit_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'gray',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.habit_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own habit categories" ON public.habit_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "create own habit categories" ON public.habit_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own habit categories" ON public.habit_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own habit categories" ON public.habit_categories FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_habit_categories_updated BEFORE UPDATE ON public.habit_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.habits ADD COLUMN category_id UUID;
