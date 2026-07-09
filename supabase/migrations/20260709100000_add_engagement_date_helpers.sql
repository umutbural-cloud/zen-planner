CREATE OR REPLACE FUNCTION public.istanbul_local_date(value timestamptz)
RETURNS date
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT ($1 AT TIME ZONE 'Europe/Istanbul')::date;
$$;

CREATE OR REPLACE FUNCTION public.istanbul_day_start_utc(value date)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT ($1::timestamp AT TIME ZONE 'Europe/Istanbul');
$$;

CREATE OR REPLACE FUNCTION public.max_true_streak(flags integer[])
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  flag integer;
  current_streak integer := 0;
  max_streak integer := 0;
BEGIN
  FOREACH flag IN ARRAY COALESCE(flags, ARRAY[]::integer[]) LOOP
    IF COALESCE(flag, 0) = 1 THEN
      current_streak := current_streak + 1;
      max_streak := GREATEST(max_streak, current_streak);
    ELSE
      current_streak := 0;
    END IF;
  END LOOP;

  RETURN max_streak;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.istanbul_local_date(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.istanbul_local_date(timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.istanbul_local_date(timestamptz) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.istanbul_day_start_utc(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.istanbul_day_start_utc(date) FROM anon;
GRANT EXECUTE ON FUNCTION public.istanbul_day_start_utc(date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.max_true_streak(integer[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.max_true_streak(integer[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.max_true_streak(integer[]) TO authenticated;
