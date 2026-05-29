-- ============================================================
-- SCHÉMA V2 — SaaS multi-tenant
-- À appliquer dans le NOUVEAU projet Supabase B (jamais sur la prod Atelier M).
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
-- Même structure qu'aujourd'hui, mais clé = 'org-{orgId}' et colonne org_id.
create table if not exists planner_state (
  key        text primary key,
  org_id     uuid references organizations(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz default now()
);

create index if not exists planner_state_org_idx on planner_state (org_id);

-- ---------- Backups / historique ----------
create table if not exists planner_state_backup (
  id         bigserial primary key,
  key        text not null,
  org_id     uuid,
  data       jsonb not null,
  created_at timestamptz default now()
);

create index if not exists planner_state_backup_key_created_at_idx
  on planner_state_backup (key, created_at desc);

-- ============================================================
-- RLS — cloisonnement réel par organisation
-- ============================================================

-- Helper : les org_id dont l'utilisateur courant est membre
-- (utilisé dans les policies ci-dessous)

-- ---- organizations ----
alter table organizations enable row level security;

create policy "members read their orgs"
  on organizations for select
  using (id in (select org_id from memberships where user_id = auth.uid()));

create policy "owners update their org"
  on organizations for update
  using (id in (select org_id from memberships where user_id = auth.uid() and role = 'owner'));

-- ---- memberships ----
alter table memberships enable row level security;

create policy "members read memberships of their orgs"
  on memberships for select
  using (org_id in (select org_id from memberships where user_id = auth.uid()));

create policy "admins manage memberships"
  on memberships for all
  using (org_id in (select org_id from memberships where user_id = auth.uid() and role in ('owner','admin')))
  with check (org_id in (select org_id from memberships where user_id = auth.uid() and role in ('owner','admin')));

-- ---- planner_state ----
alter table planner_state enable row level security;

create policy "members read own org state"
  on planner_state for select
  using (org_id in (select org_id from memberships where user_id = auth.uid()));

-- members peuvent lire ; seuls owner/admin écrivent (member = lecture seule)
create policy "editors write own org state"
  on planner_state for all
  using  (org_id in (select org_id from memberships where user_id = auth.uid() and role in ('owner','admin')))
  with check (org_id in (select org_id from memberships where user_id = auth.uid() and role in ('owner','admin')));

-- ---- invitations ----
alter table invitations enable row level security;

create policy "admins manage invitations"
  on invitations for all
  using (org_id in (select org_id from memberships where user_id = auth.uid() and role in ('owner','admin')))
  with check (org_id in (select org_id from memberships where user_id = auth.uid() and role in ('owner','admin')));

-- ============================================================
-- Trigger : créer une org + membership owner à l'inscription
-- (optionnel — on peut aussi le faire côté app dans l'onboarding)
-- ============================================================
-- Laissé commenté : on gère la création d'org dans le flux d'onboarding
-- applicatif (Phase 1) pour demander le nom de la société.
