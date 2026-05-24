'use server';

import { createLooseAdminClient } from '@/lib/admin';

// ─── Helpers ────────────────────────────────────────────────────────────────

export async function getChoferes() {
  const supabase = createLooseAdminClient();
  // Role string exactly like that might be customized, let's fetch any profile that might be a driver.
  // We'll fetch all profiles to be safe, or just where role is 'chofer_reparto' if they use standard roles.
  // Often it's 'chofer' or 'chofer_reparto' or 'repartidor'.
  const { data } = await supabase.from('profiles').select('id, full_name, role');
  // For now we return all, in the UI we will filter if needed, but it's fine.
  return data || [];
}

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
  otros: number;
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

export type ProductSummary = {
  productId: string;
  productName: string;
  quantity: number;
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
  productsSummary: ProductSummary[];
  expenses: { id: string; category: string; amount: number; description: string; date: string }[];
  routeExpensesTotal: number;
  netCashToHandOver: number;
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
  date: string,
  profileId?: string
): Promise<{ success: boolean; data?: DeliveryCashCloseResult; error?: string }> {
  try {
    const supabase = createLooseAdminClient();
    const { startISO, endISO } = getArgentinaDayBounds(date);

    let query = supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        amount_paid,
        amount_pending,
        payment_method,
        status,
        created_at,
        customers ( full_name ),
        order_items ( quantity, products ( id, name ) )
      `)
      .gte('created_at', startISO)
      .lt('created_at', endISO)
      .order('created_at', { ascending: false });

    if (profileId && profileId !== 'todos') {
      query = query.eq('profile_id', profileId);
    }

    const { data, error } = await query;

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
      otros: 0,
      total: 0,
    };

    let debtGenerated = 0;
    const productCounts: Record<string, ProductSummary> = {};

    for (const row of rows) {
      if (row.status === 'entregado') {
        const paid = Number(row.amount_paid) || 0;
        const method = (row.payment_method || 'otros').toLowerCase().trim();

        if (method === 'efectivo') collected.efectivo += paid;
        else if (method === 'transferencia') collected.transferencia += paid;
        else if (method === 'mercado_pago' || method === 'mercadopago') collected.mercado_pago += paid;
        else if (method === 'cuenta_corriente') collected.cuenta_corriente += paid;
        else collected.otros += paid;

        collected.total += paid;
        debtGenerated += Number(row.amount_pending) || 0;

        // Sumarizar productos
        const items = row.order_items || [];
        for (const item of items) {
          if (item.products) {
            const pId = item.products.id;
            if (!productCounts[pId]) {
              productCounts[pId] = {
                productId: pId,
                productName: item.products.name,
                quantity: 0
              };
            }
            productCounts[pId].quantity += Number(item.quantity) || 0;
          }
        }
      }
    }

    const productsSummary = Object.values(productCounts).sort((a, b) => b.quantity - a.quantity);

    // Fetch expenses
    let expQuery = supabase
      .from('expenses')
      .select('id, category, amount, description, date')
      .eq('date', date);

    if (profileId && profileId !== 'todos') {
      expQuery = expQuery.eq('user_id', profileId);
    }

    const { data: expensesData } = await expQuery;
    const expenses = (expensesData || []) as any[];
    const routeExpensesTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const netCashToHandOver = collected.efectivo - routeExpensesTotal;

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
        productsSummary,
        expenses,
        routeExpensesTotal,
        netCashToHandOver
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
      otros: 0,
      total: 0,
    };

    for (const s of active) {
      const amount = s.total_amount;
      const method = (s.payment_method || 'otros').toLowerCase().trim();

      if (method === 'efectivo') collected.efectivo += amount;
      else if (method === 'transferencia') collected.transferencia += amount;
      else if (method === 'mercado_pago' || method === 'mercadopago') collected.mercado_pago += amount;
      else if (method === 'cuenta_corriente') collected.cuenta_corriente += amount;
      else collected.otros += amount;

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
