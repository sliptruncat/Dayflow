-- Run only after `supabase db reset` against a local or isolated Supabase project.
-- The transaction is rolled back, so it never leaves test users or rows behind.
begin;

do $$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  category_a uuid;
  category_b uuid;
  task_a uuid;
  task_b uuid;
  event_a uuid;
  event_b uuid;
  cover_a uuid;
  cover_b uuid;
  cross_owner_rows integer;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (owner_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      concat(owner_a, '@calendar-test.invalid'), 'not-used', now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (owner_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      concat(owner_b, '@calendar-test.invalid'), 'not-used', now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now());

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', owner_a::text, true);

  insert into public.categories (owner_id, name, color)
  values (owner_a, 'Work', '#4a7c59') returning id into category_a;

  begin
    insert into public.categories (owner_id, name, color) values (owner_a, 'work', '#4a7c59');
    raise exception 'Expected case-insensitive category uniqueness violation';
  exception when unique_violation then null;
  end;

  insert into public.tasks (owner_id, category_id, title, status, completed_at)
  values (owner_a, category_a, 'Valid task', 'completed', now()) returning id into task_a;

  insert into public.calendar_events (owner_id, category_id, title, starts_at, ends_at)
  values (owner_a, category_a, 'Valid event', now(), now() + interval '1 hour') returning id into event_a;

  insert into public.month_covers (owner_id, month_start, theme_id)
  values (owner_a, date '2026-11-01', 'sage') returning id into cover_a;

  begin
    insert into public.calendar_events (owner_id, title, starts_at, ends_at)
    values (owner_a, 'Invalid interval', now(), now());
    raise exception 'Expected calendar interval constraint violation';
  exception when check_violation then null;
  end;

  begin
    insert into public.month_covers (owner_id, month_start) values (owner_a, date '2026-11-02');
    raise exception 'Expected month-start constraint violation';
  exception when check_violation then null;
  end;

  perform set_config('request.jwt.claim.sub', owner_b::text, true);
  insert into public.categories (owner_id, name, color)
  values (owner_b, 'Private', '#3355aa') returning id into category_b;
  insert into public.tasks (owner_id, category_id, title)
  values (owner_b, category_b, 'Private task') returning id into task_b;
  insert into public.calendar_events (owner_id, category_id, title, starts_at, ends_at)
  values (owner_b, category_b, 'Private event', now(), now() + interval '1 hour') returning id into event_b;
  insert into public.month_covers (owner_id, month_start)
  values (owner_b, date '2026-11-01') returning id into cover_b;

  perform set_config('request.jwt.claim.sub', owner_a::text, true);
  begin
    insert into public.tasks (owner_id, category_id, title)
    values (owner_a, category_b, 'Cross-owner category');
    raise exception 'Expected cross-owner category foreign-key violation';
  exception when foreign_key_violation then null;
  end;

  begin
    insert into public.calendar_events (owner_id, category_id, title, starts_at, ends_at)
    values (owner_a, category_b, 'Cross-owner event category', now(), now() + interval '1 hour');
    raise exception 'Expected cross-owner event category foreign-key violation';
  exception when foreign_key_violation then null;
  end;

  select count(*) into cross_owner_rows from public.categories where id = category_b;
  if cross_owner_rows <> 0 then
    raise exception 'RLS exposed another user''s category';
  end if;

  select count(*) into cross_owner_rows from public.tasks where id = task_b;
  if cross_owner_rows <> 0 then
    raise exception 'RLS exposed another user''s task';
  end if;

  select count(*) into cross_owner_rows from public.calendar_events where id = event_b;
  if cross_owner_rows <> 0 then
    raise exception 'RLS exposed another user''s event';
  end if;

  select count(*) into cross_owner_rows from public.month_covers where id = cover_b;
  if cross_owner_rows <> 0 then
    raise exception 'RLS exposed another user''s month cover';
  end if;

  update public.tasks set title = 'Cross-owner write' where id = task_a and owner_id = owner_b;
  get diagnostics cross_owner_rows = row_count;
  if cross_owner_rows <> 0 then
    raise exception 'RLS updated another user''s task';
  end if;

  delete from public.tasks where id = task_a and owner_id = owner_b;
  get diagnostics cross_owner_rows = row_count;
  if cross_owner_rows <> 0 then
    raise exception 'RLS deleted another user''s task';
  end if;

  update public.calendar_events set title = 'Cross-owner write' where id = event_b;
  get diagnostics cross_owner_rows = row_count;
  if cross_owner_rows <> 0 then
    raise exception 'RLS updated another user''s event';
  end if;

  delete from public.month_covers where id = cover_b;
  get diagnostics cross_owner_rows = row_count;
  if cross_owner_rows <> 0 then
    raise exception 'RLS deleted another user''s month cover';
  end if;

  begin
    insert into public.categories (owner_id, name, color) values (owner_b, 'Forged owner', '#000000');
    raise exception 'Expected RLS insert rejection for another owner';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
