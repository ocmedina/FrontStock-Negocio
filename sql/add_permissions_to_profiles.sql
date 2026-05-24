-- Add per-user permission overrides
alter table profiles
  add column if not exists permissions text[] default '{}'::text[],
  add column if not exists permissions_allow text[] default '{}'::text[],
  add column if not exists permissions_deny text[] default '{}'::text[];

-- Per-role permission overrides
create table if not exists role_permissions (
  role text primary key,
  permissions_allow text[] default '{}'::text[],
  permissions_deny text[] default '{}'::text[],
  updated_at timestamptz default now()
);
