-- DAYFLOW Phase 2: identity records, preferences, defaults, and RLS.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https?://'),
  locale text not null default 'ru' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  theme_id text not null default 'sage' check (theme_id in ('sage', 'griotte', 'seafoam')),
  locale text not null default 'ru' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 100),
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  time_format text not null default '24h' check (time_format in ('24h', '12h')),
  date_format text not null default 'DD.MM.YYYY' check (date_format in ('DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_preferences_owner_id_idx on public.user_preferences(owner_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();
create trigger user_preferences_set_updated_at before update on public.user_preferences
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, locale, timezone)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''), 'ru', 'UTC');
  insert into public.user_preferences (owner_id, theme_id, locale, timezone)
  values (new.id, 'sage', 'ru', 'UTC');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_delete_own" on public.profiles for delete using (id = auth.uid());

create policy "preferences_select_own" on public.user_preferences for select using (owner_id = auth.uid());
create policy "preferences_insert_own" on public.user_preferences for insert with check (owner_id = auth.uid());
create policy "preferences_update_own" on public.user_preferences for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "preferences_delete_own" on public.user_preferences for delete using (owner_id = auth.uid());
