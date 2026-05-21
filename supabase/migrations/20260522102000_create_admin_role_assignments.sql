-- V1-B1: Minimum admin role foundation.
-- Admin roles are tied to auth.users.id; email is used only for initial bootstrap lookup.

CREATE TABLE IF NOT EXISTS public.admin_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  assigned_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  revoked_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_role_assignments_role_check
    CHECK (role IN ('super_manager', 'manager')),
  CONSTRAINT admin_role_assignments_user_role_key
    UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_admin_role_assignments_user_active
  ON public.admin_role_assignments(user_id, active)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_role_assignments_role_active
  ON public.admin_role_assignments(role, active)
  WHERE revoked_at IS NULL;

DROP TRIGGER IF EXISTS admin_role_assignments_set_updated_at ON public.admin_role_assignments;
CREATE TRIGGER admin_role_assignments_set_updated_at
BEFORE UPDATE ON public.admin_role_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.admin_role_assignments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_role_assignments FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_role_assignments FROM anon;
REVOKE ALL ON TABLE public.admin_role_assignments FROM authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_role_assignments AS assignments
    WHERE assignments.user_id = auth.uid()
      AND auth.uid() IS NOT NULL
      AND assignments.active = true
      AND assignments.revoked_at IS NULL
      AND assignments.role IN ('super_manager', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_role_assignments AS assignments
    WHERE assignments.user_id = auth.uid()
      AND auth.uid() IS NOT NULL
      AND assignments.active = true
      AND assignments.revoked_at IS NULL
      AND assignments.role = 'super_manager'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_admin_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH current_account AS (
    SELECT auth.uid() AS user_id
  ),
  active_roles AS (
    SELECT assignments.role
    FROM public.admin_role_assignments AS assignments
    CROSS JOIN current_account
    WHERE current_account.user_id IS NOT NULL
      AND assignments.user_id = current_account.user_id
      AND assignments.active = true
      AND assignments.revoked_at IS NULL
  ),
  role_summary AS (
    SELECT COALESCE(jsonb_agg(active_roles.role ORDER BY active_roles.role), '[]'::jsonb) AS roles
    FROM active_roles
  )
  SELECT jsonb_build_object(
    'user_id', current_account.user_id,
    'is_admin', role_summary.roles ?| ARRAY['super_manager', 'manager'],
    'is_super_manager', role_summary.roles ? 'super_manager',
    'roles', role_summary.roles
  )
  FROM current_account
  CROSS JOIN role_summary;
$$;

DO $$
DECLARE
  bootstrap_user_id uuid;
BEGIN
  SELECT users.id
  INTO bootstrap_user_id
  FROM auth.users AS users
  WHERE lower(users.email) = lower('uumutbural@gmail.com')
  LIMIT 1;

  IF bootstrap_user_id IS NULL THEN
    RAISE NOTICE 'Bootstrap super_manager user not found: uumutbural@gmail.com';
  ELSE
    INSERT INTO public.admin_role_assignments (user_id, role, active, revoked_at, revoked_by)
    VALUES (bootstrap_user_id, 'super_manager', true, NULL, NULL)
    ON CONFLICT (user_id, role) DO UPDATE
    SET active = true,
        revoked_at = NULL,
        revoked_by = NULL,
        updated_at = now();
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_super_manager() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_manager() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_super_manager() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_current_admin_context() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_admin_context() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_current_admin_context() TO authenticated;
