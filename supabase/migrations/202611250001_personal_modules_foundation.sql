-- Personal modules foundation: finance, contacts and private wellness journal.
-- This migration is CI/Preview only until separately approved for Production.
create table public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  kind text not null check (kind in ('income','expense')),
  color text not null default '#9aa88f' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  unique (owner_id, name, kind)
);
create table public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 180),
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null default 'RUB' check (currency ~ '^[A-Z]{3}$'),
  kind text not null check (kind in ('income','expense')),
  occurred_on date not null default current_date,
  is_recurring boolean not null default false,
  recurrence text check (recurrence in ('weekly','monthly','yearly')),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_transactions_category_owner_fkey foreign key (owner_id, category_id)
    references public.finance_categories(owner_id, id) on delete set null
);
create index finance_transactions_owner_date_idx on public.finance_transactions(owner_id, occurred_on desc);
create table public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 100),
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null default 'RUB' check (currency ~ '^[A-Z]{3}$'),
  period text not null default 'monthly' check (period in ('weekly','monthly','yearly')),
  starts_on date not null default current_date,
  created_at timestamptz not null default now(),
  constraint finance_budgets_category_owner_fkey foreign key (owner_id, category_id)
    references public.finance_categories(owner_id, id) on delete set null
);
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 160),
  company text check (company is null or char_length(company) <= 160),
  role text check (role is null or char_length(role) <= 120),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 40),
  birthday date,
  notes text check (notes is null or char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contacts_owner_name_idx on public.contacts(owner_id, full_name);
create table public.contact_interactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null,
  occurred_at timestamptz not null default now(),
  channel text not null default 'note' check (channel in ('note','call','meeting','email','message')),
  summary text not null check (char_length(trim(summary)) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint contact_interactions_contact_owner_fkey foreign key (owner_id, contact_id)
    references public.contacts(owner_id, id) on delete cascade
);
create index contact_interactions_contact_date_idx on public.contact_interactions(owner_id, contact_id, occurred_at desc);
create table public.health_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  sleep_minutes integer check (sleep_minutes is null or sleep_minutes between 0 and 1440),
  mood smallint check (mood is null or mood between 1 and 5),
  energy smallint check (energy is null or energy between 1 and 5),
  notes text check (notes is null or char_length(notes) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, entry_date)
);
create index health_entries_owner_date_idx on public.health_entries(owner_id, entry_date desc);

create function public.set_personal_module_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger finance_transactions_updated_at before update on public.finance_transactions for each row execute function public.set_personal_module_updated_at();
create trigger contacts_updated_at before update on public.contacts for each row execute function public.set_personal_module_updated_at();
create trigger health_entries_updated_at before update on public.health_entries for each row execute function public.set_personal_module_updated_at();

alter table public.finance_categories enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_budgets enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_interactions enable row level security;
alter table public.health_entries enable row level security;

create policy finance_categories_own on public.finance_categories for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy finance_transactions_own on public.finance_transactions for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy finance_budgets_own on public.finance_budgets for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy contacts_own on public.contacts for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy contact_interactions_own on public.contact_interactions for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy health_entries_own on public.health_entries for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
