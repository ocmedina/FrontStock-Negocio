'use server';

import { createLooseAdminClient } from '@/lib/admin';
import { PERMISSIONS, type Permission, type Role, roleHasPermission } from '@/lib/permissions';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserWithPermissions = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  role: Role;
  is_active: boolean;
  overrides: Record<string, boolean>; // permission → granted
};

// ─── Listar todos los usuarios con sus overrides ──────────────────────────────

export async function listUsers(): Promise<{
  success: boolean;
  data?: UserWithPermissions[];
  error?: string;
}> {
  try {
    const supabase = createLooseAdminClient();

    const [profilesResult, overridesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, username, email, role, is_active')
        .order('full_name', { ascending: true }),
      supabase
        .from('user_permissions')
        .select('profile_id, permission, granted'),
    ]);

    if (profilesResult.error) throw profilesResult.error;

    const overridesByProfile: Record<string, Record<string, boolean>> = {};
    for (const row of overridesResult.data || []) {
      if (!overridesByProfile[row.profile_id]) {
        overridesByProfile[row.profile_id] = {};
      }
      overridesByProfile[row.profile_id][row.permission] = row.granted;
    }

    const users: UserWithPermissions[] = (profilesResult.data || []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      email: p.email,
      role: p.role as Role,
      is_active: p.is_active ?? true,
      overrides: overridesByProfile[p.id] ?? {},
    }));

    return { success: true, data: users };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[listUsers]', msg);
    return { success: false, error: msg };
  }
}

// ─── Actualizar rol de un usuario ─────────────────────────────────────────────

export async function updateUserRole(
  profileId: string,
  newRole: Role
): Promise<{ success: boolean; error?: string }> {
  try {
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
