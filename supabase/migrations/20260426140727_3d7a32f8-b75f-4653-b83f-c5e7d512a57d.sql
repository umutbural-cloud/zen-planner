CREATE OR REPLACE FUNCTION public.protect_default_project()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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