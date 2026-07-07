'use server'

import { createLooseAdminClient } from '@/lib/admin';
import { Database } from '@/lib/database.types';
import { revalidatePath } from 'next/cache';

type CustomerData = Database['public']['Tables']['customers']['Row'];

type SaleWithRelationsRaw = {
  id: string;
  total_amount: number;
  customers: CustomerData | CustomerData[] | null;
  sale_items: Array<{
    quantity: number;
    price: number;
    products: {
      name: string | null;
      sku: string | null;
    } | Array<{
      name: string | null;
      sku: string | null;
    }> | null;
  }>;
};

export async function createInvoiceFromSale(
  saleId: string,
  invoiceType: string = 'B',
  customerCuit?: string,
  customerIvaCondition?: string,
  taxRateVal?: number
) {
  try {
    // Usamos solo Admin client
    const supabaseAdmin = createLooseAdminClient();

    // 1. Verificar si ya existe factura (con fallback por si faltan columnas nuevas)
    let existingInvoiceRes = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, created_at, customer_data, items_data, total_amount, invoice_type, customer_cuit, customer_iva_condition')
      .eq('sale_id', saleId)
      .maybeSingle();

    if (existingInvoiceRes.error) {
      // Fallback a las columnas básicas si da error de columna inexistente
      existingInvoiceRes = await supabaseAdmin
        .from('invoices')
        .select('id, invoice_number, created_at, customer_data, items_data, total_amount')
        .eq('sale_id', saleId)
        .maybeSingle();
    }

    if (existingInvoiceRes.error) {
      console.error("Error al verificar factura:", existingInvoiceRes.error);
      return { success: false, message: "Error al verificar si la factura ya existe." };
    }

    if (existingInvoiceRes.data) {
      return { success: true, message: "La factura ya existe.", invoiceData: existingInvoiceRes.data };
    }

    // 2. Obtener datos de la venta
    const { data: rawSaleData, error: saleError } = await supabaseAdmin
      .from('sales')
      .select(`
        id,
        total_amount,
        voucher_type_id,
        voucher_number,
        point_of_sale,
        subtotal_neto,
        iva_amount,
        iva_breakdown,
        observations,
        customers (*),
        sale_items ( quantity, price, tax_rate_id, subtotal_neto, iva_amount, products ( name, sku ) )
      `)
      .eq('id', saleId)
      .single();

    if (saleError || !rawSaleData) return { success: false, message: "No se encontraron los datos completos de la venta." };

    const saleData = rawSaleData as any;

    const customerSnapshot = Array.isArray(saleData.customers)
      ? saleData.customers[0] ?? null
      : saleData.customers;

    if (!customerSnapshot || !Array.isArray(saleData.sale_items)) {
      return { success: false, message: "La venta no tiene datos suficientes para generar factura." };
    }

    // Resolve invoice letter from voucher type
    let resolvedInvoiceType = invoiceType;
    let resolvedVoucherName = 'Factura';
    if (saleData.voucher_type_id) {
      const { data: vtData } = await supabaseAdmin
        .from('voucher_types')
        .select('name, letter')
        .eq('id', saleData.voucher_type_id)
        .maybeSingle();
      if (vtData?.letter) {
        resolvedInvoiceType = vtData.letter;
      }
      if (vtData?.name) {
        resolvedVoucherName = vtData.name;
      }
    } else {
      resolvedVoucherName = `Factura ${invoiceType}`;
    }

    // 3. Generar o recuperar número de factura
    let invoiceNumber = saleData.voucher_number;
    if (!invoiceNumber) {
      const { data: invoiceNumData, error: numError } = await supabaseAdmin.rpc('generate_invoice_number');
      if (numError || !invoiceNumData) return { success: false, message: "Error al generar el número de factura." };
      invoiceNumber = invoiceNumData as string;
    }

    // IVA Rate selection (defaults to 21% if not specified)
    const selectedRate = taxRateVal !== undefined ? taxRateVal : 21.00;

    // 4. Preparar datos recalculando Neto e IVA si es Factura A o B
    const itemsSnapshot = saleData.sale_items.map((item: any) => {
      const product = Array.isArray(item.products)
        ? item.products[0] ?? null
        : item.products;

      const itemPrice = item.price || 0;
      const qty = item.quantity || 1;
      const totalItemAmount = itemPrice * qty;

      let itemNet = totalItemAmount;
      let itemIva = 0;

      // Si es Factura A o B y la tasa de IVA es mayor a 0, discriminamos el impuesto
      if (resolvedInvoiceType === 'A' || resolvedInvoiceType === 'B') {
        if (selectedRate > 0) {
          const unitNet = itemPrice / (1 + selectedRate / 100);
          itemNet = unitNet * qty;
          itemIva = totalItemAmount - itemNet;
        } else {
          itemNet = totalItemAmount;
          itemIva = 0;
        }
      } else {
        // Factura C o Presupuestos no discriminan IVA
        itemNet = totalItemAmount;
        itemIva = 0;
      }

      const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

      return {
        name: product?.name ?? 'N/A',
        sku: product?.sku ?? 'N/A',
        quantity: qty,
        price: itemPrice,
        tax_rate_id: selectedRate === 10.5 ? 2 : selectedRate === 27 ? 3 : selectedRate === 0 ? 4 : 1,
        subtotal_neto: round(itemNet),
        iva_amount: round(itemIva)
      };
    });

    const fullCustomerSnapshot = {
      ...customerSnapshot,
      cuit: customerCuit || customerSnapshot?.cuit || null,
      iva_condition: customerIvaCondition || customerSnapshot?.iva_condition || 'Consumidor Final',
      invoice_type: resolvedInvoiceType,
      voucher_name: resolvedVoucherName,
      locality: customerSnapshot?.locality || null,
      province: customerSnapshot?.province || null
    };

    // 5. Insertar factura
    let newInvoice = null;
    let insertError = null;

    try {
      const result = await supabaseAdmin
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          sale_id: saleId,
          customer_data: fullCustomerSnapshot,
          items_data: itemsSnapshot,
          total_amount: saleData.total_amount,
          invoice_type: resolvedInvoiceType,
          customer_cuit: fullCustomerSnapshot.cuit,
          customer_iva_condition: fullCustomerSnapshot.iva_condition
        })
        .select()
        .single();
      
      newInvoice = result.data;
      insertError = result.error;
    } catch (err) {
      insertError = err;
    }

    // Si da error de columna inexistente (por si no se corrió la migración en algún ambiente), reintentar sin las nuevas columnas
    if (insertError && (insertError.code === '42703' || String(insertError.message || '').includes('column') || String(insertError).includes('column'))) {
      const retryResult = await supabaseAdmin
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          sale_id: saleId,
          customer_data: fullCustomerSnapshot,
          items_data: itemsSnapshot,
          total_amount: saleData.total_amount
        })
        .select()
        .single();
      
      newInvoice = retryResult.data;
      insertError = retryResult.error;
    }

    if (insertError) return { success: false, message: `Error al guardar la factura: ${insertError.message}` };

    // 6. Revalidar rutas
    revalidatePath('/dashboard/ventas');
    revalidatePath(`/dashboard/ventas/${saleId}`);
    revalidatePath('/dashboard/facturas');

    return { success: true, message: `Factura ${invoiceNumber} generada exitosamente.`, invoiceData: newInvoice };
  } catch (error) {
    console.error('Error inesperado al crear factura:', error);
    return { success: false, message: 'Error inesperado al crear la factura.' };
  }
}

