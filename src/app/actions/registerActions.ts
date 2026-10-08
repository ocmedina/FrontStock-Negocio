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
  register_id: number | null;
  register_name: string | null;
};

// ─── Listar todas las cajas ───────────────────────────────────────────────────

export async function getRegisters(): Promise<{
  success: boolean;
  data?: Register[];
  error?: string;
}> {
  try {
    await requireAuth();

    const supabase = createLooseAdminClient();

    const [registersRes, profilesRes] = await Promise.all([
      supabase
        .from('registers' as any)
        .select('*')
        .order('id', { ascending: true }),
      supabase
        .from('profiles')
        .select('register_id'),
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

    // Contar usuarios asignados por caja
    const counts: Record<number, number> = {};
    for (const p of (profilesRes.data || []) as any[]) {
      if (p.register_id) {
        counts[p.register_id] = (counts[p.register_id] || 0) + 1;
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

export async function getActiveRegisters(): Promise<{
  success: boolean;
  data?: Register[];
  error?: string;
}> {
  try {
    await requireAuth();

    const supabase = createLooseAdminClient();
    const { data, error } = await supabase
      .from('registers' as any)
      .select('id, name, description, is_active, point_of_sale, created_at')
      .eq('is_active', true)
      .order('id', { ascending: true });

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

export async function getUserAssignedRegister(profileId: string): Promise<{
  success: boolean;
  data?: Register | null;
  error?: string;
}> {
  try {
    await requireAuth();

    const supabase = createLooseAdminClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('register_id')
      .eq('id', profileId)
      .single();

    if (error) throw error;

    const regId = (profile as any)?.register_id;
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
  registerId: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('GESTIONAR_CAJAS');

    const supabase = createLooseAdminClient();
    const { error } = await supabase
      .from('profiles')
      .update({ register_id: registerId } as any)
      .eq('id', profileId);

    if (error) throw error;
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
  point_of_sale: number = 1
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

export async function getUserRegisterAssignments(): Promise<{
  success: boolean;
  data?: UserRegisterAssignment[];
  error?: string;
}> {
  try {
    await requireAuth();

    const supabase = createLooseAdminClient();
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        username,
        role,
        register_id,
        registers ( id, name )
      `)
      .order('full_name', { ascending: true });

    if (error) throw error;

    const list: UserRegisterAssignment[] = (data || []).map((p: any) => ({
      profile_id: p.id,
      full_name: p.full_name,
      username: p.username,
      role: p.role,
      register_id: p.register_id ?? null,
      register_name: p.registers?.name ?? null,
    }));

    return { success: true, data: list };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[getUserRegisterAssignments]', msg);
    return { success: false, error: msg };
  }
}

