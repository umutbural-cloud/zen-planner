-- V1-B6b-1.5 data correction: normalize existing pre-restriction members.
-- Existing pre-restriction members are normalized to plus to preserve access
-- parity before feature restrictions are enabled. New signups remain beginner
-- through the existing default and trigger behavior.

UPDATE public.user_memberships AS memberships
SET
  membership = 'plus',
  updated_at = now(),
  updated_by = NULL
FROM auth.users AS users
WHERE users.id = memberships.user_id
  AND users.created_at <= '2026-05-22 15:30:38+00'::timestamptz
  AND memberships.membership = 'beginner';
