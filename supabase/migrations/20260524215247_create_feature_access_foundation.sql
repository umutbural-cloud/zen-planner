CREATE TABLE public.app_features (
  feature_key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  category text NOT NULL,
  route_path text,
  is_active boolean NOT NULL DEFAULT true,
  is_core boolean NOT NULL DEFAULT false,
  backend_enforcement_required boolean NOT NULL DEFAULT false,
  content_risk text NOT NULL DEFAULT 'low',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_features_content_risk_check
    CHECK (content_risk IN ('none', 'low', 'medium', 'high')),
  CONSTRAINT app_features_feature_key_not_blank_check
    CHECK (length(btrim(feature_key)) > 0)
);

CREATE TABLE public.membership_feature_access (
  membership text NOT NULL,
  feature_key text NOT NULL REFERENCES public.app_features(feature_key) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_feature_access_pkey PRIMARY KEY (membership, feature_key),
  CONSTRAINT membership_feature_access_membership_check
    CHECK (membership IN ('beginner', 'plus'))
);

CREATE TRIGGER app_features_set_updated_at
BEFORE UPDATE ON public.app_features
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER membership_feature_access_set_updated_at
BEFORE UPDATE ON public.membership_feature_access
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.app_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_feature_access ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.app_features FROM PUBLIC;
REVOKE ALL ON TABLE public.app_features FROM anon;
REVOKE ALL ON TABLE public.app_features FROM authenticated;

REVOKE ALL ON TABLE public.membership_feature_access FROM PUBLIC;
REVOKE ALL ON TABLE public.membership_feature_access FROM anon;
REVOKE ALL ON TABLE public.membership_feature_access FROM authenticated;

WITH feature_seed (
  feature_key,
  label,
  description,
  category,
  route_path,
  is_active,
  is_core,
  backend_enforcement_required,
  content_risk,
  display_order,
  beginner_enabled,
  plus_enabled
) AS (
  VALUES
    ('dashboard_home', 'Ana Sayfa / Dashboard', 'Ana sayfa dashboard ve ozet metrikler.', 'dashboard', '/', true, false, true, 'medium', 10, false, true),
    ('pomodoro', 'Pomodoro', 'Pomodoro zamanlayici ve temel odak akisi.', 'focus', '/pomodoro', true, false, false, 'low', 20, true, true),
    ('tasks_basic', 'Temel Gorevler', 'Temel gorev listeleme ve durum yonetimi.', 'tasks', NULL, true, false, false, 'medium', 30, true, true),
    ('projects', 'Projeler', 'Proje ve temel proje ici planlama akisi.', 'planning', NULL, true, false, false, 'high', 40, true, true),
    ('habits', 'Aliskanliklar', 'Temel aliskanlik takibi.', 'habits', NULL, true, false, false, 'medium', 50, true, true),
    ('habit_stats', 'Aliskanlik Istatistikleri', 'Aliskanlik analiz ve istatistik alanlari.', 'habits', NULL, true, false, true, 'medium', 60, false, true),
    ('work_history_basic', 'Pomodoro Ici Sinirli Calisma Gecmisi', 'Pomodoro sayfasi icindeki sinirli calisma gecmisi.', 'work_history', '/pomodoro', true, false, false, 'low', 70, true, true),
    ('work_history_full', 'Tam Calisma Gecmisi', 'Tam calisma gecmisi sayfasi ve detayli liste.', 'work_history', '/work-history', true, false, true, 'medium', 80, false, true),
    ('advanced_stats', 'Gelismis Istatistikler', 'Gelismis dashboard ve calisma analitikleri.', 'stats', NULL, true, false, true, 'medium', 90, false, true),
    ('knowledge_base', 'Bilgi Merkezi', 'Notebook ve bilgi merkezi alanlari.', 'knowledge', NULL, true, false, true, 'high', 100, false, true),
    ('quick_notes', 'Anlik Notlar', 'Kisa not ve hizli bilgi kayitlari.', 'knowledge', NULL, true, false, true, 'high', 110, false, true),
    ('documents', 'Metin Belgeleri', 'Uzun form notlar ve metin dokumanlari.', 'knowledge', NULL, true, false, true, 'high', 120, false, true)
),
upserted_features AS (
  INSERT INTO public.app_features (
    feature_key,
    label,
    description,
    category,
    route_path,
    is_active,
    is_core,
    backend_enforcement_required,
    content_risk,
    display_order
  )
  SELECT
    feature_seed.feature_key,
    feature_seed.label,
    feature_seed.description,
    feature_seed.category,
    feature_seed.route_path,
    feature_seed.is_active,
    feature_seed.is_core,
    feature_seed.backend_enforcement_required,
    feature_seed.content_risk,
    feature_seed.display_order
  FROM feature_seed
  ON CONFLICT (feature_key) DO UPDATE
  SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    route_path = EXCLUDED.route_path,
    is_active = EXCLUDED.is_active,
    is_core = EXCLUDED.is_core,
    backend_enforcement_required = EXCLUDED.backend_enforcement_required,
    content_risk = EXCLUDED.content_risk,
    display_order = EXCLUDED.display_order,
    updated_at = now()
  RETURNING feature_key
)
INSERT INTO public.membership_feature_access (membership, feature_key, is_enabled)
SELECT access_seed.membership, access_seed.feature_key, access_seed.is_enabled
FROM (
  SELECT 'beginner'::text AS membership, feature_seed.feature_key, feature_seed.beginner_enabled AS is_enabled
  FROM feature_seed
  UNION ALL
  SELECT 'plus'::text AS membership, feature_seed.feature_key, feature_seed.plus_enabled AS is_enabled
  FROM feature_seed
) AS access_seed
ON CONFLICT (membership, feature_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_access_feature(target_feature_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_membership text;
  normalized_feature_key text := NULLIF(btrim(target_feature_key), '');
  has_access boolean := false;
BEGIN
  IF current_user_id IS NULL OR normalized_feature_key IS NULL THEN
    RETURN false;
  END IF;

  IF NOT public.can_use_app(current_user_id) THEN
    RETURN false;
  END IF;

  SELECT memberships.membership
  INTO current_membership
  FROM public.user_memberships AS memberships
  WHERE memberships.user_id = current_user_id
    AND memberships.status = 'active'
  LIMIT 1;

  IF current_membership IS NULL THEN
    RETURN false;
  END IF;

  SELECT true
  INTO has_access
  FROM public.app_features AS features
  JOIN public.membership_feature_access AS access
    ON access.feature_key = features.feature_key
  WHERE features.feature_key = normalized_feature_key
    AND features.is_active = true
    AND access.membership = current_membership
    AND access.is_enabled = true
  LIMIT 1;

  RETURN COALESCE(has_access, false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_feature_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_membership text;
  feature_keys jsonb := '[]'::jsonb;
  landing_path text := '/pomodoro';
BEGIN
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  IF NOT public.can_use_app(current_user_id) THEN
    RETURN jsonb_build_object('error', 'account_not_allowed');
  END IF;

  SELECT memberships.membership
  INTO current_membership
  FROM public.user_memberships AS memberships
  WHERE memberships.user_id = current_user_id
    AND memberships.status = 'active'
  LIMIT 1;

  IF current_membership IS NULL THEN
    RETURN jsonb_build_object('error', 'membership_not_found');
  END IF;

  SELECT COALESCE(
    jsonb_agg(features.feature_key ORDER BY features.display_order ASC, features.feature_key ASC),
    '[]'::jsonb
  )
  INTO feature_keys
  FROM public.app_features AS features
  JOIN public.membership_feature_access AS access
    ON access.feature_key = features.feature_key
  WHERE access.membership = current_membership
    AND access.is_enabled = true
    AND features.is_active = true;

  landing_path := CASE
    WHEN current_membership = 'plus' THEN '/'
    WHEN current_membership = 'beginner' THEN '/pomodoro'
    ELSE '/pomodoro'
  END;

  RETURN jsonb_build_object(
    'membership', current_membership,
    'features', feature_keys,
    'landing_path', landing_path
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_feature_access_matrix()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  matrix_items jsonb := '[]'::jsonb;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  IF NOT public.is_super_manager() THEN
    RETURN jsonb_build_object('error', 'insufficient_privilege');
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'feature_key', features.feature_key,
        'label', features.label,
        'description', features.description,
        'category', features.category,
        'route_path', features.route_path,
        'is_active', features.is_active,
        'is_core', features.is_core,
        'backend_enforcement_required', features.backend_enforcement_required,
        'content_risk', features.content_risk,
        'display_order', features.display_order,
        'beginner_enabled', COALESCE(beginner_access.is_enabled, false),
        'plus_enabled', COALESCE(plus_access.is_enabled, false)
      )
      ORDER BY features.display_order ASC, features.feature_key ASC
    ),
    '[]'::jsonb
  )
  INTO matrix_items
  FROM public.app_features AS features
  LEFT JOIN public.membership_feature_access AS beginner_access
    ON beginner_access.feature_key = features.feature_key
   AND beginner_access.membership = 'beginner'
  LEFT JOIN public.membership_feature_access AS plus_access
    ON plus_access.feature_key = features.feature_key
   AND plus_access.membership = 'plus';

  RETURN jsonb_build_object('items', matrix_items);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_feature(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_feature(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_feature(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_current_feature_access() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_feature_access() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_current_feature_access() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_feature_access_matrix() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_feature_access_matrix() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_feature_access_matrix() TO authenticated;
