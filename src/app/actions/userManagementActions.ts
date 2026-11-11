'use server';

import { createLooseAdminClient } from '@/lib/admin';
import { requirePermission } from '@/lib/serverAuth';
import { PERMISSIONS, type Permission, type Role, roleHasPermission } from '@/lib/permissions';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserWithPermissions = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  role: Role;
  is_active: boolean;
  branch_id: number | null;
  branch_ids: number[];
  overrides: Record<string, boolean>; // permission → granted
};

export type BranchOption = {
  id: number;
  name: string;
  is_active: boolean;
};

// ─── Listar todos los usuarios con sus overrides ──────────────────────────────

export async function listUsers(): Promise<{
  success: boolean;
  data?: UserWithPermissions[];
  error?: string;
}> {
  try {
    await requirePermission('VER_USUARIOS');

    const supabase = createLooseAdminClient();

    const [profilesResult, overridesResult, branchAssignmentsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, username, email, role, is_active, branch_id')
        .order('full_name', { ascending: true }),
      supabase
        .from('user_permissions')
        .select('profile_id, permission, granted'),
      (supabase as any)
        .from('profile_branch_assignments')
        .select('profile_id, branch_id'),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (branchAssignmentsResult.error) throw branchAssignmentsResult.error;

    const overridesByProfile: Record<string, Record<string, boolean>> = {};
    for (const row of overridesResult.data || []) {
      if (!overridesByProfile[row.profile_id]) {
        overridesByProfile[row.profile_id] = {};
      }
      overridesByProfile[row.profile_id][row.permission] = row.granted;
    }

    const branchesByProfile: Record<string, number[]> = {};
    for (const row of branchAssignmentsResult.data || []) {
      if (!branchesByProfile[row.profile_id]) branchesByProfile[row.profile_id] = [];
      branchesByProfile[row.profile_id].push(Number(row.branch_id));
    }

    const users: UserWithPermissions[] = (profilesResult.data || []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      email: p.email,
      role: p.role as Role,
      is_active: p.is_active ?? true,
      branch_id: p.branch_id ? Number(p.branch_id) : null,
      branch_ids: branchesByProfile[p.id] ?? [],
      overrides: overridesByProfile[p.id] ?? {},
    }));

    return { success: true, data: users };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[listUsers]', msg);
    return { success: false, error: msg };
  }
}

export async function listBranches(): Promise<{
  success: boolean;
  data?: BranchOption[];
  error?: string;
}> {
  try {
    await requirePermission('VER_USUARIOS');
    const supabase = createLooseAdminClient();
    const { data, error } = await supabase
      .from('branches' as any)
      .select('id, name, is_active')
      .order('id', { ascending: true });

    if (error) throw error;
    return {
      success: true,
      data: ((data || []) as any[]).map((branch) => ({
        id: Number(branch.id),
        name: branch.name,
        is_active: Boolean(branch.is_active),
      })),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[listBranches]', msg);
    return { success: false, error: msg };
  }
}

export async function assignUserBranches(
profileId: string,
branchIds: number[]
): Promise<{ success: boolean; error?: string }> {
try {
  await requirePermission('EDITAR_USUARIOS');
  const supabase = createLooseAdminClient();
  const normalizedIds = [...new Set((branchIds || []).map(Number))].filter((id) => Number.isInteger(id) && id > 0);
  const { data: target, error: targetError } = await supabase.from('profiles').select('id, role, branch_id').eq('id', profileId).single();
  if (targetError) throw targetError;
  if (target.role === 'administrador') return { success: false, error: 'Las sucursales asignadas a administradores no se cambian desde esta pantalla.' };

  if (normalizedIds.length > 0) {
    const { data: branches, error: branchError } = await (supabase as any)
      .from('branches').select('id').in('id', normalizedIds).eq('is_active', true);
    if (branchError) throw branchError;
    if ((branches || []).length !== normalizedIds.length) return { success: false, error: 'Una o más sucursales no están activas.' };
  }

  const { data: existing, error: existingError } = await (supabase as any)
    .from('profile_branch_assignments').select('branch_id').eq('profile_id', profileId);
  if (existingError) throw existingError;
  const existingIds = (existing || []).map((row: any) => Number(row.branch_id));
  const toAdd = normalizedIds.filter((id) => !existingIds.includes(id));
  const toRemove = existingIds.filter((id: number) => !normalizedIds.includes(id));

  if (toAdd.length > 0) {
    const { error } = await (supabase as any).from('profile_branch_assignments').insert(
      toAdd.map((branch_id) => ({ profile_id: profileId, branch_id }))
    );
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const { error } = await (supabase as any).from('profile_branch_assignments')
      .delete().eq('profile_id', profileId).in('branch_id', toRemove);
    if (error) throw error;
  }

  const nextActiveBranchId = normalizedIds.includes(Number(target.branch_id))
    ? Number(target.branch_id)
    : normalizedIds[0] ?? null;
  const { error: profileError } = await supabase.from('profiles').update({ branch_id: nextActiveBranchId } as any).eq('id', profileId);
  if (profileError) throw profileError;
  return { success: true };
} catch (err) {
  const msg = err instanceof Error ? err.message : JSON.stringify(err);
  console.error('[assignUserBranch]', msg);
  return { success: false, error: msg };
}
}

// ─── Actualizar rol de un usuario ─────────────────────────────────────────────

export async function updateUserRole(
  profileId: string,
  newRole: Role
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await requirePermission('CAMBIAR_ROLES');

    const validRoles: Role[] = ['administrador', 'supervendedor', 'vendedor', 'repartidor'];
    if (!validRoles.includes(newRole)) {
      return { success: false, error: 'Rol inválido.' };
    }

    if (ctx.user.id === profileId && newRole !== 'administrador') {
      return { success: false, error: 'No puedes degradar tu propio rol de administrador.' };
    }

    const supabase = createLooseAdminClient();
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[updateUserRole]', msg);
    return { success: false, error: msg };
  }
}

// ─── Activar / Desactivar usuario ─────────────────────────────────────────────

export async function updateUserStatus(
  profileId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await requirePermission('EDITAR_USUARIOS');

    if (ctx.user.id === profileId && !isActive) {
      return { success: false, error: 'No puedes desactivar tu propia cuenta.' };
    }

    const supabase = createLooseAdminClient();
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', profileId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[updateUserStatus]', msg);
    return { success: false, error: msg };
  }
}

// ─── Guardar overrides de permisos de un usuario ──────────────────────────────
// overrides: array de { permission, granted }
// Solo se guardan permisos que DIFIEREN del default del rol.
// Los que coinciden con el default se eliminan (para mantener la tabla limpia).

export async function saveUserPermissions(
  profileId: string,
  role: Role,
  overrides: { permission: Permission; granted: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('GESTIONAR_PERMISOS');

    const supabase = createLooseAdminClient();

    // Separar los overrides reales (difieren del rol) de los redundantes
    const realOverrides = overrides.filter(
      (o) => o.granted !== roleHasPermission(role, o.permission)
    );
    const redundantPermissions = overrides
      .filter((o) => o.granted === roleHasPermission(role, o.permission))
      .map((o) => o.permission);

    // Insertar / actualizar overrides reales
    if (realOverrides.length > 0) {
      const rows = realOverrides.map((o) => ({
        profile_id: profileId,
        permission: o.permission,
        granted: o.granted,
      }));

      const { error } = await supabase
        .from('user_permissions')
        .upsert(rows, { onConflict: 'profile_id,permission' });

      if (error) throw error;
    }

    // Eliminar overrides redundantes (mismos que el rol base → no necesitan guardarse)
    if (redundantPermissions.length > 0) {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('profile_id', profileId)
        .in('permission', redundantPermissions);

      if (error) throw error;
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[saveUserPermissions]', msg);
    return { success: false, error: msg };
  }
}

// ─── Resetear overrides de un usuario (volver a defaults del rol) ─────────────

export async function resetUserPermissions(
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('GESTIONAR_PERMISOS');

    const supabase = createLooseAdminClient();
    const { error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('profile_id', profileId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[resetUserPermissions]', msg);
    return { success: false, error: msg };
  }
}

