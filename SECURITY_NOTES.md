# Security Notes

- The app currently has no admin/mentor/user role model. Route protection only checks whether a Supabase session exists.
- If role-based screens or privileged actions are added, client-side gates are not sufficient. Enforce roles with Supabase RLS policies, verified JWT claims, or server-side/Edge Function checks.
- Supabase auth sessions are persisted in browser storage for the current client flow. Do not store service-role keys or privileged tokens in the frontend, and keep user-controlled rich text/HTML away from unsafe DOM sinks.
- Email verification and password reset redirects should use the production `VITE_APP_URL` in deployed environments. The same URL must be allowlisted in Supabase Auth redirect settings.
