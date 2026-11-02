-- ARENA « Mes équipes » : groupes de joueurs. À coller dans Supabase → SQL Editor → New query → Run.
-- Ne touche pas aux équipes existantes ; on peut le relancer sans risque.
--   * tout le monde voit les groupes et qui en fait partie (pour le classement) ;
--   * un joueur connecté peut créer un groupe, et rejoindre ou quitter un groupe pour lui-même seulement ;
--   * un joueur est dans un seul groupe à la fois ;
--   * le créateur d'un groupe peut le supprimer seulement quand il est vide.

create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 2 and 30),
  owner      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index if not exists groups_name_unique on public.groups (lower(btrim(name)));

create table if not exists public.group_members (
  user_id   uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  group_id  uuid not null references public.groups (id) on delete cascade,
  joined_at timestamptz not null default now()
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "groupes visibles par tous" on public.groups;
create policy "groupes visibles par tous" on public.groups for select using (true);

drop policy if exists "je cree un groupe" on public.groups;
create policy "je cree un groupe" on public.groups
  for insert to authenticated with check (auth.uid() = owner);

drop policy if exists "je supprime mon groupe vide" on public.groups;
create policy "je supprime mon groupe vide" on public.groups
  for delete to authenticated
  using (auth.uid() = owner and not exists (select 1 from public.group_members m where m.group_id = id));

drop policy if exists "membres visibles par tous" on public.group_members;
create policy "membres visibles par tous" on public.group_members for select using (true);

drop policy if exists "je rejoins un groupe" on public.group_members;
create policy "je rejoins un groupe" on public.group_members
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "je change de groupe" on public.group_members;
create policy "je change de groupe" on public.group_members
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "je quitte mon groupe" on public.group_members;
create policy "je quitte mon groupe" on public.group_members
  for delete to authenticated using (auth.uid() = user_id);
