
CREATE TYPE public.pomodoro_kind AS ENUM ('work', 'break');

CREATE TABLE public.pomodoro_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INTEGER NOT NULL,
  kind public.pomodoro_kind NOT NULL DEFAULT 'work',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pomodoro_user_started ON public.pomodoro_sessions(user_id, started_at DESC);

ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pomodoro" ON public.pomodoro_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own pomodoro" ON public.pomodoro_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pomodoro" ON public.pomodoro_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pomodoro" ON public.pomodoro_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_pomodoro_sessions_updated_at
BEFORE UPDATE ON public.pomodoro_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
