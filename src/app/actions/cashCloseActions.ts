'use server';

import { createLooseAdminClient } from '@/lib/admin';
import { requirePermission } from '@/lib/serverAuth';

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
  amount_paid?: number;
  amount_pending?: number;
  payment_method: string | null;
  is_cancelled: boolean;
  register_id?: number | null;
  register_name?: string | null;
  created_at: string;
};

export type DeliveryCashCloseResult = {
  date: string;
  branchId: number;
  totalOrders: number;
  delivered: number;
  pending: number;
  cancelled: number;
  deliveredBilled: number;
  deliveredCollected: number;
  priorDebtCollected: number;
  unallocatedCollected: number;
  unattributedCollected: number;
  collected: PaymentBreakdown;
  deliveryCollected: PaymentBreakdown;
  priorDebtPayments: PaymentBreakdown;
  debtGenerated: number;
  paymentCount: number;
  orders: DeliveryOrderRow[];
};

export type DeskCashCloseResult = {
  date: string;
  registerId?: number | null;
  totalSales: number;
  activeSales: number;
  cancelledSales: number;
  collected: PaymentBreakdown;
  sales: DeskSaleRow[];
};

// ─── Cierre de Reparto ────────────────────────────────────────────────────────

export async function getDeliveryCashClose(
  date: string,
  branchId: number
): Promise<{ success: boolean; data?: DeliveryCashCloseResult; error?: string }> {
  try {
    await requirePermission('VER_CIERRE_CAJA');

    if (!Number.isInteger(branchId) || branchId <= 0) {
      return { success: false, error: 'Sucursal inválida para el cierre de reparto.' };
    }

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
      .eq('branch_id', branchId)
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
    const deliveredOrderIds = delivered.map((o) => o.id);

    const emptyBreakdown = (): PaymentBreakdown => ({
      efectivo: 0,
      transferencia: 0,
      mercado_pago: 0,
      cuenta_corriente: 0,
      cheque: 0,
      tarjeta_debito: 0,
      tarjeta_credito: 0,
      mixto: 0,
      total: 0,
    });
    const collected = emptyBreakdown();
    const deliveryCollected = emptyBreakdown();
    const priorDebtPayments = emptyBreakdown();

    const { data: paymentRows, error: paymentsError } = await supabase
      .from('payments')
      .select('id, order_id, sale_id, amount, payment_method, created_at')
      .eq('type', 'pago')
      .gte('created_at', startISO)
      .lt('created_at', endISO);
    if (paymentsError) throw paymentsError;

    const paymentOrderIds = [...new Set(
      ((paymentRows || []) as any[]).map((payment) => payment.order_id).filter(Boolean)
    )];
    const paymentSaleIds = [...new Set(
      ((paymentRows || []) as any[]).map((payment) => payment.sale_id).filter(Boolean)
    )];
    const paymentOrders = paymentOrderIds.length
      ? await supabase.from('orders').select('id, branch_id').in('id', paymentOrderIds)
      : { data: [], error: null };
    if (paymentOrders.error) throw paymentOrders.error;
    const branchOrderIds = new Set(
      ((paymentOrders.data || []) as any[])
        .filter((order) => Number(order.branch_id) === branchId)
        .map((order) => order.id)
    );
    const paymentSales = paymentSaleIds.length
      ? await supabase.from('sales').select('id, branch_id').in('id', paymentSaleIds)
      : { data: [], error: null };
    if (paymentSales.error) throw paymentSales.error;
    const branchSaleIds = new Set(
      ((paymentSales.data || []) as any[])
        .filter((sale) => Number(sale.branch_id) === branchId)
        .map((sale) => sale.id)
    );
    const deliveryOrderIdSet = new Set(deliveredOrderIds);

    const addPayment = (breakdown: PaymentBreakdown, methodValue: string | null, amount: number) => {
      const method = (methodValue || 'otros').toLowerCase().trim();
      if (method === 'efectivo') breakdown.efectivo += amount;
      else if (method === 'transferencia') breakdown.transferencia += amount;
      else if (method === 'mercado_pago' || method === 'mercadopago') breakdown.mercado_pago += amount;
      else if (method === 'cuenta_corriente') breakdown.cuenta_corriente += amount;
      else if (method === 'cheque') breakdown.cheque += amount;
      else if (method === 'tarjeta_debito' || method === 'tarjeta_de_debito') breakdown.tarjeta_debito += amount;
      else if (method === 'tarjeta_credito' || method === 'tarjeta_de_credito') breakdown.tarjeta_credito += amount;
      else breakdown.mixto += amount;
      breakdown.total += amount;
    };

    let debtGenerated = 0;
    const deliveredBilled = delivered.reduce((sum, order) => sum + order.total_amount, 0);

    for (const o of delivered) {
      debtGenerated += o.amount_pending;
    }

    let deliveryCollectedTotal = 0;
    let priorDebtCollected = 0;
    let unallocatedCollected = 0;
    let unattributedCollected = 0;
    let classifiedPaymentCount = 0;
    for (const payment of (paymentRows || []) as any[]) {
      const amount = Number(payment.amount) || 0;
      if (amount <= 0) continue;
      if (payment.order_id && branchOrderIds.has(payment.order_id)) {
        classifiedPaymentCount += 1;
        if (deliveryOrderIdSet.has(payment.order_id)) {
          addPayment(deliveryCollected, payment.payment_method, amount);
          deliveryCollectedTotal += amount;
        } else {
          addPayment(priorDebtPayments, payment.payment_method, amount);
          priorDebtCollected += amount;
        }
      } else if (payment.sale_id && branchSaleIds.has(payment.sale_id)) {
        classifiedPaymentCount += 1;
        addPayment(priorDebtPayments, payment.payment_method, amount);
        priorDebtCollected += amount;
      } else if (payment.order_id || payment.sale_id) {
        // Payment belongs to another branch or references a missing invoice.
        continue;
      } else {
        // Historical payments without an invoice cannot be assigned safely.
        unattributedCollected += amount;
      }
    }
    Object.keys(collected).forEach((key) => {
      const typedKey = key as keyof PaymentBreakdown;
      collected[typedKey] = (deliveryCollected[typedKey] || 0) + (priorDebtPayments[typedKey] || 0);
    });

    return {
      success: true,
      data: {
        date,
        branchId,
        totalOrders: orders.length,
        delivered: delivered.length,
        pending: pending.length,
        cancelled: cancelled.length,
        deliveredBilled,
        deliveredCollected: deliveryCollectedTotal,
        priorDebtCollected,
        unallocatedCollected,
        unattributedCollected,
        collected,
        deliveryCollected,
        priorDebtPayments,
        debtGenerated,
        paymentCount: classifiedPaymentCount,
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
  date: string,
  registerId?: number | null,
  branchId?: number
): Promise<{ success: boolean; data?: DeskCashCloseResult; error?: string }> {
  try {
    await requirePermission('VER_CIERRE_CAJA');

    const supabase = createLooseAdminClient();
    const { startISO, endISO } = getArgentinaDayBounds(date);

    if (!Number.isInteger(branchId) || (branchId ?? 0) <= 0) {
      return { success: false, error: 'Sucursal inválida para el cierre de mostrador.' };
    }

    let query = (supabase.from('sales') as any)
      .select(`
        id,
        total_amount,
        amount_paid,
        amount_pending,
        payment_method,
        is_cancelled,
        register_id,
        created_at,
        customers ( full_name ),
        registers ( id, name )
      `)
      .gte('created_at', startISO)
      .lt('created_at', endISO)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (registerId !== undefined && registerId !== null) {
      query = query.eq('register_id', registerId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data || []) as any[];

    const sales: DeskSaleRow[] = rows.map((s) => ({
      id: s.id,
      customer_name: s.customers?.full_name ?? 'Sin cliente',
      total_amount: Number(s.total_amount) || 0,
      amount_paid: Number(s.amount_paid) || 0,
      amount_pending: Number(s.amount_pending) || 0,
      payment_method: s.payment_method ?? null,
      is_cancelled: Boolean(s.is_cancelled),
      register_id: s.register_id ?? null,
      register_name: s.registers?.name ?? null,
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

    const addDeskPayment = (methodValue: string | null, amount: number) => {
      const method = (methodValue || 'otros').toLowerCase().trim();
      if (method === 'efectivo') collected.efectivo += amount;
      else if (method === 'transferencia') collected.transferencia += amount;
      else if (method === 'mercado_pago' || method === 'mercadopago') collected.mercado_pago += amount;
      else if (method === 'cuenta_corriente') collected.cuenta_corriente += amount;
      else if (method === 'cheque') collected.cheque += amount;
      else if (method === 'tarjeta_debito' || method === 'tarjeta_de_debito') collected.tarjeta_debito += amount;
      else if (method === 'tarjeta_credito' || method === 'tarjeta_de_credito') collected.tarjeta_credito += amount;
      else collected.mixto += amount;
      collected.total += amount;
    };

    const activeSaleIds = active.map((sale) => sale.id);
    const { data: salePayments, error: salePaymentsError } = activeSaleIds.length
      ? await supabase
          .from('payments')
          .select('sale_id, amount, payment_method')
          .in('sale_id', activeSaleIds)
          .eq('type', 'pago')
          .gte('created_at', startISO)
          .lt('created_at', endISO)
      : { data: [], error: null };
    if (salePaymentsError) throw salePaymentsError;

    const paymentTotalsBySale = new Map<string, number>();
    for (const payment of (salePayments || []) as any[]) {
      const amount = Number(payment.amount) || 0;
      addDeskPayment(payment.payment_method, amount);
      paymentTotalsBySale.set(
        payment.sale_id,
        (paymentTotalsBySale.get(payment.sale_id) || 0) + amount
      );
    }

    for (const sale of active) {
      if (!paymentTotalsBySale.has(sale.id) && (sale.amount_paid || 0) > 0) {
        addDeskPayment(sale.payment_method, sale.amount_paid || 0);
      }
    }

    return {
      success: true,
      data: {
        date,
        registerId: registerId ?? null,
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
    await requirePermission('VER_DEUDA_CLIENTES');

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

    const pendingSales = allSales.filter(
      (s: any) =>
        !s.is_cancelled &&
        Number(s.amount_pending || 0) > 0
    );

    const ordersDebt = pendingOrders.reduce(
      (sum: number, o: any) => sum + Number(o.amount_pending || 0),
      0
    );
    const salesDebt = pendingSales.reduce(
      (sum: number, s: any) => sum + Number(s.amount_pending || 0),
      0
    );

    const total = ordersDebt + salesDebt;
    console.log('[getCustomerRealDebt] ordersDebt:', ordersDebt, 'salesDebt:', salesDebt, 'total:', total);

    return { debt: total };
  } catch (e) {
    console.error('[getCustomerRealDebt] CATCH error:', e);
    throw e;
  }
}
