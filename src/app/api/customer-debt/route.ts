import { NextRequest, NextResponse } from 'next/server';
import { createLooseAdminClient } from '@/lib/admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('id');

  if (!customerId) {
    return NextResponse.json({ debt: 0, error: 'No customerId' }, { status: 400 });
  }

  try {
    const supabase = createLooseAdminClient();

    const [ordersResult, salesResult] = await Promise.all([
      supabase
        .from('orders')
        .select('amount_pending, status')
        .eq('customer_id', customerId)
        .neq('status', 'cancelado'),
      supabase
        .from('sales')
        .select('amount_pending, payment_method, is_cancelled')
        .eq('customer_id', customerId),
    ]);

    console.log('[/api/customer-debt] orders:', JSON.stringify(ordersResult.data));
    console.log('[/api/customer-debt] orders error:', ordersResult.error);
    console.log('[/api/customer-debt] sales:', JSON.stringify(salesResult.data));
    console.log('[/api/customer-debt] sales error:', salesResult.error);

    const ordersDebt = (ordersResult.data || []).reduce(
      (sum: number, o: any) => sum + Number(o.amount_pending || 0),
      0
    );

    const salesDebt = (salesResult.data || [])
      .filter(
        (s: any) =>
          (s.payment_method || '').toLowerCase() === 'cuenta_corriente' &&
          !s.is_cancelled
      )
      .reduce((sum: number, s: any) => sum + Number(s.amount_pending || 0), 0);

    const debt = ordersDebt + salesDebt;
    console.log('[/api/customer-debt] ordersDebt:', ordersDebt, 'salesDebt:', salesDebt, 'total:', debt);

    return NextResponse.json({ debt, ordersDebt, salesDebt });
  } catch (e: any) {
    console.error('[/api/customer-debt] error:', e);
    return NextResponse.json({ debt: 0, error: e?.message }, { status: 500 });
  }
}
