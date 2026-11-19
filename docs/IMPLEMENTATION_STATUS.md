# DAYFLOW implementation status

This document distinguishes local code from cloud deployment. A page rendering successfully does not by itself prove that its database-backed actions are available.

## Implemented in this source tree

- Authentication shell, user profile/preferences and three theme palettes.
- Calendar, task and event workflows; categories and subtasks.
- Focus sessions, progression/XP, achievements and companion-stage calculation.
- Inbox capture, status changes (open/processed/archived), restore and delete.
- Goals with target date, progress and active/completed/paused lifecycle.
- Task reminder scheduling and cancellation. The current implementation stores reminder schedules; it does not deliver push/email notifications on its own.
- Factual analytics from saved tasks, focus sessions, goals and reminder rows.
- Assistant capture flow that saves a prompt into Inbox. It does not call an AI model until a server-side OpenAI key and AI endpoint are configured.

## Intentionally not represented as finished

- Finance, contacts/CRM and health integrations remain planned extensions. Their navigation entries are informational placeholders.
- Push notifications/email delivery require a trusted scheduled worker and provider configuration.
- Voice/image task extraction, calendar synchronization and native iOS/Android integrations are not implemented.
- The assistant does not fabricate model output; it clearly offers Inbox capture until AI is configured.

## Database deployment state

The development history for this repository records migrations `202611180001_identity_and_preferences.sql` and `202611190001_calendar_and_tasks.sql` as applied to the connected Supabase project. Migrations `202611190002_phase4a_database_foundation.sql` through `202611190005_inbox_goals_reminders.sql` are local pending migrations and must not be assumed present in the cloud database.

Before applying pending migrations, review them as a single ordered set against the target Supabase project and take a database backup. Apply only after explicit approval. Never use `supabase db reset` against the existing project.

## Local verification

Run from the repository root:

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

A successful local build does not replace isolated Supabase RLS tests or a two-account end-to-end check. Do not include `.env.local`, `.git`, `node_modules` or `.next` in source archives.
