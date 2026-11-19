# DAYFLOW — Phase 4 Database Design: Sharing & Collaboration

**Status:** DDL design for review only. This is not a migration and must not be applied to any database.

## 1. Scope, invariants and current-schema conflicts

Phase 4 adds explicit sharing while preserving all Phase 3 UUIDs, timestamps, task/category links and personal-data isolation. The existing Phase 3 tables have no `calendar_id`, use `owner_id` as both ownership boundary and category scope, and enforce `tasks/events(owner_id, category_id) -> categories(owner_id, id)`. Their RLS policies allow only `owner_id = auth.uid()`. Consequently, sharing cannot safely be added by creating memberships alone.

The design resolves this by adding explicit calendar containers, backfilling every existing record to a private personal calendar, adding calendar-scoped integrity, and only then replacing owner-only RLS. No existing Phase 2/3 migration is edited.

### Explicit contradictions to resolve in the Phase 4 migration series

1. Phase 3 `owner_id` means both record owner and authorization subject; after sharing, resource authorization must use `calendar_id`, while the legacy field remains immutable historical creator/data-owner metadata until a later rename is safe.
2. Phase 3 user-owned foreign keys use `on delete cascade`; a new resource owner must use `on delete restrict` so an account cannot silently delete a workspace/calendar while it is the final owner. The account-deletion workflow must therefore resolve Phase 4 ownership before relying on existing cascades.
3. Phase 3 category FKs and uniqueness are owner-scoped, while shared categories require calendar scope. Both integrity models must coexist during backfill; the old model can be removed only after every row has a validated calendar mapping.
4. PostgreSQL permissive RLS policies compose with `OR`. Leaving old owner-only and new membership-view policies active together could widen reads unexpectedly, so policy replacement is a controlled cutover rather than an additive permission change.

### ER structure

```text
auth.users
  ├─< workspaces.owner_id
  ├─< calendars.owner_id ─< calendar_memberships >─ auth.users
  ├─< workspace_memberships >─ workspaces
  ├─< sharing_invitations.(invited_by, accepted_by)
  ├─< {calendar,workspace}_ownership_transfers.(from_owner_id, to_owner_id)
  └─< calendar_audit_log.actor_id

workspaces ─< calendars ─< {categories, tasks, calendar_events, month_covers}
calendars ─< sharing_invitations (calendar scope)
workspaces ─< sharing_invitations (workspace scope)
tasks ─< task_assignments >─ auth.users
```

`calendars.owner_id` is the only source of calendar resource ownership. A workspace owner owns the workspace, not every child calendar. Workspace membership can at most produce inherited calendar editor/viewer access; it never produces calendar `owner`.

## 2. New table DDL contract

Use UUID primary keys and `timestamptz` timestamps consistently with Phase 2/3. Use checked `text` values rather than PostgreSQL enums so future values can be introduced by append-only constraints/migrations. Every mutable table has the existing `public.set_updated_at()` trigger.

### `workspaces`

| Column | Definition and constraints |
| --- | --- |
| `id` | `uuid primary key default gen_random_uuid()` |
| `owner_id` | `uuid not null references auth.users(id) on delete restrict`; immutable except transfer RPC |
| `title` | trimmed `text`, 1–120 characters |
| `kind` | `text not null check (kind in ('family', 'friends', 'work'))` |
| timestamps | `created_at`, `updated_at`, both `not null default now()` |

Indexes: `workspaces_owner_id_idx(owner_id)`. The creating owner receives one `workspace_memberships` row with role `owner`. A trigger prevents a workspace owner mismatch or deletion/demotion of the final owner.

### `calendars`

| Column | Definition and constraints |
| --- | --- |
| `id` | UUID primary key |
| `owner_id` | `uuid not null references auth.users(id) on delete restrict`; immutable outside transfer RPC |
| `workspace_id` | nullable `uuid references workspaces(id) on delete restrict` |
| `title` | trimmed text, 1–120 characters |
| `color` | nullable lower-case `#RRGGBB` |
| `kind` | `text not null check (kind in ('personal', 'shared'))` |
| timestamps | standard timestamps |

Indexes and uniqueness:

```text
unique index calendars_one_personal_per_owner
  on calendars(owner_id) where kind = 'personal';
index calendars_workspace_id_idx(workspace_id);
index calendars_owner_id_idx(owner_id);
```

Personal calendars must have `workspace_id is null`; shared calendars may be direct (`workspace_id is null`) or workspace-owned. A trigger ensures the resource owner has one direct calendar membership with role `owner`; no invitation or ordinary role update may create an `owner` membership.

### `workspace_memberships` and `calendar_memberships`

Both tables use the same shape, with `workspace_id` or `calendar_id` as scope:

| Column | Definition and constraints |
| --- | --- |
| `id` | UUID primary key |
| scope ID | non-null FK to its resource, `on delete cascade` only after explicit resource deletion |
| `user_id` | `uuid not null references auth.users(id) on delete restrict` |
| `role` | `text not null check (role in ('owner', 'editor', 'viewer'))` |
| `grant_source` | `text not null check (grant_source in ('system_owner', 'manual', 'invitation', 'transfer'))` |
| `invitation_id` | nullable FK to `sharing_invitations(id) on delete restrict` |
| `invited_by` | nullable FK to `auth.users(id) on delete set null` |
| `joined_at`, `created_at`, `updated_at` | non-null/default timestamps |
| `removed_at`, `removed_by` | nullable audit fields; active rows have `removed_at is null` |

Constraints/indexes:

```text
unique(scope_id, user_id) where removed_at is null
check ((grant_source = 'invitation') = (invitation_id is not null))
index active_membership_by_user(user_id) where removed_at is null
index active_membership_by_scope(scope_id) where removed_at is null
```

The concrete migration uses separate names for each scope, e.g. `calendar_memberships_active_scope_user_key`. A calendar `owner` membership must match `calendars.owner_id`; a workspace `owner` membership must match `workspaces.owner_id`. A trigger rejects direct creation, deletion or role modification that violates either invariant or removes the final owner.

### `sharing_invitations`

| Column | Definition and constraints |
| --- | --- |
| `id` | UUID primary key |
| `scope_type` | `text not null check (scope_type in ('workspace', 'calendar'))` |
| `workspace_id` / `calendar_id` | nullable FKs, exactly one selected by scope check |
| `email_normalized` | trimmed lower-case text; application validates RFC-compatible email shape |
| `role` | `editor` or `viewer` only; `owner` is never invited |
| `token_hash` | non-null cryptographic hash, unique; raw token is never stored |
| `invited_by` | nullable Auth FK `on delete set null`; non-null at creation inside the invitation command |
| `status` | `pending`, `accepted`, `revoked`, `expired` only |
| `expires_at` | non-null; must be later than creation |
| `accepted_by`, `accepted_at`, `revoked_at`, `revoked_by` | nullable audit fields with FK as applicable |
| timestamps | standard timestamps |

Required constraints/indexes:

```sql
check (
  (scope_type = 'workspace' and workspace_id is not null and calendar_id is null)
  or
  (scope_type = 'calendar' and calendar_id is not null and workspace_id is null)
)
check ((status = 'accepted') = (accepted_by is not null and accepted_at is not null))
check (status <> 'revoked' or revoked_at is not null)
unique (token_hash)
create unique index sharing_invitations_pending_workspace_email_key
  on public.sharing_invitations (workspace_id, email_normalized)
  where scope_type = 'workspace' and status = 'pending';
create unique index sharing_invitations_pending_calendar_email_key
  on public.sharing_invitations (calendar_id, email_normalized)
  where scope_type = 'calendar' and status = 'pending';
```

The acceptance RPC locks the invitation row with `FOR UPDATE`, verifies a pending unexpired state and the session's confirmed Auth email, then inserts/updates membership and changes status in one transaction. An existing membership causes an audited no-op/conflict; it cannot be downgraded. Revoking a pending invitation never removes a membership. Removing an active membership is a separate action with its own audit record.

### `calendar_ownership_transfers`

| Column | Definition and constraints |
| --- | --- |
| `id` | UUID primary key |
| `calendar_id` | nullable FK to calendar, `on delete set null` |
| `calendar_id_snapshot` | non-null UUID without an FK; equals `calendar_id` while the calendar exists |
| `from_owner_id`, `to_owner_id` | nullable Auth FKs `on delete set null`, must differ while both are present; non-null at creation inside the transfer command |
| `initiated_by` | nullable Auth FK `on delete set null`; must equal current owner at command time |
| `status` | `pending`, `completed`, `cancelled`, `expired` |
| `confirmed_at`, `completed_at`, `cancelled_at` | nullable lifecycle timestamps |
| `reason` | nullable 1–500 character audit-safe text |
| timestamps | standard timestamps |

Use `check (status <> 'pending' or calendar_id is not null)`, `unique(calendar_id) where status = 'pending'`, `index(to_owner_id, status)` and an immutable completion audit. Only the ownership-transfer RPC may create or update this table. It locks calendar, transfer and active membership rows, confirms `to_owner_id` is active, changes `calendars.owner_id`, synchronizes owner membership and inserts audit events. Transfer of a personal calendar is rejected. Historical completed/cancelled rows survive a confirmed calendar deletion using `calendar_id_snapshot`; pending transfers prevent deletion. Auth deletion anonymizes historical participant FKs instead of retaining a durable user identifier.

### `workspace_ownership_transfers`

Workspaces require the same explicit last-owner-safe lifecycle as calendars. This table mirrors `calendar_ownership_transfers`, replacing `calendar_id`/snapshot with nullable `workspace_id on delete set null` and non-null `workspace_id_snapshot`; it has nullable `from_owner_id`, `to_owner_id`, `initiated_by` FKs `on delete set null`, lifecycle timestamps, audit-safe reason, and `unique(workspace_id) where status = 'pending'`. Creation requires non-null distinct transfer parties; historical Auth references are later anonymized. `public.transfer_workspace_ownership(...)` locks the workspace and both active membership rows, requires an active eligible recipient, synchronizes the sole workspace-owner membership and writes an audit event. A workspace owner cannot leave, be removed, or be deleted until this transfer finishes or the workspace is explicitly deleted.

### `calendar_audit_log`

| Column | Definition and constraints |
| --- | --- |
| `id` | UUID primary key |
| `calendar_id` | nullable FK to calendar, `on delete set null`; current-calendar audit uses the FK while historical audit relies on `calendar_id_snapshot` |
| `actor_id` | nullable Auth FK `on delete set null` |
| `event_type` | closed text check, e.g. invitation/membership/role/ownership/assignment events |
| `target_type`, `target_id` | required non-sensitive resource identifiers |
| `calendar_id_snapshot` | non-null UUID without an FK; retains the deleted calendar identity for a permitted historical audit row |
| `retention_until`, `redacted_at` | `retention_until` is non-null; `redacted_at` is set only by the controlled retention job |
| `metadata` | `jsonb not null default '{}'::jsonb`; Phase 4A permits only the empty object. A later reviewed append-only migration may add event-specific, non-sensitive allow-lists; it must never accept task descriptions, raw tokens, private email or secrets. |
| `created_at` | non-null default timestamp |

`calendar_id` is nullable with `on delete set null`; a check constraint requires `calendar_id is null or calendar_id = calendar_id_snapshot`. Index `(calendar_id, created_at desc)` and `(calendar_id_snapshot, created_at desc)`, plus `(target_type, target_id, created_at desc)`. The table is append-only for application actors: no client `INSERT`, `UPDATE` or `DELETE`; only reviewed trigger/RPC code writes it and the controlled retention job can redact/purge after `retention_until`. Calendar resource owners may select current-calendar rows, never arbitrary historical rows.

### `task_assignments`

| Column | Definition and constraints |
| --- | --- |
| `id` | UUID primary key |
| `task_id` | non-null FK to `tasks(id) on delete cascade` |
| `assignee_id` | nullable Auth FK `on delete set null` after account deletion |
| `assigned_by` | nullable Auth FK `on delete set null` |
| `assigned_at` | non-null default timestamp |
| `unassigned_at`, `unassigned_by` | nullable audit fields |
| `unassigned_reason` | nullable checked text: `membership_revoked`, `manual`, `account_deleted`, `task_deleted` |

Use `unique(task_id, assignee_id) where unassigned_at is null and assignee_id is not null` and `index(assignee_id) where unassigned_at is null`. An owner/editor assignment trigger verifies that the actor and assignee are active effective members of the task calendar. Removing a member atomically marks active assignments `membership_revoked`; it never deletes the task or silently reassigns it.

### `task_comments`

| Column | Definition and constraints |
| --- | --- |
| `id` | UUID primary key |
| `task_id` | non-null FK to `tasks(id) on delete cascade`; a soft-deleted task retains its comments |
| `author_id` | nullable Auth FK `on delete set null` |
| `body` | trimmed text, 1–10,000 characters while active; no author/profile snapshot is stored |
| lifecycle | `created_at`, `updated_at`, `deleted_at nullable`, `deleted_by nullable Auth FK on delete set null`, `content_redacted_at nullable` |

Index `(task_id, created_at)`. Comments are not independently visible when their task is soft-deleted. On account deletion `author_id` is anonymized. A legally valid personal-data erasure request may additionally redact `body` through a controlled worker, with the redaction event retained in the audit log; ordinary account deletion preserves collaborative content by default.

### Private operational tables

`private.account_deletion_requests` is server-only and has one active row per requested account: `user_id` (PK/FK to Auth `on delete cascade` only after successful completion), `status` (`requested`, `blocked`, `ready`, `processing`, `completed`, `cancelled`), `requested_at`, `updated_at`, `completed_at nullable`, `block_reason_code nullable`, and an audit-safe `last_error_code nullable`. No browser role receives table privileges or direct RPC write access; a re-authenticated request RPC and the controlled deletion worker are its only writers. Critical evidence remains in `calendar_audit_log`, not in this operational row.

`private.phase4_backfill_checkpoints` holds operational progress rather than product data: `job_name` (PK), `table_name`, `last_processed_id uuid nullable`, `rows_processed bigint not null default 0`, `status` (`pending`, `running`, `failed`, `completed`), `started_at`, `updated_at`, `completed_at nullable`, and `last_error nullable`. It is accessible only to the controlled worker. A checkpoint is advanced in the same short transaction as its successful batch; a failed batch leaves its last completed cursor unchanged.

`private.operation_jobs` is the provider-agnostic task interface. It has `id` (UUID PK), `task_type` (`phase4_backfill`, `invitation_expiry`, `audit_retention`, `account_deletion`, `comment_erasure`), `idempotency_key` (unique), a minimal non-secret `payload jsonb`, `status` (`pending`, `running`, `retryable_failure`, `completed`, `dead_letter`, `cancelled`), `attempt_count`, `max_attempts`, `available_at`, `locked_at`, `locked_by`, `completed_at`, `last_error_code`, and timestamps. A provider adapter claims due rows using a short transaction and `FOR UPDATE SKIP LOCKED`; it passes only a job ID/short-lived workload identity to the worker, never a database or Auth service-role secret in payload or logs. The worker performs idempotent work, records metrics and checkpoint progress, and completes or schedules bounded exponential-backoff retries. Queue depth, oldest runnable age, retry/dead-letter count, account-deletion age and mapped/remaining backfill rows are required monitoring signals. The concrete queue/scheduler provider is deliberately deferred to deployment design.

## 3. Phase 3 extension and backward compatibility

The future migration adds nullable `calendar_id` to `categories`, `tasks`, `calendar_events` and `month_covers`; it does not replace primary keys or timestamps. It retains `owner_id` as the original creator/owner audit field and adds `created_by` only where new shared-record authoring makes that distinction necessary.

After personal-calendar backfill:

1. Add `unique(calendar_id, id)` to categories and non-validated composite FKs from tasks/events `(calendar_id, category_id)` to categories.
2. Add calendar query indexes: tasks `(calendar_id, start_at)`, `(calendar_id, deadline_at)`, `(calendar_id, status)`; events `(calendar_id, starts_at)`, `(calendar_id, ends_at)`; covers unique `(calendar_id, month_start)`.
3. Validate new constraints after counts and orphan checks pass.
4. Deploy code/types that dual-read calendar scope and always supply `calendar_id` on new writes.
5. Only after compatibility tests pass, drop the Phase 3 owner/category FKs and owner/month cover/category-name uniqueness that prevent legitimate shared calendar records.

Existing clients are compatible during the additive stage because nullable columns do not change existing selected fields. They are not compatible with a final `calendar_id not null` write contract, so application deployment must precede that change. `src/types/database.ts` must first add optional calendar fields/tables, then switch them to required only after all server/browser writers use the new contract.

## 4. Idempotent personal-calendar backfill

### Population and identity preservation

Create one personal calendar for every user from `profiles` plus the union of distinct owners in Phase 3 tables; this includes users with no tasks or events. The partial unique index on `calendars(owner_id) where kind = 'personal'` makes:

```text
insert personal calendar for owner on conflict do nothing
```

safe on retry. The backfill reads the resulting calendar ID by owner and updates only rows where `calendar_id is null`. It neither rewrites row UUIDs, task/category IDs, timestamps nor existing `owner_id` values.

### Large-table strategy

Do not put an unbounded data update and `set not null` into one migration transaction. Use an additive migration first, then a resumable, privileged backfill job keyed by stable UUID ranges or `updated_at/id` batches. Each batch:

1. upserts personal calendars for its owners;
2. updates a bounded number of null `calendar_id` rows;
3. commits and records count/checkpoint metrics outside user-visible tables;
4. retries safely because the predicate is `calendar_id is null`.

Build new indexes concurrently where the deployment tool permits it; otherwise schedule the lock-bearing index/constraint validation separately. Do not enable collaboration membership writes until all four Phase 3 tables have zero null calendar mappings.

### Integrity gates before RLS cutover

The cutover requires all of the following to be zero/true:

```text
categories/tasks/events/month_covers with calendar_id is null = 0
every record's calendar owner equals its preserved owner_id for backfilled personal data
every task/event category belongs to the same calendar
one and only one personal calendar per eligible owner
no active membership except the resource owner's system_owner row
row counts, UUID sets and relevant timestamps match pre-backfill snapshots
```

The current Phase 3 test creates two owners and verifies owner isolation plus cross-owner category rejection. Phase 4 adds a separate test suite; it does not weaken or replace that test.

## 5. RLS design and effective role

### Effective role

`effective_calendar_role(calendar_id, subject_id default auth.uid())` is internal. It returns:

1. `owner` only when `calendars.owner_id = subject_id` and the system owner membership is active;
2. otherwise the maximum of direct calendar membership and inherited parent-workspace membership;
3. inherited workspace `owner` maps to calendar `editor`, never calendar `owner`.

This prevents workspace ownership from changing personal calendar ownership. Direct calendar membership cannot be used to deny inherited access; a revoked direct membership therefore may still leave workspace-derived access, which the UI must show.

### Policy matrix

`O` = calendar resource owner, `E` = effective editor, `V` = effective viewer, `X` = outsider. `Manage` means only resource owner, not inherited workspace owner.

| Table/resource | SELECT O/E/V/X | INSERT O/E/V/X | UPDATE O/E/V/X | DELETE O/E/V/X |
| --- | --- | --- | --- | --- |
| `workspaces` | owner/member / X | authenticated creator / X | workspace owner / X | workspace owner / X |
| `calendars` | O/E/V / X | authenticated as own resource owner / X | calendar owner / X | calendar owner / X |
| workspace memberships | active workspace members / X | command RPC only | command RPC only | command RPC only |
| calendar memberships | active calendar members / X | command/transfer RPC only | command/transfer RPC only | command RPC only |
| invitations | inviter/target audit view / X | creation RPC only | acceptance/revoke RPC only | revoke RPC only |
| ownership transfers | current/from/to owner audit view / X | transfer RPC only | transfer RPC only | none; append-only |
| audit log | calendar owner / X | trigger/RPC only | none | none |
| categories, tasks, events, covers | O/E/V / X | O/E / V/X | O/E / V/X | O/E for task/event; owner only for calendar metadata / V/X |
| task assignments | O/E/V / X | O/E / V/X | owner/editor unassign only / V/X | no hard delete; soft-unassign |

Policies derive the actor from `auth.uid()` only. They never trust a submitted `owner_id`, `calendar_id`, workspace ID, role, invitation ID or assignee ID. `BEFORE UPDATE` triggers reject changes to immutable resource owner, record creator and `calendar_id`; composite FKs ensure category/calendar matches. `authenticated` has no direct DML policy for memberships, invitations, transfers, audit records, deletion requests or jobs: owner actions go through narrowly scoped command RPCs. Direct SQL from `authenticated` must receive the same policy result as an API call.

### SECURITY DEFINER helpers and grants

| Function | Purpose | Execution/grants |
| --- | --- | --- |
| `public.can_view_calendar(uuid)` | boolean membership check for SELECT policies | `authenticated` execute only; no membership details returned |
| `public.can_edit_calendar(uuid)` | owner/editor check for content writes | `authenticated` execute only |
| `public.can_manage_calendar(uuid)` | calendar resource-owner check | `authenticated` execute only |
| `private.effective_workspace_role(uuid, uuid)` | role resolution for workspace policies | no client grant |
| `public.can_manage_workspace(uuid)` | workspace resource-owner check | `authenticated` execute only |
| `public.create_sharing_invitation(...)` | validate scope/role, persist only token hash and return raw token once | `authenticated` execute only |
| `private.effective_calendar_role(uuid, uuid)` | role resolution used by helpers/RPCs | no client grant; called only schema-qualified from public wrappers/RPCs |
| `public.accept_sharing_invitation(text)` | lock/verify/accept opaque token | `authenticated` execute only |
| `public.change_*_membership(...)`, `public.remove_*_member(...)`, `public.revoke_sharing_invitation(uuid)` | owner-scoped role/removal/revocation commands | `authenticated` execute only |
| `public.transfer_calendar_ownership(uuid, uuid, …)` | confirmed calendar transfer | `authenticated` execute only |
| `public.transfer_workspace_ownership(uuid, uuid, …)` | confirmed workspace transfer | `authenticated` execute only |
| `public.convert_personal_calendar_to_shared(uuid, …)` | owner-confirmed conversion only | `authenticated` execute only |
| `public.request_account_deletion()` | re-authenticated deletion-workflow request | `authenticated` execute only |
| `private.claim_operation_job(...)`, `private.complete_operation_job(...)` | provider adapter/worker coordination | worker role only; no `authenticated` grant |

Every function is `SECURITY DEFINER`, owned by a controlled non-login role, uses `set search_path = pg_catalog, public` (or `pg_catalog, private` for private helpers), schema-qualifies relations, and has `revoke all on function … from public`. The function owner receives only the membership/calendar privileges necessary to bypass recursive RLS; it must not own unrelated application tables or expose arbitrary select APIs. Migration review must inspect function owner and grants explicitly.

## 6. SQL test suite design

Use an isolated Supabase project after `supabase db reset`. Seed four users (`A`, `B`, `C`, `D`), two workspaces and at least four calendars: A personal, B personal, an A direct-shared calendar and a workspace child calendar. Run each SQL scenario under `set local role authenticated` and a matching `request.jwt.claim.sub`; execute API/RPC cases separately with valid JWT sessions.

| Scenario | Required assertion |
| --- | --- |
| Full Phase 3 backfill | all legacy rows keep UUID/date/category relationships; each maps to a personal calendar; B/C/D cannot select A personal rows before/after cutover |
| Roles | owner/editor/viewer/outsider matrix matches Section 5 for calendar records and metadata |
| Direct/inherited | direct editor plus inherited viewer resolves editor; inherited workspace owner is not calendar owner |
| Forged IDs | forged calendar, owner, workspace, category and assignee IDs fail through direct table writes and API/RPC paths |
| Self escalation | editor/viewer cannot create/update owner membership, alter role, or call transfer as a non-owner |
| Last owner | direct deletion/demotion of final owner fails; transfer then removal succeeds |
| Invitations | duplicate pending invite fails; revoked/expired invite fails; re-invite works; raw token is absent from storage/log metadata |
| Token races | two concurrent accept calls produce one membership, one accepted state and no role downgrade |
| Revocation | pending revoke does not remove independent membership; member removal blocks access and soft-unassigns tasks |
| Assignments | editor assigns only active calendar member; viewer and outsider fail; removing assignee keeps historical assignment row marked unassigned |
| SECURITY DEFINER | `anon`/outsider cannot execute helpers; authenticated caller cannot use helper/RPC to list membership or bypass RLS |

## 7. Rollout, rollback and recovery

### Safe rollout

1. **Expand:** add containers, membership/invitation/audit/transfer tables, helper functions and nullable `calendar_id`; leave existing Phase 3 policies/FKs active.
2. **Backfill:** create idempotent personal calendars and populate nullable mappings in batches; no non-owner membership rows are created.
3. **Validate:** run count/relationship snapshots, isolated RLS tests and performance checks; add/validate new FKs and indexes.
4. **Deploy compatible application:** add optional database types and dual-write/read support while legacy constraints still exist.
5. **Cut over RLS:** in a reviewed maintenance window, block conflicting writes, verify integrity gates, replace old owner-only policies with calendar-membership policies in one transactional policy change, then verify personal isolation.
6. **Enable sharing:** expose invitation, membership and transfer RPC/API only after RLS verification.
7. **Contract:** after all clients use calendar scope and multi-user tests pass, remove obsolete owner-scoped FKs/unique indexes in a later append-only migration.

### Rollback and recovery

Before cutover retain immutable row-count/UUID/timestamp snapshots and a durable owner-to-personal-calendar mapping export. Before shared writes begin, rollback restores owner-only policies and removes or ignores nullable calendar mappings; no data is deleted. After shared writes or calendar-scoped categories exist, do **not** attempt a destructive down migration: pause sharing writes, restore access from audit/mapping snapshots, deploy a forward corrective migration, and use database backup/point-in-time recovery only under an approved incident procedure.

## 8. Open technical questions for review

The decisions below resolve the initial scope questions. The remaining implementation review must select the concrete worker/deployment mechanism and validate retention obligations for the operating jurisdictions.

## 9. Adopted decision review

### 9.1 Inherited workspace access

**Decision:** workspace membership applies only to calendars whose `calendars.workspace_id` equals that workspace. A personal calendar always has `workspace_id is null` and is therefore never inherited. No inherited membership is materialized into `calendar_memberships`; effective access is computed at read/write time from the direct calendar membership plus the matching parent workspace membership.

The effective-role function is amended as follows:

```text
resource owner                         -> calendar owner
direct calendar editor/viewer          -> direct role
matching workspace editor              -> inherited editor
matching workspace viewer              -> inherited viewer
matching workspace owner               -> inherited editor (not calendar owner)
no matching membership / other space   -> no access
effective result                       -> highest direct/inherited non-owner role
```

`calendars.workspace_id` changes are owner-only, forbidden for personal calendars, and audited. Reparenting a shared calendar changes inherited access and therefore requires an explicit confirmation and pre-change membership impact preview. Direct membership can raise inherited viewer to editor, but cannot revoke inherited access or create `owner`.

**DDL/RLS impact:** retain the `calendars.workspace_id` FK/index; add an immutable/policy trigger for personal calendars and a reparenting audit trigger. `private.effective_calendar_role` joins workspace membership only when the stored parent IDs match. Test direct `calendar_id` and forged `workspace_id` writes, plus a workspace member attempting to read an unrelated personal calendar.

**Risks/alternative:** inheritance makes workspace membership powerful when calendars are reparented. An alternative is opt-in per-calendar inheritance, but it adds a third source of access and is not selected for the first release.

### 9.2 Personal calendar conversion, not transfer

**Decision:** direct ownership transfer of a `kind = 'personal'` calendar is prohibited. The owner may invoke a separate `convert_personal_calendar_to_shared` RPC, which locks the calendar and its records, confirms the owner session, checks `workspace_id is null`, verifies that the calendar has no active non-owner membership, and changes only `kind` from `personal` to `shared`. It writes `calendar_converted_to_shared` to the audit log and does not add participants; sharing begins only after explicit invitations/memberships.

The conversion preserves all task, event, category, cover and calendar UUIDs, dates and links because they already point to that calendar after backfill. It is consequential because all existing records in that calendar become potentially shareable, so the UI must show a record-count/data-category confirmation. The owner may instead copy selected records into a new shared calendar; this is the safer alternative for mixed personal data.

**DDL/RLS impact:** no new container table is required. Add a `BEFORE UPDATE` trigger allowing `personal -> shared` only through the conversion RPC context, reject reverse conversion while non-owner membership or shared activity exists, and record the transition in `calendar_audit_log`. Keep `calendars.owner_id` unchanged. Test that direct SQL cannot flip `kind`, a viewer/editor cannot invoke conversion, and no participant has access until a separate membership is active.

### 9.3 Audit retention and privacy

**Decision:** audit only critical access events: ownership transfer, role/membership changes, invitation lifecycle, participant removal, calendar conversion, permission-affecting reparenting and soft delete/restore. Store allow-listed metadata only: IDs, role/state transition, actor relation and timestamps. Never store raw invitation tokens, email addresses, task/event descriptions, comment bodies or profile snapshots.

Recommended baseline retention is 24 months for detailed critical audit rows, followed by deletion or irreversible aggregation; a longer legal/compliance retention needs explicit product and jurisdiction approval. On account deletion, `actor_id`/other user FKs become null while a non-identifying actor relation (`former_member`, `former_owner`, `system`) remains in metadata. Audit rows for deleted calendars retain a non-FK `calendar_id_snapshot`; `calendar_audit_log.calendar_id` must therefore be nullable with `on delete set null`, rather than the earlier non-null/restrict proposal.

**DDL/RLS impact:** add `retention_until`, `redacted_at`, `calendar_id_snapshot` and a fail-closed `metadata = '{}'::jsonb` check in Phase 4A. A later audited append-only migration may replace it with an event-specific allow-list validator alongside approved writers. Only a controlled retention/redaction function may update/delete audit rows; calendar owners can read current-calendar audit, not arbitrary historical rows. Test raw token/PII rejection, actor anonymization, retention purge authorization and audit persistence after explicit calendar deletion.

### 9.4 Account deletion

**Decision:** account deletion is an asynchronous, server-controlled workflow. Direct deletion of `auth.users` is blocked while the account owns a workspace/calendar or has unprocessed collaboration state. A deletion request has states `requested`, `blocked`, `ready`, `processing`, `completed`, `cancelled`; use a private `account_deletion_requests` table keyed by user with progress/error fields and no public direct writes.

Required sequence:

1. Re-authenticate the requester and create the deletion request; freeze new invitations and ownership changes involving that account.
2. Delete the user's personal calendars and their private records through an explicit confirmed cleanup path; preserve only redacted critical audit rows.
3. For each shared calendar/workspace owned by the account, require completed transfer to an active eligible member or explicit confirmed resource deletion. If neither is chosen, remain `blocked`.
4. Revoke pending invitations created by or directed to the account; remove direct/workspace memberships; soft-unassign active task assignments with `account_deleted`.
5. Preserve shared comments/content according to the chosen collaboration retention policy but anonymize author identity where required; never cascade-delete shared records merely because their historical author leaves.
6. Remove or anonymize profile/personal data, verify no ownership or active membership FK remains, then perform the privileged Auth deletion and mark the request completed.

**Critical Phase 3 conflict:** `tasks`, `calendar_events`, `categories` and `month_covers` currently reference `auth.users(id) on delete cascade`. Before sharing is enabled, Phase 4 must add a nullable historical `created_by`/`legacy_owner_id` reference with `on delete set null`, copy the value, and eventually replace the Phase 3 cascade FKs after compatibility validation. Calendar-based RLS, not this historical field, becomes the authorization boundary. Otherwise deleting a former author could delete shared records.

Test account deletion for users with only personal data, with shared resources that need transfer, with no eligible recipient, with active assignments/comments and with stale invitations. Verify no orphan calendar, active membership, pending invitation, FK violation or shared-record cascade remains.

### 9.5 Resumable batch backfill

**Decision:** do not run the long data backfill inside a single Supabase migration transaction. The first additive migration creates nullable columns/tables only. A separately deployed privileged worker runs idempotent batches, tracked in private `phase4_backfill_checkpoints`:

```text
job_name primary key, table_name, last_processed_id uuid nullable,
rows_processed bigint, status (pending/running/failed/completed),
started_at, updated_at, completed_at nullable, last_error nullable
```

The worker uses keyset batches against primary-key UUIDs (or a claim table with `FOR UPDATE SKIP LOCKED` for parallel workers), upserts the owner's personal calendar, updates only `calendar_id is null`, commits each batch, then persists the checkpoint. Retrying a completed/partial batch is safe because personal calendar creation uses its partial unique index and record updates are null-only.

Progress checks report mapped/remaining counts per Phase 3 table, personal-calendar count per owner, category/task/event same-calendar violations, UUID/timestamp snapshots and unexpected memberships. RLS cutover is forbidden until all checkpoints are `completed` and every integrity gate in Section 4 is zero/true. The worker must be run under a controlled server credential and is never exposed to browser/API clients.

**Risk/alternative:** UUID keysets do not represent creation order but remain stable and indexed. A single transaction is rejected because it risks long locks, timeout and unrecoverable partial operational state.

### 9.6 Editor soft delete and owner restore

**Decision:** editors may soft-delete active tasks/events in a shared calendar; viewers cannot mutate. Add these fields to both `tasks` and `calendar_events` before enabling editor delete:

```text
deleted_at timestamptz nullable
deleted_by uuid nullable references auth.users(id) on delete set null
delete_reason text nullable check (delete_reason in ('editor_delete', 'owner_delete'))
restored_at timestamptz nullable
restored_by uuid nullable references auth.users(id) on delete set null
check ((deleted_at is null) = (deleted_by is null))
```

A `BEFORE UPDATE` trigger permits an active-to-deleted transition only for `can_edit_calendar(calendar_id)`, permits restore only for the calendar resource owner, forbids changing the underlying calendar/creator/category scope, and writes audit events. RLS exposes active records to owner/editor/viewer; resource owners may additionally select deleted rows for recovery. Editors cannot restore.

For soft-deleted tasks, active assignments are soft-unassigned with reason `task_deleted`; they are not automatically restored because membership may have changed. Task comments remain attached but are hidden with the task from non-owners and return on restoration unless individually moderated. Event collaboration metadata follows the same visibility rule if introduced later. Hard purge is a separate owner-only retention operation after audit requirements are met.

Tests cover editor delete, viewer denial, outsider forged delete, owner restore, no automatic reassignment, comment visibility, audit event creation and direct Supabase attempts to set/delete/restore fields without the allowed role.

### 9.7 Concrete isolated SQL test cases

The following are test-case contracts for the future isolated SQL suite, not executable code against the current Phase 3 schema. Each uses four seeded Auth users, wraps the actor context in `set local role authenticated` plus `request.jwt.claim.sub`, and ends with `rollback`.

| Decision | Setup and SQL action | Required assertion |
| --- | --- | --- |
| Workspace inheritance | Create `W1`, `W2`, an A-owned shared `C1(workspace_id=W1)`, a B personal `P1(workspace_id=null)`, then give B a `W1` viewer membership. Run `select public.can_view_calendar(C1)` and `select public.can_view_calendar(P1)` as B; attempt `insert into calendar_memberships(calendar_id, user_id, role) values (C1, B, 'owner')`. | `C1` is visible as viewer; `P1` is invisible; the forged owner grant is rejected. Reparenting `C1` to `W2` as anyone but its owner is rejected and the approved owner path writes one audit event. |
| Personal conversion | As the personal owner call `public.convert_personal_calendar_to_shared(P1, confirmation)`; separately issue `update calendars set kind = 'shared' where id = P1` and invoke the RPC as an editor/viewer. | Only confirmed owner RPC succeeds; UUID/count snapshots for records in `P1` are unchanged; no new membership exists and B cannot read it until a later explicit grant. |
| Audit retention | Attempt a trigger/RPC audit write with `metadata` containing `token`, `email` or `description`; then invoke controlled redaction for a row before and after `retention_until`, and delete its calendar through the confirmed owner path. | Disallowed metadata and premature redaction fail; permitted retention processing redacts/deletes only eligible records; historical row survives calendar deletion with `calendar_id is null` and the snapshot retained. |
| Account deletion | Request deletion for A who owns `P1` and a shared `C1`; exercise worker once without a completed transfer, then transfer `C1` to B and resume. Repeat with A owning only `P1`. | First run is `blocked` and deletes no shared row; after transfer A is removed/unassigned and Auth deletion leaves no active membership/invitation/owned resource; personal-only path removes personal records and redacts audit without FK violations or shared-record cascades. |
| Resumable backfill | Seed Phase 3 rows for multiple owners. Run two worker batches, record the checkpoint, simulate failure before the third batch, then resume the same job; re-run a completed batch. | Only null `calendar_id` rows are updated; exactly one personal calendar exists per owner; UUID, timestamp and cross-category snapshots match; cursor/count never move backwards and final integrity gates pass. |
| Editor soft delete | Give B editor and C viewer access to shared `C1`; B soft-deletes task `T1` with an active B/C assignment and comment, C attempts delete, A owner restores. | B’s delete sets the four deletion fields, hides `T1`/comment from B/C and marks assignments `task_deleted`; C and outsider fail; A alone restores; assignments remain unassigned and audit has delete/restore events. |

The suite also runs every mutating operation through direct table access and its reviewed RPC/API counterpart. A passing RPC route cannot compensate for an RLS or trigger bypass in a direct authenticated Supabase query.

## 10. Final implementation review

### Adopted operational decisions

1. **Audit retention:** retain detailed critical audit data for 24 months as the technical baseline. Production launch requires legal confirmation for the applicable jurisdictions; the retention job must remain configurable and may only delete or irreversibly aggregate data after `retention_until`.
2. **Provider-agnostic background work:** `private.operation_jobs` plus checkpoints are the contract. A future provider adapter may enqueue/claim jobs, but it cannot change idempotency, retry, metrics, or credential rules. Job payloads/logs contain no service-role key, raw token, email or record content; workers receive a short-lived workload identity and retrieve any privileged credential from the deployment secret manager.
3. **Account deletion and comments:** preserve shared comment body where lawful, set `author_id` to null, and write an audit event. A verified personal-data deletion requirement can schedule a targeted body-redaction job. No ordinary account deletion may silently remove shared history.
4. **Privileged Auth deletion:** Auth Admin/service-role deletion is a break-glass operation, not a product endpoint. It requires a completed `account_deletion_requests` workflow, a fresh integrity query proving no owned resource/active membership/pending invite remains, an operator identity and ticket/reference in the audit trail, and post-delete verification. Restrict service-role secrets to the controlled worker/administrative environment; do not put them in browser code, ordinary API routes, job payloads or logs. Emergency use is separately audited and reconciled by the same workflow. RLS does not protect against `service_role`, a table owner or a `BYPASSRLS` role: those credentials belong only to the deployment secret manager and a minimal server worker/admin boundary, never a browser or mobile client.

### Phase 4A audit-metadata boundary

Phase 4A permits only `metadata = '{}'::jsonb` for every audit event. This fail-closed allow-list prevents raw invitation tokens, email addresses, content and arbitrary identifiers from entering the audit log before the event writers exist. A later append-only migration may replace this empty-object constraint with per-event, typed allow-lists only when it simultaneously introduces reviewed audit writers and SQL tests for accepted and rejected keys/values. It must never accept a browser-supplied free-form `jsonb` object.

### DDL creation order

There is no referential-FK cycle if the objects are created in this order; ownership/member consistency is enforced by deferrable/transition-safe triggers and command RPCs, not circular foreign keys.

1. Create the private schema (if absent), controlled function-owner/worker roles in deployment infrastructure, and revoke default privileges. Keep the existing `pgcrypto` extension and `public.set_updated_at()`.
2. Create `private.operation_jobs`, `private.phase4_backfill_checkpoints`, and `private.account_deletion_requests` with no client grants.
3. Create `public.workspaces`, then `public.calendars` (`workspace_id` is nullable); add owner/workspace indexes and the one-personal-calendar partial unique index.
4. Create `public.sharing_invitations` and its scope/status/token/pending-email constraints and indexes.
5. Create `public.workspace_memberships` and `public.calendar_memberships`, each with its own FKs to its already-created resource and invitations, provenance checks and active partial unique indexes.
6. Create `public.workspace_ownership_transfers` and `public.calendar_ownership_transfers`, including nullable resource FKs, immutable snapshots and pending-transfer indexes.
7. Create `public.calendar_audit_log` with nullable current-resource FK, immutable resource snapshot, retention/redaction columns and the Phase 4A fail-closed metadata constraint; add event-specific metadata validation only with future approved writers.
8. Add nullable Phase 3 compatibility columns and supporting indexes (next subsection); create `public.task_assignments` and `public.task_comments` only after their Phase 3 parent tables and `calendar_id` columns exist.
9. Create triggers for timestamps, personal-calendar shape, immutable ownership/scope, owner-membership synchronization, last-owner protection, membership removal/unassignment, invitation state, category/calendar integrity, soft delete/restore, audit append, and comment visibility/redaction. Triggers that must observe the owner/membership pair during a transfer are deferred constraint triggers or run only inside the locked transfer RPC context.
10. Create private effective-role functions first, then public boolean helpers and command RPCs; set owner, fixed `search_path`, schema-qualified references, `revoke all from public`, and only the grants listed in Section 5.
11. Enable RLS and add policies to new tables while existing Phase 3 owner policies remain unchanged. Perform data backfill and validation before the Phase 3 policy cutover.

### Exact Phase 3 table and constraint changes

All changes are append-only migrations; old migration files remain untouched.

| Existing table | Expand stage | Contract stage after compatibility validation |
| --- | --- | --- |
| `categories` | Add nullable `calendar_id` FK to `calendars on delete restrict`; add nullable `created_by` FK to Auth `on delete set null`, populate from current `owner_id`; add `unique(calendar_id, id)` and calendar/name index. | Make `calendar_id` non-null; retain `owner_id` only as nullable legacy metadata during the compatibility window; replace `categories_owner_name_key` with calendar-scoped uniqueness, then schedule legacy-column removal only after all readers/types no longer use it. |
| `tasks` | Add nullable `calendar_id`, nullable `created_by`, `deleted_at`, `deleted_by`, `delete_reason`, `restored_at`, `restored_by`; calendar query indexes; non-validated `(calendar_id, category_id)` FK. Populate `created_by` from `owner_id`. | Validate/make calendar scope required; replace owner-based category FK/indexes with calendar-based equivalents; change the existing `owner_id -> auth.users on delete cascade` relation to nullable/set-null or remove it only after all writers use `created_by`; preserve Phase 3 UUIDs/timestamps/status checks. |
| `calendar_events` | Same calendar/creator/soft-delete columns, calendar time indexes and non-validated calendar/category FK. | Same FK/cascade and not-null cutover as tasks; preserve event interval check and UUID/timestamps. |
| `month_covers` | Add nullable `calendar_id`, nullable `created_by`, calendar/month index; populate creator from `owner_id`. | Make calendar scope required; replace `unique(owner_id, month_start)` with `unique(calendar_id, month_start)`; eliminate the Phase 3 cascade author relation after compatibility validation. |

During expansion, retain existing `owner_id` and its Phase 3 FKs/RLS unchanged. Before any account deletion can affect shared Phase 3-derived content, migrate the legacy owner relationship away from `on delete cascade` and validate that new calendar-scoped constraints cover every row. New shared records set `created_by = auth.uid()` through a trusted trigger/RPC; browser input cannot set it.

### RLS cutover order

1. Run all backfill checkpoints to `completed`, then execute the integrity gates from Section 4, including record/count/UUID/timestamp snapshots, category-calendar consistency and personal-isolation probes.
2. Deploy a backward-compatible application version that understands nullable `calendar_id` and never assumes membership-sharing is live. Keep sharing commands disabled.
3. Install and test new-table RLS, helper functions and command RPCs in the isolated environment. Confirm no `authenticated` direct DML policy exists for membership/invitation/transfer/audit/operations tables.
4. In a reviewed maintenance window, block conflicting Phase 3 writes and acquire suitable table locks. In one transaction, enable/verify final table RLS, create the new calendar-based Phase 3 policies, drop the old owner-only policies, and re-check policy/grant catalog state. New and old permissive policies must never be committed together.
5. Commit, run immediate multi-user smoke probes for personal isolation, editor/viewer boundaries and category forgery, then enable sharing command endpoints. If a gate fails before shared writes, retain/restore the old owner-only policies in a forward corrective transaction; do not perform a destructive down migration after sharing writes exist.

### Required SQL suites

**Before cutover:** existing Phase 2 timezone and identity tests; existing `phase3_calendar.sql`; additive-schema constraint/index tests; personal-calendar backfill retry/checkpoint tests; row/UUID/timestamp/category snapshot tests; and tests proving existing owner-only RLS still prevents every cross-user read/write while `calendar_id` is nullable.

**After cutover:**

1. owner/editor/viewer/outsider SELECT/INSERT/UPDATE/soft-delete/restore matrix for calendars, categories, tasks, events, covers, comments and assignments;
2. direct and inherited workspace role matrix, including workspace owner mapping only to calendar editor, direct-role precedence and no inherited access to personal calendars;
3. forged `calendar_id`, `workspace_id`, `owner_id`, `category_id`, assignee and creator values through both RPC/API and direct authenticated SQL;
4. membership provenance, duplicate pending invitations, revoked/expired/reused tokens, concurrent acceptance, existing-member no-downgrade, re-invite and revocation-vs-independent-membership cases;
5. calendar/workspace transfer locking, non-member target rejection, personal-transfer rejection, final-owner removal/demotion rejection and post-transfer former-owner access;
6. conversion of a personal calendar with unchanged record UUID/count/date/category snapshots and no participant access before explicit membership;
7. editor soft delete/viewer denial/owner restore, task-assignment soft-unassignment, hidden comment visibility and legal comment-redaction authorization;
8. account-deletion request states: personal-only completion, shared-owner block, successful transfer/resume, invitation/membership cleanup, author anonymization, no orphan/FK failure/cascade of shared records;
9. audit allow-list, 24-month eligibility boundary, resource-deletion snapshot retention and no raw token/PII in audit/job data;
10. SECURITY DEFINER ownership/search-path/grant catalog assertions, including inability to pass a forged actor ID or enumerate memberships through helpers; and
11. failure/recovery: worker crash before/after checkpoint update, duplicate delivery, retry exhaustion/dead letter, and resume without duplicated calendars, assignments, audit events or access grants.

### Review conclusion and production blockers

The model is implementable without a circular FK: resources precede membership rows, and membership rows never serve as a foreign-key parent of their resource. Effective-role helpers require a deliberately narrow `SECURITY DEFINER` read path to avoid RLS recursion; this is acceptable only with the fixed search path, private resolver, no caller-supplied subject, minimal EXECUTE grants and catalog/grant tests above. Partial backfill and recovery are safe only through null-only idempotent writes plus atomic per-batch checkpoint update. Ownership transfer and account deletion are correct only when their locked command functions and final integrity gates are implemented together.

Production remains blocked until: legal confirmation of retention/comment-redaction rules; a deployment design chooses and secures the worker identity/secret manager/monitoring; all listed isolated SQL suites pass against the actual migration; a privileged-Auth operational runbook is approved; and a separate production migration/backfill review approves observed data volume, lock plan and rollback gates.
