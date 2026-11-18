# DAYFLOW — Delivery Roadmap

## Phase 1 — Foundation (current)

**Outcome:** a buildable, responsive Next.js shell with design tokens, navigation, theme preference persistence and explicit empty states. It does not claim persistence for user data until Supabase exists.

- Establish TypeScript, Tailwind, lint, unit-test and E2E-test configuration.
- Implement shared layout and responsive navigation for all product areas.
- Add the three starting token themes and local preview preference.
- Document security boundaries, architecture, services and decisions.

## Phase 2 — Identity and durable data

**Outcome:** a user can authenticate and safely store their profile and preferences.

- Add Supabase clients and auth screens.
- Create initial migrations, indexes, constraints, RLS and storage policies.
- Add typed repositories and integration tests for cross-user isolation.

## Phase 3 — Calendar

**Outcome:** real tasks and events render in year, month, week and day views; date changes persist.

## Phase 4 — Tasks and projects

**Outcome:** task lifecycle, task drawer, subtasks, project assignment, filters, search and safe deletion work against the database.

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
