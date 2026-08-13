'use server';

import { createLooseAdminClient } from '@/lib/admin';
import { revalidatePath } from 'next/cache';

type OrderItemInput = {
  product_id: string;
  quantity: number;
  price: number;
  promotion?: any;
};

export async function updateOrder(
  orderId: string,
  customerId: string,
  totalAmount: number,
  items: OrderItemInput[],
  paymentMethod?: string,
  amountPaid?: number,
  amountPending?: number
) {
  try {
    // Usar el cliente Admin para tener permisos completos
    const supabase = createLooseAdminClient();

    // Verificar que el pedido existe y está en estado pendiente
    const { data: existingOrderData, error: checkError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    const existingOrder = existingOrderData as { status?: string } | null;

    if (checkError) {
      throw new Error(`Error verificando pedido: ${checkError.message}`);
    }

    if (!existingOrder) {
      throw new Error('Pedido no encontrado');
    }

    if (existingOrder.status !== 'pendiente') {
      throw new Error('Solo se pueden editar pedidos en estado pendiente');
    }

    // Eliminar items anteriores
    const { data: deletedItems, error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId)
      .select();

    if (deleteError) {
      console.error('Error eliminando items:', deleteError);
      throw new Error(`Error al eliminar items anteriores: ${deleteError.message}`);
    }

    console.log(`[Server Action] Items eliminados: ${deletedItems?.length || 0}`, deletedItems);

    // Insertar nuevos items
    const orderItems = items.map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      promotion: item.promotion || { applied: false },
    }));

    console.log(`[Server Action] Items a insertar: ${orderItems.length}`, orderItems);

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (itemsError) {
      console.error('Error insertando items:', itemsError);
      throw new Error(`Error al insertar items: ${itemsError.message}`);
    }

    console.log(`[Server Action] Items insertados: ${insertedItems?.length || 0}`, insertedItems);

    // Actualizar el pedido
    const updateData: Record<string, string | number> = {
      customer_id: customerId,
      total_amount: totalAmount,
    };
    
    if (paymentMethod !== undefined) {
      updateData.payment_method = paymentMethod;
    }
    
    if (amountPaid !== undefined) {
      updateData.amount_paid = amountPaid;
    }
    
    if (amountPending !== undefined) {
      updateData.amount_pending = amountPending;
    }

    const { error: orderError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (orderError) {
      throw new Error(`Error al actualizar pedido: ${orderError.message}`);
    }

    // Revalidar la página de detalles
    revalidatePath(`/dashboard/pedidos/${orderId}`);
    revalidatePath('/dashboard/pedidos');

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en updateOrder:', error);
    return { success: false, error: message };
  }
}
