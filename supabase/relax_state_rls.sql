-- ============================================================
-- SAUVEGARDE FIABLE (app mono-entreprise) — règles RLS permissives
-- sur l'état du planning : tout utilisateur CONNECTÉ peut lire/écrire.
-- À jouer dans le bon projet Supabase (SQL Editor → coller → Run).
-- Idempotent : re-jouable sans erreur.
-- ============================================================

-- ---- planner_state ----
alter table planner_state enable row level security;
drop policy if exists "members read state"  on planner_state;
drop policy if exists "editors write state" on planner_state;
drop policy if exists "auth read state"     on planner_state;
drop policy if exists "auth write state"    on planner_state;
drop policy if exists "auth all state"      on planner_state;
create policy "auth all state" on planner_state
  for all to authenticated using (true) with check (true);

-- ---- planner_state_backup ----
alter table planner_state_backup enable row level security;
drop policy if exists "members read backups"  on planner_state_backup;
drop policy if exists "editors write backups" on planner_state_backup;
drop policy if exists "auth all backups"      on planner_state_backup;
create policy "auth all backups" on planner_state_backup
  for all to authenticated using (true) with check (true);
