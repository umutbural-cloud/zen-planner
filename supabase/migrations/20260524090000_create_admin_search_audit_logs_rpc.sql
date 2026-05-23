-- V1-B7a: Read-only admin audit log search RPC.
-- Exposes only normalized operational audit summaries to super_manager users.

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
     AND normalized_action NOT IN ('membership.changed', 'account.suspended', 'account.reactivated') THEN
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
      logs.metadata->>'normalized_reason_code' AS reason_code,
      CASE
        WHEN logs.action = 'membership.changed' THEN logs.metadata->>'from_membership'
        WHEN logs.action IN ('account.suspended', 'account.reactivated') THEN logs.metadata->>'from_account_status'
        ELSE NULL
      END AS old_value_summary,
      CASE
        WHEN logs.action = 'membership.changed' THEN logs.metadata->>'to_membership'
        WHEN logs.action IN ('account.suspended', 'account.reactivated') THEN logs.metadata->>'to_account_status'
        ELSE NULL
      END AS new_value_summary
    FROM public.admin_audit_logs AS logs
    LEFT JOIN public.profiles AS actor_profiles
      ON actor_profiles.user_id = logs.actor_user_id
    LEFT JOIN public.profiles AS target_profiles
      ON target_profiles.user_id = logs.target_user_id
    WHERE logs.action IN ('membership.changed', 'account.suspended', 'account.reactivated')
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

REVOKE EXECUTE ON FUNCTION public.admin_search_audit_logs(text, boolean, text, text, timestamptz, timestamptz, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_search_audit_logs(text, boolean, text, text, timestamptz, timestamptz, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_search_audit_logs(text, boolean, text, text, timestamptz, timestamptz, integer, integer) TO authenticated;
