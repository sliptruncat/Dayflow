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

## Phase 4 — Tasks and projects

**Outcome:** build on Phase 3 tasks with project assignment, subtasks, filters, search, attachments, comments and richer lifecycle workflows.

## Phase 5 — Time tracking

**Outcome:** timestamp-derived task sessions persist and recover correctly after reload.

## Phase 6 — Personalization

**Outcome:** preferences sync to the user profile; month-cover uploads are authorized storage objects.

## Phase 7 — AI capture

**Outcome:** text, then audio and image extraction yield editable, deduplicated proposals confirmed by the user.

## Phase 8 — Planner and check-ins

**Outcome:** transparent rule-based suggestions, conflict detection and confirmation-led rescheduling.

## Phase 9 — Notifications and analytics

**Outcome:** permission-aware reminders and factual reports from persisted data.

## Phase 10 — Extended modules

**Outcome:** finance, CRM, health adapters, gamification and external integrations are added behind their permission and data contracts.
