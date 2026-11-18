# DAYFLOW — Database Plan

The database is introduced in Phase 2 through ordered migrations. All user-owned tables use UUID primary keys, `owner_id uuid not null references auth.users(id) on delete cascade`, `created_at timestamptz not null default now()`, and `updated_at timestamptz not null default now()` unless documented otherwise.

## Initial table groups

| Group | Tables | Notes |
| --- | --- | --- |
| Identity and preferences | `profiles`, `user_preferences`, `themes`, `month_covers` | profile ID maps 1:1 to `auth.users`; custom themes and covers are owner-scoped |
| Planning | `projects`, `project_members`, `tasks`, `subtasks`, `calendar_events`, `task_dependencies`, `task_reminders` | task dates use `timestamptz`; user timezone remains in preferences |
| Activity | `task_sessions`, `task_comments`, `task_attachments`, `inbox_items`, `check_ins` | session timestamps enable recoverable timers |
| Relationships | `contacts`, `contact_interactions` | external message delivery is never stored as an assumed success |
| Extended data | `financial_transactions`, `budgets`, `health_records` | introduced only after their respective consent and validation rules |
| AI, notifications, pet | `ai_conversations`, `ai_messages`, `notification_logs`, `pet_profiles`, `pet_experience_events` | least-sensitive metadata and user-controlled retention |

## Required constraints and indexes

- Enums or checked values for task status (`inbox`, `planned`, `in_progress`, `paused`, `completed`, `cancelled`) and priority model fields.
- `tasks(owner_id, start_at)`, `tasks(owner_id, deadline_at)`, `tasks(owner_id, status)`, `calendar_events(owner_id, starts_at)`, and `task_sessions(task_id, started_at)` indexes.
- Non-negative estimated and actual durations; `ends_at >= starts_at`; one profile and one preference row per user.
- Attachment metadata references a private storage path, never a public bucket URL by default.
- Mutation commands include a scoped idempotency key where network retries could produce a duplicate.

## Row Level Security baseline

RLS is enabled on every exposed table. The minimum policy is `owner_id = auth.uid()` for select, insert, update and delete, with `WITH CHECK (owner_id = auth.uid())` on writes. Join tables additionally verify ownership of their parent record. Storage policies derive the owner from the first path segment or verified metadata. The service role is used only in trusted server operations and is never sent to the client.

## Migration protocol

Migrations are append-only SQL files under `supabase/migrations/`. Each migration adds constraints, indexes, RLS enablement and policies in the same change. A migration is tested against a local Supabase instance before deployment and checked with a two-user isolation test.
