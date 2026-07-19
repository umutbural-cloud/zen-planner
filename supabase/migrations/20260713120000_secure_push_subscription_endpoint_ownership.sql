-- Secure PushSubscription endpoint ownership and provide one atomic claim path.

DO $$
DECLARE
  required_column text;
BEGIN
  IF to_regclass('public.push_subscriptions') IS NULL THEN
    RAISE EXCEPTION 'Required table public.push_subscriptions does not exist';
  END IF;

  FOREACH required_column IN ARRAY ARRAY[
    'endpoint',
    'user_id',
    'p256dh',
    'auth',
    'device_label',
    'user_agent',
    'last_seen_at'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute
      WHERE attrelid = 'public.push_subscriptions'::regclass
        AND attname = required_column
        AND attnum > 0
        AND NOT attisdropped
    ) THEN
      RAISE EXCEPTION 'Required column public.push_subscriptions.% does not exist', required_column;
    END IF;
  END LOOP;
END
$$;

DO $$
DECLARE
  duplicate_endpoint text;
  duplicate_count bigint;
BEGIN
  SELECT subscriptions.endpoint, count(*)
  INTO duplicate_endpoint, duplicate_count
  FROM public.push_subscriptions AS subscriptions
  GROUP BY subscriptions.endpoint
  HAVING count(*) > 1
  ORDER BY subscriptions.endpoint
  LIMIT 1;

  IF duplicate_endpoint IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot enforce global push endpoint ownership: endpoint % appears % times',
      duplicate_endpoint,
      duplicate_count;
  END IF;
END
$$;

DROP INDEX IF EXISTS public.push_subscriptions_user_endpoint_uidx;

DO $$
DECLARE
  endpoint_index regclass := to_regclass('public.push_subscriptions_endpoint_uidx');
  endpoint_attnum smallint;
  index_is_expected boolean;
BEGIN
  IF endpoint_index IS NULL THEN
    CREATE UNIQUE INDEX push_subscriptions_endpoint_uidx
      ON public.push_subscriptions (endpoint);
    RETURN;
  END IF;

  SELECT attnum
  INTO endpoint_attnum
  FROM pg_catalog.pg_attribute
  WHERE attrelid = 'public.push_subscriptions'::regclass
    AND attname = 'endpoint'
    AND attnum > 0
    AND NOT attisdropped;

  SELECT indexes.indisunique
      AND indexes.indisvalid
      AND indexes.indisready
      AND indexes.indrelid = 'public.push_subscriptions'::regclass
      AND indexes.indnkeyatts = 1
      AND indexes.indnatts = 1
      AND indexes.indkey[0] = endpoint_attnum
      AND indexes.indexprs IS NULL
      AND indexes.indpred IS NULL
  INTO index_is_expected
  FROM pg_catalog.pg_index AS indexes
  WHERE indexes.indexrelid = endpoint_index;

  IF index_is_expected IS DISTINCT FROM true THEN
    RAISE EXCEPTION
      'Existing index public.push_subscriptions_endpoint_uidx does not match the required unique index on public.push_subscriptions(endpoint)';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.claim_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_device_label text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  claimed_subscription_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(p_endpoint), '') IS NULL
    OR NULLIF(btrim(p_p256dh), '') IS NULL
    OR NULLIF(btrim(p_auth), '') IS NULL THEN
    RAISE EXCEPTION 'endpoint, p256dh, and auth are required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.push_subscriptions AS subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    device_label,
    user_agent,
    last_seen_at
  )
  VALUES (
    current_user_id,
    p_endpoint,
    p_p256dh,
    p_auth,
    p_device_label,
    p_user_agent,
    now()
  )
  ON CONFLICT (endpoint) DO UPDATE
  SET user_id = EXCLUDED.user_id,
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      device_label = EXCLUDED.device_label,
      user_agent = EXCLUDED.user_agent,
      last_seen_at = now()
  RETURNING subscriptions.id INTO claimed_subscription_id;

  RETURN claimed_subscription_id;
END;
$$;

REVOKE INSERT, UPDATE ON TABLE public.push_subscriptions FROM authenticated;
REVOKE INSERT, UPDATE ON TABLE public.push_subscriptions FROM anon;

REVOKE ALL ON FUNCTION public.claim_push_subscription(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_push_subscription(text, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.claim_push_subscription(text, text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_push_subscription(text, text, text, text, text) TO authenticated;
