'use server';

import { createLooseAdminClient } from '@/lib/admin';
import { requireAuth, requirePermission } from '@/lib/serverAuth';

export type Register = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  point_of_sale: number;
  created_at: string;
  updated_at?: string;
  assigned_users_count?: number;
};

export type CashRegister = Register;

export type UserRegisterAssignment = {
  profile_id: string;
  full_name: string | null;
  username: string | null;
  role: string | null;
  branch_id: number;
  register_id: number | null;
  register_name: string | null;
};

// ─── Listar todas las cajas ───────────────────────────────────────────────────

export async function getRegisters(branchId?: number): Promise<{
  success: boolean;
  data?: Register[];
  error?: string;
}> {
  try {
    await requireAuth();

    const supabase = createLooseAdminClient();

    let registersQuery = supabase
        .from('registers' as any)
        .select('*')
        .order('id', { ascending: true });
    if (branchId) registersQuery = registersQuery.eq('branch_id', branchId);
    const [registersRes, assignmentsRes] = await Promise.all([
      registersQuery,
      branchId
        ? (supabase as any).from('profile_register_assignments').select('register_id').eq('branch_id', branchId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (registersRes.error) {
      // Si la tabla todavía no fue creada por la migración, retornar fallback amigable
      if (registersRes.error.message?.includes('does not exist') || registersRes.error.code === '42P01') {
        return {
          success: true,
          data: [
            { id: 1, name: 'Caja 1', description: 'Puesto principal (por defecto)', is_active: true, point_of_sale: 1, created_at: new Date().toISOString() },
            { id: 2, name: 'Caja 2', description: 'Puesto adicional simultáneo', is_active: true, point_of_sale: 2, created_at: new Date().toISOString() },
          ],
        };
      }
      throw registersRes.error;
    }
    if (assignmentsRes.error) throw assignmentsRes.error;

    // Contar usuarios asignados por caja
    const counts: Record<number, number> = {};
    for (const assignment of (assignmentsRes.data || []) as any[]) {
      if (assignment.register_id) {
        counts[assignment.register_id] = (counts[assignment.register_id] || 0) + 1;
      }
    }

    const data: Register[] = ((registersRes.data || []) as any[]).map((r) => ({
      id: Number(r.id),
      name: r.name,
      description: r.description ?? null,
      is_active: Boolean(r.is_active),
      point_of_sale: Math.max(1, Number(r.point_of_sale) || 1),
      created_at: r.created_at,
      updated_at: r.updated_at,
      assigned_users_count: counts[Number(r.id)] || 0,
    }));

    return { success: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[getRegisters]', msg);
    return { success: false, error: msg };
  }
}

// ─── Listar solo cajas activas ────────────────────────────────────────────────

export async function getActiveRegisters(branchId?: number): Promise<{
  success: boolean;
  data?: Register[];
  error?: string;
}> {
  try {
    await requireAuth();

    const supabase = createLooseAdminClient();
    let registersQuery = supabase
      .from('registers' as any)
      .select('id, name, description, is_active, point_of_sale, created_at')
      .eq('is_active', true)
      .order('id', { ascending: true });
    if (branchId) registersQuery = registersQuery.eq('branch_id', branchId);
    const { data, error } = await registersQuery;

    if (error) {
      // Fallback si la tabla aún se está migrando
      return {
        success: true,
        data: [
          { id: 1, name: 'Caja 1', description: 'Puesto principal', is_active: true, point_of_sale: 1, created_at: new Date().toISOString() },
          { id: 2, name: 'Caja 2', description: 'Puesto adicional', is_active: true, point_of_sale: 2, created_at: new Date().toISOString() },
        ],
      };
    }

    return {
      success: true,
      data: ((data || []) as any[]).map((r) => ({
        id: Number(r.id),
        name: r.name,
        description: r.description ?? null,
        is_active: Boolean(r.is_active),
        point_of_sale: Math.max(1, Number(r.point_of_sale) || 1),
        created_at: r.created_at,
      })),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[getActiveRegisters]', msg);
    return { success: false, error: msg };
  }
}

// ─── Obtener caja asignada a un usuario específico ────────────────────────────

export async function getUserAssignedRegister(profileId: string, branchId: number): Promise<{
  success: boolean;
  data?: Register | null;
  error?: string;
}> {
  try {
    await requireAuth();

    const supabase = createLooseAdminClient();
    const { data: assignment, error } = await (supabase as any)
      .from('profile_register_assignments')
      .select('register_id')
      .eq('profile_id', profileId)
      .eq('branch_id', branchId)
      .maybeSingle();

    if (error) throw error;

    const regId = assignment?.register_id;
    if (!regId) return { success: true, data: null };

    const { data: reg, error: regError } = await supabase
      .from('registers' as any)
      .select('*')
      .eq('id', regId)
      .single();

    if (regError || !reg) return { success: true, data: null };

    return {
      success: true,
      data: {
        id: Number(reg.id),
        name: reg.name,
        description: reg.description ?? null,
        is_active: Boolean(reg.is_active),
        point_of_sale: Math.max(1, Number(reg.point_of_sale) || 1),
        created_at: reg.created_at,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[getUserAssignedRegister]', msg);
    return { success: false, error: msg };
  }
}

// ─── Asignar o desasignar caja a un usuario ───────────────────────────────────

export async function assignUserRegister(
  profileId: string,
  branchId: number,
  registerId: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('GESTIONAR_CAJAS');

    const supabase = createLooseAdminClient();
    if (!Number.isInteger(branchId) || branchId <= 0) return { success: false, error: 'Seleccioná una sucursal válida.' };
    if (registerId !== null) {
      const { data: register, error: registerError } = await supabase
        .from('registers' as any)
        .select('id, branch_id, is_active')
        .eq('id', registerId)
        .maybeSingle();
      if (registerError) throw registerError;
      if (!register || Number(register.branch_id) !== branchId) return { success: false, error: 'La caja no pertenece a la sucursal seleccionada.' };
      if (!register.is_active) return { success: false, error: 'No se puede asignar una caja inactiva.' };

      const { error } = await (supabase as any).from('profile_register_assignments').upsert(
        { profile_id: profileId, branch_id: branchId, register_id: registerId },
        { onConflict: 'profile_id,branch_id' }
      );
      if (error) throw error;
    } else {
      const { error } = await (supabase as any).from('profile_register_assignments')
        .delete().eq('profile_id', profileId).eq('branch_id', branchId);
      if (error) throw error;
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[assignUserRegister]', msg);
    return { success: false, error: msg };
  }
}

// ─── Crear nueva caja ─────────────────────────────────────────────────────────

export async function createRegister(
  name: string,
  description?: string,
  point_of_sale: number = 1,
  branchId?: number
): Promise<{ success: boolean; data?: Register; error?: string }> {
  try {
    await requirePermission('GESTIONAR_CAJAS');

    if (!name || !name.trim()) {
      return { success: false, error: 'El nombre de la caja es obligatorio' };
    }

    const pos = Math.max(1, Number(point_of_sale) || 1);
    const supabase = createLooseAdminClient();
    const { data, error } = await supabase
      .from('registers' as any)
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        point_of_sale: pos,
        is_active: true,
        ...(branchId ? { branch_id: branchId } : {}),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        id: Number(data.id),
        name: data.name,
        description: data.description,
        is_active: Boolean(data.is_active),
        point_of_sale: Number(data.point_of_sale) || pos,
        created_at: data.created_at,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[createRegister]', msg);
    return { success: false, error: msg };
  }
}

// ─── Modificar caja existente (nombre, descripción, activo, punto de venta) ───

export async function updateRegister(
  id: number,
  updates: { name?: string; description?: string; is_active?: boolean; point_of_sale?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('GESTIONAR_CAJAS');

    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim() || null;
    if (updates.is_active !== undefined) payload.is_active = updates.is_active;
    if (updates.point_of_sale !== undefined) {
      payload.point_of_sale = Math.max(1, Number(updates.point_of_sale) || 1);
    }

    const supabase = createLooseAdminClient();
    const { error } = await supabase
      .from('registers' as any)
      .update(payload)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[updateRegister]', msg);
    return { success: false, error: msg };
  }
}

// ─── Listar asignaciones de usuarios a cajas ─────────────────────────────────

export async function getUserRegisterAssignments(branchId: number): Promise<{
  success: boolean;
  data?: UserRegisterAssignment[];
  error?: string;
}> {
  try {
    await requireAuth();

    const supabase = createLooseAdminClient();
    if (!Number.isInteger(branchId) || branchId <= 0) return { success: true, data: [] };
    const [profilesResult, assignmentsResult] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username, role').order('full_name', { ascending: true }),
      (supabase as any).from('profile_register_assignments')
        .select('profile_id, register_id, registers ( id, name )').eq('branch_id', branchId),
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;
    const assignments = new Map<string, any>((assignmentsResult.data || []).map((row: any) => [row.profile_id, row]));
    const list: UserRegisterAssignment[] = (profilesResult.data || []).map((p: any) => {
      const assignment = assignments.get(p.id);
      return {
        profile_id: p.id,
        full_name: p.full_name,
        username: p.username,
        role: p.role,
        branch_id: branchId,
        register_id: assignment?.register_id ?? null,
        register_name: assignment?.registers?.name ?? null,
      };
    });

    return { success: true, data: list };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[getUserRegisterAssignments]', msg);
    return { success: false, error: msg };
  }
}

