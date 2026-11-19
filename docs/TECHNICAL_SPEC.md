# DAYFLOW — Technical Specification

**Version:** 1.0 · **Status:** Phase 2 implemented; Supabase project setup pending · **Updated:** 2026-11-18

## Scope and delivery principle

DAYFLOW starts as a responsive web application. The MVP validates one durable workflow: an authenticated user creates and edits a task, schedules it, tracks time, completes it, and sees the same state after a reload. Features outside that workflow are introduced only when their persistence, permissions, and error states are implemented.

No browser-only mock records are used as production data. Before Supabase is configured, UI states explicitly say that there is no data or that setup is required.

## Technology decisions

| Area | Choice | Responsibility |
| --- | --- | --- |
| Web | Next.js App Router, React, TypeScript | responsive application shell and server endpoints |
| Styling | Tailwind CSS plus CSS custom-property tokens | accessible, themeable UI |
| Validation | Zod and React Hook Form | input parsing at UI and API boundaries |
| Data | Supabase PostgreSQL, Auth, Storage, RLS | durable user-owned records |
| Client data | typed repository layer | no direct SQL or service role in the browser |
| AI | server-only OpenAI adapter with structured schemas | proposals, never unreviewed mutations |
| Tests | Vitest, Testing Library, Playwright | unit, integration, and end-to-end coverage |

## Functional boundary for MVP

Implemented progressively: authenticated identity; preferences and themes; projects; tasks, subtasks and statuses; calendar month/week/day placement; timestamp-based task sessions; manual task capture; and an AI text-capture proposal with explicit confirmation.

Voice, image extraction, push notifications, external calendars, finance, CRM, health, and native mobile features are deliberately deferred until their required providers, permissions, and server paths exist.

## Core invariants

1. Every user-owned row has an `owner_id` linked to `auth.users(id)` and RLS checks it.
2. Browser code uses the Supabase anonymous key only. Service role and third-party secrets remain server-only.
3. All writes validate input, use UUID identifiers, carry timestamps, and accept an idempotency key where retries could duplicate a result.
4. AI returns validated proposals. A user-visible confirmation invokes normal domain services to persist a change.
5. Timer elapsed time is derived from persisted session timestamps and pause intervals, never solely from an in-memory counter.
6. Times are stored as `timestamptz`; user timezone is a named IANA zone in preferences.
7. Deletion of user-created information requires an explicit confirmation; files are authorization-scoped.

## Authentication and preferences

Email/password sign-up, sign-in, sign-out, verification callback and password recovery use Supabase SSR cookies. Middleware refreshes sessions and redirects unauthenticated app requests to `/auth/sign-in`; auth routes remain public. Registration creates the profile and Russian default preferences (`sage`, Monday, 24-hour time) via a database trigger. Authenticated theme changes use a validated server route; local theme storage is only an unauthenticated preview fallback.

## External services and configuration

| Service | Required for | Variables / setup |
| --- | --- | --- |
| Supabase | auth, database, storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, server service-role key |
| OpenAI | AI capture/planning, transcription, vision | server-only `OPENAI_API_KEY`; usage limits and audit logs |
| Google OAuth/Calendar | optional calendar sync | OAuth client, redirect URI, encrypted refresh-token handling |
| Web Push | supported web reminders | VAPID key pair, service worker, browser permission |
| APNs / FCM | future native notifications | native projects and provider credentials |
| HealthKit / Health Connect | future native health import | native permission flows; unavailable in web-only MVP |

All names are supplied in `.env.example`; no key, private user file, or OAuth token belongs in Git.

## Quality gates

Each phase must pass TypeScript checking, linting, production build, relevant migration validation, and tests. Key end-to-end scenarios cover task lifecycle, calendar visibility, subtask state, timer restoration, theme persistence, AI confirmation and duplicate handling, and RLS isolation.
