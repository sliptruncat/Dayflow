begin;
-- Run only against supabase start or an isolated Supabase test project.
-- All fixtures are rolled back.
do $$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  item_id uuid;
  goal_id uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (owner_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', owner_a::text||'@planner-test.invalid', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (owner_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', owner_b::text||'@planner-test.invalid', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
  insert into public.inbox_items(owner_id,title) values (owner_a,'private note') returning id into item_id;
  insert into public.goals(owner_id,title) values (owner_a,'private goal') returning id into goal_id;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub',owner_b::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  if exists(select 1 from public.inbox_items where id=item_id) then raise exception 'Inbox isolation failed'; end if;
  if exists(select 1 from public.goals where id=goal_id) then raise exception 'Goal isolation failed'; end if;
  perform set_config('request.jwt.claim.sub',owner_a::text,true);
  if not exists(select 1 from public.inbox_items where id=item_id) then raise exception 'Owner cannot read own inbox item'; end if;
  if not exists(select 1 from public.goals where id=goal_id) then raise exception 'Owner cannot read own goal'; end if;
end $$;
rollback;
