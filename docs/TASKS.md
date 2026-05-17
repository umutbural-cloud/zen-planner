# Tasks

## Current Working Notes

- Keep existing uncommitted work intact unless the user explicitly asks to revert it.
- Before implementing new modules, check `git status --short`.
- Prefer small, scoped changes over broad refactors.

## Bug Tracker Module Plan

1. Analyze existing module integration points.
2. Add a dedicated Supabase migration for bug tracker tables.
3. Add TypeScript types for bug records.
4. Add a `useBugs` hook using the current `useAuth` pattern.
5. Build a mobile-first bug tracker view using existing UI/card patterns.
6. Add the module to sidebar preferences, labels, and startup settings if needed.
7. Render the module from `Index.tsx`.
8. Run `npm run build`.
9. Report unrelated lint failures separately if the repo lint baseline is already failing.

## Suggested Bug Fields

- Title
- Description
- Status
- Severity
- Priority
- Area or module
- Steps to reproduce
- Expected result
- Actual result
- Assignee text or owner text
- Due date
- Position
- Soft delete timestamp

## Verification Checklist

- Build succeeds.
- New module appears in the sidebar.
- Create, edit, filter, and delete flows work.
- Empty state works.
- Mobile layout remains usable.
- Supabase RLS policies restrict rows to the owner.
