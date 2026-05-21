-- V1-B2: Minimum append-only admin audit log foundation.
-- Store only operational admin events. Do not store user content, OTPs, secrets,
-- tokens, raw IPs, full user agents, session data, or free-form private content.

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  target_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_role text NULL,
  success boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT admin_audit_logs_action_check
    CHECK (action IN (
      'membership.changed',
      'account.suspended',
      'account.reactivated',
      'manager.granted',
      'manager.revoked'
    )),
  CONSTRAINT admin_audit_logs_target_role_check
    CHECK (
      target_role IS NULL
      OR target_role IN ('manager', 'super_manager', 'beginner', 'plus')
    ),
  CONSTRAINT admin_audit_logs_metadata_object_check
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at_desc
  ON public.admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_user_id
  ON public.admin_audit_logs(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id
  ON public.admin_audit_logs(target_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action
  ON public.admin_audit_logs(action);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_audit_logs FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_audit_logs FROM anon;
REVOKE ALL ON TABLE public.admin_audit_logs FROM authenticated;

CREATE OR REPLACE FUNCTION public.prevent_admin_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Admin audit logs are append-only';
END;
$$;

DROP TRIGGER IF EXISTS admin_audit_logs_prevent_update_delete ON public.admin_audit_logs;
CREATE TRIGGER admin_audit_logs_prevent_update_delete
BEFORE UPDATE OR DELETE ON public.admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_audit_log_mutation();

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

  -- Metadata must stay operational and non-sensitive. Do not include user content,
  -- OTPs, secrets, tokens, raw IPs, full user agents, session data, or free-form
  -- private content in this payload.
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

REVOKE EXECUTE ON FUNCTION public.prevent_admin_audit_log_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_admin_audit_log_mutation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_admin_audit_log_mutation() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.write_admin_audit_log(text, uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.write_admin_audit_log(text, uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.write_admin_audit_log(text, uuid, text, jsonb) FROM authenticated;
