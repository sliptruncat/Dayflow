# DAYFLOW — Delivery Roadmap

## Phase 1 — Foundation (complete)

**Outcome:** a buildable, responsive Next.js shell with design tokens, navigation, theme preference persistence and explicit empty states. It does not claim persistence for user data until Supabase exists.

- Establish TypeScript, Tailwind, lint, and unit-test configuration. End-to-end coverage is not implemented yet.
- Implement shared layout and responsive navigation for all product areas.
- Add the three starting token themes and local preview preference.
- Document security boundaries, architecture, services and decisions.

## Phase 2 — Identity and durable data (implementation complete; verification pending)

**Outcome:** a user can authenticate and safely store their profile and preferences.

- Add Supabase clients and auth screens.
- Create initial migrations, indexes, constraints, RLS and storage policies.
- Add typed repositories and a documented manual protocol for cross-user isolation.

Still required before production use: configure an isolated Supabase project, apply the migration, and execute the two-user RLS protocol. The RLS protocol and SQL timezone checks are not automated in CI because they require an isolated Supabase database.

## Phase 3 — Calendar

**Outcome:** user-owned tasks and events persist and render in responsive year, month, week and day views.

- Review [Calendar technical specification](CALENDAR_SPEC.md) before changing the schema.
- Add an append-only calendar migration for categories, tasks, events and month-cover metadata, with constraints, indexes, RLS and isolated two-user verification. **Implemented in code; isolated Supabase verification remains required.**
- Update typed database contracts and add a rollback-only SQL test for calendar constraints and two-user isolation. **Implemented in code; execution requires isolated Supabase.**
- Add typed repositories, validated APIs and range queries that derive ownership from the session.
- Build year, month, week and day views; support category colours, deadlines, explicit task completion and confirmed deletion.
- Add responsive, keyboard-accessible UI states and unit/integration coverage. Add E2E coverage when the runner is introduced.
- Defer project membership, subtasks, timer sessions, cover uploads/generation and external calendar synchronization to their respective phases.

## Phase 4 — Sharing & Collaboration

**Outcome:** users can explicitly share calendars or workspaces by email without exposing personal records by default.

- Review [Sharing & Collaboration technical specification](SHARING_COLLABORATION_SPEC.md) before changing Phase 3 ownership or RLS.
- Complete implementation review of the [Phase 4 database design](PHASE4_DATABASE_DESIGN.md) before writing the append-only migration.
- Introduce append-only workspaces, calendars, memberships and invitation tables; backfill existing Phase 3 records into private personal calendars.
- Implement one immutable resource owner per calendar/workspace, explicit ownership transfer, last-owner protection and membership provenance.
- Implement owner/editor/viewer RLS through server-side membership checks, calendar-scoped category integrity, hardened SECURITY DEFINER helpers and isolated multi-user tests.
- Add POST-body invitation acceptance, separate pending-invite revocation/member removal, role changes, calendar/workspace sharing indicators, assignments and comments.
- Use the staged additive-schema → personal-calendar backfill → integrity validation → RLS switch → application update rollout defined in the sharing specification.
- Use a provider-agnostic, resumable checkpointed worker outside the migration transaction; add account-deletion, personal-to-shared conversion, 24-month technical audit-retention baseline and editor soft-delete/owner-restore flows before enabling sharing.
- Defer production migration until a separate review approves the backfill and authorization test matrix.

## Phase 5 — Tasks and projects

**Outcome:** build on shared-capable Phase 3 tasks with subtasks, filters, search, attachments and richer lifecycle workflows.

## Phase 6 — Time tracking

**Outcome:** timestamp-derived task sessions persist and recover correctly after reload.

## Phase 7 — Personalization

**Outcome:** preferences sync to the user profile; month-cover uploads are authorized storage objects.

## Phase 8 — AI capture

**Outcome:** text, then audio and image extraction yield editable, deduplicated proposals confirmed by the user.

## Phase 9 — Planner and check-ins

**Outcome:** transparent rule-based suggestions, conflict detection and confirmation-led rescheduling.

## Phase 10 — Notifications and analytics

**Outcome:** permission-aware reminders and factual reports from persisted data.

## Phase 10A — Personal planner extensions (implemented locally; deployment pending)

**Outcome:** private Inbox capture, goals, reminder scheduling records and factual analytics.

- Add owner-scoped Inbox capture, status changes and archive/delete actions.
- Add owner-scoped goals with target dates, progress and lifecycle states.
- Add task reminder records with future-time validation, a dedicated reminder management screen, and dismissal/cancellation API.
- Add factual analytics derived from persisted tasks, focus sessions, goals and reminders.
- Add migration `202611190005_inbox_goals_reminders.sql` and an isolated RLS test.
- Still required: apply migrations 002–005 in order to the intended Supabase project after reviewing the SQL, add an authorized delivery worker/browser notification permission flow, and run isolated database plus end-to-end tests. A scheduled reminder record is not yet a delivered push notification.
- Inbox, goals, reminders and assistant capture have dedicated local UI/API paths. The assistant does not yet call an AI model; it explicitly saves prompts to Inbox rather than fabricating AI output.
- Finance, CRM/contacts and health remain planned extensions; current navigation entries are informational placeholders, not working data modules.

## Phase 11 — Extended modules

**Outcome:** finance, CRM, health adapters, gamification and external integrations are added behind their permission and data contracts.
