'use server';

import { createLooseAdminClient } from '@/lib/admin';
import { revalidatePath } from 'next/cache';

/** Extrae un mensaje legible de cualquier tipo de error (Error nativo, objeto Supabase, string, etc.) */
function extractMessage(error: unknown): string {
  if (!error) return 'Error desconocido';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  // Supabase devuelve objetos { code, message, details, hint }
  const obj = error as Record<string, unknown>;
  return (
    (typeof obj.message === 'string' && obj.message) ||
    (typeof obj.details === 'string' && obj.details) ||
    (typeof obj.hint === 'string' && obj.hint) ||
    JSON.stringify(error)
  );
}

export async function registerSupplierPayment(
  supplierId: string,
  amount: number,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  if (!supplierId || amount <= 0) {
    return { success: false, error: 'Datos inválidos.' };
  }

  const supabase = createLooseAdminClient();

  // Timestamp en zona horaria Argentina
  const now = new Date();
  const argentinaTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })
  );

  let insertedPaymentId: number | string | null = null;

  try {
    // 1. Registrar el pago en supplier_payments
    const { data: paymentData, error: paymentError } = await supabase
      .from('supplier_payments')
      .insert({
        supplier_id: supplierId,
        amount: amount,
        notes: notes || 'Pago a cuenta',
        created_at: argentinaTime.toISOString(),
      })
      .select('id')
      .single();

    if (paymentError) {
      console.error('[registerSupplierPayment] Error insertando pago:', paymentError);
      throw paymentError;
    }
    if (!paymentData) {
      throw new Error('No se recibió confirmación del insert.');
    }

    insertedPaymentId = (paymentData as { id: number | string }).id;
    console.log('[registerSupplierPayment] Pago insertado, id:', insertedPaymentId);

    // 2. Intentar descontar la deuda via RPC
    const { error: rpcError } = await supabase.rpc('increment_supplier_debt', {
      supplier_id_in: supplierId,
      amount_in: -amount,
    });

    if (rpcError) {
      const rpcMsg = extractMessage(rpcError).toLowerCase();
      const isMissingFunction =
        rpcMsg.includes('increment_supplier_debt') ||
        rpcMsg.includes('function') ||
        rpcMsg.includes('does not exist') ||
        rpcMsg.includes('42883'); // código PostgreSQL para "function not found"

      if (!isMissingFunction) {
        // Error real del RPC — no silenciar
        console.error('[registerSupplierPayment] Error en RPC:', rpcError);
        throw rpcError;
      }

      // Fallback: actualizar la deuda directamente
      console.warn('[registerSupplierPayment] RPC no disponible, usando fallback manual.');
      const { data: supplierData, error: supplierFetchError } = await supabase
        .from('suppliers')
        .select('debt')
        .eq('id', supplierId)
        .single();

      if (supplierFetchError) {
        console.error('[registerSupplierPayment] Error leyendo deuda:', supplierFetchError);
        throw supplierFetchError;
      }

      const currentDebt = Number((supplierData as { debt: number } | null)?.debt ?? 0);

      const { error: updateError } = await supabase
        .from('suppliers')
        .update({ debt: currentDebt - amount })
        .eq('id', supplierId);

      if (updateError) {
        console.error('[registerSupplierPayment] Error actualizando deuda:', updateError);
        throw updateError;
      }
    }

    // 3. Revalidar páginas
    revalidatePath(`/dashboard/proveedores/${supplierId}`);
    revalidatePath('/dashboard/proveedores');

    console.log('[registerSupplierPayment] Pago registrado correctamente.');
    return { success: true };
  } catch (error: unknown) {
    const message = extractMessage(error);
    console.error('[registerSupplierPayment] Error final:', message, error);

    // Rollback: eliminar el pago si se insertó pero falló el paso 2
    if (insertedPaymentId !== null) {
      const { error: rollbackError } = await supabase
        .from('supplier_payments')
        .delete()
        .eq('id', insertedPaymentId);
      if (rollbackError) {
        console.error('[registerSupplierPayment] Error en rollback:', rollbackError);
      }
    }

    return { success: false, error: message };
  }
}

export async function deleteSupplierPayment(
  paymentId: string,
  supplierId: string
): Promise<{ success: boolean; error?: string }> {
  if (!paymentId || !supplierId) {
    return { success: false, error: 'Datos inválidos.' };
  }

  const supabase = createLooseAdminClient();

  try {
    // 1. Obtener la información del pago para saber el monto
    const { data: paymentData, error: fetchError } = await supabase
      .from('supplier_payments')
      .select('amount, supplier_id')
      .eq('id', paymentId)
      .single();

    if (fetchError || !paymentData) {
      console.error('[deleteSupplierPayment] Error al obtener el pago:', fetchError);
      throw new Error('No se pudo encontrar el pago a eliminar.');
    }

    const { amount, supplier_id: paymentSupplierId } = paymentData as { amount: number; supplier_id: string };

    if (paymentSupplierId !== supplierId) {
      throw new Error('El pago no corresponde al proveedor especificado.');
    }

    // 2. Eliminar el pago de supplier_payments
    const { error: deleteError } = await supabase
      .from('supplier_payments')
      .delete()
      .eq('id', paymentId);

    if (deleteError) {
      console.error('[deleteSupplierPayment] Error al eliminar el pago:', deleteError);
      throw deleteError;
    }

    // 3. Incrementar la deuda del proveedor (revertir el descuento de la deuda)
    const { error: rpcError } = await supabase.rpc('increment_supplier_debt', {
      supplier_id_in: supplierId,
      amount_in: amount,
    });

    if (rpcError) {
      const rpcMsg = extractMessage(rpcError).toLowerCase();
      const isMissingFunction =
        rpcMsg.includes('increment_supplier_debt') ||
        rpcMsg.includes('function') ||
        rpcMsg.includes('does not exist') ||
        rpcMsg.includes('42883');

      if (!isMissingFunction) {
        console.error('[deleteSupplierPayment] Error en RPC:', rpcError);
        throw rpcError;
      }

      // Fallback manual si el RPC no existe o no tiene permisos
      console.warn('[deleteSupplierPayment] RPC no disponible, usando fallback manual.');
      const { data: supplierData, error: supplierFetchError } = await supabase
        .from('suppliers')
        .select('debt')
        .eq('id', supplierId)
        .single();

      if (supplierFetchError) {
        console.error('[deleteSupplierPayment] Error leyendo deuda:', supplierFetchError);
        throw supplierFetchError;
      }

      const currentDebt = Number((supplierData as { debt: number } | null)?.debt ?? 0);

      const { error: updateError } = await supabase
        .from('suppliers')
        .update({ debt: currentDebt + amount })
        .eq('id', supplierId);

      if (updateError) {
        console.error('[deleteSupplierPayment] Error actualizando deuda:', updateError);
        throw updateError;
      }
    }

    // 4. Revalidar caminos
    revalidatePath(`/dashboard/proveedores/${supplierId}`);
    revalidatePath('/dashboard/proveedores');

    return { success: true };
  } catch (error: unknown) {
    const message = extractMessage(error);
    console.error('[deleteSupplierPayment] Error final:', message, error);
    return { success: false, error: message };
  }
}
