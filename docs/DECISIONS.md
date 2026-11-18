# DAYFLOW — Architectural Decisions

## ADR-001: Web-first App Router foundation

**Decision:** use Next.js App Router with TypeScript for the initial web product.

**Reason:** it provides server boundaries for secrets and integrations while retaining a responsive React UI. Native clients remain a later concern and consume shared API/domain contracts rather than web components.

## ADR-002: Supabase is the source of truth

**Decision:** persist user data in Supabase PostgreSQL with Auth, Storage and Row Level Security.

**Reason:** a planner cannot rely on browser storage for its key workflow. Local storage is allowed only for non-sensitive UI preference preview and offline queues; it is never the authoritative copy.

## ADR-003: AI proposes, users confirm

**Decision:** AI cannot mutate tasks, schedules or finances directly.

**Reason:** natural language is ambiguous and planning changes are consequential. Structured, editable proposals preserve control and prevent fabricated details from silently becoming commitments.

## ADR-004: Timestamp-derived timers

**Decision:** time sessions are append-friendly events with timestamps and pause/resume state, not a `setInterval` counter.

**Reason:** elapsed time remains correct through reloads, restarts and brief disconnections.

## ADR-005: Foundation contains no fictional records

**Decision:** dashboards and feature routes begin with empty/setup states rather than sample personal tasks, finances or health data.

**Reason:** it is honest about integration state and avoids mistaking demo data for a user’s life.

## ADR-006: Supabase SSR sessions and trigger-created identity records

**Decision:** use `@supabase/ssr` browser, server and middleware clients; create profiles and defaults through an Auth trigger.

**Reason:** request-boundary cookie refresh and an atomic trigger keep identity records consistent without exposing a service-role key. RLS remains the data boundary.
