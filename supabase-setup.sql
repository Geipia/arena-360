-- ARENA « Je parie » : à coller dans Supabase → SQL Editor → New query → Run.
-- Crée la table des équipes et les règles de sécurité :
--   * tout le monde peut voir le classement ;
--   * chaque joueur ne peut créer / modifier QUE sa propre équipe ;
--   * les modifications sont refusées en dehors des périodes autorisées
--     (avant le 19 janvier 2027 et pendant les fenêtres de transferts, mêmes dates que config.js).

create table if not exists public.entries (
  user_id    uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  pseudo     text not null check (char_length(pseudo) between 2 and 20),
  season     int  not null default 2027,
  riders     jsonb not null default '[]'::jsonb check (jsonb_array_length(riders) <= 15),
  history    jsonb not null default '[]'::jsonb,
  transfers  jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index if not exists entries_pseudo_unique on public.entries (lower(pseudo));

alter table public.entries enable row level security;

-- Périodes où les équipes peuvent changer (heure de Bruxelles).
create or replace function public.arena_team_open() returns boolean
language sql stable as $$
  select (now() at time zone 'Europe/Brussels') < timestamp '2027-01-19 00:00'
      or (now() at time zone 'Europe/Brussels') between timestamp '2027-04-26 00:00' and timestamp '2027-05-02 23:59:59'
      or (now() at time zone 'Europe/Brussels') between timestamp '2027-07-26 00:00' and timestamp '2027-08-01 23:59:59';
$$;

drop policy if exists "classement visible par tous" on public.entries;
create policy "classement visible par tous" on public.entries
  for select using (true);

drop policy if exists "je cree mon equipe" on public.entries;
create policy "je cree mon equipe" on public.entries
  for insert to authenticated
  with check (auth.uid() = user_id and (jsonb_array_length(riders) = 0 or public.arena_team_open()));

drop policy if exists "je modifie mon equipe" on public.entries;
create policy "je modifie mon equipe" on public.entries
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.arena_team_open());

-- ===================================================================
-- Jeu « Je parie » Football (saison 2026-27) : 3 équipes par joueur.
-- Les équipes peuvent changer jusqu'au 31 mai 2027 (5 changements, contrôlés par l'appli).
create table if not exists public.foot_entries (
  user_id    uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  pseudo     text not null check (char_length(pseudo) between 2 and 20),
  season     text not null default '2026-27',
  teams      jsonb not null default '[]'::jsonb check (jsonb_array_length(teams) <= 3),
  history    jsonb not null default '[]'::jsonb,
  changes    int  not null default 0 check (changes between 0 and 5),
  updated_at timestamptz not null default now()
);

alter table public.foot_entries enable row level security;

drop policy if exists "classement foot visible par tous" on public.foot_entries;
create policy "classement foot visible par tous" on public.foot_entries
  for select using (true);

drop policy if exists "je cree mes equipes foot" on public.foot_entries;
create policy "je cree mes equipes foot" on public.foot_entries
  for insert to authenticated
  with check (auth.uid() = user_id and now() < timestamptz '2027-06-01 00:00+02');

drop policy if exists "je modifie mes equipes foot" on public.foot_entries;
create policy "je modifie mes equipes foot" on public.foot_entries
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and now() < timestamptz '2027-06-01 00:00+02');
