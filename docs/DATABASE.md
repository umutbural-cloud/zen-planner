# Database

## Backend

The project uses Supabase as the only backend for persisted application data.

## Migration Location

All migrations live in:

```text
supabase/migrations
```

Each database change should be added as a separate SQL migration file.

## Auth Ownership

Tables that store user data should include `user_id uuid NOT NULL` and use row-level security policies based on:

```sql
auth.uid() = user_id
```

## Common Table Shape

Most user-owned tables should include:

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- `deleted_at timestamptz` when soft deletion is needed
- `position integer NOT NULL DEFAULT 0` when manual sorting is needed
- `stable_export_id uuid` when participating in export/import flows

## RLS Pattern

Recommended policies:

```sql
ALTER TABLE public.example_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own example rows"
ON public.example_table FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users create own example rows"
ON public.example_table FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own example rows"
ON public.example_table FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own example rows"
ON public.example_table FOR DELETE
USING (auth.uid() = user_id);
```

## Relationship Ownership

Parent references that cross user-owned tables must also preserve tenant ownership.
`projects.parent_id` and `notebooks.parent_id` are protected by same-user triggers.
The parent ownership migration runs preflight checks and stops without changing data
if orphan or cross-user parent rows already exist.
The triggers block self-parent references, but they do not perform full recursive
cycle detection; handle deeper hierarchy cycles as a separate migration if needed.

## Indexing

Add indexes for common filters:

- `user_id`
- `deleted_at`
- foreign keys such as `project_id`, `notebook_id`, or parent IDs
- status or priority fields when frequently filtered

## Type Generation

After schema changes, update `src/integrations/supabase/types.ts` to reflect the new table shape if generated types are not refreshed automatically.
