-- ARENA 360 · notifications (coups d'envoi, buts, résultats des équipes et championnats suivis)
-- À coller dans Supabase → SQL Editor → New query → Run, APRÈS avoir créé la fonction « arena-push » (voir NOTIFICATIONS.md).
-- Le relancer ne casse rien.

-- 1) abonnements : un par téléphone/navigateur, avec ce que la personne suit
create table if not exists public.push_subs (
  endpoint   text primary key check (endpoint like 'https://%' and char_length(endpoint) < 1000),
  p256dh     text not null check (char_length(p256dh) < 200),
  auth       text not null check (char_length(auth) < 100),
  follows    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;   -- aucune lecture directe : seulement via les fonctions ci-dessous

-- 2) mémoire des matchs (pour savoir ce qui a changé depuis la dernière minute)
create table if not exists public.push_match_state (
  event_id   text primary key,
  league     text not null,
  state      text not null,
  home_score int  not null default 0,
  away_score int  not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.push_match_state enable row level security;

-- 3) s'abonner / se désabonner (appelées par l'appli, sans compte)
create or replace function public.arena_push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_follows jsonb)
returns void language sql security definer set search_path = public as $$
  insert into push_subs (endpoint, p256dh, auth, follows, updated_at)
  values (p_endpoint, p_p256dh, p_auth, coalesce(p_follows, '{}'::jsonb), now())
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, follows = excluded.follows, updated_at = now();
$$;
create or replace function public.arena_push_unsubscribe(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from push_subs where endpoint = p_endpoint;
$$;
grant execute on function public.arena_push_subscribe(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.arena_push_unsubscribe(text) to anon, authenticated;

-- 4) nombre d'abonnés (page Admin)
create or replace function public.arena_push_count() returns int
language sql stable security definer set search_path = public as $$
  select case when public.arena_is_admin() then (select count(*)::int from push_subs) else null end;
$$;
grant execute on function public.arena_push_count() to authenticated;

-- 5) minuterie : le robot « arena-push » vérifie les matchs chaque minute
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.unschedule('arena-push') where exists (select 1 from cron.job where jobname = 'arena-push');
select cron.schedule('arena-push', '* * * * *', $cron$
  select net.http_post(
    url     := 'https://ljlshnxllwrgkrhqtyth.supabase.co/functions/v1/arena-push',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbHNobnhsbHdyZ2tyaHF0eXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MDU0ODYsImV4cCI6MjEwNzk4MTQ4Nn0.90tbSczln_Y7i-5I99fpLPIWa8Uln-O_lasdGAFImJs"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
$cron$);
