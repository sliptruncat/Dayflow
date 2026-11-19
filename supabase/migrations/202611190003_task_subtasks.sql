-- DAYFLOW Planner: one-level, owner-scoped subtasks. Apply only through Supabase CLI.
create unique index if not exists tasks_owner_id_id_key
  on public.tasks (owner_id, id);
create table public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  title text not null check (title = btrim(title) and char_length(title) between 1 and 240),
  is_completed boolean not null default false,
  completed_at timestamptz,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_subtasks_completed_state check (is_completed = (completed_at is not null)),
  constraint task_subtasks_task_owner_fkey
    foreign key (owner_id, task_id) references public.tasks(owner_id, id) on delete cascade
);

create index task_subtasks_owner_task_position_idx on public.task_subtasks (owner_id, task_id, position, created_at);
create trigger task_subtasks_set_updated_at before update on public.task_subtasks
for each row execute function public.set_updated_at();

alter table public.task_subtasks enable row level security;
create policy "task_subtasks_select_own" on public.task_subtasks for select using (owner_id = auth.uid());
create policy "task_subtasks_insert_own" on public.task_subtasks for insert with check (owner_id = auth.uid());
create policy "task_subtasks_update_own" on public.task_subtasks for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "task_subtasks_delete_own" on public.task_subtasks for delete using (owner_id = auth.uid());
