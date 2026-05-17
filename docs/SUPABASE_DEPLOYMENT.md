# Supabase Deployment Checklist

## 1. Create and link the project

Create a Supabase project, then install and authenticate the Supabase CLI if it is not already installed.

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref vfdjirbdbbldjyrmhhck
```

If you created a different Supabase project, replace `vfdjirbdbbldjyrmhhck` with the new project ref and update `supabase/config.toml`.

## 2. Push database migrations

Run this from the repository root:

```bash
supabase db push
```

This applies every SQL file under `supabase/migrations`, including the schema completion migration that adds missing note title, reminder, notification, push subscription, foreign key, RLS, and index coverage.

## 3. Configure frontend environment

Create `.env.local` with values from Supabase Project Settings > API:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

Do not put the service role key in the frontend.

## 4. Configure auth redirects

In Supabase Dashboard > Authentication > URL Configuration:

- Site URL: your deployed frontend URL.
- Redirect URLs:
  - `http://localhost:8080/reset-password`
  - your deployed `/reset-password` URL.

The app uses Supabase Auth for sign in, sign up, password reset, and password update.

## 5. Regenerate types after push

After migrations are applied, refresh generated database types:

```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

Then run:

```bash
npm run build
```

## 6. Production checks

Before using real data:

- Confirm Row Level Security is enabled on all public user-data tables.
- Confirm `user_id` policies use `auth.uid() = user_id`.
- Create a test user and verify project, task, note, habit, Pomodoro, journal, notebook, import, and export flows.
- Keep `supabase/migrations` as the source of truth for future schema changes.
