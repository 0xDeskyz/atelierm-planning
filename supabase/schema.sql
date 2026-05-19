-- Planner state key-value store
create table if not exists planner_state (
  key        text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Planner state backup / snapshot history
create table if not exists planner_state_backup (
  id         bigserial primary key,
  key        text not null,
  data       jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists planner_state_backup_key_created_at_idx
  on planner_state_backup (key, created_at desc);
