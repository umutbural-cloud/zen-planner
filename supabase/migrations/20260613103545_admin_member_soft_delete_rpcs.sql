-- V1-B8: Admin member soft delete support using existing deleted account_status.
-- Keep the data model append-only for audits and avoid hard deletes.

ALTER TABLE public.admin_audit_logs
  DROP CONSTRAINT IF EXISTS admin_audit_logs_action_check;

ALTER TABLE public.admin_audit_logs
  ADD CONSTRAINT admin_audit_logs_action_check
    CHECK (action IN (
      'membership.changed',
      'account.suspended',
      'account.reactivated',
      'account.deleted',
      'account.restored',
      'manager.granted',
      'manager.revoked'
    ));

CREATE OR REPLACE FUNCTION public.write_admin_audit_log(
  action text,
  target_user_id uuid DEFAULT NULL,
  target_role text DEFAULT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_actor_id uuid := auth.uid();
  safe_metadata jsonb := COALESCE(metadata, '{}'::jsonb);
  inserted_audit_id uuid;
BEGIN
  IF current_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  IF action NOT IN (
    'membership.changed',
    'account.suspended',
    'account.reactivated',
    'account.deleted',
    'account.restored',
    'manager.granted',
    'manager.revoked'
  ) THEN
    RAISE EXCEPTION 'Unsupported admin audit action: %', action;
  END IF;

  IF target_role IS NOT NULL
     AND target_role NOT IN ('manager', 'super_manager', 'beginner', 'plus') THEN
    RAISE EXCEPTION 'Unsupported admin audit target role: %', target_role;
  END IF;

  IF jsonb_typeof(safe_metadata) <> 'object' THEN
    RAISE EXCEPTION 'Admin audit metadata must be a JSON object';
  END IF;

  -- Metadata must stay operational and non-sensitive.
  INSERT INTO public.admin_audit_logs (
    action,
    actor_user_id,
    target_user_id,
    target_role,
    success,
    metadata
  )
  VALUES (
    action,
    current_actor_id,
    target_user_id,
    target_role,
    true,
    safe_metadata
  )
  RETURNING id INTO inserted_audit_id;

  RETURN inserted_audit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_archive_member(
  target_user_id uuid,
  reason_code text,
  reason_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_actor_id uuid := auth.uid();
  current_account_status text;
  current_membership text;
  current_membership_status text;
  reason_code_value text := NULLIF(btrim(COALESCE(reason_code, '')), '');
  normalized_reason_note text := NULLIF(btrim(COALESCE(reason_note, '')), '');
  active_super_manager_count integer := 0;
  audit_id uuid;
  changed_at timestamptz := now();
BEGIN
  IF current_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_super_manager() THEN
    RAISE EXCEPTION 'Super manager privileges required';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id is required';
  END IF;

  IF target_user_id = current_actor_id THEN
    RAISE EXCEPTION 'Admin cannot delete own account';
  END IF;

  IF reason_code_value IS NULL THEN
    RAISE EXCEPTION 'reason_code is required';
  END IF;

  IF length(reason_code_value) > 64 THEN
    RAISE EXCEPTION 'reason_code must be 64 characters or less';
  END IF;

  IF reason_code_value !~ '^[a-z0-9_.-]+$' THEN
    RAISE EXCEPTION 'reason_code contains unsupported characters';
  END IF;

  SELECT
    profiles.account_status,
    memberships.membership,
    memberships.status
  INTO current_account_status,
       current_membership,
       current_membership_status
  FROM public.profiles AS profiles
  JOIN public.user_memberships AS memberships
    ON memberships.user_id = profiles.user_id
  WHERE profiles.user_id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member profile or membership record not found';
  END IF;

  IF current_account_status = 'deleted' THEN
    RAISE EXCEPTION 'already_deleted';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.admin_role_assignments AS assignments
    WHERE assignments.user_id = target_user_id
      AND assignments.active = true
      AND assignments.revoked_at IS NULL
      AND assignments.role = 'super_manager'
  ) THEN
    SELECT COUNT(*)
    INTO active_super_manager_count
    FROM public.admin_role_assignments AS assignments
    WHERE assignments.active = true
      AND assignments.revoked_at IS NULL
      AND assignments.role = 'super_manager';

    IF active_super_manager_count <= 1 THEN
      RAISE EXCEPTION 'Cannot delete last super_manager';
    END IF;
  END IF;

  UPDATE public.profiles
  SET account_status = 'deleted',
      updated_at = changed_at
  WHERE user_id = target_user_id;

  audit_id := public.write_admin_audit_log(
    'account.deleted',
    target_user_id,
    NULL,
    jsonb_build_object(
      'previous_account_status', current_account_status,
      'next_account_status', 'deleted',
      'reason_code', reason_code_value,
      'reason_note', normalized_reason_note,
      'source', 'admin_archive_member',
      'membership', current_membership,
      'membership_status', current_membership_status
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'target_user_id', target_user_id,
    'account_status', 'deleted',
    'audit_id', audit_id,
    'changed_at', changed_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_restore_member(
  target_user_id uuid,
  reason_code text,
  reason_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_actor_id uuid := auth.uid();
  current_account_status text;
  current_membership text;
  current_membership_status text;
  reason_code_value text := NULLIF(btrim(COALESCE(reason_code, '')), '');
  normalized_reason_note text := NULLIF(btrim(COALESCE(reason_note, '')), '');
  audit_id uuid;
  changed_at timestamptz := now();
BEGIN
  IF current_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_super_manager() THEN
    RAISE EXCEPTION 'Super manager privileges required';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id is required';
  END IF;

  IF reason_code_value IS NULL THEN
    RAISE EXCEPTION 'reason_code is required';
  END IF;

  IF length(reason_code_value) > 64 THEN
    RAISE EXCEPTION 'reason_code must be 64 characters or less';
  END IF;

  IF reason_code_value !~ '^[a-z0-9_.-]+$' THEN
    RAISE EXCEPTION 'reason_code contains unsupported characters';
  END IF;

  SELECT
    profiles.account_status,
    memberships.membership,
    memberships.status
  INTO current_account_status,
       current_membership,
       current_membership_status
  FROM public.profiles AS profiles
  JOIN public.user_memberships AS memberships
    ON memberships.user_id = profiles.user_id
  WHERE profiles.user_id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member profile or membership record not found';
  END IF;

  IF current_account_status <> 'deleted' THEN
    RAISE EXCEPTION 'Member is not deleted';
  END IF;

  UPDATE public.profiles
  SET account_status = 'active',
      updated_at = changed_at
  WHERE user_id = target_user_id;

  audit_id := public.write_admin_audit_log(
    'account.restored',
    target_user_id,
    NULL,
    jsonb_build_object(
      'previous_account_status', current_account_status,
      'next_account_status', 'active',
      'reason_code', reason_code_value,
      'reason_note', normalized_reason_note,
      'source', 'admin_restore_member',
      'membership', current_membership,
      'membership_status', current_membership_status
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'target_user_id', target_user_id,
    'account_status', 'active',
    'audit_id', audit_id,
    'changed_at', changed_at
  );
END;
$$;

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
      AND CASE
        WHEN normalized_account_status IS NULL THEN profiles.account_status <> 'deleted'
        ELSE profiles.account_status = normalized_account_status
      END
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

CREATE OR REPLACE FUNCTION public.admin_search_audit_logs(
  action_filter text DEFAULT NULL,
  success_filter boolean DEFAULT NULL,
  target_query text DEFAULT NULL,
  actor_query text DEFAULT NULL,
  created_from timestamptz DEFAULT NULL,
  created_to timestamptz DEFAULT NULL,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_action text := NULLIF(btrim(COALESCE(action_filter, '')), '');
  normalized_target_query text := NULLIF(btrim(COALESCE(target_query, '')), '');
  normalized_actor_query text := NULLIF(btrim(COALESCE(actor_query, '')), '');
  normalized_target_pattern text;
  normalized_actor_pattern text;
  normalized_limit integer := CASE
    WHEN limit_count IS NULL OR limit_count <= 0 THEN 50
    ELSE LEAST(limit_count, 100)
  END;
  normalized_offset integer := GREATEST(COALESCE(offset_count, 0), 0);
  total_count bigint := 0;
  items jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT public.is_super_manager() THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  IF normalized_action IS NOT NULL
     AND normalized_action NOT IN ('membership.changed', 'account.suspended', 'account.reactivated', 'account.deleted', 'account.restored') THEN
    RAISE EXCEPTION 'unsupported_action_filter';
  END IF;

  IF created_from IS NOT NULL
     AND created_to IS NOT NULL
     AND created_from > created_to THEN
    RAISE EXCEPTION 'invalid_date_range';
  END IF;

  normalized_target_pattern := CASE
    WHEN normalized_target_query IS NULL THEN NULL
    ELSE replace(replace(replace(normalized_target_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_')
  END;

  normalized_actor_pattern := CASE
    WHEN normalized_actor_query IS NULL THEN NULL
    ELSE replace(replace(replace(normalized_actor_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_')
  END;

  WITH audit_rows AS (
    SELECT
      logs.id,
      logs.created_at,
      logs.action,
      actor_profiles.email AS actor_email,
      target_profiles.email AS target_email,
      logs.success,
      COALESCE(logs.metadata->>'reason_code', logs.metadata->>'normalized_reason_code') AS reason_code,
      CASE
        WHEN logs.action = 'membership.changed' THEN logs.metadata->>'from_membership'
        WHEN logs.action IN ('account.suspended', 'account.reactivated') THEN logs.metadata->>'from_account_status'
        WHEN logs.action IN ('account.deleted', 'account.restored') THEN COALESCE(logs.metadata->>'previous_account_status', logs.metadata->>'from_account_status')
        ELSE NULL
      END AS old_value_summary,
      CASE
        WHEN logs.action = 'membership.changed' THEN logs.metadata->>'to_membership'
        WHEN logs.action IN ('account.suspended', 'account.reactivated') THEN logs.metadata->>'to_account_status'
        WHEN logs.action IN ('account.deleted', 'account.restored') THEN COALESCE(logs.metadata->>'next_account_status', logs.metadata->>'to_account_status')
        ELSE NULL
      END AS new_value_summary
    FROM public.admin_audit_logs AS logs
    LEFT JOIN public.profiles AS actor_profiles
      ON actor_profiles.user_id = logs.actor_user_id
    LEFT JOIN public.profiles AS target_profiles
      ON target_profiles.user_id = logs.target_user_id
    WHERE logs.action IN ('membership.changed', 'account.suspended', 'account.reactivated', 'account.deleted', 'account.restored')
      AND (
        normalized_action IS NULL
        OR logs.action = normalized_action
      )
      AND (
        success_filter IS NULL
        OR logs.success = success_filter
      )
      AND (
        normalized_target_pattern IS NULL
        OR target_profiles.email ILIKE '%' || normalized_target_pattern || '%' ESCAPE '\'
      )
      AND (
        normalized_actor_pattern IS NULL
        OR actor_profiles.email ILIKE '%' || normalized_actor_pattern || '%' ESCAPE '\'
      )
      AND (
        created_from IS NULL
        OR logs.created_at >= created_from
      )
      AND (
        created_to IS NULL
        OR logs.created_at < created_to
      )
  ),
  counted_rows AS (
    SELECT COUNT(*)::bigint AS total_count
    FROM audit_rows
  ),
  paginated_rows AS (
    SELECT *
    FROM audit_rows
    ORDER BY created_at DESC, id DESC
    LIMIT normalized_limit
    OFFSET normalized_offset
  )
  SELECT
    COALESCE(counted_rows.total_count, 0),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', paginated_rows.id,
          'created_at', paginated_rows.created_at,
          'action', paginated_rows.action,
          'actor_email', paginated_rows.actor_email,
          'target_email', paginated_rows.target_email,
          'success', paginated_rows.success,
          'reason_code', paginated_rows.reason_code,
          'old_value_summary', paginated_rows.old_value_summary,
          'new_value_summary', paginated_rows.new_value_summary
        )
        ORDER BY paginated_rows.created_at DESC, paginated_rows.id DESC
      ) FILTER (WHERE paginated_rows.id IS NOT NULL),
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

REVOKE EXECUTE ON FUNCTION public.write_admin_audit_log(text, uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.write_admin_audit_log(text, uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.write_admin_audit_log(text, uuid, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.write_admin_audit_log(text, uuid, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_archive_member(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_archive_member(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_member(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_restore_member(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_restore_member(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_restore_member(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_search_members(text, text, text, text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_search_members(text, text, text, text, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_search_members(text, text, text, text, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_member_detail(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_member_detail(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_member_detail(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_search_audit_logs(text, boolean, text, text, timestamptz, timestamptz, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_search_audit_logs(text, boolean, text, text, timestamptz, timestamptz, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_search_audit_logs(text, boolean, text, text, timestamptz, timestamptz, integer, integer) TO authenticated;
