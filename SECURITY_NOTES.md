# Security Notes

- The app currently has no admin/mentor/user role model. Route protection only checks whether a Supabase session exists.
- If role-based screens or privileged actions are added, client-side gates are not sufficient. Enforce roles with Supabase RLS policies, verified JWT claims, or server-side/Edge Function checks.
- Supabase auth sessions are persisted in browser storage for the current client flow. Do not store service-role keys or privileged tokens in the frontend, and keep user-controlled rich text/HTML away from unsafe DOM sinks.
- Supabase sessions are stored in `localStorage`, so any XSS issue increases token exposure risk. CSP, rich-text URL validation, import file limits, and dependency freshness are priority controls.
- Location data is sensitive personal data. For third-party APIs such as prayer time providers, users should be clearly told when coordinates are sent to an external service; prefer city-level data or rounded coordinates where possible.
- Email verification and password reset redirects should use the production `VITE_APP_URL` in deployed environments. The same URL must be allowlisted in Supabase Auth redirect settings.

## Environment Variable Hygiene

- Real environment values must only be stored in Vercel Environment Variables or local untracked `.env` files.
- Manage Production, Preview, and Development environment variables separately in Vercel. Do not assume Preview can safely reuse Production values.
- Keep `.env` and `.env.*` out of git. Keep `.env.example` tracked with placeholders only.
- If a Supabase anon/publishable key is treated as leaked, evaluate rotating the key and updating every deployed environment.
- Never put the Supabase service role key in client code, `.env.example`, or the repository.

## Pre-Push Manual Checklist

- Confirm Vercel has the required environment variables configured separately for Production, Preview, and Development.
- Confirm local `.env` and `.env.local` remain untracked.
- Confirm Supabase Auth redirect URL allowlist is narrowed to the exact production, preview, and local callback origins that are actually needed.
- Confirm no service role key is present in client-side environment variables or repository files.
- If any real Supabase URL/key was previously committed or shared externally, consider it exposed and evaluate key rotation before shipping.
