# DAYFLOW — Product Brief

**Version:** 1.0  
**Status:** Product definition / initial development baseline

## 1. Product vision

DAYFLOW is a cross-platform AI life planner for organizing work, study, personal life, health, finances, relationships, and rest in one place. It combines a calendar, task manager, time tracker, reminders, AI assistant, personal analytics, and lightweight gamification.

The product should reduce the effort required to capture plans and maintain a realistic schedule. The user remains in control: AI can suggest and prepare changes, while important rescheduling, deletion, and other consequential actions require confirmation.

## 2. Target platforms

- Web application for the first development and validation stage.
- iOS and Android applications, including support for iPhone and Samsung/Android devices.
- Desktop browser access.

The web application is the first implementation target. Native integrations that require platform APIs will be added in the mobile applications.

## 3. Main product areas

### Calendar
- Year view with all 12 months and individual month cover images.
- Month view with a calendar grid; selecting a date opens its detailed agenda.
- Week and day views.
- Tasks can be marked complete from the calendar.
- Month images can be uploaded by the user or generated from a prompt.
- Customizable themes, including per-month themes.

### Sharing and collaboration
- Share one calendar or a workspace of calendars with authenticated users by email.
- Roles are owner (calendar and member control), editor (shared task/event creation and editing), and viewer (read-only).
- Each calendar has one immutable resource owner; workspace ownership never grants ownership of another user's personal calendar. Ownership transfer and last-owner removal use an explicit confirmed flow.
- Invitations use a one-time token, verified confirmed email and server-side acceptance. Pending invite revocation and active-member removal are separate actions.
- Private records remain private until explicitly moved or copied into a shared calendar.
- Workspace membership reaches only calendars explicitly attached to that workspace; personal calendars remain private. Editors may soft-delete shared tasks/events, while owners can restore them.
- Shared tasks can later have assignees, responsible participants and comments for collaborative planning.
- Account deletion preserves shared history with anonymized authors where lawful; targeted content erasure and the 24-month access-audit baseline remain subject to legal confirmation before production.
- Family, friends and work are workspace types with the same explicit permission model, not implicit access to a user's private life.

### Tasks and projects
A task can contain:
- Title and description.
- Subtasks / mini checklist.
- Contact or responsible person, with phone, Telegram handle, or email.
- Deadline, priority, and estimated duration.
- Reminder settings.
- Attachments, source screenshot, comments, and change history.
- Linked tasks and recorded actual time.

Tasks are organized across work, study, personal life, friends and family, home, health, finance, hobbies, and rest.

### AI capture and planning
- Add tasks manually, by voice, or from screenshots.
- Extract structured task details from voice and images.
- Ask follow-up questions when essential details are missing.
- Detect possible duplicates.
- Suggest a schedule and priority order.
- Consider deadlines, urgency, importance, complexity, dependencies, and deferred tasks.
- Do not invent missing details or silently make consequential changes.

### Time tracking
- Start, pause, resume, finish, and interrupt a task.
- Calculate active time from timestamps rather than relying on a continuously running timer.
- Preserve timer state across app closure and offline periods.
- Compare estimated and actual duration.
- Gradually adapt estimates after several similar completed tasks.

### Smart notifications
- Configurable reminders: minutes or hours before a task, days before, at the deadline, custom times, and repeat-until-complete options.
- Work, rest, sleep, do-not-disturb, and vacation modes.
- Morning briefing and evening summary.
- On iOS, do not depend on a guaranteed first-unlock event; use scheduled notifications and refresh on app open.

### AI Check-in
- Morning, midday, and evening check-ins.
- Voice or text updates.
- Review completed and incomplete tasks.
- Capture new tasks and sort the inbox.
- Propose schedule adjustments for user approval.

### Inbox
A place for voice notes, screenshots, ideas, unclear requests, and tasks without dates. AI can suggest classification and next steps. It must not silently delete inbox items.

### Finance
- Track fees, event revenue, contractor costs, advertising spend, expenses, and profit.
- Record expected and actual payments.
- Calculate hourly cost and project/event financial results.
- Connect financial entries with a calendar.

### CRM
- Contacts and interaction history.
- Message templates.
- Follow-up reminders.
- Links between contacts, projects, and tasks.

### Health and sleep
- Integrate Apple Health / HealthKit on supported iOS devices.
- Integrate Android Health Connect and compatible Samsung Health data where available.
- Display sleep duration, schedule, available sleep phases, and trends.
- Request permissions explicitly and only show data that the user has authorized.

### Gamification
A virtual dinosaur grows through stages: egg, baby, teen, and adult. Experience can be earned through task completion, focus sessions, and meeting deadlines. The system should encourage recovery and consistency without punishing illness, rest, or difficult periods.

### Analytics
- Task completion and overdue rates.
- Deferrals and changes to plans.
- Estimated versus actual time.
- Productive hours and schedule patterns.
- Sleep trends when health data is connected.
- Financial results.
- Weekly and monthly summaries with actionable observations.

## 4. Visual direction

The interface should support three initial palette directions:
- Sage Green & Banana.
- Griotte & Ice Blue.
- Seafoam & Magenta.

Users should be able to customize backgrounds and interface elements, save themes, and assign themes to individual months. Calendar presentation should support an expressive year overview and a clear, practical monthly grid. Reference images supplied during product definition are part of the visual direction and should be consulted during UI implementation.

## 5. Product principles

1. **User control:** AI proposes; the user approves consequential changes.
2. **No fabricated data:** missing details are requested or left explicitly unknown.
3. **Reliable persistence:** tasks, timer state, and preferences survive restarts and offline periods.
4. **Realistic planning:** estimates and schedules adapt to observed behavior.
5. **Protected personal time:** work planning must not consume all available time.
6. **Gentle gamification:** no punitive mechanics around rest, illness, or missed days.
7. **Privacy by design:** health, finance, and contact data require careful permissions and access controls.

## 6. Suggested technical direction

Initial architecture proposal:
- Web: Next.js, React, and TypeScript.
- Mobile: React Native with Expo, with native modules where platform APIs are required.
- Backend and persistence: Supabase, PostgreSQL, authentication, and storage.
- AI: OpenAI API for extraction, classification, planning suggestions, and conversational check-ins.
- Calendar: Google Calendar API, with conflict handling and clear sync ownership.
- iOS health integration: HealthKit / Apple Health.
- Android health integration: Health Connect and supported Samsung Health data.
- Notifications: APNs, FCM, and Web Push as appropriate.

The application database should remain the source of truth. External calendar synchronization must account for conflicts, duplicate prevention, time zones, and offline changes.

## 7. Suggested MVP sequence

1. Repository foundation, application shell, and design system.
2. Authentication and database model.
3. Calendar views and task management.
4. Explicit calendar/workspace sharing and collaboration permissions.
5. Task completion, subtasks, and persistence.
6. AI task capture from text, voice, and screenshots.
7. Time tracking.
8. Notifications and check-ins.
9. Calendar and health integrations.
10. Gamification, analytics and mobile release preparation.

The first milestone should validate the core web workflow: create a task, place it on a calendar, complete it, track time, and retain all state after reload.

## 8. Initial acceptance criteria

- Tasks and changes persist after reload and across sessions.
- Completing a task updates its state consistently.
- Voice and screenshot capture produce editable structured suggestions.
- Duplicate detection warns rather than silently discarding data.
- The timer survives app closure and calculates active time correctly.
- Schedule changes are visible and consequential changes require confirmation.
- Notifications respect configured settings and time zones.
- Check-ins reflect actual task state.
- Theme choices persist.
- Health data is accessed only after explicit permission.
