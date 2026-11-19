# DAYFLOW — Phase 4: Sharing & Collaboration

**Status:** architecture only. No sharing migration, RLS policy or API is implemented by this document.
**Prerequisite:** Phase 3 must be applied and verified in isolated Supabase infrastructure before this phase changes its access model.

## Product boundary

DAYFLOW will let a user share one calendar or a workspace containing multiple calendars by email. An invitation grants one of three roles:

| Role | Calendar content | Members and access |
| --- | --- | --- |
| `owner` | immutable resource owner; full control, including settings and deletion | invite, change roles, revoke access and transfer ownership |
| `editor` | create, edit and, subject to confirmed UI actions, remove shared tasks and events | cannot invite, change roles or delete a calendar/workspace |
| `viewer` | read shared calendar metadata, tasks, events and permitted comments | no writes |

Sharing is explicit and scoped. A user may belong to many workspaces and calendars, and a calendar may have many members. Personal tasks, events, categories and covers must never become shared merely because their creator joins a workspace or accepts an invitation. The UI labels the calendar/workspace, effective role and sharing origin for every shared record.

The design supports future `family`, `friends` and `work` workspaces without making any of them special authorization classes.

## Ownership, removal and transfer

Each `calendars.owner_id` is one immutable **resource owner**. A workspace owner manages that workspace, its invitations and workspace memberships, but does not automatically own or manage a personal calendar belonging to another user. Workspace membership may grant view/edit access to a child calendar; it never changes that calendar's `owner_id`.

Ownership transfer is an explicit server-side command, not a membership role update. The current calendar owner selects an already active calendar member, confirms the target, and the transaction locks the calendar and both membership rows. It then changes `calendars.owner_id`, ensures the recipient has an explicit calendar `owner` membership, downgrades the former owner only if the former owner selected a lower role, and writes an immutable audit record. The transfer rejects a non-member, a removed member, a personal calendar, a missing confirmation and a concurrent/obsolete owner state. Workspace ownership has its own equivalent locked command and transfer-history record; it never changes ownership of a child calendar.

Every calendar and workspace must always retain at least one active owner. Database triggers and owner-only RPCs reject deleting or downgrading the last owner, including through direct Supabase requests. An owner leaving a workspace must first transfer workspace ownership or delete the workspace according to an explicit confirmed flow. Deleting a user revokes that user's memberships and pending invitations; it must block when the user is the last resource owner until a transfer or confirmed resource deletion is completed. Calendar deletion is never an implicit consequence of removing a non-owner member.

## Compatibility with Phase 3

The Phase 3 schema correctly isolates records with `owner_id = auth.uid()` and composite `(owner_id, category_id)` foreign keys. Those policies intentionally prevent cross-user category use and must remain unchanged until the collaboration migration is ready.

Phase 4 must use a new append-only migration; it must not edit Phase 2 or Phase 3 files. The migration will:

1. Create an explicit personal calendar for every existing owner.
2. Add nullable `calendar_id` to existing tasks, events, categories and month covers, then make it non-null only after backfilling each row to its owner's personal calendar and deploying compatible clients.
3. Preserve `owner_id` as legacy metadata during compatibility; add immutable nullable `created_by` fields and replace the legacy Auth cascade FKs before account deletion can touch shared data.
4. Replace Phase 3 owner-only RLS with membership-aware RLS in the new migration.

No data is reassigned to a shared calendar by default. Moving or copying an item into a shared calendar is a separately confirmed command. Shared categories are calendar-scoped after the migration; a personal category is copied or explicitly moved, never silently exposed. The Phase 3 category foreign keys are replaced only after new calendar-scoped integrity constraints and a successful backfill exist.

## Proposed data model

### Calendar containers

`workspaces` groups calendars for future family, friends and work use:

```text
workspaces(id, owner_id, title, kind, created_at, updated_at)
calendars(id, owner_id, workspace_id nullable, title, color, kind, created_at, updated_at)
```

Calendar `kind` is initially `personal` or `shared`; `family`, `friends` and `work` are workspace kinds, not authorization-changing calendar kinds. Every user receives one private personal calendar during backfill. A calendar can be directly shared without a workspace; a workspace may contain several calendars. `calendars.owner_id` is immutable except through the transfer procedure above; `workspaces.owner_id` has the same last-owner protection but is a separate resource owner.

### Memberships and invitations

```text
workspace_memberships(workspace_id, user_id, role, grant_source, invitation_id nullable, joined_at, invited_by)
calendar_memberships(calendar_id, user_id, role, grant_source, invitation_id nullable, joined_at, invited_by)
sharing_invitations(
  id, scope_type, workspace_id nullable, calendar_id nullable,
  email_normalized, role, token_hash, invited_by,
  status, expires_at, accepted_by nullable, accepted_at nullable,
  revoked_at nullable, created_at, updated_at
)
```

`scope_type` is either `workspace` or `calendar`, with a check constraint requiring exactly the matching target ID. Both membership tables have an exact unique key (`unique(workspace_id, user_id)` and `unique(calendar_id, user_id)`). `grant_source` is `manual`, `invitation` or `transfer`; an invitation-created membership stores `invitation_id`, while independently granted membership has no invitation provenance.

The migration must define concrete constraints and indexes:

```sql
check (
  (scope_type = 'workspace' and workspace_id is not null and calendar_id is null)
  or
  (scope_type = 'calendar' and calendar_id is not null and workspace_id is null)
)
check (status in ('pending', 'accepted', 'revoked', 'expired'))
unique (token_hash)
create unique index sharing_invitations_pending_workspace_email_key
  on sharing_invitations (workspace_id, email_normalized)
  where scope_type = 'workspace' and status = 'pending';
create unique index sharing_invitations_pending_calendar_email_key
  on sharing_invitations (calendar_id, email_normalized)
  where scope_type = 'calendar' and status = 'pending';
```

`workspace_id`, `calendar_id`, `invited_by`, `accepted_by`, membership `user_id` and membership `invitation_id` are foreign keys. Calendar membership/invitation creation also checks the calendar's actual workspace association, preventing a forged `workspace_id`/`calendar_id` combination. Client commands never set resource ownership or invitation provenance.

An accepted invitation locks its row with `FOR UPDATE`, confirms it is pending and unexpired, verifies the authenticated user's normalized **confirmed** email from the server Supabase Auth session, inserts membership atomically, and marks the invitation accepted. It is therefore single-use under concurrent requests. If a matching membership already exists, acceptance never downgrades its role; it returns an explicit conflict/no-op and consumes the invitation according to the audited transaction rule.

Revoking a **pending** invitation changes only its status to `revoked`. Removing an **active** member is a separate owner command against the membership row. That command can remove a membership created by its recorded invitation, but revoking an old invitation must never remove an independent `manual` or `transfer` membership. Re-inviting an existing participant is a no-op or an explicit owner-approved role-change flow, never a second membership; re-inviting after revocation creates a new pending invitation permitted by the partial indexes.

An effective role is the most privileged active role from direct calendar membership and the matching parent workspace membership. Workspace membership applies only when the stored `calendars.workspace_id` matches; personal calendars have no workspace and are never inherited. Calendar `owner` is only `calendars.owner_id`; workspace `owner` maps to inherited calendar `editor`. A direct calendar role can grant more access but cannot be used to deny workspace access. The UI must expose this inherited source so revoking a direct calendar membership does not misleadingly imply that workspace-derived access is gone.

### Shared records and collaboration metadata

After calendar backfill, all calendar-owned rows use `calendar_id` and are constrained to the target calendar. New Phase 4 tables support planning without widening personal access:

```text
task_assignments(task_id, assignee_id, assigned_by, assigned_at, unassigned_at nullable, unassigned_reason nullable)
task_comments(id, task_id, author_id, body, created_at, updated_at, deleted_at nullable)
```

An owner or editor may assign a task only to an active effective member of that task's calendar; viewers cannot assign tasks. A trigger verifies the task calendar, assignee membership and actor role. When a participant is removed, existing assignments are retained as audit history but set `unassigned_at` and `unassigned_reason = 'membership_revoked'`; account deletion uses `account_deleted`. Active task displays treat them as unassigned. Editors may soft-delete shared tasks/events; owners may restore them. Soft-deleted task assignments are unassigned without automatic restoration, comments stay retained but hidden with the task, and each transition is audited. Comments are visible only to calendar members; authors can edit/delete their own comments, while owners can moderate. Future attachment, reminder and history tables must likewise carry or join through `calendar_id` before they receive membership-based policies.

### Audit, retention and account lifecycle

The collaboration audit log records only critical access changes: ownership transfer, membership/role and invitation lifecycle, participant removal, calendar conversion/reparenting, and soft delete/restore. It stores allow-listed identifiers and state transitions, never raw invitation tokens, email addresses or content. The proposed detailed retention baseline is 24 months, followed by deletion or irreversible aggregation; the final retention period needs legal/jurisdiction review.

Account deletion is a server-controlled asynchronous workflow. Personal calendars are explicitly removed; shared resources require a completed transfer to an eligible active member or an explicit confirmed deletion. Pending invitations and active memberships are revoked, active assignments are marked `account_deleted`, and audit/person identity is redacted where required. Shared comment bodies are retained with anonymized `author_id` by default; a legally valid erasure request can schedule targeted content redaction. The workflow must block rather than leave an orphan resource or cascade-delete shared records authored by the departing user.

Phase 4 background work is provider-agnostic. A private job/checkpoint interface defines idempotency keys, bounded retries, short transaction claims, progress metrics and dead-letter handling for backfill, invitation expiry, audit retention, account deletion and comment-erasure jobs. Queue providers and workers may receive short-lived workload identity, but job payloads/logs never carry raw tokens, content or service-role credentials. Privileged Auth deletion is a break-glass administrative operation only after the deletion workflow and integrity checks complete; ordinary endpoints cannot bypass it.

## RLS and integrity contract

All collaboration tables enable RLS. Reusable `security definer` helper functions resolve active membership and effective role without recursively querying a policy-protected table:

```text
can_view_calendar(calendar_id)          -- owner, editor or viewer
can_edit_calendar(calendar_id)          -- owner or editor
can_manage_calendar(calendar_id)        -- owner only
effective_calendar_role(calendar_id)    -- direct/workspace role resolution
```

Every such function must use a fixed `search_path` (`set search_path = pg_catalog, public`), schema-qualified table/function references, and a controlled non-login function owner with only the privileges needed to read membership data. `revoke all on function … from public` is mandatory. Boolean `can_*` helpers receive only the minimal `execute` grant needed by `authenticated` RLS policies; the role-returning helper is server-only unless a reviewed policy needs it. Mutating functions such as invitation acceptance and ownership transfer receive `execute` only for `authenticated`, validate `auth.uid()` internally, and must not accept an actor ID as input. No helper may expose membership lists or bypass RLS outside its narrowly documented authorization query. `service_role`, database-owner and `BYPASSRLS` credentials are outside RLS and must be stored only in the deployment secret manager for the minimal server worker/admin boundary; they must never be shipped to browser or mobile clients.

Policies must check membership server-side from `auth.uid()`, never a browser-supplied `owner_id`, `calendar_id`, role or email. Record policies follow these rules:

- `SELECT`: `can_view_calendar(calendar_id)`.
- `INSERT`: `can_edit_calendar(calendar_id)` plus `owner_id = auth.uid()` / `created_by = auth.uid()` where applicable.
- `UPDATE`: `can_edit_calendar(calendar_id)`; a trigger rejects changes to immutable `calendar_id`, creator and ownership fields. Membership/invitation mutations use owner-scoped command RPCs, not direct client DML.
- `DELETE`: owner-only command RPC for calendars, memberships and invitations; shared task/event deletion is explicitly allowed only by the documented editor/owner rule and requires a UI confirmation.

Categories must use a calendar-scoped foreign key after backfill, such as `(calendar_id, category_id)`, so an editor cannot attach a category from another calendar by forging either ID. Assignment and comment triggers/RLS similarly verify the target task belongs to a calendar the actor and assignee can access.

Invitation rows are visible to the inviter/owner and, after acceptance, to the accepting user as necessary for audit. Recipients do not query invites by arbitrary email. The email link opens a frontend route such as `/invite/accept#token=<opaque-token>`; client code reads the fragment and sends the token only in the POST body to `/api/invitations/accept`. No API path, query string, referrer or log should contain the raw token. Acceptance uses the opaque token server-side, preventing email enumeration and `calendar_id` substitution.

## API and validation boundary

All endpoints resolve the session on the server and use Zod schemas. Proposed routes are:

```text
POST   /api/workspaces
POST   /api/workspaces/[workspaceId]/calendars
POST   /api/calendars/[calendarId]/invitations
POST   /api/workspaces/[workspaceId]/invitations
POST   /api/invitations/accept
PATCH  /api/calendars/[calendarId]/members/[userId]
DELETE /api/calendars/[calendarId]/members/[userId]
POST   /api/tasks/[taskId]/assignments
DELETE /api/tasks/[taskId]/assignments/[userId]
POST   /api/tasks/[taskId]/comments
PATCH  /api/tasks/[taskId]/comments/[commentId]
DELETE /api/tasks/[taskId]/comments/[commentId]
```

Zod validates UUID path values, normalized email, title/body bounds, closed role/kind enums and the opaque token in the POST body. Routes return `401` for no session, `403` for insufficient effective role, `404` for owner-scoped hidden resources, `409` for duplicate pending invitations, role conflicts, an existing membership or a last-owner removal attempt, `410` for revoked/expired/used invitations, and `422` for invalid commands. Responses to unauthenticated invitation links must not disclose calendar membership or email existence.

## Test plan

The Phase 4 isolated Supabase test suite must cover:

1. personal-calendar backfill preserves every Phase 3 ID, date, relationship and row while leaving it private before and after the RLS cutover;
2. owner/editor/viewer select/insert/update/delete matrices for calendars, tasks, events, categories, assignments and comments;
3. forged `calendar_id`, `owner_id`, category ID, workspace ID and assignee ID through both API and direct Supabase requests;
4. self-role escalation, direct membership changes, inherited workspace membership and the effective-role conflict matrix;
5. last-owner removal, owner departure, ownership transfer and user-deletion behavior;
6. duplicate, expired, revoked and accepted invitation transitions; repeated-token acceptance and concurrent acceptance of one token;
7. pending invitation revocation does not remove an independent active membership, while active-member removal revokes calendar access and unassigns active tasks;
8. absence of access to another user's personal calendar before RLS switching and after direct membership revocation, while correctly preserving inherited workspace access;
9. API validation, SECURITY DEFINER execute-grant checks, audit-safe errors and confirmed deletion flows.

No Phase 4 feature is complete until isolated migration/RLS tests and multi-user browser tests pass. Production migration requires a separate review and approval.

## Implementation order

1. Add additive schema: containers, memberships, invitations, provenance, helper functions and nullable calendar references. Keep Phase 3 RLS active.
2. Backfill deterministic personal calendars with idempotent upserts, then populate `calendar_id` in bounded batches without changing existing IDs, dates or ownership.
3. Run integrity checks: no null mappings, every category/task/event relationship remains in one calendar, exactly one personal calendar per owner and no unexpected memberships.
4. Add/validate calendar-scoped constraints and indexes; update application database types and deploy a backward-compatible application version.
5. Switch RLS only after the mapping checks pass, in a reviewed transaction/maintenance window. Test that no personal Phase 3 row is visible to another user before granting any shared membership.
6. Add invitation acceptance/revocation, ownership transfer, personal-to-shared conversion and membership management through server-only token/RPC handling.
7. Add assignments/comments, soft delete/owner restore, participant-removal/account-deletion unassignment triggers and provider-agnostic operational jobs.
8. Remove obsolete owner-scoped category constraints only after compatibility, RLS and multi-user browser tests pass; then consider collaboration UI polish and notifications.
