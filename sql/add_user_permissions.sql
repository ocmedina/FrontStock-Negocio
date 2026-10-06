-- =====================================================
-- Migración: Sistema de permisos granulares por usuario
-- Fecha: 2026-10-06
-- =====================================================

begin;

-- 1. Agregar is_active a profiles si no existe
alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- 2. Tabla de permisos granulares por usuario
-- Permite sobreescribir permisos base del rol (grant o revoke por usuario)
create table if not exists public.user_permissions (
  id          bigserial primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  permission  text not null,
  granted     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (profile_id, permission)
);

create index if not exists idx_user_permissions_profile_id
  on public.user_permissions(profile_id);

-- Trigger para updated_at
create or replace function public.touch_user_permissions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_permissions_updated_at on public.user_permissions;
create trigger trg_user_permissions_updated_at
  before update on public.user_permissions
  for each row execute function public.touch_user_permissions_updated_at();

-- 3. RLS para user_permissions
alter table public.user_permissions enable row level security;

drop policy if exists "auth_select_user_permissions" on public.user_permissions;
drop policy if exists "auth_insert_user_permissions" on public.user_permissions;
drop policy if exists "auth_update_user_permissions" on public.user_permissions;
drop policy if exists "auth_delete_user_permissions" on public.user_permissions;

create policy "auth_select_user_permissions"
  on public.user_permissions for select to authenticated using (true);

create policy "auth_insert_user_permissions"
  on public.user_permissions for insert to authenticated with check (true);

create policy "auth_update_user_permissions"
  on public.user_permissions for update to authenticated using (true) with check (true);

create policy "auth_delete_user_permissions"
  on public.user_permissions for delete to authenticated using (true);

-- 4. Grants
grant all on public.user_permissions to authenticated;
grant usage, select on sequence public.user_permissions_id_seq to authenticated;

commit;
