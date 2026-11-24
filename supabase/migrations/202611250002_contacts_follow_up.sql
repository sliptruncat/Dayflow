alter table public.contacts
  add column if not exists next_follow_up_at date;

create index if not exists contacts_owner_follow_up_idx
  on public.contacts(owner_id, next_follow_up_at)
  where next_follow_up_at is not null;
