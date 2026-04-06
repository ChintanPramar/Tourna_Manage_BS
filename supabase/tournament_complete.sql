-- Complete Supabase SQL for one-tournament lifecycle template
-- Date: 2026-04-07
-- Includes:
-- 1) Tournament feed statuses (previous/current/open_registration/upcoming)
-- 2) Per-tournament player registrations
-- 3) Admin rank tagging (Pro/Semi-Pro/Casual) and selection
-- 4) Admin pool creation and assignment (A/B/C, etc.)
-- 5) Wheel configuration by pool + rank tier
-- 6) Draft placeholders for later implementation

create extension if not exists "pgcrypto";

-- =============================
-- Utility functions and triggers
-- =============================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- =============================
-- Tournament core
-- =============================

create table if not exists public.tournaments_v2 (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null check (status in ('upcoming', 'open_registration', 'current', 'previous')),
  registration_open_at timestamptz,
  registration_close_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tournaments_v2_status on public.tournaments_v2(status);
create index if not exists idx_tournaments_v2_dates on public.tournaments_v2(starts_at, ends_at);

-- Keep at most one active tournament across open/current.
create unique index if not exists uq_one_active_tournament
  on public.tournaments_v2 ((true))
  where status in ('open_registration', 'current');

-- =============================
-- Tournament registrations
-- =============================

create table if not exists public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments_v2(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,

  player_name text not null,
  brawl_tag text not null,
  trophies integer not null default 0,
  brawler_rank integer,
  victories_3v3 integer not null default 0,
  club_name text,

  selected_for_tournament boolean not null default false,
  rank_tier text check (rank_tier in ('Pro', 'Semi-Pro', 'Casual')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (tournament_id, brawl_tag)
);

-- Composite unique keys to support strict same-tournament FK checks.
create unique index if not exists uq_tournament_registrations_tournament_id_id
  on public.tournament_registrations(tournament_id, id);

create index if not exists idx_tournament_registrations_tournament_id
  on public.tournament_registrations(tournament_id);
create index if not exists idx_tournament_registrations_selected
  on public.tournament_registrations(selected_for_tournament);
create index if not exists idx_tournament_registrations_rank_tier
  on public.tournament_registrations(rank_tier);

-- =============================
-- Pools and assignments
-- =============================

create table if not exists public.tournament_pools (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments_v2(id) on delete cascade,
  pool_code text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, pool_code)
);

create unique index if not exists uq_tournament_pools_tournament_id_id
  on public.tournament_pools(tournament_id, id);

create index if not exists idx_tournament_pools_tournament_id
  on public.tournament_pools(tournament_id);

create table if not exists public.tournament_pool_members (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments_v2(id) on delete cascade,
  pool_id uuid not null,
  registration_id uuid not null,
  rank_tier text not null check (rank_tier in ('Pro', 'Semi-Pro', 'Casual')),
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),

  unique (tournament_id, registration_id)
);

-- Strictly enforce that pool and registration belong to the same tournament.
alter table public.tournament_pool_members
  drop constraint if exists tournament_pool_members_tournament_pool_fk;
alter table public.tournament_pool_members
  add constraint tournament_pool_members_tournament_pool_fk
  foreign key (tournament_id, pool_id)
  references public.tournament_pools(tournament_id, id)
  on delete cascade;

alter table public.tournament_pool_members
  drop constraint if exists tournament_pool_members_tournament_registration_fk;
alter table public.tournament_pool_members
  add constraint tournament_pool_members_tournament_registration_fk
  foreign key (tournament_id, registration_id)
  references public.tournament_registrations(tournament_id, id)
  on delete cascade;

create index if not exists idx_tournament_pool_members_tournament_id
  on public.tournament_pool_members(tournament_id);
create index if not exists idx_tournament_pool_members_pool_id
  on public.tournament_pool_members(pool_id);
create index if not exists idx_tournament_pool_members_rank_tier
  on public.tournament_pool_members(rank_tier);

-- =============================
-- Wheel setup
-- =============================

create table if not exists public.wheel_configs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments_v2(id) on delete cascade,
  pool_id uuid not null,
  rank_tier text not null check (rank_tier in ('Pro', 'Semi-Pro', 'Casual')),
  title text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, pool_id, rank_tier)
);

alter table public.wheel_configs
  drop constraint if exists wheel_configs_tournament_pool_fk;
alter table public.wheel_configs
  add constraint wheel_configs_tournament_pool_fk
  foreign key (tournament_id, pool_id)
  references public.tournament_pools(tournament_id, id)
  on delete cascade;

create table if not exists public.wheel_entries (
  id uuid primary key default gen_random_uuid(),
  wheel_id uuid not null references public.wheel_configs(id) on delete cascade,
  registration_id uuid not null references public.tournament_registrations(id) on delete cascade,
  weight integer not null default 1 check (weight > 0),
  created_at timestamptz not null default now(),
  unique (wheel_id, registration_id)
);

create index if not exists idx_wheel_configs_tournament_pool_role
  on public.wheel_configs(tournament_id, pool_id, rank_tier);
create index if not exists idx_wheel_entries_wheel_id
  on public.wheel_entries(wheel_id);

-- =============================
-- Draft placeholders
-- =============================

create table if not exists public.draft_sessions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments_v2(id) on delete cascade,
  pool_id uuid,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.draft_sessions
  drop constraint if exists draft_sessions_pool_id_fkey;
alter table public.draft_sessions
  add constraint draft_sessions_pool_id_fkey
  foreign key (pool_id) references public.tournament_pools(id) on delete set null;

-- =============================
-- Triggers for updated_at
-- =============================

drop trigger if exists trg_tournaments_v2_updated_at on public.tournaments_v2;
create trigger trg_tournaments_v2_updated_at
before update on public.tournaments_v2
for each row execute function public.set_updated_at();

drop trigger if exists trg_tournament_registrations_updated_at on public.tournament_registrations;
create trigger trg_tournament_registrations_updated_at
before update on public.tournament_registrations
for each row execute function public.set_updated_at();

drop trigger if exists trg_tournament_pools_updated_at on public.tournament_pools;
create trigger trg_tournament_pools_updated_at
before update on public.tournament_pools
for each row execute function public.set_updated_at();

drop trigger if exists trg_wheel_configs_updated_at on public.wheel_configs;
create trigger trg_wheel_configs_updated_at
before update on public.wheel_configs
for each row execute function public.set_updated_at();

drop trigger if exists trg_draft_sessions_updated_at on public.draft_sessions;
create trigger trg_draft_sessions_updated_at
before update on public.draft_sessions
for each row execute function public.set_updated_at();

-- =============================
-- Helper functions
-- =============================

create or replace function public.create_tournament_template(
  p_title text,
  p_created_by uuid default null,
  p_status text default 'open_registration'
)
returns uuid
language plpgsql
as $$
declare
  v_tournament_id uuid;
begin
  if p_status not in ('upcoming', 'open_registration', 'current', 'previous') then
    raise exception 'Invalid status: %', p_status;
  end if;

  insert into public.tournaments_v2 (title, status, created_by)
  values (p_title, p_status, p_created_by)
  returning id into v_tournament_id;

  insert into public.tournament_pools (tournament_id, pool_code, created_by)
  values
    (v_tournament_id, 'A', p_created_by),
    (v_tournament_id, 'B', p_created_by),
    (v_tournament_id, 'C', p_created_by);

  return v_tournament_id;
end;
$$;

create or replace function public.add_wheel_entries_from_pool_role(
  p_wheel_id uuid
)
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  insert into public.wheel_entries (wheel_id, registration_id, weight)
  select
    p_wheel_id,
    tpm.registration_id,
    1
  from public.wheel_configs wc
  join public.tournament_pool_members tpm
    on tpm.tournament_id = wc.tournament_id
   and tpm.pool_id = wc.pool_id
   and tpm.rank_tier = wc.rank_tier
  where wc.id = p_wheel_id
  on conflict (wheel_id, registration_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Optional: view for tournament feed UI
create or replace view public.tournament_feed_view as
select
  t.id,
  t.title,
  t.status,
  t.registration_open_at,
  t.registration_close_at,
  t.starts_at,
  t.ends_at,
  t.created_at,
  coalesce(regs.total_registrations, 0) as total_registrations,
  coalesce(regs.selected_registrations, 0) as selected_registrations
from public.tournaments_v2 t
left join (
  select
    tournament_id,
    count(*) as total_registrations,
    count(*) filter (where selected_for_tournament) as selected_registrations
  from public.tournament_registrations
  group by tournament_id
) regs on regs.tournament_id = t.id;

-- =============================
-- Row Level Security
-- =============================

alter table public.tournaments_v2 enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.tournament_pools enable row level security;
alter table public.tournament_pool_members enable row level security;
alter table public.wheel_configs enable row level security;
alter table public.wheel_entries enable row level security;
alter table public.draft_sessions enable row level security;

-- tournaments_v2 policies
drop policy if exists tournaments_v2_select_all on public.tournaments_v2;
create policy tournaments_v2_select_all
  on public.tournaments_v2
  for select
  to anon, authenticated
  using (true);

drop policy if exists tournaments_v2_admin_insert on public.tournaments_v2;
create policy tournaments_v2_admin_insert
  on public.tournaments_v2
  for insert
  to authenticated
  with check (public.is_admin_user());

drop policy if exists tournaments_v2_admin_update on public.tournaments_v2;
create policy tournaments_v2_admin_update
  on public.tournaments_v2
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists tournaments_v2_admin_delete on public.tournaments_v2;
create policy tournaments_v2_admin_delete
  on public.tournaments_v2
  for delete
  to authenticated
  using (public.is_admin_user());

-- tournament_registrations policies
drop policy if exists tournament_registrations_select_all on public.tournament_registrations;
create policy tournament_registrations_select_all
  on public.tournament_registrations
  for select
  to authenticated
  using (true);

drop policy if exists tournament_registrations_user_insert on public.tournament_registrations;
create policy tournament_registrations_user_insert
  on public.tournament_registrations
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.tournaments_v2 t
      where t.id = tournament_id
        and t.status = 'open_registration'
    )
  );

drop policy if exists tournament_registrations_admin_update on public.tournament_registrations;
create policy tournament_registrations_admin_update
  on public.tournament_registrations
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists tournament_registrations_admin_delete on public.tournament_registrations;
create policy tournament_registrations_admin_delete
  on public.tournament_registrations
  for delete
  to authenticated
  using (public.is_admin_user());

-- pools / pool members / wheel / draft policies

drop policy if exists tournament_pools_select_all on public.tournament_pools;
create policy tournament_pools_select_all
  on public.tournament_pools
  for select
  to authenticated
  using (true);

drop policy if exists tournament_pools_admin_write on public.tournament_pools;
create policy tournament_pools_admin_write
  on public.tournament_pools
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists tournament_pool_members_select_all on public.tournament_pool_members;
create policy tournament_pool_members_select_all
  on public.tournament_pool_members
  for select
  to authenticated
  using (true);

drop policy if exists tournament_pool_members_admin_write on public.tournament_pool_members;
create policy tournament_pool_members_admin_write
  on public.tournament_pool_members
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists wheel_configs_select_all on public.wheel_configs;
create policy wheel_configs_select_all
  on public.wheel_configs
  for select
  to authenticated
  using (true);

drop policy if exists wheel_configs_admin_write on public.wheel_configs;
create policy wheel_configs_admin_write
  on public.wheel_configs
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists wheel_entries_select_all on public.wheel_entries;
create policy wheel_entries_select_all
  on public.wheel_entries
  for select
  to authenticated
  using (true);

drop policy if exists wheel_entries_admin_write on public.wheel_entries;
create policy wheel_entries_admin_write
  on public.wheel_entries
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists draft_sessions_select_all on public.draft_sessions;
create policy draft_sessions_select_all
  on public.draft_sessions
  for select
  to authenticated
  using (true);

drop policy if exists draft_sessions_admin_write on public.draft_sessions;
create policy draft_sessions_admin_write
  on public.draft_sessions
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- =============================
-- Quick template seed (optional)
-- =============================
-- select public.create_tournament_template('April Championship 2026');

