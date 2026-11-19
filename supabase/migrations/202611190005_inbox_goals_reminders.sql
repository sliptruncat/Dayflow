-- DAYFLOW Block 4A: private capture, goals and reminder scheduling foundation.
create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  body text,
  status text not null default 'open' check (status in ('open','processed','archived')),
  converted_task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inbox_items_owner_status_created_idx on public.inbox_items(owner_id,status,created_at desc);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  status text not null default 'active' check (status in ('active','completed','paused','archived')),
  target_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_owner_status_target_idx on public.goals(owner_id,status,target_date);

create table public.task_reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  remind_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','sent','dismissed','cancelled')),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint task_reminders_task_owner_fkey foreign key (owner_id,task_id) references public.tasks(owner_id,id) on delete cascade,
  constraint task_reminders_delivery_state check ((status = 'sent') = (delivered_at is not null))
);
create index task_reminders_due_idx on public.task_reminders(remind_at) where status = 'scheduled';
create index task_reminders_owner_task_idx on public.task_reminders(owner_id,task_id,remind_at);

create trigger inbox_items_set_updated_at before update on public.inbox_items for each row execute function public.set_updated_at();
create trigger goals_set_updated_at before update on public.goals for each row execute function public.set_updated_at();

alter table public.inbox_items enable row level security;
alter table public.goals enable row level security;
alter table public.task_reminders enable row level security;
create policy "inbox_items_select_own" on public.inbox_items for select using (owner_id = auth.uid());
create policy "inbox_items_insert_own" on public.inbox_items for insert with check (owner_id = auth.uid());
create policy "inbox_items_update_own" on public.inbox_items for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "inbox_items_delete_own" on public.inbox_items for delete using (owner_id = auth.uid());
create policy "goals_select_own" on public.goals for select using (owner_id = auth.uid());
create policy "goals_insert_own" on public.goals for insert with check (owner_id = auth.uid());
create policy "goals_update_own" on public.goals for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "goals_delete_own" on public.goals for delete using (owner_id = auth.uid());
create policy "task_reminders_select_own" on public.task_reminders for select using (owner_id = auth.uid());
create policy "task_reminders_insert_own" on public.task_reminders for insert with check (owner_id = auth.uid());
create policy "task_reminders_update_own" on public.task_reminders for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "task_reminders_delete_own" on public.task_reminders for delete using (owner_id = auth.uid());
