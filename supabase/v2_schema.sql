-- ============================================================
-- SCHÉMA V2 — SaaS multi-tenant  (IDEMPOTENT : re-jouable sans erreur)
-- À appliquer dans le projet Supabase B (jamais sur la prod Atelier M).
-- SQL Editor → coller → Run.
-- ============================================================

-- ---------- Organisations (= un tenant = une société cliente) ----------
create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  plan        text not null default 'trial',          -- trial | starter | pro
  trial_ends  timestamptz default (now() + interval '14 days'),
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at  timestamptz default now()
);

-- Colonne ajoutée après coup (idempotent) : suspension manuelle par l'admin.
alter table organizations
  add column if not exists suspended boolean not null default false;

-- ---------- Lien utilisateur ↔ organisation + rôle ----------
create table if not exists memberships (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member',          -- owner | admin | member
  created_at timestamptz default now(),
  unique (org_id, user_id)
);

create index if not exists memberships_user_idx on memberships (user_id);
create index if not exists memberships_org_idx  on memberships (org_id);

-- ---------- Invitations en attente ----------
create table if not exists invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  email       text not null,
  role        text not null default 'member',
  token       text unique not null,
  expires_at  timestamptz default (now() + interval '7 days'),
  accepted_at timestamptz
);

-- ---------- État du planning (1 ligne par org) ----------
-- create if not exists NE modifie PAS une table déjà présente : on patche
-- ensuite avec ALTER ADD COLUMN IF NOT EXISTS pour les bases déjà créées.
create table if not exists planner_state (
  key        text primary key,
  org_id     uuid,
  data       jsonb not null,
  updated_at timestamptz default now()
);

alter table planner_state
  add column if not exists org_id uuid;

-- FK ajoutée séparément (idempotente via DO block)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'planner_state_org_fk'
  ) then
    alter table planner_state
      add constraint planner_state_org_fk
      foreign key (org_id) references organizations(id) on delete cascade;
  end if;
end $$;

create index if not exists planner_state_org_idx on planner_state (org_id);

-- ---------- Backups / historique ----------
create table if not exists planner_state_backup (
  id         bigserial primary key,
  key        text not null,
  org_id     uuid,
  data       jsonb not null,
  created_at timestamptz default now()
);

alter table planner_state_backup
  add column if not exists org_id uuid;

create index if not exists planner_state_backup_key_created_at_idx
  on planner_state_backup (key, created_at desc);

-- ============================================================
-- Fonctions SECURITY DEFINER — contournent la RLS pour casser la récursion
-- (une policy sur memberships ne peut pas requêter memberships directement)
-- ============================================================

create or replace function public.user_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from memberships where user_id = auth.uid()
$$;

create or replace function public.user_editor_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from memberships
  where user_id = auth.uid() and role in ('owner','admin')
$$;

create or replace function public.user_owner_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from memberships where user_id = auth.uid() and role = 'owner'
$$;

-- ============================================================
-- Création d'organisation (onboarding) — SECURITY DEFINER
-- Crée l'org + le membership owner atomiquement (contourne le chicken-and-egg
-- RLS : au moment de la création, l'utilisateur n'est encore membre de rien).
-- ============================================================
create or replace function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  new_slug   text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  new_slug := lower(regexp_replace(coalesce(nullif(trim(org_name), ''), 'societe'),
                                   '[^a-zA-Z0-9]+', '-', 'g'))
              || '-' || substr(gen_random_uuid()::text, 1, 6);

  insert into organizations (name, slug)
    values (trim(org_name), new_slug)
    returning id into new_org_id;

  insert into memberships (org_id, user_id, role)
    values (new_org_id, auth.uid(), 'owner');

  return new_org_id;
end;
$$;

-- ============================================================
-- Gestion d'équipe — SECURITY DEFINER
-- ============================================================

-- Liste les membres d'une org (avec leur email depuis auth.users).
-- Sécurité : ne renvoie rien si l'appelant n'est pas membre de l'org.
create or replace function public.org_members(p_org_id uuid)
returns table(user_id uuid, email text, role text, created_at timestamptz)
language sql security definer set search_path = public stable
as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from memberships m
  join auth.users u on u.id = m.user_id
  where m.org_id = p_org_id
    and p_org_id in (select org_id from memberships where user_id = auth.uid())
  order by m.created_at asc
$$;

-- Infos publiques d'une invitation (pour l'écran d'acceptation). Le token = secret.
create or replace function public.invitation_info(p_token text)
returns table(org_name text, role text, expired boolean)
language sql security definer set search_path = public stable
as $$
  select o.name::text, i.role, (i.expires_at < now()) as expired
  from invitations i
  join organizations o on o.id = i.org_id
  where i.token = p_token
$$;

-- Accepte une invitation : crée le membership de l'utilisateur courant.
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  inv record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into inv from invitations where token = p_token;
  if inv is null then raise exception 'invitation introuvable'; end if;
  if inv.expires_at < now() then raise exception 'invitation expirée'; end if;

  insert into memberships (org_id, user_id, role)
  values (inv.org_id, auth.uid(), inv.role)
  on conflict (org_id, user_id) do nothing;

  update invitations set accepted_at = now()
  where token = p_token and accepted_at is null;

  return inv.org_id;
end;
$$;

-- ============================================================
-- RLS — cloisonnement réel par organisation
-- (drop policy if exists → re-jouable sans "policy already exists")
-- ============================================================

-- Reset propre : efface TOUTES les policies existantes sur ces tables (y compris
-- d'éventuelles vieilles versions récursives héritées de runs partiels) avant de
-- recréer les bonnes. Garantit un état cohérent quel que soit l'historique.
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public'
           and tablename in ('organizations','memberships','invitations','planner_state','planner_state_backup')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ---- organizations ----
alter table organizations enable row level security;
create policy "members read their orgs" on organizations for select
  using (id in (select user_org_ids()));
create policy "owners update their org" on organizations for update
  using (id in (select user_owner_org_ids()));

-- ---- memberships ----
alter table memberships enable row level security;
create policy "members read memberships" on memberships for select
  using (org_id in (select user_org_ids()));
create policy "admins manage memberships" on memberships for all
  using (org_id in (select user_editor_org_ids()))
  with check (org_id in (select user_editor_org_ids()));

-- ---- planner_state (members = lecture seule ; owner/admin écrivent) ----
alter table planner_state enable row level security;
create policy "members read state" on planner_state for select
  using (org_id in (select user_org_ids()));
create policy "editors write state" on planner_state for all
  using (org_id in (select user_editor_org_ids()))
  with check (org_id in (select user_editor_org_ids()));

-- ---- planner_state_backup ----
alter table planner_state_backup enable row level security;
create policy "members read backups" on planner_state_backup for select
  using (org_id in (select user_org_ids()));
create policy "editors write backups" on planner_state_backup for all
  using (org_id in (select user_editor_org_ids()))
  with check (org_id in (select user_editor_org_ids()));

-- ---- invitations ----
alter table invitations enable row level security;
create policy "admins manage invitations" on invitations for all
  using (org_id in (select user_editor_org_ids()))
  with check (org_id in (select user_editor_org_ids()));
