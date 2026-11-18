# DAYFLOW — Architecture

## System shape

```text
Browser UI (feature components)
        │ validated forms / queries
        ▼
Next.js route handlers and server actions
        │ domain services + authorization
        ├──────────────► Supabase Auth / PostgreSQL / Storage
        └──────────────► server-only integration adapters (OpenAI, Calendar, Push)
```

The database is the source of truth. The UI never accesses a service-role client and integrations never execute arbitrary SQL.

## Proposed source layout

```text
src/
  app/                 routes, layouts, route handlers
  components/          reusable presentational components
  features/            task, calendar, timer, theme feature modules
  lib/                 clients, utilities, configuration
  server/              domain services, repositories, integration adapters
  types/               shared domain types
  styles/              token and global styles
supabase/
  migrations/          ordered SQL migrations and RLS policies
  seed.sql              development-only seed, never production personal data
tests/                 unit, integration and browser tests
```

## Data and authorization flow

1. Auth resolves a session on the server or through the public Supabase client.
2. A feature validates its command with Zod.
3. A domain service confirms ownership and business rules, then calls a repository.
4. PostgreSQL constraints and RLS apply a second ownership boundary.
5. The service returns typed success or a safe error; UI renders loading, error, empty, and offline-aware states.

## AI safety boundary

An AI adapter receives only the minimum task context for an operation and produces a schema-validated proposal. The UI displays editable fields and the user confirms. Confirmation passes through the same task service as manual creation. Requests record provider, model, token/cost metadata, outcome and non-sensitive error details; raw private prompts are retained only when a user-controlled retention policy permits it.

## Offline direction

The Foundation isolates commands so a later outbox can store `idempotency_key`, payload, local timestamp and retry status. On reconnect, commands replay in order and server `updated_at` / version checks surface conflicts for the user rather than silently overwriting data. Timer events are timestamped before enqueueing.

## Responsive and accessibility policy

Desktop uses a persistent sidebar. Mobile uses a compact header and bottom navigation. Interactive elements have keyboard focus states and labels; dialogs trap focus and dangerous actions require confirmation. Semantic headings, minimum contrast and reduced-motion support are baseline requirements.
