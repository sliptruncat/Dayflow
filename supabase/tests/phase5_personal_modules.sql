begin;
-- Run only against a temporary local Supabase stack or an isolated test database.
-- All users and records are rolled back at the end of this test.
do $$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  category_a uuid;
  transaction_a uuid;
  budget_a uuid;
  contact_a uuid;
  interaction_a uuid;
  health_a uuid;
  affected_rows integer;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (owner_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', owner_a::text||'@personal-modules-test.invalid', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (owner_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', owner_b::text||'@personal-modules-test.invalid', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

  -- Seed one record in each personal module table as the database owner.
  insert into public.finance_categories(owner_id,name,kind) values (owner_a,'Food','expense') returning id into category_a;
  insert into public.finance_transactions(owner_id,category_id,title,amount,kind) values (owner_a,category_a,'Groceries',42.50,'expense') returning id into transaction_a;
  insert into public.finance_budgets(owner_id,category_id,name,amount) values (owner_a,category_a,'Food budget',300) returning id into budget_a;
  insert into public.contacts(owner_id,full_name,next_follow_up_at) values (owner_a,'Private contact',current_date + 7) returning id into contact_a;
  insert into public.contact_interactions(owner_id,contact_id,summary) values (owner_a,contact_a,'Private interaction') returning id into interaction_a;
  insert into public.health_entries(owner_id,entry_date,mood) values (owner_a,current_date,4) returning id into health_a;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub',owner_b::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);

  -- A different authenticated user must not read any of the six private tables.
  if exists(select 1 from public.finance_categories where id=category_a) then raise exception 'Finance category SELECT isolation failed'; end if;
  if exists(select 1 from public.finance_transactions where id=transaction_a) then raise exception 'Finance transaction SELECT isolation failed'; end if;
  if exists(select 1 from public.finance_budgets where id=budget_a) then raise exception 'Finance budget SELECT isolation failed'; end if;
  if exists(select 1 from public.contacts where id=contact_a) then raise exception 'Contacts SELECT isolation failed'; end if;
  if exists(select 1 from public.contact_interactions where id=interaction_a) then raise exception 'Contact interaction SELECT isolation failed'; end if;
  if exists(select 1 from public.health_entries where id=health_a) then raise exception 'Health entry SELECT isolation failed'; end if;

  -- Cross-owner updates and deletes must affect zero rows.
  update public.finance_categories set name='stolen' where id=category_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'Finance category UPDATE crossed owner boundary'; end if;
  delete from public.finance_categories where id=category_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'Finance category DELETE crossed owner boundary'; end if;

  update public.finance_transactions set title='stolen' where id=transaction_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'Finance transaction UPDATE crossed owner boundary'; end if;
  delete from public.finance_transactions where id=transaction_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'Finance transaction DELETE crossed owner boundary'; end if;

  update public.finance_budgets set name='stolen' where id=budget_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'Finance budget UPDATE crossed owner boundary'; end if;
  delete from public.finance_budgets where id=budget_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'Finance budget DELETE crossed owner boundary'; end if;

  update public.contacts set full_name='stolen' where id=contact_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'Contacts UPDATE crossed owner boundary'; end if;
  delete from public.contacts where id=contact_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'Contacts DELETE crossed owner boundary'; end if;

  update public.contact_interactions set summary='stolen' where id=interaction_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'Contact interactions UPDATE crossed owner boundary'; end if;
  delete from public.contact_interactions where id=interaction_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'Contact interactions DELETE crossed owner boundary'; end if;

  update public.health_entries set mood=1 where id=health_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'Health entries UPDATE crossed owner boundary'; end if;
  delete from public.health_entries where id=health_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then raise exception 'Health entries DELETE crossed owner boundary'; end if;

  -- A user must not forge another owner's identity on insert.
  begin insert into public.finance_categories(owner_id,name,kind) values (owner_a,'forged','expense'); raise exception 'Expected finance category owner check'; exception when insufficient_privilege then null; end;
  begin insert into public.finance_transactions(owner_id,title,amount,kind) values (owner_a,'forged',1,'expense'); raise exception 'Expected finance transaction owner check'; exception when insufficient_privilege then null; end;
  begin insert into public.finance_budgets(owner_id,name,amount) values (owner_a,'forged',1); raise exception 'Expected finance budget owner check'; exception when insufficient_privilege then null; end;
  begin insert into public.contacts(owner_id,full_name) values (owner_a,'forged'); raise exception 'Expected contact owner check'; exception when insufficient_privilege then null; end;
  begin insert into public.contact_interactions(owner_id,contact_id,summary) values (owner_a,contact_a,'forged'); raise exception 'Expected interaction owner check'; exception when insufficient_privilege then null; end;
  begin insert into public.health_entries(owner_id,mood) values (owner_a,3); raise exception 'Expected health entry owner check'; exception when insufficient_privilege then null; end;

  -- Composite owner foreign keys must prevent linking another user's category/contact.
  begin
    insert into public.finance_transactions(owner_id,category_id,title,amount,kind) values (owner_b,category_a,'cross-owner category',1,'expense');
    raise exception 'Expected cross-owner finance category foreign-key violation';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.contact_interactions(owner_id,contact_id,summary) values (owner_b,contact_a,'cross-owner contact');
    raise exception 'Expected cross-owner contact foreign-key violation';
  exception when foreign_key_violation then null;
  end;

  -- The owner can still read and update every own record.
  perform set_config('request.jwt.claim.sub',owner_a::text,true);
  if not exists(select 1 from public.finance_categories where id=category_a) then raise exception 'Owner cannot read own finance category'; end if;
  if not exists(select 1 from public.finance_transactions where id=transaction_a) then raise exception 'Owner cannot read own finance transaction'; end if;
  if not exists(select 1 from public.finance_budgets where id=budget_a) then raise exception 'Owner cannot read own finance budget'; end if;
  if not exists(select 1 from public.contacts where id=contact_a) then raise exception 'Owner cannot read own contact'; end if;
  if not exists(select 1 from public.contact_interactions where id=interaction_a) then raise exception 'Owner cannot read own interaction'; end if;
  if not exists(select 1 from public.health_entries where id=health_a) then raise exception 'Owner cannot read own health entry'; end if;

  update public.finance_categories set name='Food updated' where id=category_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'Owner cannot update own finance category'; end if;
  update public.finance_transactions set title='Groceries updated' where id=transaction_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'Owner cannot update own finance transaction'; end if;
  update public.finance_budgets set amount=350 where id=budget_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'Owner cannot update own finance budget'; end if;
  update public.contacts set full_name='Private contact updated' where id=contact_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'Owner cannot update own contact'; end if;
  update public.contact_interactions set summary='Private interaction updated' where id=interaction_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'Owner cannot update own interaction'; end if;
  update public.health_entries set mood=5 where id=health_a;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then raise exception 'Owner cannot update own health entry'; end if;
end $$;
rollback;
