-- DAYFLOW Phase 4A: additive collaboration database foundation.
-- This migration intentionally performs no backfill and does not alter Phase 3 RLS.
-- Controlled worker/function-owner roles are deployment infrastructure, not database
-- objects in this migration. No SECURITY DEFINER function is introduced here.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
alter default privileges in schema private revoke all on tables from public;
alter default privileges in schema private revoke all on sequences from public;
alter default privileges in schema private revoke all on functions from public;
alter default privileges in schema private revoke all on tables from anon, authenticated;
alter default privileges in schema private revoke all on sequences from anon, authenticated;
alter default privileges in schema private revoke all on functions from anon, authenticated;

create table private.operation_jobs (
  id uuid primary key default gen_random_uuid(),
  task_type text not null check (task_type in ('phase4_backfill', 'invitation_expiry', 'audit_retention', 'account_deletion', 'comment_erasure')),
  idempotency_key text not null check (idempotency_key = btrim(idempotency_key) and char_length(idempotency_key) between 1 and 240),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'running', 'retryable_failure', 'completed', 'dead_letter', 'cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text check (locked_by is null or (locked_by = btrim(locked_by) and char_length(locked_by) between 1 and 240)),
  completed_at timestamptz,
  last_error_code text check (last_error_code is null or (last_error_code = btrim(last_error_code) and char_length(last_error_code) between 1 and 120)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key),
  check (attempt_count <= max_attempts)
);

create index operation_jobs_claim_idx
  on private.operation_jobs (status, available_at, created_at)
  where status in ('pending', 'retryable_failure');

create table private.phase4_backfill_checkpoints (
  job_name text primary key check (job_name = btrim(job_name) and char_length(job_name) between 1 and 120),
  table_name text not null check (table_name in ('categories', 'tasks', 'calendar_events', 'month_covers')),
  last_processed_id uuid,
  rows_processed bigint not null default 0 check (rows_processed >= 0),
  status text not null default 'pending' check (status in ('pending', 'running', 'failed', 'completed')),
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  unique (table_name)
);

create table private.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'blocked', 'ready', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  block_reason_code text check (block_reason_code is null or (block_reason_code = btrim(block_reason_code) and char_length(block_reason_code) between 1 and 120)),
  last_error_code text check (last_error_code is null or (last_error_code = btrim(last_error_code) and char_length(last_error_code) between 1 and 120)),
  check (status <> 'completed' or completed_at is not null)
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (title = btrim(title) and char_length(title) between 1 and 120),
  kind text not null check (kind in ('family', 'friends', 'work')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspaces_owner_id_idx on public.workspaces (owner_id);

create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  workspace_id uuid references public.workspaces(id) on delete restrict,
  title text not null check (title = btrim(title) and char_length(title) between 1 and 120),
  color text check (color is null or (color = lower(color) and color ~ '^#[0-9a-f]{6}$')),
  kind text not null check (kind in ('personal', 'shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'personal' or workspace_id is null)
);

create unique index calendars_one_personal_per_owner
  on public.calendars (owner_id)
  where kind = 'personal';
create index calendars_workspace_id_idx on public.calendars (workspace_id);
create index calendars_owner_id_idx on public.calendars (owner_id);

create table public.sharing_invitations (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('workspace', 'calendar')),
  workspace_id uuid references public.workspaces(id) on delete restrict,
  calendar_id uuid references public.calendars(id) on delete restrict,
  email_normalized text not null check (email_normalized = lower(btrim(email_normalized)) and char_length(email_normalized) between 3 and 320),
  role text not null check (role in ('editor', 'viewer')),
  token_hash text not null check (token_hash = btrim(token_hash) and char_length(token_hash) between 32 and 512),
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope_type = 'workspace' and workspace_id is not null and calendar_id is null)
    or
    (scope_type = 'calendar' and calendar_id is not null and workspace_id is null)
  ),
  check (expires_at > created_at),
  check (
    (status = 'accepted' and accepted_by is not null and accepted_at is not null)
    or
    (status <> 'accepted' and accepted_by is null and accepted_at is null)
  ),
  check (status <> 'revoked' or revoked_at is not null),
  unique (token_hash)
);

create unique index sharing_invitations_pending_workspace_email_key
  on public.sharing_invitations (workspace_id, email_normalized)
  where scope_type = 'workspace' and status = 'pending';
create unique index sharing_invitations_pending_calendar_email_key
  on public.sharing_invitations (calendar_id, email_normalized)
  where scope_type = 'calendar' and status = 'pending';

create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  grant_source text not null check (grant_source in ('system_owner', 'manual', 'invitation', 'transfer')),
  invitation_id uuid references public.sharing_invitations(id) on delete restrict,
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references auth.users(id) on delete set null,
  check ((grant_source = 'invitation') = (invitation_id is not null))
);

create unique index workspace_memberships_active_scope_user_key
  on public.workspace_memberships (workspace_id, user_id)
  where removed_at is null;
create index workspace_memberships_active_user_idx
  on public.workspace_memberships (user_id)
  where removed_at is null;
create index workspace_memberships_active_scope_idx
  on public.workspace_memberships (workspace_id)
  where removed_at is null;

create table public.calendar_memberships (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  grant_source text not null check (grant_source in ('system_owner', 'manual', 'invitation', 'transfer')),
  invitation_id uuid references public.sharing_invitations(id) on delete restrict,
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references auth.users(id) on delete set null,
  check ((grant_source = 'invitation') = (invitation_id is not null))
);

create unique index calendar_memberships_active_scope_user_key
  on public.calendar_memberships (calendar_id, user_id)
  where removed_at is null;
create index calendar_memberships_active_user_idx
  on public.calendar_memberships (user_id)
  where removed_at is null;
create index calendar_memberships_active_scope_idx
  on public.calendar_memberships (calendar_id)
  where removed_at is null;

create table public.calendar_ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid references public.calendars(id) on delete set null,
  calendar_id_snapshot uuid not null,
  from_owner_id uuid references auth.users(id) on delete set null,
  to_owner_id uuid references auth.users(id) on delete set null,
  initiated_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled', 'expired')),
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  reason text check (reason is null or (reason = btrim(reason) and char_length(reason) between 1 and 500)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (calendar_id is null or calendar_id = calendar_id_snapshot),
  check (status <> 'pending' or calendar_id is not null),
  check (from_owner_id is null or to_owner_id is null or from_owner_id <> to_owner_id),
  check (status <> 'completed' or completed_at is not null),
  check (status <> 'cancelled' or cancelled_at is not null)
);

create unique index calendar_ownership_transfers_pending_calendar_key
  on public.calendar_ownership_transfers (calendar_id)
  where status = 'pending';
create index calendar_ownership_transfers_to_owner_status_idx
  on public.calendar_ownership_transfers (to_owner_id, status);

create table public.workspace_ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  workspace_id_snapshot uuid not null,
  from_owner_id uuid references auth.users(id) on delete set null,
  to_owner_id uuid references auth.users(id) on delete set null,
  initiated_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled', 'expired')),
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  reason text check (reason is null or (reason = btrim(reason) and char_length(reason) between 1 and 500)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (workspace_id is null or workspace_id = workspace_id_snapshot),
  check (status <> 'pending' or workspace_id is not null),
  check (from_owner_id is null or to_owner_id is null or from_owner_id <> to_owner_id),
  check (status <> 'completed' or completed_at is not null),
  check (status <> 'cancelled' or cancelled_at is not null)
);

create unique index workspace_ownership_transfers_pending_workspace_key
  on public.workspace_ownership_transfers (workspace_id)
  where status = 'pending';
create index workspace_ownership_transfers_to_owner_status_idx
  on public.workspace_ownership_transfers (to_owner_id, status);

create table public.calendar_audit_log (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid references public.calendars(id) on delete set null,
  calendar_id_snapshot uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'calendar_converted_to_shared', 'calendar_reparented',
    'invitation_created', 'invitation_accepted', 'invitation_revoked',
    'workspace_member_added', 'workspace_member_removed',
    'calendar_member_added', 'calendar_member_removed', 'member_role_changed',
    'calendar_ownership_transferred', 'workspace_ownership_transferred',
    'task_soft_deleted', 'event_soft_deleted', 'task_restored', 'event_restored',
    'account_deletion_requested', 'account_deletion_completed', 'comment_redacted'
  )),
  target_type text not null check (target_type = btrim(target_type) and char_length(target_type) between 1 and 80),
  target_id uuid not null,
  -- Phase 4A is fail-closed: per-event metadata schemas arrive in a later
  -- append-only migration alongside the only approved audit writers.
  metadata jsonb not null default '{}'::jsonb constraint calendar_audit_log_metadata_empty_check check (metadata = '{}'::jsonb),
  retention_until timestamptz not null default (now() + interval '24 months'),
  redacted_at timestamptz,
  created_at timestamptz not null default now(),
  check (calendar_id is null or calendar_id = calendar_id_snapshot),
  check (retention_until >= created_at)
);

create index calendar_audit_log_calendar_created_idx
  on public.calendar_audit_log (calendar_id, created_at desc);
create index calendar_audit_log_calendar_snapshot_created_idx
  on public.calendar_audit_log (calendar_id_snapshot, created_at desc);
create index calendar_audit_log_target_created_idx
  on public.calendar_audit_log (target_type, target_id, created_at desc);

alter table public.categories
  add column calendar_id uuid references public.calendars(id) on delete restrict,
  add column created_by uuid references auth.users(id) on delete set null;

alter table public.tasks
  add column calendar_id uuid references public.calendars(id) on delete restrict,
  add column created_by uuid references auth.users(id) on delete set null;

alter table public.calendar_events
  add column calendar_id uuid references public.calendars(id) on delete restrict,
  add column created_by uuid references auth.users(id) on delete set null;

alter table public.month_covers
  add column calendar_id uuid references public.calendars(id) on delete restrict,
  add column created_by uuid references auth.users(id) on delete set null;

create index categories_calendar_id_idx on public.categories (calendar_id);
create index tasks_calendar_id_idx on public.tasks (calendar_id);
create index calendar_events_calendar_id_idx on public.calendar_events (calendar_id);
create index month_covers_calendar_id_idx on public.month_covers (calendar_id);

create trigger operation_jobs_set_updated_at before update on private.operation_jobs
for each row execute function public.set_updated_at();
create trigger phase4_backfill_checkpoints_set_updated_at before update on private.phase4_backfill_checkpoints
for each row execute function public.set_updated_at();
create trigger account_deletion_requests_set_updated_at before update on private.account_deletion_requests
for each row execute function public.set_updated_at();
create trigger workspaces_set_updated_at before update on public.workspaces
for each row execute function public.set_updated_at();
create trigger calendars_set_updated_at before update on public.calendars
for each row execute function public.set_updated_at();
create trigger sharing_invitations_set_updated_at before update on public.sharing_invitations
for each row execute function public.set_updated_at();
create trigger workspace_memberships_set_updated_at before update on public.workspace_memberships
for each row execute function public.set_updated_at();
create trigger calendar_memberships_set_updated_at before update on public.calendar_memberships
for each row execute function public.set_updated_at();
create trigger calendar_ownership_transfers_set_updated_at before update on public.calendar_ownership_transfers
for each row execute function public.set_updated_at();
create trigger workspace_ownership_transfers_set_updated_at before update on public.workspace_ownership_transfers
for each row execute function public.set_updated_at();

alter table private.operation_jobs enable row level security;
alter table private.phase4_backfill_checkpoints enable row level security;
alter table private.account_deletion_requests enable row level security;
alter table public.workspaces enable row level security;
alter table public.calendars enable row level security;
alter table public.sharing_invitations enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.calendar_memberships enable row level security;
alter table public.calendar_ownership_transfers enable row level security;
alter table public.workspace_ownership_transfers enable row level security;
alter table public.calendar_audit_log enable row level security;

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;
revoke all on table public.workspaces, public.calendars, public.sharing_invitations,
  public.workspace_memberships, public.calendar_memberships,
  public.calendar_ownership_transfers, public.workspace_ownership_transfers,
  public.calendar_audit_log from public, anon, authenticated;
