DROP FUNCTION IF EXISTS public.admin_search_members(text, text, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_search_members(
  query text DEFAULT NULL,
  membership text DEFAULT NULL,
  membership_status text DEFAULT NULL,
  account_status text DEFAULT NULL,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0,
  sort_column text DEFAULT NULL,
  sort_direction text DEFAULT NULL
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
  normalized_sort_column text := NULLIF(btrim(COALESCE(sort_column, '')), '');
  normalized_sort_direction text := lower(NULLIF(btrim(COALESCE(sort_direction, '')), ''));
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

  IF normalized_sort_column IS NOT NULL
     AND normalized_sort_column NOT IN ('full_name', 'email', 'membership', 'last_seen_at', 'created_at') THEN
    normalized_sort_column := NULL;
  END IF;

  IF normalized_sort_direction IS NOT NULL
     AND normalized_sort_direction NOT IN ('asc', 'desc') THEN
    normalized_sort_direction := NULL;
  END IF;

  IF normalized_sort_column IS NULL OR normalized_sort_direction IS NULL THEN
    normalized_sort_column := NULL;
    normalized_sort_direction := NULL;
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
  sorted_rows AS (
    SELECT
      member_rows.*,
      row_number() OVER (
        ORDER BY
          CASE
            WHEN normalized_sort_column = 'full_name' AND normalized_sort_direction = 'asc'
              THEN NULLIF(COALESCE(member_rows.full_name, ''), '')
          END ASC NULLS LAST,
          CASE
            WHEN normalized_sort_column = 'full_name' AND normalized_sort_direction = 'desc'
              THEN NULLIF(COALESCE(member_rows.full_name, ''), '')
          END DESC NULLS LAST,
          CASE
            WHEN normalized_sort_column = 'email' AND normalized_sort_direction = 'asc'
              THEN NULLIF(COALESCE(member_rows.email, ''), '')
          END ASC NULLS LAST,
          CASE
            WHEN normalized_sort_column = 'email' AND normalized_sort_direction = 'desc'
              THEN NULLIF(COALESCE(member_rows.email, ''), '')
          END DESC NULLS LAST,
          CASE
            WHEN normalized_sort_column = 'membership' AND normalized_sort_direction = 'asc'
              THEN NULLIF(COALESCE(member_rows.membership, ''), '')
          END ASC NULLS LAST,
          CASE
            WHEN normalized_sort_column = 'membership' AND normalized_sort_direction = 'desc'
              THEN NULLIF(COALESCE(member_rows.membership, ''), '')
          END DESC NULLS LAST,
          CASE
            WHEN normalized_sort_column = 'last_seen_at' AND normalized_sort_direction = 'asc'
              THEN member_rows.last_seen_at
          END ASC NULLS LAST,
          CASE
            WHEN normalized_sort_column = 'last_seen_at' AND normalized_sort_direction = 'desc'
              THEN member_rows.last_seen_at
          END DESC NULLS LAST,
          CASE
            WHEN normalized_sort_column = 'created_at' AND normalized_sort_direction = 'asc'
              THEN member_rows.created_at
          END ASC NULLS LAST,
          CASE
            WHEN normalized_sort_column = 'created_at' AND normalized_sort_direction = 'desc'
              THEN member_rows.created_at
          END DESC NULLS LAST,
          CASE
            WHEN normalized_sort_column IS NULL THEN member_rows.updated_at
          END DESC,
          CASE
            WHEN normalized_sort_column IS NULL THEN member_rows.created_at
          END DESC,
          member_rows.user_id ASC
      ) AS sort_position
    FROM member_rows
  ),
  paginated_rows AS (
    SELECT *
    FROM sorted_rows
    ORDER BY sort_position
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
        ORDER BY paginated_rows.sort_position
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

REVOKE EXECUTE ON FUNCTION public.admin_search_members(text, text, text, text, integer, integer, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_search_members(text, text, text, text, integer, integer, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_search_members(text, text, text, text, integer, integer, text, text) TO authenticated;
