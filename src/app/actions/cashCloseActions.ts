'use server';

import { createLooseAdminClient } from '@/lib/admin';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getArgentinaDayBounds(date: string) {
  // date: 'YYYY-MM-DD' en zona Argentina
  const startISO = `${date}T00:00:00-03:00`;
  const dateObj = new Date(`${date}T12:00:00-03:00`);
  dateObj.setDate(dateObj.getDate() + 1);
  const nextDay = dateObj.toISOString().split('T')[0];
  const endISO = `${nextDay}T00:00:00-03:00`;
  return { startISO, endISO };
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type PaymentBreakdown = {
  efectivo: number;
  transferencia: number;
  mercado_pago: number;
  cuenta_corriente: number;
  cheque: number;
  tarjeta_debito: number;
  tarjeta_credito: number;
  mixto: number;
  total: number;
};

export type DeliveryOrderRow = {
  id: string;
  customer_name: string;
  total_amount: number;
  amount_paid: number;
  amount_pending: number;
  payment_method: string | null;
  status: string;
  created_at: string;
};

export type DeskSaleRow = {
  id: string;
  customer_name: string;
  total_amount: number;
  payment_method: string | null;
  is_cancelled: boolean;
  created_at: string;
};

export type DeliveryCashCloseResult = {
  date: string;
  totalOrders: number;
  delivered: number;
  pending: number;
  cancelled: number;
  collected: PaymentBreakdown;
  debtGenerated: number;
  orders: DeliveryOrderRow[];
};

export type DeskCashCloseResult = {
  date: string;
  totalSales: number;
  activeSales: number;
  cancelledSales: number;
  collected: PaymentBreakdown;
  sales: DeskSaleRow[];
};

// ─── Cierre de Reparto ────────────────────────────────────────────────────────

export async function getDeliveryCashClose(
  date: string
): Promise<{ success: boolean; data?: DeliveryCashCloseResult; error?: string }> {
  try {
    const supabase = createLooseAdminClient();
    const { startISO, endISO } = getArgentinaDayBounds(date);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        amount_paid,
        amount_pending,
        payment_method,
        status,
        created_at,
        customers ( full_name )
      `)
      .gte('created_at', startISO)
      .lt('created_at', endISO)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data || []) as any[];

    const orders: DeliveryOrderRow[] = rows.map((o) => ({
      id: o.id,
      customer_name: o.customers?.full_name ?? 'Sin cliente',
      total_amount: Number(o.total_amount) || 0,
      amount_paid: Number(o.amount_paid) || 0,
      amount_pending: Number(o.amount_pending) || 0,
      payment_method: o.payment_method ?? null,
      status: o.status,
      created_at: o.created_at,
    }));

    const delivered = orders.filter((o) => o.status === 'entregado');
    const pending = orders.filter((o) => o.status === 'pendiente');
    const cancelled = orders.filter((o) => o.status === 'cancelado');

    const collected: PaymentBreakdown = {
      efectivo: 0,
      transferencia: 0,
      mercado_pago: 0,
      cuenta_corriente: 0,
      cheque: 0,
      tarjeta_debito: 0,
      tarjeta_credito: 0,
      mixto: 0,
      total: 0,
    };

    let debtGenerated = 0;

    for (const o of delivered) {
      const paid = o.amount_paid;
      const method = (o.payment_method || 'otros').toLowerCase().trim();

      if (method === 'efectivo') collected.efectivo += paid;
      else if (method === 'transferencia') collected.transferencia += paid;
      else if (method === 'mercado_pago' || method === 'mercadopago') collected.mercado_pago += paid;
      else if (method === 'cuenta_corriente') collected.cuenta_corriente += o.total_amount;
      else if (method === 'cheque') collected.cheque += paid;
      else if (method === 'tarjeta_debito' || method === 'tarjeta_de_debito') collected.tarjeta_debito += paid;
      else if (method === 'tarjeta_credito' || method === 'tarjeta_de_credito') collected.tarjeta_credito += paid;
      else if (method === 'mixto' || method === 'mixtos') collected.mixto += paid;

      collected.total += paid;
      debtGenerated += o.amount_pending;
    }

    return {
      success: true,
      data: {
        date,
        totalOrders: orders.length,
        delivered: delivered.length,
        pending: pending.length,
        cancelled: cancelled.length,
        collected,
        debtGenerated,
        orders,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[getDeliveryCashClose]', msg);
    return { success: false, error: msg };
  }
}

// ─── Cierre de Mostrador ─────────────────────────────────────────────────────

export async function getDeskCashClose(
  date: string
): Promise<{ success: boolean; data?: DeskCashCloseResult; error?: string }> {
  try {
    const supabase = createLooseAdminClient();
    const { startISO, endISO } = getArgentinaDayBounds(date);

    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        total_amount,
        payment_method,
        is_cancelled,
        created_at,
        customers ( full_name )
      `)
      .gte('created_at', startISO)
      .lt('created_at', endISO)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data || []) as any[];

    const sales: DeskSaleRow[] = rows.map((s) => ({
      id: s.id,
      customer_name: s.customers?.full_name ?? 'Sin cliente',
      total_amount: Number(s.total_amount) || 0,
      payment_method: s.payment_method ?? null,
      is_cancelled: Boolean(s.is_cancelled),
      created_at: s.created_at,
    }));

    const active = sales.filter((s) => !s.is_cancelled);
    const cancelled = sales.filter((s) => s.is_cancelled);

    const collected: PaymentBreakdown = {
      efectivo: 0,
      transferencia: 0,
      mercado_pago: 0,
      cuenta_corriente: 0,
      cheque: 0,
      tarjeta_debito: 0,
      tarjeta_credito: 0,
      mixto: 0,
      total: 0,
    };

    for (const s of active) {
      const amount = s.total_amount;
      const method = (s.payment_method || 'otros').toLowerCase().trim();

      if (method === 'efectivo') collected.efectivo += amount;
      else if (method === 'transferencia') collected.transferencia += amount;
      else if (method === 'mercado_pago' || method === 'mercadopago') collected.mercado_pago += amount;
      else if (method === 'cuenta_corriente') collected.cuenta_corriente += amount;
      else if (method === 'cheque') collected.cheque += amount;
      else if (method === 'tarjeta_debito' || method === 'tarjeta_de_debito') collected.tarjeta_debito += amount;
      else if (method === 'tarjeta_credito' || method === 'tarjeta_de_credito') collected.tarjeta_credito += amount;
      else if (method === 'mixto' || method === 'mixtos') collected.mixto += amount;

      collected.total += amount;
    }

    return {
      success: true,
      data: {
        date,
        totalSales: sales.length,
        activeSales: active.length,
        cancelledSales: cancelled.length,
        collected,
        sales,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[getDeskCashClose]', msg);
    return { success: false, error: msg };
  }
}

// ─── Deuda real de un cliente específico ─────────────────────────────────────
// Misma lógica que la página /dashboard/clientes/[id]
// Usa admin client para evitar que RLS bloquee las queries del browser.

export async function getCustomerRealDebt(
  customerId: string
): Promise<{ debt: number; debug?: any }> {
  try {
    const supabase = createLooseAdminClient();

    console.log('[getCustomerRealDebt] customerId:', customerId);

    const [ordersResult, salesResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id, amount_pending, status')
        .eq('customer_id', customerId)
        .neq('status', 'cancelado'),
      supabase
        .from('sales')
        .select('id, amount_pending, payment_method, is_cancelled')
        .eq('customer_id', customerId),
    ]);

    console.log('[getCustomerRealDebt] ordersResult.error:', ordersResult.error);
    console.log('[getCustomerRealDebt] ordersResult.data:', JSON.stringify(ordersResult.data));
    console.log('[getCustomerRealDebt] salesResult.error:', salesResult.error);
    console.log('[getCustomerRealDebt] salesResult.data:', JSON.stringify(salesResult.data));

    const pendingOrders = ordersResult.data || [];
    const allSales = salesResult.data || [];

    // filtrar igual que la pagina del cliente
    const cuentaCorrienteSales = allSales.filter(
      (s: any) =>
        (s.payment_method || '').toLowerCase() === 'cuenta_corriente' &&
        !s.is_cancelled
    );

    const ordersDebt = pendingOrders.reduce(
      (sum: number, o: any) => sum + Number(o.amount_pending || 0),
      0
    );
    const salesDebt = cuentaCorrienteSales.reduce(
      (sum: number, s: any) => sum + Number(s.amount_pending || 0),
      0
    );

    const total = ordersDebt + salesDebt;
    console.log('[getCustomerRealDebt] ordersDebt:', ordersDebt, 'salesDebt:', salesDebt, 'total:', total);

    return { debt: total };
  } catch (e) {
    console.error('[getCustomerRealDebt] CATCH error:', e);
    return { debt: 0 };
  }
}
