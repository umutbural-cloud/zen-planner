# Architecture

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives in `src/components/ui`
- Supabase for auth, database, and row-level security

## Application Structure

- `src/pages` contains top-level routed pages.
- `src/components` contains shared and module-level UI used by pages.
- `src/hooks` contains shared data and state hooks.
- `src/features` contains larger feature areas with local components, hooks, and types.
- `src/integrations/supabase` contains the Supabase client and generated database types.
- `supabase/migrations` contains SQL migration files.

## State Model

Global page selection is handled through `usePageState`.

The main workspace route renders module content based on the active `section`. Project views are selected separately through `ViewKey`.

## Auth Model

Authentication is owned by the existing Supabase auth integration and `useAuth`. Feature modules should consume the current user from `useAuth`; they should not create, replace, or fork auth behavior.

## Data Access Pattern

Feature hooks generally:

- Read `user` from `useAuth`.
- Query Supabase tables filtered by `user_id`.
- Keep local optimistic state for responsive updates.
- Use soft deletion when the module needs trash support.
- Return a compact API to the UI component, such as `items`, `loading`, `createItem`, `updateItem`, and `deleteItem`.

## UI Integration Pattern

Modules are typically integrated by:

- Extending the `Section` union.
- Adding sidebar visibility and label metadata.
- Adding a sidebar menu entry.
- Rendering the module component in `src/pages/Index.tsx`.
- Updating startup-page settings when the module can be selected at launch.

## Migration Pattern

Each database change should be a separate timestamped SQL file under `supabase/migrations`.

Recommended migration contents:

- Table creation.
- Indexes.
- Row-level security enablement.
- Select, insert, update, and delete policies scoped to `auth.uid() = user_id`.
- Updated-at triggers where the table has `updated_at`.
