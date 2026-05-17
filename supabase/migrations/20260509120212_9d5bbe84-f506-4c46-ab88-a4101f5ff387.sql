-- User settings table for per-user preferences (location, prayer times, etc.)
CREATE TABLE public.user_settings (
  user_id UUID NOT NULL PRIMARY KEY,
  auto_prayer_times BOOLEAN NOT NULL DEFAULT false,
  location_permission BOOLEAN NOT NULL DEFAULT false,
  country TEXT NOT NULL DEFAULT 'Turkey',
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  calculation_method INTEGER NOT NULL DEFAULT 13,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON public.user_settings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();