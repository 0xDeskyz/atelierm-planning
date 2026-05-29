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
-- RLS — cloisonnement réel par organisation
-- (drop policy if exists → re-jouable sans "policy already exists")
-- ============================================================

-- ---- organizations ----
alter table organizations enable row level security;

drop policy if exists "members read their orgs" on organizations;
create policy "members read their orgs"
  on organizations for select
  using (id in (select user_org_ids()));

drop policy if exists "owners update their org" on organizations;
create policy "owners update their org"
  on organizations for update
  using (id in (select user_owner_org_ids()));

-- ---- memberships ----
alter table memberships enable row level security;

drop policy if exists "members read memberships of their orgs" on memberships;
create policy "members read memberships of their orgs"
  on memberships for select
  using (org_id in (select user_org_ids()));

drop policy if exists "admins manage memberships" on memberships;
create policy "admins manage memberships"
  on memberships for all
  using (org_id in (select user_editor_org_ids()))
  with check (org_id in (select user_editor_org_ids()));

-- ---- planner_state ----
alter table planner_state enable row level security;

drop policy if exists "members read own org state" on planner_state;
create policy "members read own org state"
  on planner_state for select
  using (org_id in (select user_org_ids()));

-- members = lecture seule ; owner/admin écrivent
drop policy if exists "editors write own org state" on planner_state;
create policy "editors write own org state"
  on planner_state for all
  using  (org_id in (select user_editor_org_ids()))
  with check (org_id in (select user_editor_org_ids()));

-- ---- invitations ----
alter table invitations enable row level security;

drop policy if exists "admins manage invitations" on invitations;
create policy "admins manage invitations"
  on invitations for all
  using (org_id in (select user_editor_org_ids()))
  with check (org_id in (select user_editor_org_ids()));
