# DAYFLOW

DAYFLOW is a personal planning workspace built with Next.js, React, TypeScript and Supabase. Each account has private tasks, events, notes, goals and progress. The application uses Supabase Row Level Security as a second ownership boundary in addition to server-side session checks.

## Current implementation

- Supabase authentication and user preferences.
- Personal tasks, categories, subtasks, events and calendar views.
- Focus sessions, XP progression, companion stages and achievements.
- Inbox capture with processing and archive states.
- Goals with target dates and editable progress.
- Task reminder scheduling records and reminder management API.
- Factual analytics based on saved tasks, focus sessions, goals and reminders.

## Requirements

- Node.js 20+
- A Supabase project

## Local setup

1. Install dependencies: `npm ci`
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
4. Start the development server: `npm run dev`.

## Database migrations

Migrations are append-only and must be applied in order in an isolated or explicitly approved Supabase project. Do not use `supabase db reset` against a project containing user data. Migration `202611190005_inbox_goals_reminders.sql` adds the planner extension tables. The migration is included in the repository but is not assumed to be applied to any remote project.

## Verification

Run `npm run lint`, `npm run typecheck`, and `npm test`. SQL isolation tests in `supabase/tests` require an isolated Supabase database. Production readiness additionally requires end-to-end tests, reminder delivery infrastructure, deployment environment configuration and a reviewed migration rollout.

## Security notes

- Never commit `.env.local`, Supabase credentials or `supabase/.temp`.
- User ownership is derived from the authenticated Supabase session, never from request payloads.
- All new personal tables enable RLS and restrict access to `auth.uid()`.
- Reminder records are stored durably; delivery to browser, email or push channels requires a separately authorized worker and explicit notification permission.
