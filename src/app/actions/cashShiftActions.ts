'use server';

import { createLooseAdminClient } from '@/lib/admin';
import { supabase as browserSupabase } from '@/lib/supabaseClient';

export type CashShift = {
  id: number;
  register_id: number;
  register_name?: string;
  profile_id: string;
  cashier_name?: string;
  opened_at: string;
  initial_cash: number;
  status: 'open' | 'closed';
  closed_at?: string | null;
  closed_by?: string | null;
  closed_by_name?: string | null;
  cash_sales: number;
  cash_inflow: number;
  cash_outflow: number;
  expected_cash: number;
  counted_cash?: number | null;
  difference?: number | null;
  notes?: string | null;
  created_at: string;
};

export type CashMovement = {
  id: number;
  shift_id?: number | null;
  register_id: number;
  profile_id?: string | null;
  cashier_name?: string;
  type: 'ingreso' | 'egreso';
  amount: number;
  reason: string;
  created_at: string;
};

/**
 * Obtener el turno activo (abierto) de una caja específica con totales en tiempo real
 */
export async function getActiveShift(
  registerId: number
): Promise<{ success: boolean; data?: CashShift | null; error?: string }> {
  try {
    const supabase = createLooseAdminClient();

    // 1. Buscar turno abierto para la caja
    const { data: shiftData, error: shiftErr } = await (supabase.from('cash_shifts') as any)
      .select(`
        *,
        registers ( id, name ),
        profiles:profile_id ( id, full_name, email )
      `)
      .eq('register_id', registerId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shiftErr) throw shiftErr;
    if (!shiftData) {
      return { success: true, data: null };
    }

    const shift = shiftData;
    const openedAt = shift.opened_at;

    // 2. Calcular ventas en efectivo de la caja desde la apertura del turno
    const { data: salesData, error: salesErr } = await (supabase.from('sales') as any)
      .select('id, total_amount, amount_paid, payment_method, is_cancelled')
      .eq('register_id', registerId)
      .eq('is_cancelled', false)
      .gte('created_at', openedAt);

    if (salesErr) throw salesErr;

    let cashSales = 0;
    for (const s of salesData || []) {
      const method = (s.payment_method || '').toLowerCase().trim();
      if (method === 'efectivo') {
        cashSales += Number(s.total_amount) || 0;
      }
    }

    // 3. Obtener movimientos de efectivo del turno (o del intervalo)
    const { data: movementsData, error: movErr } = await (supabase.from('cash_movements') as any)
      .select('*')
      .eq('register_id', registerId)
      .gte('created_at', openedAt);

    if (movErr) throw movErr;

    let cashInflow = 0;
    let cashOutflow = 0;
    for (const m of movementsData || []) {
      const amt = Number(m.amount) || 0;
      if (m.type === 'ingreso') {
        cashInflow += amt;
      } else if (m.type === 'egreso') {
        cashOutflow += amt;
      }
    }

    const initialCash = Number(shift.initial_cash) || 0;
    const expectedCash = initialCash + cashSales + cashInflow - cashOutflow;

    const result: CashShift = {
      id: Number(shift.id),
      register_id: Number(shift.register_id),
      register_name: shift.registers?.name || `Caja ${shift.register_id}`,
      profile_id: shift.profile_id,
      cashier_name: shift.profiles?.full_name || shift.profiles?.email || 'Cajero',
      opened_at: shift.opened_at,
      initial_cash: initialCash,
      status: 'open',
      cash_sales: cashSales,
      cash_inflow: cashInflow,
      cash_outflow: cashOutflow,
      expected_cash: expectedCash,
      notes: shift.notes,
      created_at: shift.created_at,
    };

    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[getActiveShift]', msg);
    return { success: false, error: msg };
  }
}

/**
 * Abrir un nuevo turno de caja con fondo inicial
 */
export async function openCashShift(params: {
  registerId: number;
  initialCash: number;
  notes?: string;
  profileId?: string;
}): Promise<{ success: boolean; data?: CashShift; error?: string }> {
  try {
    const supabase = createLooseAdminClient();

    // Validar que no haya ya un turno abierto en esta caja
    const { data: existing } = await (supabase.from('cash_shifts') as any)
      .select('id')
      .eq('register_id', params.registerId)
      .eq('status', 'open')
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Esta caja ya tiene un turno abierto activo.' };
    }

    let cashierId = params.profileId;
    if (!cashierId) {
      // Intentar obtener usuario de auth si no fue enviado
      const { data: { session } } = await browserSupabase.auth.getSession();
      cashierId = session?.user?.id;
    }

    if (!cashierId) {
      // Si no hay sesión directa en servidor, buscar el primer admin o perfil disponible
      const { data: firstProfile } = await supabase.from('profiles').select('id').limit(1).single();
      cashierId = firstProfile?.id;
    }

    if (!cashierId) {
      return { success: false, error: 'No se pudo identificar el usuario para abrir el turno.' };
    }

    const initialAmount = Math.max(0, Number(params.initialCash) || 0);

    const { data: inserted, error: insertErr } = await (supabase.from('cash_shifts') as any)
      .insert({
        register_id: params.registerId,
        profile_id: cashierId,
        initial_cash: initialAmount,
        status: 'open',
        notes: params.notes || null,
        cash_sales: 0,
        cash_inflow: 0,
        cash_outflow: 0,
        expected_cash: initialAmount,
      })
      .select(`
        *,
        registers ( id, name ),
        profiles:profile_id ( id, full_name, email )
      `)
      .single();

    if (insertErr) throw insertErr;

    const result: CashShift = {
      id: Number(inserted.id),
      register_id: Number(inserted.register_id),
      register_name: inserted.registers?.name || `Caja ${inserted.register_id}`,
      profile_id: inserted.profile_id,
      cashier_name: inserted.profiles?.full_name || 'Cajero',
      opened_at: inserted.opened_at,
      initial_cash: initialAmount,
      status: 'open',
      cash_sales: 0,
      cash_inflow: 0,
      cash_outflow: 0,
      expected_cash: initialAmount,
      notes: inserted.notes,
      created_at: inserted.created_at,
    };

    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[openCashShift]', msg);
    return { success: false, error: msg };
  }
}

/**
 * Registrar un movimiento de caja (Ingreso extraordinario o Egreso/Retiro/Gasto)
 */
export async function createCashMovement(params: {
  registerId: number;
  shiftId?: number | null;
  type: 'ingreso' | 'egreso';
  amount: number;
  reason: string;
  profileId?: string;
}): Promise<{ success: boolean; data?: CashMovement; error?: string }> {
  try {
    const supabase = createLooseAdminClient();

    const amt = Number(params.amount);
    if (isNaN(amt) || amt <= 0) {
      return { success: false, error: 'El monto debe ser mayor a 0.' };
    }

    if (!params.reason?.trim()) {
      return { success: false, error: 'Debe especificar el motivo del movimiento.' };
    }

    let cashierId = params.profileId;
    if (!cashierId) {
      const { data: { session } } = await browserSupabase.auth.getSession();
      cashierId = session?.user?.id;
    }

    const { data: inserted, error } = await (supabase.from('cash_movements') as any)
      .insert({
        register_id: params.registerId,
        shift_id: params.shiftId || null,
        profile_id: cashierId || null,
        type: params.type,
        amount: amt,
        reason: params.reason.trim(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        id: Number(inserted.id),
        shift_id: inserted.shift_id ? Number(inserted.shift_id) : null,
        register_id: Number(inserted.register_id),
        profile_id: inserted.profile_id,
        type: inserted.type,
        amount: Number(inserted.amount),
        reason: inserted.reason,
        created_at: inserted.created_at,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[createCashMovement]', msg);
    return { success: false, error: msg };
  }
}

/**
 * Obtener movimientos de efectivo de un turno o caja
 */
export async function getShiftMovements(
  shiftId?: number | null,
  registerId?: number | null,
  openedAt?: string
): Promise<{ success: boolean; data?: CashMovement[]; error?: string }> {
  try {
    const supabase = createLooseAdminClient();

    let query = (supabase.from('cash_movements') as any)
      .select(`
        *,
        profiles ( full_name, email )
      `)
      .order('created_at', { ascending: false });

    if (shiftId) {
      query = query.eq('shift_id', shiftId);
    } else if (registerId && openedAt) {
      query = query.eq('register_id', registerId).gte('created_at', openedAt);
    } else if (registerId) {
      query = query.eq('register_id', registerId).limit(50);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows: CashMovement[] = (data || []).map((m: any) => ({
      id: Number(m.id),
      shift_id: m.shift_id ? Number(m.shift_id) : null,
      register_id: Number(m.register_id),
      profile_id: m.profile_id,
      cashier_name: m.profiles?.full_name || m.profiles?.email || 'Usuario',
      type: m.type,
      amount: Number(m.amount) || 0,
      reason: m.reason || 'Sin motivo',
      created_at: m.created_at,
    }));

    return { success: true, data: rows };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[getShiftMovements]', msg);
    return { success: false, error: msg };
  }
}

/**
 * Cerrar turno de caja y registrar arqueo (conteo físico vs esperado)
 */
export async function closeCashShift(params: {
  shiftId: number;
  countedCash: number;
  notes?: string;
  closedBy?: string;
}): Promise<{ success: boolean; data?: CashShift; error?: string }> {
  try {
    const supabase = createLooseAdminClient();

    // 1. Obtener datos del turno abierto
    const { data: shift, error: getErr } = await (supabase.from('cash_shifts') as any)
      .select('*')
      .eq('id', params.shiftId)
      .single();

    if (getErr || !shift) {
      return { success: false, error: 'No se encontró el turno especificado.' };
    }

    if (shift.status === 'closed') {
      return { success: false, error: 'Este turno ya fue cerrado previamente.' };
    }

    const openedAt = shift.opened_at;
    const registerId = shift.register_id;

    // 2. Calcular ventas en efectivo desde opened_at
    const { data: salesData, error: salesErr } = await (supabase.from('sales') as any)
      .select('total_amount, payment_method, is_cancelled')
      .eq('register_id', registerId)
      .eq('is_cancelled', false)
      .gte('created_at', openedAt);

    if (salesErr) throw salesErr;

    let cashSales = 0;
    for (const s of salesData || []) {
      if ((s.payment_method || '').toLowerCase().trim() === 'efectivo') {
        cashSales += Number(s.total_amount) || 0;
      }
    }

    // 3. Calcular ingresos y egresos
    const { data: movsData, error: movErr } = await (supabase.from('cash_movements') as any)
      .select('type, amount')
      .eq('register_id', registerId)
      .gte('created_at', openedAt);

    if (movErr) throw movErr;

    let cashInflow = 0;
    let cashOutflow = 0;
    for (const m of movsData || []) {
      const amt = Number(m.amount) || 0;
      if (m.type === 'ingreso') cashInflow += amt;
      else if (m.type === 'egreso') cashOutflow += amt;
    }

    const initialCash = Number(shift.initial_cash) || 0;
    const expectedCash = initialCash + cashSales + cashInflow - cashOutflow;
    const countedCash = Number(params.countedCash) || 0;
    const difference = countedCash - expectedCash;

    let closerId = params.closedBy;
    if (!closerId) {
      const { data: { session } } = await browserSupabase.auth.getSession();
      closerId = session?.user?.id || shift.profile_id;
    }

    // 4. Actualizar el turno como cerrado
    const { data: updated, error: updateErr } = await (supabase.from('cash_shifts') as any)
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: closerId,
        cash_sales: cashSales,
        cash_inflow: cashInflow,
        cash_outflow: cashOutflow,
        expected_cash: expectedCash,
        counted_cash: countedCash,
        difference: difference,
        notes: params.notes || shift.notes,
      })
      .eq('id', params.shiftId)
      .select(`
        *,
        registers ( id, name ),
        profiles:profile_id ( id, full_name, email ),
        closer:closed_by ( id, full_name, email )
      `)
      .single();

    if (updateErr) throw updateErr;

    const result: CashShift = {
      id: Number(updated.id),
      register_id: Number(updated.register_id),
      register_name: updated.registers?.name || `Caja ${updated.register_id}`,
      profile_id: updated.profile_id,
      cashier_name: updated.profiles?.full_name || 'Cajero',
      opened_at: updated.opened_at,
      initial_cash: initialCash,
      status: 'closed',
      closed_at: updated.closed_at,
      closed_by: updated.closed_by,
      closed_by_name: updated.closer?.full_name || updated.closer?.email || 'Administrador',
      cash_sales: cashSales,
      cash_inflow: cashInflow,
      cash_outflow: cashOutflow,
      expected_cash: expectedCash,
      counted_cash: countedCash,
      difference: difference,
      notes: updated.notes,
      created_at: updated.created_at,
    };

    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[closeCashShift]', msg);
    return { success: false, error: msg };
  }
}

/**
 * Obtener historial de turnos cerrados (arqueos anteriores)
 */
export async function getShiftHistory(
  registerId?: number | null,
  limit: number = 30
): Promise<{ success: boolean; data?: CashShift[]; error?: string }> {
  try {
    const supabase = createLooseAdminClient();

    let query = (supabase.from('cash_shifts') as any)
      .select(`
        *,
        registers ( id, name ),
        profiles:profile_id ( id, full_name, email ),
        closer:closed_by ( id, full_name, email )
      `)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(limit);

    if (registerId) {
      query = query.eq('register_id', registerId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const shifts: CashShift[] = (data || []).map((s: any) => ({
      id: Number(s.id),
      register_id: Number(s.register_id),
      register_name: s.registers?.name || `Caja ${s.register_id}`,
      profile_id: s.profile_id,
      cashier_name: s.profiles?.full_name || s.profiles?.email || 'Cajero',
      opened_at: s.opened_at,
      initial_cash: Number(s.initial_cash) || 0,
      status: 'closed',
      closed_at: s.closed_at,
      closed_by: s.closed_by,
      closed_by_name: s.closer?.full_name || s.closer?.email || 'Administrador',
      cash_sales: Number(s.cash_sales) || 0,
      cash_inflow: Number(s.cash_inflow) || 0,
      cash_outflow: Number(s.cash_outflow) || 0,
      expected_cash: Number(s.expected_cash) || 0,
      counted_cash: Number(s.counted_cash) || 0,
      difference: Number(s.difference) || 0,
      notes: s.notes,
      created_at: s.created_at,
    }));

    return { success: true, data: shifts };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[getShiftHistory]', msg);
    return { success: false, error: msg };
  }
}
