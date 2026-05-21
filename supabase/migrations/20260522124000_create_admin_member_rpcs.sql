-- V1-B3: Admin member RPC foundation.
-- These RPCs only expose operational profile/membership state. They must not
-- return user content, notes, tasks, journal entries, habits, or any raw auth
-- session material.

CREATE OR REPLACE FUNCTION public.admin_search_members(
  query text DEFAULT NULL,
  membership text DEFAULT NULL,
  membership_status text DEFAULT NULL,
  account_status text DEFAULT NULL,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_limit integer := GREATEST(1, LEAST(COALESCE(limit_count, 20), 100));
  normalized_offset integer := GREATEST(COALESCE(offset_count, 0), 0);
  normalized_membership text := NULLIF(btrim(COALESCE(membership, '')), '');
  normalized_membership_status text := NULLIF(btrim(COALESCE(membership_status, '')), '');
  normalized_account_status text := NULLIF(btrim(COALESCE(account_status, '')), '');
  search_query text := NULLIF(btrim(COALESCE(query, '')), '');
  total_count bigint := 0;
  items jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  IF offset_count < 0 THEN
    RAISE EXCEPTION 'offset_count must be greater than or equal to 0';
  END IF;

  IF normalized_membership IS NOT NULL
     AND normalized_membership NOT IN ('beginner', 'plus') THEN
    RAISE EXCEPTION 'Unsupported membership filter: %', normalized_membership;
  END IF;

  IF normalized_membership_status IS NOT NULL
     AND normalized_membership_status NOT IN ('active', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Unsupported membership status filter: %', normalized_membership_status;
  END IF;

  IF normalized_account_status IS NOT NULL
     AND normalized_account_status NOT IN ('active', 'suspended', 'security_blocked', 'deleted', 'anonymized') THEN
    RAISE EXCEPTION 'Unsupported account status filter: %', normalized_account_status;
  END IF;

  WITH member_rows AS (
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
    FROM public.profiles AS profiles
    JOIN public.user_memberships AS memberships
      ON memberships.user_id = profiles.user_id
    WHERE (
      search_query IS NULL
      OR profiles.email ILIKE '%' || search_query || '%'
      OR COALESCE(profiles.full_name, '') ILIKE '%' || search_query || '%'
      OR profiles.user_id::text ILIKE '%' || search_query || '%'
    )
      AND (
        normalized_membership IS NULL
        OR memberships.membership = normalized_membership
      )
      AND (
        normalized_membership_status IS NULL
        OR memberships.status = normalized_membership_status
      )
      AND (
        normalized_account_status IS NULL
        OR profiles.account_status = normalized_account_status
      )
  ),
  counted_rows AS (
    SELECT COUNT(*)::bigint AS total_count
    FROM member_rows
  ),
  paginated_rows AS (
    SELECT *
    FROM member_rows
    ORDER BY updated_at DESC, created_at DESC, user_id ASC
    LIMIT normalized_limit
    OFFSET normalized_offset
  )
  SELECT
    COALESCE(counted_rows.total_count, 0),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'user_id', paginated_rows.user_id,
          'email', paginated_rows.email,
          'full_name', paginated_rows.full_name,
          'account_status', paginated_rows.account_status,
          'membership', paginated_rows.membership,
          'membership_status', paginated_rows.membership_status,
          'last_seen_at', paginated_rows.last_seen_at,
          'created_at', paginated_rows.created_at,
          'updated_at', paginated_rows.updated_at,
          'can_use_app', CASE
            WHEN paginated_rows.account_status = 'active'
             AND paginated_rows.membership_status = 'active'
             AND paginated_rows.membership IN ('beginner', 'plus')
            THEN true
            ELSE false
          END,
          'can_export', CASE
            WHEN paginated_rows.account_status IN ('active', 'suspended')
             AND paginated_rows.membership_status IN ('active', 'cancelled', 'expired')
            THEN true
            ELSE false
          END,
          'block_reason', CASE
            WHEN paginated_rows.account_status IN ('suspended', 'security_blocked', 'deleted', 'anonymized')
              THEN paginated_rows.account_status
            WHEN paginated_rows.membership_status <> 'active'
              THEN 'membership_inactive'
            WHEN NOT (
              paginated_rows.account_status = 'active'
              AND paginated_rows.membership_status = 'active'
              AND paginated_rows.membership IN ('beginner', 'plus')
            )
              THEN 'not_allowed'
            ELSE NULL
          END
        )
        ORDER BY paginated_rows.updated_at DESC, paginated_rows.created_at DESC, paginated_rows.user_id ASC
      ) FILTER (WHERE paginated_rows.user_id IS NOT NULL),
      '[]'::jsonb
    )
  INTO total_count, items
  FROM counted_rows
  LEFT JOIN paginated_rows ON TRUE
  GROUP BY counted_rows.total_count;

  RETURN jsonb_build_object(
    'items', items,
    'total_count', total_count,
    'limit', normalized_limit,
    'offset', normalized_offset
  );
END;
$$;

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
    'block_reason', block_reason
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_change_membership(
  target_user_id uuid,
  target_membership text,
  reason_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_actor_id uuid := auth.uid();
  current_membership text;
  current_status text;
  audit_id uuid;
  changed_at timestamptz := now();
  normalized_reason_code text := NULL;
BEGIN
  IF current_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id is required';
  END IF;

  IF target_user_id = current_actor_id THEN
    RAISE EXCEPTION 'Admin cannot change own membership';
  END IF;

  IF target_membership IS NULL THEN
    RAISE EXCEPTION 'target_membership is required';
  END IF;

  IF target_membership NOT IN ('beginner', 'plus') THEN
    RAISE EXCEPTION 'Unsupported membership: %', target_membership;
  END IF;

  IF reason_code IS NOT NULL THEN
    normalized_reason_code := NULLIF(btrim(reason_code), '');

    IF normalized_reason_code IS NOT NULL THEN
      IF length(normalized_reason_code) > 64 THEN
        RAISE EXCEPTION 'reason_code must be 64 characters or less';
      END IF;

      IF normalized_reason_code !~ '^[a-z0-9_.-]+$' THEN
        RAISE EXCEPTION 'reason_code contains unsupported characters';
      END IF;
    END IF;
  END IF;

  SELECT
    memberships.membership,
    memberships.status
  INTO current_membership,
       current_status
  FROM public.user_memberships AS memberships
  WHERE memberships.user_id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member profile or membership record not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.admin_role_assignments AS assignments
    WHERE assignments.user_id = target_user_id
      AND assignments.active = true
      AND assignments.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Admin accounts cannot be managed through member RPCs';
  END IF;

  UPDATE public.user_memberships
  SET membership = target_membership,
      updated_by = current_actor_id,
      updated_at = changed_at
  WHERE user_id = target_user_id;

  audit_id := public.write_admin_audit_log(
    'membership.changed',
    target_user_id,
    target_membership,
    jsonb_build_object(
      'from_membership', current_membership,
      'to_membership', target_membership,
      'normalized_reason_code', normalized_reason_code,
      'change_source', 'admin_member_rpc',
      'policy_version', 'v1-b3'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'target_user_id', target_user_id,
    'membership', target_membership,
    'membership_status', current_status,
    'audit_id', audit_id,
    'changed_at', changed_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  target_user_id uuid,
  target_account_status text,
  reason_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_actor_id uuid := auth.uid();
  current_account_status text;
  current_membership_status text;
  current_membership text;
  audit_action text;
  audit_id uuid;
  changed_at timestamptz := now();
  normalized_reason_code text := NULL;
BEGIN
  IF current_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id is required';
  END IF;

  IF target_user_id = current_actor_id THEN
    RAISE EXCEPTION 'Admin cannot change own account status';
  END IF;

  IF target_account_status IS NULL THEN
    RAISE EXCEPTION 'target_account_status is required';
  END IF;

  IF target_account_status NOT IN ('active', 'suspended', 'security_blocked') THEN
    RAISE EXCEPTION 'Unsupported account status: %', target_account_status;
  END IF;

  IF reason_code IS NOT NULL THEN
    normalized_reason_code := NULLIF(btrim(reason_code), '');

    IF normalized_reason_code IS NOT NULL THEN
      IF length(normalized_reason_code) > 64 THEN
        RAISE EXCEPTION 'reason_code must be 64 characters or less';
      END IF;

      IF normalized_reason_code !~ '^[a-z0-9_.-]+$' THEN
        RAISE EXCEPTION 'reason_code contains unsupported characters';
      END IF;
    END IF;
  END IF;

  SELECT profiles.account_status
  INTO current_account_status
  FROM public.profiles AS profiles
  WHERE profiles.user_id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member profile or membership record not found';
  END IF;

  SELECT
    memberships.membership,
    memberships.status
  INTO current_membership,
       current_membership_status
  FROM public.user_memberships AS memberships
  WHERE memberships.user_id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member profile or membership record not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.admin_role_assignments AS assignments
    WHERE assignments.user_id = target_user_id
      AND assignments.active = true
      AND assignments.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Admin accounts cannot be managed through member RPCs';
  END IF;

  UPDATE public.profiles
  SET account_status = target_account_status,
      updated_at = changed_at
  WHERE user_id = target_user_id;

  audit_action := CASE
    WHEN target_account_status = 'active' THEN 'account.reactivated'
    WHEN target_account_status = 'suspended' THEN 'account.suspended'
    WHEN target_account_status = 'security_blocked' THEN 'account.suspended'
  END;

  audit_id := public.write_admin_audit_log(
    audit_action,
    target_user_id,
    NULL,
    jsonb_build_object(
      'from_account_status', current_account_status,
      'to_account_status', target_account_status,
      'normalized_reason_code', normalized_reason_code,
      'change_source', 'admin_member_rpc',
      'policy_version', 'v1-b3',
      'status_type', target_account_status,
      'membership', current_membership,
      'membership_status', current_membership_status
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'target_user_id', target_user_id,
    'account_status', target_account_status,
    'audit_id', audit_id,
    'changed_at', changed_at
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_search_members(text, text, text, text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_search_members(text, text, text, text, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_search_members(text, text, text, text, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_member_detail(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_member_detail(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_member_detail(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_change_membership(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_change_membership(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_change_membership(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_status(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_status(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, text, text) TO authenticated;
