'use server';

import { createLooseAdminClient } from '@/lib/admin';
import { requirePermission } from '@/lib/serverAuth';

export async function cancelSale(saleId: string): Promise<{ success: boolean; error?: string; alreadyCancelled?: boolean }> {
  try {
    const ctx = await requirePermission('ANULAR_VENTAS');
    if (!saleId) return { success: false, error: 'Venta inválida.' };

    const supabase = createLooseAdminClient();
    const [{ data: sale, error: saleError }, { data: branchAssignments, error: assignmentsError }] = await Promise.all([
      supabase.from('sales').select('branch_id').eq('id', saleId).single(),
      (supabase as any).from('profile_branch_assignments').select('branch_id').eq('profile_id', ctx.user.id),
    ]);
    if (saleError) throw saleError;
    if (assignmentsError) throw assignmentsError;

    const assignedBranchIds = (branchAssignments || []).map((row: any) => Number(row.branch_id));
    if (assignedBranchIds.length > 0 && !assignedBranchIds.includes(Number(sale.branch_id))) {
      return { success: false, error: 'No tienes acceso a la sucursal de esta venta.' };
    }

    const { data, error } = await supabase.rpc('cancel_sale_transaction' as any, {
      p_sale_id: saleId,
      p_actor_id: ctx.user.id,
    } as any);
    if (error) throw error;

    const result = data as { already_cancelled?: boolean } | null;
    return { success: true, alreadyCancelled: Boolean(result?.already_cancelled) };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo anular la venta.';
    console.error('[cancelSale]', message);
    return { success: false, error: message };
  }
}
