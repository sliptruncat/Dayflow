-- Run only after `supabase db reset` against a local or isolated Supabase database.
-- Phase 4A is schema-only: it adds no backfill and leaves Phase 3 RLS unchanged.
begin;

do $$
declare
  owner_a uuid := '10000000-0000-0000-0000-000000000001';
  owner_b uuid := '10000000-0000-0000-0000-000000000002';
  owner_c uuid := '10000000-0000-0000-0000-000000000003';
  workspace_a uuid; workspace_delete uuid;
  calendar_a uuid; calendar_shared uuid; calendar_delete uuid;
  invitation_a uuid; audit_a uuid;
  phase4a_task_id uuid; phase4a_event_id uuid; phase4a_cover_id uuid;
  relation_name text; privilege_name text;
begin
  foreach relation_name in array array[
    'private.operation_jobs', 'private.phase4_backfill_checkpoints', 'private.account_deletion_requests',
    'public.workspaces', 'public.calendars', 'public.sharing_invitations',
    'public.workspace_memberships', 'public.calendar_memberships',
    'public.calendar_ownership_transfers', 'public.workspace_ownership_transfers',
    'public.calendar_audit_log'
  ] loop
    if to_regclass(relation_name) is null then raise exception 'Missing Phase 4A table: %', relation_name; end if;
    if not exists (select 1 from pg_class where oid = relation_name::regclass and relrowsecurity) then
      raise exception 'Expected RLS on Phase 4A table: %', relation_name;
    end if;
  end loop;

  if exists (
    select 1 from pg_policies
    where (schemaname = 'private' and tablename in ('operation_jobs', 'phase4_backfill_checkpoints', 'account_deletion_requests'))
       or (schemaname = 'public' and tablename in (
         'workspaces', 'calendars', 'sharing_invitations', 'workspace_memberships', 'calendar_memberships',
         'calendar_ownership_transfers', 'workspace_ownership_transfers', 'calendar_audit_log'
       ))
  ) then raise exception 'Phase 4A must not create RLS policies before the cutover'; end if;

  if has_schema_privilege('anon', 'private', 'usage') or has_schema_privilege('authenticated', 'private', 'usage') then
    raise exception 'private schema is accessible to an ordinary Supabase role';
  end if;

  foreach relation_name in array array[
    'public.workspaces', 'public.calendars', 'public.sharing_invitations',
    'public.workspace_memberships', 'public.calendar_memberships',
    'public.calendar_ownership_transfers', 'public.workspace_ownership_transfers', 'public.calendar_audit_log',
    'private.operation_jobs', 'private.phase4_backfill_checkpoints', 'private.account_deletion_requests'
  ] loop
    foreach privilege_name in array array['select', 'insert', 'update', 'delete'] loop
      if has_table_privilege('anon', relation_name, privilege_name)
         or has_table_privilege('authenticated', relation_name, privilege_name) then
        raise exception 'Unexpected % privilege on %', privilege_name, relation_name;
      end if;
    end loop;
    if exists (
      select 1 from pg_class c
      cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) as acl
      where c.oid = relation_name::regclass
        and acl.grantee in (0, 'anon'::regrole::oid, 'authenticated'::regrole::oid)
    ) then raise exception 'Unexpected PUBLIC, anon, or authenticated ACL entry on %', relation_name; end if;
  end loop;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (owner_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'phase4a-owner-a@calendar-test.invalid', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (owner_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'phase4a-owner-b@calendar-test.invalid', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (owner_c, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'phase4a-owner-c@calendar-test.invalid', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

  insert into public.workspaces (owner_id, title, kind) values (owner_a, 'Family workspace', 'family') returning id into workspace_a;
  begin
    insert into public.workspaces (owner_id, title, kind) values (gen_random_uuid(), 'Invalid owner', 'family');
    raise exception 'Expected workspace owner foreign-key violation';
  exception when foreign_key_violation then null; end;
  insert into public.calendars (owner_id, title, kind) values (owner_a, 'Personal', 'personal') returning id into calendar_a;
  insert into public.calendars (owner_id, title, kind) values (owner_a, 'Shared', 'shared') returning id into calendar_shared;
  begin
    insert into public.calendars (owner_id, title, kind) values (owner_a, 'Second personal', 'personal');
    raise exception 'Expected one-personal-calendar uniqueness violation';
  exception when unique_violation then null; end;
  begin
    insert into public.calendars (owner_id, workspace_id, title, kind) values (owner_a, workspace_a, 'Invalid personal workspace', 'personal');
    raise exception 'Expected personal-calendar workspace check violation';
  exception when check_violation then null; end;
  begin
    insert into public.calendars (owner_id, workspace_id, title, kind) values (owner_a, gen_random_uuid(), 'Invalid shared workspace', 'shared');
    raise exception 'Expected calendar workspace foreign-key violation';
  exception when foreign_key_violation then null; end;

  insert into public.sharing_invitations (scope_type, workspace_id, email_normalized, role, token_hash, expires_at)
  values ('workspace', workspace_a, 'member@calendar-test.invalid', 'editor', repeat('a', 64), now() + interval '1 day') returning id into invitation_a;
  begin
    insert into public.sharing_invitations (scope_type, workspace_id, email_normalized, role, token_hash, expires_at)
    values ('workspace', workspace_a, 'member@calendar-test.invalid', 'viewer', repeat('b', 64), now() + interval '1 day');
    raise exception 'Expected pending workspace invitation uniqueness violation';
  exception when unique_violation then null; end;
  begin
    insert into public.sharing_invitations (scope_type, calendar_id, email_normalized, role, token_hash, expires_at)
    values ('calendar', calendar_shared, 'calendar-member@calendar-test.invalid', 'viewer', repeat('c', 64), now() + interval '1 day');
    insert into public.sharing_invitations (scope_type, calendar_id, email_normalized, role, token_hash, expires_at)
    values ('calendar', calendar_shared, 'calendar-member@calendar-test.invalid', 'viewer', repeat('d', 64), now() + interval '1 day');
    raise exception 'Expected pending calendar invitation uniqueness violation';
  exception when unique_violation then null; end;
  insert into public.sharing_invitations (scope_type, calendar_id, email_normalized, role, token_hash, status, accepted_by, accepted_at, expires_at)
  values ('calendar', calendar_shared, 'accepted@calendar-test.invalid', 'viewer', repeat('e', 64), 'accepted', owner_b, now(), now() + interval '1 day');
  begin
    insert into public.sharing_invitations (scope_type, workspace_id, email_normalized, role, token_hash, accepted_by, expires_at)
    values ('workspace', workspace_a, 'invalid@calendar-test.invalid', 'viewer', repeat('f', 64), owner_b, now() + interval '1 day');
    raise exception 'Expected accepted invitation lifecycle check violation';
  exception when check_violation then null; end;
  begin
    delete from public.workspaces where id = workspace_a;
    raise exception 'Expected invitation workspace restrict violation';
  exception when foreign_key_violation then null; end;

  insert into public.workspace_memberships (workspace_id, user_id, role, grant_source) values (workspace_a, owner_a, 'owner', 'system_owner');
  begin
    insert into public.workspace_memberships (workspace_id, user_id, role, grant_source) values (workspace_a, owner_a, 'owner', 'system_owner');
    raise exception 'Expected active workspace-membership uniqueness violation';
  exception when unique_violation then null; end;
  begin
    insert into public.workspace_memberships (workspace_id, user_id, role, grant_source) values (workspace_a, owner_b, 'viewer', 'invitation');
    raise exception 'Expected membership invitation provenance check violation';
  exception when check_violation then null; end;
  insert into public.calendar_memberships (calendar_id, user_id, role, grant_source) values (calendar_a, owner_a, 'owner', 'system_owner');
  update public.calendar_memberships set removed_at = now() where calendar_id = calendar_a and user_id = owner_a;
  insert into public.calendar_memberships (calendar_id, user_id, role, grant_source) values (calendar_a, owner_a, 'owner', 'system_owner');

  insert into private.operation_jobs (task_type, idempotency_key) values ('phase4_backfill', 'phase4a-test-job');
  begin
    insert into private.operation_jobs (task_type, idempotency_key) values ('phase4_backfill', 'phase4a-test-job');
    raise exception 'Expected operation-job idempotency uniqueness violation';
  exception when unique_violation then null; end;
  begin
    insert into private.operation_jobs (task_type, idempotency_key, attempt_count, max_attempts) values ('phase4_backfill', 'phase4a-invalid-attempts', 6, 5);
    raise exception 'Expected operation-job attempt constraint violation';
  exception when check_violation then null; end;
  insert into private.phase4_backfill_checkpoints (job_name, table_name) values ('phase4a-categories', 'categories');
  begin
    insert into private.phase4_backfill_checkpoints (job_name, table_name) values ('phase4a-categories-duplicate', 'categories');
    raise exception 'Expected checkpoint table uniqueness violation';
  exception when unique_violation then null; end;

  insert into public.calendar_audit_log (calendar_id, calendar_id_snapshot, event_type, target_type, target_id, metadata)
  values (calendar_shared, calendar_shared, 'invitation_created', 'invitation', invitation_a, '{}'::jsonb) returning id into audit_a;
  begin
    insert into public.calendar_audit_log (calendar_id, calendar_id_snapshot, event_type, target_type, target_id, metadata)
    values (calendar_shared, calendar_shared, 'invitation_created', 'invitation', invitation_a, '{"token":"secret"}'::jsonb);
    raise exception 'Expected fail-closed audit token metadata violation';
  exception when check_violation then null; end;
  begin
    insert into public.calendar_audit_log (calendar_id, calendar_id_snapshot, event_type, target_type, target_id, metadata)
    values (calendar_shared, calendar_shared, 'invitation_created', 'invitation', invitation_a, '{"email":"person@example.invalid"}'::jsonb);
    raise exception 'Expected fail-closed audit email metadata violation';
  exception when check_violation then null; end;
  begin
    insert into public.calendar_audit_log (calendar_id, calendar_id_snapshot, event_type, target_type, target_id, metadata)
    values (calendar_shared, calendar_shared, 'task_soft_deleted', 'task', gen_random_uuid(), '{"description":"private task content"}'::jsonb);
    raise exception 'Expected fail-closed audit content metadata violation';
  exception when check_violation then null; end;
  begin
    insert into public.calendar_audit_log (calendar_id, calendar_id_snapshot, event_type, target_type, target_id, metadata)
    values (calendar_shared, gen_random_uuid(), 'invitation_created', 'invitation', invitation_a, '{}'::jsonb);
    raise exception 'Expected audit calendar snapshot check violation';
  exception when check_violation then null; end;

  insert into public.calendars (owner_id, title, kind) values (owner_a, 'Delete test', 'shared') returning id into calendar_delete;
  insert into public.calendar_memberships (calendar_id, user_id, role, grant_source) values (calendar_delete, owner_b, 'viewer', 'manual');
  insert into public.calendar_ownership_transfers (calendar_id, calendar_id_snapshot, from_owner_id, to_owner_id, initiated_by, status, completed_at)
  values (calendar_delete, calendar_delete, owner_a, owner_b, owner_a, 'completed', now());
  insert into public.calendar_audit_log (calendar_id, calendar_id_snapshot, event_type, target_type, target_id, metadata)
  values (calendar_delete, calendar_delete, 'calendar_ownership_transferred', 'calendar', calendar_delete, '{}'::jsonb);
  delete from public.calendars where id = calendar_delete;
  if exists (select 1 from public.calendar_memberships where calendar_id = calendar_delete) then raise exception 'Calendar membership did not cascade on calendar deletion'; end if;
  if exists (select 1 from public.calendar_ownership_transfers where calendar_id_snapshot = calendar_delete and calendar_id is not null) then raise exception 'Calendar transfer did not set calendar_id to null on deletion'; end if;
  if exists (select 1 from public.calendar_audit_log where calendar_id_snapshot = calendar_delete and calendar_id is not null) then raise exception 'Calendar audit did not set calendar_id to null on deletion'; end if;

  insert into public.workspaces (owner_id, title, kind) values (owner_a, 'Delete workspace', 'work') returning id into workspace_delete;
  insert into public.workspace_memberships (workspace_id, user_id, role, grant_source) values (workspace_delete, owner_b, 'viewer', 'manual');
  delete from public.workspaces where id = workspace_delete;
  if exists (select 1 from public.workspace_memberships where workspace_id = workspace_delete) then raise exception 'Workspace membership did not cascade on workspace deletion'; end if;

  begin
    delete from auth.users where id = owner_a;
    raise exception 'Expected resource-owner restrict violation';
  exception when foreign_key_violation then null; end;

  insert into public.categories (owner_id, created_by, name, color) values (owner_a, owner_c, 'Phase 4A nullable columns', '#123456');
  insert into public.tasks (owner_id, title) values (owner_a, 'Phase 4A nullable task') returning id into phase4a_task_id;
  insert into public.calendar_events (owner_id, title, starts_at, ends_at) values (owner_a, 'Phase 4A nullable event', now(), now() + interval '1 hour') returning id into phase4a_event_id;
  insert into public.month_covers (owner_id, month_start) values (owner_a, date '2026-11-01') returning id into phase4a_cover_id;
  if exists (select 1 from public.categories where owner_id = owner_a and (calendar_id is not null or created_by = owner_a)) or exists (
    select 1 from public.tasks where id = phase4a_task_id and (calendar_id is not null or created_by is not null)
    union all select 1 from public.calendar_events where id = phase4a_event_id and (calendar_id is not null or created_by is not null)
    union all select 1 from public.month_covers where id = phase4a_cover_id and (calendar_id is not null or created_by is not null)
  ) then raise exception 'Phase 4A unexpectedly backfilled Phase 3 calendar or creator columns'; end if;
  insert into private.account_deletion_requests (user_id) values (owner_c);
  delete from auth.users where id = owner_c;
  if exists (select 1 from private.account_deletion_requests where user_id = owner_c) then raise exception 'Account deletion request did not cascade with Auth user deletion'; end if;
  if exists (select 1 from public.categories where owner_id = owner_a and name = 'Phase 4A nullable columns' and created_by is not null) then raise exception 'created_by did not set null after Auth user deletion'; end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

do $$
declare relation_name text; row_count integer; owner_a uuid := '10000000-0000-0000-0000-000000000001';
begin
  foreach relation_name in array array[
    'public.workspaces', 'public.calendars', 'public.sharing_invitations', 'public.workspace_memberships',
    'public.calendar_memberships', 'public.calendar_ownership_transfers', 'public.workspace_ownership_transfers',
    'public.calendar_audit_log', 'private.operation_jobs', 'private.phase4_backfill_checkpoints', 'private.account_deletion_requests'
  ] loop
    begin
      execute format('select count(*) from %s', relation_name) into row_count;
      if row_count <> 0 then raise exception 'Phase 4A exposed rows from % to authenticated user', relation_name; end if;
    exception when insufficient_privilege then null; end;
  end loop;
  select count(*) into row_count from public.categories where owner_id = owner_a;
  if row_count <> 0 then raise exception 'Phase 4A weakened existing Phase 3 category RLS'; end if;
end;
$$;
rollback;

begin;
set local role anon;
do $$
declare relation_name text; row_count integer;
begin
  foreach relation_name in array array[
    'public.workspaces', 'public.calendars', 'public.sharing_invitations', 'public.workspace_memberships',
    'public.calendar_memberships', 'public.calendar_ownership_transfers', 'public.workspace_ownership_transfers',
    'public.calendar_audit_log', 'private.operation_jobs', 'private.phase4_backfill_checkpoints', 'private.account_deletion_requests'
  ] loop
    begin
      execute format('select count(*) from %s', relation_name) into row_count;
      if row_count <> 0 then raise exception 'Phase 4A exposed rows from % to anon user', relation_name; end if;
    exception when insufficient_privilege then null; end;
  end loop;
end;
$$;
rollback;
