# DAYFLOW

AI-powered life planner for calendar, tasks, time tracking, reminders, personal analytics, and everyday planning.

## Project status

Foundation is in progress. The project now contains a buildable, responsive application shell and documentation for the durable MVP. Authenticated user data is not implemented yet, so the shell intentionally contains no sample personal records.

## Product brief

See [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md) for the product vision, feature scope, visual direction, architecture proposal, MVP sequence, and initial acceptance criteria.

## Development approach

The first milestone is a web application that validates the core workflow:

1. Create and edit a task.
2. Place it on a calendar.
3. Mark it complete.
4. Track time spent.
5. Preserve state after reload.

The proposed stack is Next.js, React, TypeScript, and Supabase. The detailed implementation choices will be recorded as the architecture is established.

## Local development

1. Copy `.env.example` to `.env.local` and fill only the services needed for the phase you are working on. Never commit it.
2. Install dependencies with `npm install`.
3. Run `npm run dev` and open `http://localhost:3000`.
4. Before a change is handed off, run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.

The Foundation theme picker is deliberately a local, non-sensitive preview. It will be synced to `user_preferences` after Phase 2 authentication exists.

## Documentation

- [Product brief](docs/PRODUCT_BRIEF.md)
- [Technical specification](docs/TECHNICAL_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database plan](docs/DATABASE.md)
- [Roadmap](docs/ROADMAP.md)
- [Architecture decisions](docs/DECISIONS.md)

## Repository structure

```
src/                 application routes, components and feature modules
docs/                product, architecture and delivery documentation
supabase/            migrations (added in Phase 2)
tests/               integration and E2E tests (expanded per phase)
```
