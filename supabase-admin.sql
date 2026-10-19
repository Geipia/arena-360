-- ARENA 360 · statistiques de visites + accès admin
-- À coller dans Supabase → SQL Editor → New query → Run (une seule fois ; le relancer ne casse rien).
--
-- Ce qui est enregistré pour chaque page vue : la date, la section (foot, cyclisme, jeu…), le type d'appareil,
-- la provenance (Instagram, Google, lien direct…) et si c'est le début d'une visite.
-- Aucun cookie, aucune adresse IP, aucun identifiant de visiteur.

create table if not exists public.page_views (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  section    text not null check (char_length(section) <= 40),
  device     text not null check (device in ('mobile', 'tablet', 'desktop')),
  source     text not null check (char_length(source) <= 40),
  first_view boolean not null default false,
  installed  boolean not null default false
);
create index if not exists page_views_at on public.page_views (at);

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.page_views enable row level security;
alter table public.admins enable row level security;

-- tout visiteur peut ajouter une vue (sans pouvoir choisir la date)
drop policy if exists "ajouter une vue" on public.page_views;
create policy "ajouter une vue" on public.page_views
  for insert to anon, authenticated
  with check (at > now() - interval '1 minute' and at < now() + interval '1 minute');

-- personne ne lit les vues directement ; l'admin passe par la fonction ci-dessous
drop policy if exists "un admin se voit" on public.admins;
create policy "un admin se voit" on public.admins
  for select to authenticated using (user_id = auth.uid());

create or replace function public.arena_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- tableau de bord : chiffres agrégés sur N jours (réservé aux admins)
create or replace function public.arena_stats(days int default 30) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := date_trunc('day', now() at time zone 'Europe/Brussels') at time zone 'Europe/Brussels' - make_interval(days => greatest(days, 1) - 1);
  result json;
begin
  if not public.arena_is_admin() then
    raise exception 'réservé aux admins';
  end if;
  select json_build_object(
    'generated_at', now(),
    'days', days,
    'total_views', (select count(*) from page_views where at >= since),
    'total_visits', (select count(*) from page_views where at >= since and first_view),
    'today_views', (select count(*) from page_views where at >= date_trunc('day', now() at time zone 'Europe/Brussels') at time zone 'Europe/Brussels'),
    'today_visits', (select count(*) from page_views where first_view and at >= date_trunc('day', now() at time zone 'Europe/Brussels') at time zone 'Europe/Brussels'),
    'all_time_views', (select count(*) from page_views),
    'installed_views', (select count(*) from page_views where at >= since and installed),
    'daily', (select coalesce(json_agg(d order by d.day), '[]') from (
        select to_char(g.day, 'YYYY-MM-DD') as day,
               count(v.id) as views,
               count(v.id) filter (where v.first_view) as visits
        from generate_series(since at time zone 'Europe/Brussels', now() at time zone 'Europe/Brussels', interval '1 day') as g(day)
        left join page_views v on date_trunc('day', v.at at time zone 'Europe/Brussels') = date_trunc('day', g.day)
        group by g.day) d),
    'by_device', (select coalesce(json_object_agg(device, n), '{}') from (select device, count(*) n from page_views where at >= since group by device) x),
    'by_section', (select coalesce(json_agg(x order by x.n desc), '[]') from (select section, count(*) n from page_views where at >= since group by section) x),
    'by_source', (select coalesce(json_agg(x order by x.n desc), '[]') from (select source, count(*) filter (where first_view) n from page_views where at >= since group by source) x),
    'by_hour', (select coalesce(json_agg(x order by x.h), '[]') from (select extract(hour from at at time zone 'Europe/Brussels')::int h, count(*) n from page_views where at >= since group by 1) x),
    'players', json_build_object(
        'velo', (select count(*) from entries),
        'foot', (select count(*) from foot_entries))
  ) into result;
  return result;
end;
$$;
revoke all on function public.arena_stats(int) from public, anon;
grant execute on function public.arena_stats(int) to authenticated;

-- ===================================================================
-- Te donner les droits d'admin (ton pseudo du jeu : Geipia).
insert into public.admins (user_id)
select user_id from public.entries where pseudo = 'Geipia'
on conflict do nothing;
