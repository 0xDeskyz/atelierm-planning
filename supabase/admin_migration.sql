-- ============================================================
-- MIGRATION ADMIN — colonne suspended sur organizations
-- À jouer dans le projet Supabase B (SQL Editor → coller → Run).
-- Idempotent : re-jouable sans erreur.
-- ============================================================

alter table organizations
  add column if not exists suspended boolean not null default false;
