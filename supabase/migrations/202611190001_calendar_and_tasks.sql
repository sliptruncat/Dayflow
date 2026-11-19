-- DAYFLOW Phase 3: owner-scoped categories, tasks, events and month-cover metadata.
-- Apply only through the ordered Supabase migration workflow.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 60),
  color text not null check (color = lower(color) and color ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, id)
);

create unique index categories_owner_name_key on public.categories (owner_id, lower(name));

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid,
  title text not null check (title = btrim(title) and char_length(title) between 1 and 240),
  description text check (description is null or char_length(description) <= 10000),
  status text not null default 'inbox' check (status in ('inbox', 'planned', 'in_progress', 'paused', 'completed', 'cancelled')),
  priority text not null default 'none' check (priority in ('none', 'low', 'medium', 'high')),
  color_override text check (color_override is null or (color_override = lower(color_override) and color_override ~ '^#[0-9a-f]{6}$')),
  start_at timestamptz,
  deadline_at timestamptz,
  is_all_day boolean not null default false,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 10080),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_deadline_after_start check (deadline_at is null or start_at is null or deadline_at >= start_at),
  constraint tasks_completed_state check ((status = 'completed') = (completed_at is not null)),
  constraint tasks_category_owner_fkey
    foreign key (owner_id, category_id) references public.categories(owner_id, id) on delete restrict
);

create index tasks_owner_start_at_idx on public.tasks (owner_id, start_at);
create index tasks_owner_deadline_at_idx on public.tasks (owner_id, deadline_at);
create index tasks_owner_status_idx on public.tasks (owner_id, status);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid,
  title text not null check (title = btrim(title) and char_length(title) between 1 and 240),
  description text check (description is null or char_length(description) <= 10000),
  color_override text check (color_override is null or (color_override = lower(color_override) and color_override ~ '^#[0-9a-f]{6}$')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_all_day boolean not null default false,
  location text check (location is null or char_length(location) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_ends_after_starts check (ends_at > starts_at),
  constraint calendar_events_category_owner_fkey
    foreign key (owner_id, category_id) references public.categories(owner_id, id) on delete restrict
);

create index calendar_events_owner_starts_at_idx on public.calendar_events (owner_id, starts_at);
create index calendar_events_owner_ends_at_idx on public.calendar_events (owner_id, ends_at);

create table public.month_covers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null check (month_start = date_trunc('month', month_start::timestamp)::date),
  theme_id text check (theme_id is null or theme_id in ('sage', 'griotte', 'seafoam')),
  image_path text check (image_path is null or (image_path = btrim(image_path) and char_length(image_path) between 1 and 1024)),
  source text not null default 'preset' check (source in ('preset', 'uploaded', 'generated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, month_start)
);

create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();
create trigger calendar_events_set_updated_at before update on public.calendar_events
for each row execute function public.set_updated_at();
create trigger month_covers_set_updated_at before update on public.month_covers
for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.month_covers enable row level security;

create policy "categories_select_own" on public.categories for select using (owner_id = auth.uid());
create policy "categories_insert_own" on public.categories for insert with check (owner_id = auth.uid());
create policy "categories_update_own" on public.categories for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "categories_delete_own" on public.categories for delete using (owner_id = auth.uid());

create policy "tasks_select_own" on public.tasks for select using (owner_id = auth.uid());
create policy "tasks_insert_own" on public.tasks for insert with check (owner_id = auth.uid());
create policy "tasks_update_own" on public.tasks for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "tasks_delete_own" on public.tasks for delete using (owner_id = auth.uid());

create policy "calendar_events_select_own" on public.calendar_events for select using (owner_id = auth.uid());
create policy "calendar_events_insert_own" on public.calendar_events for insert with check (owner_id = auth.uid());
create policy "calendar_events_update_own" on public.calendar_events for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "calendar_events_delete_own" on public.calendar_events for delete using (owner_id = auth.uid());

create policy "month_covers_select_own" on public.month_covers for select using (owner_id = auth.uid());
create policy "month_covers_insert_own" on public.month_covers for insert with check (owner_id = auth.uid());
create policy "month_covers_update_own" on public.month_covers for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "month_covers_delete_own" on public.month_covers for delete using (owner_id = auth.uid());
