begin;
-- Run only against `supabase start` or an isolated test project. Never production.
-- All test rows and auth users are rolled back.
do $$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  own_theme text;
  cross_owner_rows integer;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (owner_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      concat(owner_a, '@phase2-test.invalid'), 'not-used', now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (owner_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      concat(owner_b, '@phase2-test.invalid'), 'not-used', now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now());

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', owner_a::text, true);

  select theme_id into own_theme from public.user_preferences where owner_id = owner_a;
  if own_theme <> 'sage' then
    raise exception 'New-user trigger did not create default preferences';
  end if;

  update public.user_preferences set theme_id = 'seafoam' where owner_id = owner_a;
  get diagnostics cross_owner_rows = row_count;
  if cross_owner_rows <> 1 then
    raise exception 'Owner could not update own preferences';
  end if;

  select count(*) into cross_owner_rows from public.profiles where id = owner_b;
  if cross_owner_rows <> 0 then
    raise exception 'RLS exposed another user profile';
  end if;

  select count(*) into cross_owner_rows from public.user_preferences where owner_id = owner_b;
  if cross_owner_rows <> 0 then
    raise exception 'RLS exposed another user preferences';
  end if;

  update public.user_preferences set theme_id = 'griotte' where owner_id = owner_b;
  get diagnostics cross_owner_rows = row_count;
  if cross_owner_rows <> 0 then
    raise exception 'RLS updated another user preferences';
  end if;

  delete from public.profiles where id = owner_b;
  get diagnostics cross_owner_rows = row_count;
  if cross_owner_rows <> 0 then
    raise exception 'RLS deleted another user profile';
  end if;

  begin
    insert into public.user_preferences (owner_id, theme_id)
    values (owner_b, 'griotte');
    raise exception 'Expected forged owner insert to be rejected';
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
