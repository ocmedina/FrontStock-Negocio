'use server';

import { revalidatePath } from 'next/cache';
import { createLooseAdminClient } from '@/lib/admin';
import { createClient } from '@/lib/server';
import { requireAdmin } from '@/lib/serverAuth';

export type CurrentPriceAdjustmentCandidate = {
  id: string;
  origin: 'order' | 'sale';
  created_at: string;
  customer_id: string;
  customer_name: string;
  customer_type: string;
  current_pending: number;
  adjustment_amount: number;
  new_pending: number;
  item_count: number;
};

function getCurrentPrice(product: any, customerType: string) {
  const value = customerType === 'mayorista'
    ? product?.price_mayorista
    : product?.price_minorista;
  return Number(value ?? 0);
}

export async function getCurrentPriceAdjustmentCandidates(): Promise<{
  success: boolean;
  data?: CurrentPriceAdjustmentCandidate[];
  error?: string;
}> {
  try {
    await requireAdmin();
    const admin = createLooseAdminClient();

    const [ordersResult, salesResult] = await Promise.all([
      admin
        .from('orders')
        .select(`
          id, created_at, customer_id, amount_pending, status,
          customers(full_name, customer_type),
          order_items(id, product_id, quantity, price, unit_price,
            products(name, price_minorista, price_mayorista))
        `)
        .gt('amount_pending', 0)
        .neq('status', 'cancelado')
        .order('created_at', { ascending: false }),
      admin
        .from('sales')
        .select(`
          id, created_at, customer_id, amount_pending, is_cancelled,
          customers(full_name, customer_type),
          sale_items(id, product_id, quantity, price,
            products(name, price_minorista, price_mayorista))
        `)
        .gt('amount_pending', 0)
        .eq('is_cancelled', false)
        .order('created_at', { ascending: false }),
    ]);

    if (ordersResult.error) throw ordersResult.error;
    if (salesResult.error) throw salesResult.error;

    const orders = (ordersResult.data || []) as any[];
    const sales = (salesResult.data || []) as any[];
    const orderItemIds = orders.flatMap((row) => (row.order_items || []).map((item: any) => item.id));
    const saleItemIds = sales.flatMap((row) => (row.sale_items || []).map((item: any) => item.id));

    const [orderAdjustments, saleAdjustments] = await Promise.all([
      orderItemIds.length
        ? admin
            .from('price_adjustment_items')
            .select('order_item_id, applied_unit_price, id')
            .in('order_item_id', orderItemIds)
            .order('id', { ascending: false })
        : Promise.resolve({ data: [], error: null } as any),
      saleItemIds.length
        ? admin
            .from('price_adjustment_items')
            .select('sale_item_id, applied_unit_price, id')
            .in('sale_item_id', saleItemIds)
            .order('id', { ascending: false })
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (orderAdjustments.error) throw orderAdjustments.error;
    if (saleAdjustments.error) throw saleAdjustments.error;

    const lastOrderPrice = new Map<string, number>();
    for (const adjustment of orderAdjustments.data || []) {
      const key = String(adjustment.order_item_id);
      if (!lastOrderPrice.has(key)) lastOrderPrice.set(key, Number(adjustment.applied_unit_price) || 0);
    }

    const lastSalePrice = new Map<string, number>();
    for (const adjustment of saleAdjustments.data || []) {
      const key = String(adjustment.sale_item_id);
      if (!lastSalePrice.has(key)) lastSalePrice.set(key, Number(adjustment.applied_unit_price) || 0);
    }

    const toCandidate = (row: any, origin: 'order' | 'sale'): CurrentPriceAdjustmentCandidate => {
      const customerType = row.customers?.customer_type || 'minorista';
      const items = origin === 'order' ? row.order_items || [] : row.sale_items || [];
      const priorPrices = origin === 'order' ? lastOrderPrice : lastSalePrice;
      const adjustmentAmount = Math.round(items.reduce((sum: number, item: any) => {
        const product = item.products;
        if (!product) return sum;
        const originalPrice = Number(
          origin === 'order' ? item.price ?? item.unit_price ?? 0 : item.price ?? 0
        );
        const baseline = priorPrices.get(String(item.id)) ?? originalPrice;
        const currentPrice = getCurrentPrice(product, customerType);
        return sum + Math.max(0, currentPrice - baseline) * Number(item.quantity || 0);
      }, 0) * 100) / 100;

      return {
        id: row.id,
        origin,
        created_at: row.created_at,
        customer_id: row.customer_id,
        customer_name: row.customers?.full_name || 'Cliente sin nombre',
        customer_type: customerType,
        current_pending: Number(row.amount_pending || 0),
        adjustment_amount: adjustmentAmount,
        new_pending: Number(row.amount_pending || 0) + adjustmentAmount,
        item_count: items.length,
      };
    };

    const candidates = [
      ...orders.map((row) => toCandidate(row, 'order')),
      ...sales.map((row) => toCandidate(row, 'sale')),
    ]
      .filter((row) => row.adjustment_amount > 0.01)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { success: true, data: candidates };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los comprobantes.';
    return { success: false, error: message };
  }
}

export async function applyCurrentPriceAdjustments(
  orderIds: string[],
  saleIds: string[]
): Promise<{
  success: boolean;
  data?: { adjusted_orders: number; adjusted_sales: number; total_adjustment: number };
  error?: string;
}> {
  try {
    await requireAdmin();

    const uniqueOrderIds = [...new Set(orderIds)].filter(Boolean);
    const uniqueSaleIds = [...new Set(saleIds)].filter(Boolean);
    if (uniqueOrderIds.length + uniqueSaleIds.length === 0) {
      return { success: false, error: 'Selecciona al menos un comprobante.' };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('apply_current_price_adjustments', {
      p_order_ids: uniqueOrderIds,
      p_sale_ids: uniqueSaleIds,
    });

    if (error) throw error;

    revalidatePath('/dashboard/pedidos/pendientes');
    revalidatePath('/dashboard/ventas/pendientes');
    revalidatePath('/dashboard/clientes/deudores');

    return { success: true, data: data as any };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo aplicar el ajuste.';
    return { success: false, error: message };
  }
}
