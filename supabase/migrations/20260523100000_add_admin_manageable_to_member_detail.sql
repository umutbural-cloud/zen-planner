-- V1-B6c-1.5a: Add admin-target guard metadata to member detail.
-- This only expands the admin_get_member_detail JSON response; it does not
-- change membership/status mutation behavior.

CREATE OR REPLACE FUNCTION public.admin_get_member_detail(
  target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  member_row record;
  can_use boolean := false;
  can_export boolean := false;
  block_reason text := NULL;
  admin_manageable boolean := true;
  admin_management_block_reason text := NULL;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id is required';
  END IF;

  SELECT
    profiles.user_id,
    profiles.email,
    profiles.full_name,
    profiles.account_status,
    profiles.last_seen_at,
    profiles.created_at,
    profiles.updated_at,
    memberships.membership,
    memberships.status AS membership_status
  INTO member_row
  FROM public.profiles AS profiles
  JOIN public.user_memberships AS memberships
    ON memberships.user_id = profiles.user_id
  WHERE profiles.user_id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  can_use := (
    member_row.account_status = 'active'
    AND member_row.membership_status = 'active'
    AND member_row.membership IN ('beginner', 'plus')
  );

  can_export := (
    member_row.account_status IN ('active', 'suspended')
    AND member_row.membership_status IN ('active', 'cancelled', 'expired')
  );

  IF member_row.account_status IN ('suspended', 'security_blocked', 'deleted', 'anonymized') THEN
    block_reason := member_row.account_status;
  ELSIF member_row.membership_status <> 'active' THEN
    block_reason := 'membership_inactive';
  ELSIF NOT can_use THEN
    block_reason := 'not_allowed';
  END IF;

  IF member_row.user_id = auth.uid() THEN
    admin_manageable := false;
    admin_management_block_reason := 'self_account';
  ELSIF EXISTS (
    SELECT 1
    FROM public.admin_role_assignments AS assignments
    WHERE assignments.user_id = member_row.user_id
      AND assignments.active = true
      AND assignments.revoked_at IS NULL
      AND assignments.role IN ('manager', 'super_manager')
  ) THEN
    admin_manageable := false;
    admin_management_block_reason := 'admin_account';
  END IF;

  RETURN jsonb_build_object(
    'user_id', member_row.user_id,
    'email', member_row.email,
    'full_name', member_row.full_name,
    'account_status', member_row.account_status,
    'membership', member_row.membership,
    'membership_status', member_row.membership_status,
    'last_seen_at', member_row.last_seen_at,
    'created_at', member_row.created_at,
    'updated_at', member_row.updated_at,
    'can_use_app', can_use,
    'can_export', can_export,
    'block_reason', block_reason,
    'admin_manageable', admin_manageable,
    'admin_management_block_reason', admin_management_block_reason
  );
END;
$$;
