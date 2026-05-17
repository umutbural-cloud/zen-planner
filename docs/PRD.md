# Product Requirements Document

## Product

Zen Planner is a personal planning workspace for projects, tasks, notes, habits, focus sessions, journal entries, notebooks, and supporting modules.

## Goals

- Keep daily planning, project execution, knowledge capture, and work tracking in one authenticated workspace.
- Use Supabase as the backend for user-owned data.
- Preserve a mobile-first interface that remains usable on narrow screens.
- Keep modules independent enough that new modules can be added without changing authentication or unrelated flows.

## Core Users

- Individual users managing personal projects, daily tasks, focus sessions, habits, and notes.
- Users who need a lightweight workspace that combines planning and knowledge management.

## Existing Modules

- Projects with notes, table, Gantt, Kanban, and calendar views.
- Backlog / Heybe.
- Journal.
- Habits.
- Pomodoro and work history.
- Knowledge notebooks / Defterim.
- Trash.
- User settings and sidebar preferences.

## New Module Expectations

When adding a module, it should:

- Use the existing authenticated user context.
- Store module data in Supabase tables protected by row-level security.
- Add migrations as separate SQL files under `supabase/migrations`.
- Integrate through the existing page state and sidebar module patterns.
- Avoid new dependencies unless explicitly approved.
- Reuse existing UI primitives and card structure.

## Non-Goals

- Replacing the auth system.
- Adding a second backend or client-side-only persistence for primary data.
- Introducing large design-system rewrites while adding a feature module.

## Acceptance Criteria

- Users can access enabled modules from the sidebar.
- Data belongs to the signed-in user only.
- Primary workflows work on mobile and desktop.
- Build passes before delivery.
- Known lint failures unrelated to the change are documented when applicable.
