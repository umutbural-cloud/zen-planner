-- V1-A1 account foundation: persistent profile, membership state, auth bootstrap,
-- idempotent backfill, and basic account/export gate helpers.

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  account_status text NOT NULL DEFAULT 'active',
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_memberships (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  membership text NOT NULL DEFAULT 'beginner',
  status text NOT NULL DEFAULT 'active',
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_account_status_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('active', 'suspended', 'security_blocked', 'deleted', 'anonymized'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_memberships_membership_check'
      AND conrelid = 'public.user_memberships'::regclass
  ) THEN
    ALTER TABLE public.user_memberships
      ADD CONSTRAINT user_memberships_membership_check
      CHECK (membership IN ('beginner', 'plus'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_memberships_status_check'
      AND conrelid = 'public.user_memberships'::regclass
  ) THEN
    ALTER TABLE public.user_memberships
      ADD CONSTRAINT user_memberships_status_check
      CHECK (status IN ('active', 'cancelled', 'expired'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status
  ON public.profiles(account_status);

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
  ON public.profiles(last_seen_at);

CREATE INDEX IF NOT EXISTS idx_user_memberships_membership
  ON public.user_memberships(membership);

CREATE INDEX IF NOT EXISTS idx_user_memberships_status
  ON public.user_memberships(status);

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS user_memberships_set_updated_at ON public.user_memberships;
CREATE TRIGGER user_memberships_set_updated_at
BEFORE UPDATE ON public.user_memberships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user_profile_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_memberships (user_id, membership, status)
  VALUES (NEW.id, 'beginner', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile_membership ON auth.users;
CREATE TRIGGER on_auth_user_created_profile_membership
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile_membership();

INSERT INTO public.profiles (user_id, email, full_name, account_status)
SELECT
  users.id,
  users.email,
  COALESCE(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name'),
  'active'
FROM auth.users AS users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles AS profiles WHERE profiles.user_id = users.id
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_memberships (user_id, membership, status)
SELECT users.id, 'beginner', 'active'
FROM auth.users AS users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_memberships AS memberships WHERE memberships.user_id = users.id
)
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_memberships'
      AND policyname = 'Users can view own membership'
  ) THEN
    CREATE POLICY "Users can view own membership"
    ON public.user_memberships FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.user_memberships TO authenticated;

CREATE OR REPLACE FUNCTION public.can_use_app(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profiles
    JOIN public.user_memberships AS memberships
      ON memberships.user_id = profiles.user_id
    WHERE profiles.user_id = target_user_id
      AND auth.uid() IS NOT NULL
      AND target_user_id = auth.uid()
      AND profiles.account_status = 'active'
      AND memberships.status = 'active'
      AND memberships.membership IN ('beginner', 'plus')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_export_own_data(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profiles
    JOIN public.user_memberships AS memberships
      ON memberships.user_id = profiles.user_id
    WHERE profiles.user_id = target_user_id
      AND auth.uid() IS NOT NULL
      AND target_user_id = auth.uid()
      AND profiles.account_status IN ('active', 'suspended')
      AND memberships.status IN ('active', 'cancelled', 'expired')
  );
$$;

CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  touched_at timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.profiles
  SET last_seen_at = touched_at
  WHERE user_id = auth.uid();

  RETURN touched_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_account_gate()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  profile_row public.profiles%ROWTYPE;
  membership_row public.user_memberships%ROWTYPE;
  can_use boolean := false;
  can_export boolean := false;
  reason text := NULL;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO profile_row
  FROM public.profiles
  WHERE user_id = current_user_id;

  IF NOT FOUND THEN
    reason := 'missing_profile';
    RETURN jsonb_build_object(
      'user_id', current_user_id,
      'email', NULL,
      'full_name', NULL,
      'account_status', NULL,
      'last_seen_at', NULL,
      'membership', NULL,
      'membership_status', NULL,
      'can_use_app', false,
      'can_export', false,
      'block_reason', reason
    );
  END IF;

  SELECT *
  INTO membership_row
  FROM public.user_memberships
  WHERE user_id = current_user_id;

  IF NOT FOUND THEN
    reason := 'missing_membership';
  ELSIF profile_row.account_status IN ('suspended', 'security_blocked', 'deleted', 'anonymized') THEN
    reason := profile_row.account_status;
  ELSIF membership_row.status <> 'active' THEN
    reason := 'membership_inactive';
  END IF;

  can_use := public.can_use_app(current_user_id);
  can_export := public.can_export_own_data(current_user_id);

  RETURN jsonb_build_object(
    'user_id', current_user_id,
    'email', profile_row.email,
    'full_name', profile_row.full_name,
    'account_status', profile_row.account_status,
    'last_seen_at', profile_row.last_seen_at,
    'membership', CASE WHEN membership_row.user_id IS NULL THEN NULL ELSE membership_row.membership END,
    'membership_status', CASE WHEN membership_row.user_id IS NULL THEN NULL ELSE membership_row.status END,
    'can_use_app', can_use,
    'can_export', can_export,
    'block_reason', reason
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile_membership() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile_membership() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile_membership() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.can_use_app(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_use_app(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_use_app(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_export_own_data(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_export_own_data(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_export_own_data(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.touch_last_seen() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_last_seen() FROM anon;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_current_account_gate() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_account_gate() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_current_account_gate() TO authenticated;
