-- Tournament lifecycle template for Supabase
-- Covers: tournament feed states, player registration, admin rank tagging,
-- pool assignment, and wheel setup (drafting tables are placeholders for now).

create extension if not exists "pgcrypto";

-- 1) Tournament master
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
create index if not exists idx_tournaments_v2_starts_at on public.tournaments_v2(starts_at);

-- Optional rule: keep at most one active tournament in open/current state.
create unique index if not exists uq_one_active_tournament
  on public.tournaments_v2 ((status))
  where status in ('open_registration', 'current');

-- 2) Player registration per tournament (user registers here)
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

  -- Admin decision fields
  selected_for_tournament boolean not null default false,
  rank_tier text check (rank_tier in ('Pro', 'Semi-Pro', 'Casual')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Prevent duplicate registration for same tag in same tournament.
  unique (tournament_id, brawl_tag)
);

create index if not exists idx_tournament_registrations_tournament_id
  on public.tournament_registrations(tournament_id);
create index if not exists idx_tournament_registrations_selected
  on public.tournament_registrations(selected_for_tournament);
create index if not exists idx_tournament_registrations_rank_tier
  on public.tournament_registrations(rank_tier);

-- 3) Admin pools (A, B, C...) per tournament
create table if not exists public.tournament_pools (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments_v2(id) on delete cascade,
  pool_code text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tournament_id, pool_code)
);

create index if not exists idx_tournament_pools_tournament_id
  on public.tournament_pools(tournament_id);

-- 4) Pool assignment (admin puts Pro/Semi-Pro/Casual players into pool)
create table if not exists public.tournament_pool_members (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments_v2(id) on delete cascade,
  pool_id uuid not null references public.tournament_pools(id) on delete cascade,
  registration_id uuid not null references public.tournament_registrations(id) on delete cascade,
  rank_tier text not null check (rank_tier in ('Pro', 'Semi-Pro', 'Casual')),
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),

  -- Each registration can be assigned once per tournament.
  unique (tournament_id, registration_id)
);

create index if not exists idx_tournament_pool_members_pool_id
  on public.tournament_pool_members(pool_id);
create index if not exists idx_tournament_pool_members_tournament_id
  on public.tournament_pool_members(tournament_id);
create index if not exists idx_tournament_pool_members_rank_tier
  on public.tournament_pool_members(rank_tier);

-- 5) Wheel setup (admin can create wheel for Pool + role, e.g., Pool A Pro)
create table if not exists public.wheel_configs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments_v2(id) on delete cascade,
  pool_id uuid not null references public.tournament_pools(id) on delete cascade,
  rank_tier text not null check (rank_tier in ('Pro', 'Semi-Pro', 'Casual')),
  title text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  unique (tournament_id, pool_id, rank_tier)
);

create table if not exists wheel_entries (
  id uuid primary key default gen_random_uuid(),
  wheel_id uuid not null references public.wheel_configs(id) on delete cascade,
  registration_id uuid not null references public.tournament_registrations(id) on delete cascade,
  weight integer not null default 1 check (weight > 0),
  created_at timestamptz not null default now(),
  unique (wheel_id, registration_id)
);

create index if not exists idx_wheel_entries_wheel_id on public.wheel_entries(wheel_id);

-- 6) Draft placeholder (kept empty for now, ready for later phase)
create table if not exists public.draft_sessions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments_v2(id) on delete cascade,
  pool_id uuid references public.tournament_pools(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  notes text,
  created_at timestamptz not null default now()
);

-- Helper: create one tournament template with pools A/B/C
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

-- Example usage:
-- select public.create_tournament_template('April Championship 2026');

