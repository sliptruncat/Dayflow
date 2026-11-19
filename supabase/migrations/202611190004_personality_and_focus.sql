-- DAYFLOW Block 3: personal progression, companion, achievements and focus history.
-- Apply only through the ordered Supabase CLI workflow.

create table public.user_progress (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  xp_total integer not null default 0 check (xp_total >= 0),
  level integer not null default 1 check (level >= 1),
  companion_stage text not null default 'egg' check (companion_stage in ('egg','hatchling','juvenile','adult')),
  productive_days integer not null default 0 check (productive_days >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_active_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('task_completed','focus_completed','daily_checkin')),
  source_id uuid,
  amount integer not null check (amount between 1 and 1000),
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (owner_id, source, source_id)
);
create unique index xp_events_daily_checkin_once_idx on public.xp_events (owner_id, source, occurred_on) where source = 'daily_checkin';
create index xp_events_owner_created_at_idx on public.xp_events (owner_id, created_at desc);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid,
  duration_seconds integer not null check (duration_seconds between 60 and 14400),
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0 and elapsed_seconds <= duration_seconds),
  status text not null default 'running' check (status in ('running','paused','completed','cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint focus_sessions_task_owner_fkey foreign key (owner_id, task_id) references public.tasks(owner_id, id) on delete set null (task_id),
  constraint focus_sessions_completion_state check ((status = 'completed') = (completed_at is not null))
);
create index focus_sessions_owner_started_at_idx on public.focus_sessions (owner_id, started_at desc);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  code text not null check (code in ('first_step','ten_tasks','focus_friend','seven_day_rhythm','level_five')),
  unlocked_at timestamptz not null default now(),
  unique (owner_id, code)
);

create or replace function public.dayflow_apply_xp(p_owner_id uuid, p_source text, p_source_id uuid, p_amount integer)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare inserted_count integer;
begin
  insert into public.xp_events (owner_id, source, source_id, amount) values (p_owner_id, p_source, p_source_id, p_amount) on conflict (owner_id, source, source_id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return; end if;
  insert into public.user_progress (owner_id, xp_total, level, companion_stage, productive_days, current_streak, longest_streak, last_active_on)
  values (p_owner_id, p_amount, 1, 'egg', 1, 1, 1, current_date)
  on conflict (owner_id) do update set
    xp_total = public.user_progress.xp_total + excluded.xp_total,
    level = greatest(1, floor((public.user_progress.xp_total + excluded.xp_total) / 100)::integer + 1),
    companion_stage = case when public.user_progress.xp_total + excluded.xp_total >= 1000 then 'adult' when public.user_progress.xp_total + excluded.xp_total >= 400 then 'juvenile' when public.user_progress.xp_total + excluded.xp_total >= 100 then 'hatchling' else 'egg' end,
    productive_days = public.user_progress.productive_days + case when public.user_progress.last_active_on is distinct from current_date then 1 else 0 end,
    current_streak = case when public.user_progress.last_active_on = current_date then public.user_progress.current_streak when public.user_progress.last_active_on = current_date - 1 then public.user_progress.current_streak + 1 else 1 end,
    longest_streak = greatest(public.user_progress.longest_streak, case when public.user_progress.last_active_on = current_date then public.user_progress.current_streak when public.user_progress.last_active_on = current_date - 1 then public.user_progress.current_streak + 1 else 1 end),
    last_active_on = current_date, updated_at = now();
end; $$;

create or replace function public.dayflow_task_completion_xp() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.dayflow_apply_xp(new.owner_id, 'task_completed', new.id, 20);
    insert into public.user_achievements(owner_id, code) values (new.owner_id, 'first_step') on conflict do nothing;
    if (select count(*) from public.tasks where owner_id = new.owner_id and status = 'completed') >= 10 then insert into public.user_achievements(owner_id, code) values (new.owner_id, 'ten_tasks') on conflict do nothing; end if;
    if (select current_streak from public.user_progress where owner_id = new.owner_id) >= 7 then insert into public.user_achievements(owner_id, code) values (new.owner_id, 'seven_day_rhythm') on conflict do nothing; end if;
    if (select level from public.user_progress where owner_id = new.owner_id) >= 5 then insert into public.user_achievements(owner_id, code) values (new.owner_id, 'level_five') on conflict do nothing; end if;
  end if;
  return new;
end; $$;
create trigger tasks_award_xp_after_completion after update of status on public.tasks for each row execute function public.dayflow_task_completion_xp();
create or replace function public.dayflow_focus_completion_xp() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.dayflow_apply_xp(new.owner_id, 'focus_completed', new.id, greatest(10, floor(new.elapsed_seconds / 60)::integer));
    insert into public.user_achievements(owner_id, code) values (new.owner_id, 'focus_friend') on conflict do nothing;
    if (select level from public.user_progress where owner_id = new.owner_id) >= 5 then insert into public.user_achievements(owner_id, code) values (new.owner_id, 'level_five') on conflict do nothing; end if;
  end if;
  return new;
end; $$;
create trigger focus_sessions_award_xp_after_completion after update of status on public.focus_sessions for each row execute function public.dayflow_focus_completion_xp();
revoke all on function public.dayflow_apply_xp(uuid, text, uuid, integer) from public, anon, authenticated;
revoke all on function public.dayflow_task_completion_xp() from public, anon, authenticated;
revoke all on function public.dayflow_focus_completion_xp() from public, anon, authenticated;
create trigger user_progress_set_updated_at before update on public.user_progress for each row execute function public.set_updated_at();
create trigger focus_sessions_set_updated_at before update on public.focus_sessions for each row execute function public.set_updated_at();

alter table public.user_progress enable row level security;
alter table public.xp_events enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.user_achievements enable row level security;
create policy "user_progress_select_own" on public.user_progress for select using (owner_id = auth.uid());
create policy "xp_events_select_own" on public.xp_events for select using (owner_id = auth.uid());
create policy "focus_sessions_select_own" on public.focus_sessions for select using (owner_id = auth.uid());
create policy "focus_sessions_insert_own" on public.focus_sessions for insert with check (owner_id = auth.uid());
create policy "focus_sessions_update_own" on public.focus_sessions for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "focus_sessions_delete_own" on public.focus_sessions for delete using (owner_id = auth.uid());
create policy "user_achievements_select_own" on public.user_achievements for select using (owner_id = auth.uid());
