# DAYFLOW — Calendar implementation status and technical notes

**Last reviewed:** 24 November 2026  
**Status:** Phase 3 calendar foundation is implemented; schedule correctness improvements are in progress on `feature/calendar-schedule-correctness`.

This document describes the current repository implementation and the remaining work. It replaces the earlier planned-only status, which no longer reflected the shipped calendar and database migrations.

## Implemented

- Owner-scoped calendar schema and RLS are present in `supabase/migrations/202611190001_calendar_and_tasks.sql`.
- Task, event and category repositories/API routes are implemented.
- Calendar UI includes year, month, week and day views.
- Tasks and calendar events are loaded from Supabase for the authenticated user; subtasks are hydrated in both Tasks and Calendar.
- Month/day grouping uses the profile's IANA timezone.
- All-day events are separated from timed events.
- The schedule correctness branch introduces timezone-aware hour slots, including 23/25-hour days on daylight-saving transitions, and shows events in every hour they overlap.
- Existing SQL isolation tests and timezone validation tests run in CI against a temporary local Supabase stack.

## Schedule rendering contract

- Calendar dates are date keys (`YYYY-MM-DD`) in the profile timezone.
- Event timestamps are stored as instants (`timestamptz`) and must be formatted and bucketed in the profile timezone, never by reading UTC hour fields directly.
- A local calendar day may contain 23, 24 or 25 elapsed hours. The schedule grid must derive its slots from the instant at local midnight to the next local midnight.
- Timed event intervals are half-open: `[starts_at, ends_at)`. An event appears in every hour slot it overlaps; an event ending exactly at a slot boundary does not appear in the following slot.
- Concurrent events must remain individually visible and actionable.
- All-day events and task deadlines are shown in a separate all-day/agenda lane.
- Multi-day events appear on every local date they overlap.

## Known limitations / next work

1. The calendar page currently loads the user's full task and event collections rather than requesting a bounded visible date range. Add a range-aware repository/API contract before the dataset grows.
2. The week/day schedule currently uses hourly segments for display; minute-accurate vertical positioning and drag-to-reschedule are not implemented.
3. DST ambiguity in a user-entered local time (the repeated hour when clocks move backward) needs an explicit product decision and UI treatment. Nonexistent local times during the spring-forward gap must not be silently converted to a different time.
4. Browser end-to-end coverage for creating, editing and verifying calendar items across timezone changes is still outstanding.
5. Locale-specific week-start preferences and configurable all-day/task lane behavior remain future improvements.

## Safety and release boundaries

- User-owned data must remain scoped to the authenticated owner and protected by RLS.
- Do not trust a browser-supplied owner ID or unvalidated timezone.
- Do not apply migrations or modify Production data as part of calendar UI work.
- Validate database migrations and SQL tests only against disposable local/isolated Supabase infrastructure in CI.
- A feature branch is not a release: merge only after CI, Preview and user verification.
