-- Keep table access explicit. Future tables must opt in with a targeted GRANT
-- and RLS policies instead of inheriting authenticated CRUD access by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM authenticated;
