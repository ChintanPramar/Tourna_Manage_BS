-- Tourna Manage BS schema for Semi-Pro drafting, pools, teams, matches, and MVP voting.
-- Assumes Supabase Postgres with auth.users available.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  role text not null check (role in ('admin', 'user')) default 'user',
  created_at timestamptz not null default now()
);

create table if not exists public.pools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  capacity_semi_pro integer not null default 2 check (capacity_semi_pro > 0),
  semi_pro_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  role text not null check (role in ('Pro', 'Semi-Pro', 'Casual')),
  available boolean not null default true,
  mvp_eligible boolean not null default false,
  pool_id uuid references public.pools(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_players_role on public.players(role);
create index if not exists idx_players_pool_id on public.players(pool_id);
create index if not exists idx_players_mvp_eligible on public.players(mvp_eligible);

create table if not exists public.team_assignments (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  role text not null check (role in ('Pro', 'Semi-Pro', 'Casual')),
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (pool_id, player_id),
  unique (player_id)
);

create index if not exists idx_team_assignments_pool_id on public.team_assignments(pool_id);
create index if not exists idx_team_assignments_player_id on public.team_assignments(player_id);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  semi_pro_left_id uuid not null references public.players(id) on delete cascade,
  semi_pro_right_id uuid not null references public.players(id) on delete cascade,
  winner_player_id uuid not null references public.players(id) on delete cascade,
  loser_player_id uuid not null references public.players(id) on delete cascade,
  coin_toss_winner_player_id uuid null references public.players(id) on delete set null,
  coin_toss_winner_name text,
  coin_toss_pick_first text,
  winner_brawler_pick text,
  loser_brawler_pick text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (winner_player_id <> loser_player_id)
);

create index if not exists idx_match_results_winner on public.match_results(winner_player_id);
create index if not exists idx_match_results_loser on public.match_results(loser_player_id);

create table if not exists public.mvp_votes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  voter_profile_id uuid references public.profiles(id) on delete set null,
  voter_label text,
  created_at timestamptz not null default now(),
  unique (player_id, voter_profile_id)
);

create index if not exists idx_mvp_votes_player_id on public.mvp_votes(player_id);

create or replace function public.enforce_pool_semi_pro_capacity()
returns trigger
language plpgsql
as $$
declare
  pool_capacity integer;
  semi_pro_count integer;

begin

  if new.pool_id is null then
    return new;
  end if;

  select capacity_semi_pro into pool_capacity
  from public.pools
  where id = new.pool_id;

  if pool_capacity is null then
    raise exception 'Pool % not found', new.pool_id;
  end if;

  select count(*) into semi_pro_count
  from public.players
  where pool_id = new.pool_id
    and role = 'Semi-Pro'
    and id <> coalesce(old.id, gen_random_uuid());

  if new.role = 'Semi-Pro' and semi_pro_count >= pool_capacity then
    raise exception 'Pool % reached Semi-Pro capacity %', new.pool_id, pool_capacity;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_pool_semi_pro_capacity on public.players;
create trigger trg_enforce_pool_semi_pro_capacity
before insert or update of pool_id, role on public.players
for each row execute function public.enforce_pool_semi_pro_capacity();

create or replace function public.sync_pool_counts()
returns trigger
language plpgsql
as $$
begin
  update public.pools p
  set semi_pro_count = (
    select count(*)
    from public.players pl
    where pl.pool_id = p.id
      and pl.role = 'Semi-Pro'
  )
  where p.id = coalesce(new.pool_id, old.pool_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_pool_counts on public.players;
create trigger trg_sync_pool_counts
after insert or update or delete on public.players
for each row execute function public.sync_pool_counts();

drop policy if exists "public read profiles" on public.profiles;
drop policy if exists "public read players" on public.players;
drop policy if exists "public read pools" on public.pools;
drop policy if exists "public read team assignments" on public.team_assignments;
drop policy if exists "public read match results" on public.match_results;
drop policy if exists "public read mvp votes" on public.mvp_votes;
drop policy if exists "authenticated manage pools" on public.pools;
drop policy if exists "authenticated manage players" on public.players;
drop policy if exists "authenticated manage assignments" on public.team_assignments;
drop policy if exists "authenticated manage matches" on public.match_results;
drop policy if exists "authenticated manage votes" on public.mvp_votes;

alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.pools enable row level security;
alter table public.team_assignments enable row level security;
alter table public.match_results enable row level security;
alter table public.mvp_votes enable row level security;

create policy "public read profiles" on public.profiles for select using (true);
create policy "public read players" on public.players for select using (true);
create policy "public read pools" on public.pools for select using (true);
create policy "public read team assignments" on public.team_assignments for select using (true);
create policy "public read match results" on public.match_results for select using (true);
create policy "public read mvp votes" on public.mvp_votes for select using (true);

create policy "authenticated manage pools" on public.pools for all to authenticated using (true) with check (true);
create policy "authenticated manage players" on public.players for all to authenticated using (true) with check (true);
create policy "authenticated manage assignments" on public.team_assignments for all to authenticated using (true) with check (true);
create policy "authenticated manage matches" on public.match_results for all to authenticated using (true) with check (true);
create policy "authenticated manage votes" on public.mvp_votes for all to authenticated using (true) with check (true);
