-- =====================================================
-- Función RPC: get_reports_raw_data
-- Consolida las 11 queries de reportes en 1 sola
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-05-08
-- =====================================================

begin;

CREATE OR REPLACE FUNCTION public.get_reports_raw_data(
  p_start timestamptz,
  p_end timestamptz,
  p_prev_start timestamptz,
  p_prev_end timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_products_active bigint;
  v_customers_active bigint;
  v_orders_total bigint;
  v_pending_orders bigint;
  v_sales jsonb;
  v_orders jsonb;
  v_prev_sales numeric;
  v_prev_orders numeric;
  v_sale_items jsonb;
  v_order_items jsonb;
  v_products jsonb;
BEGIN
  -- 1. Contadores generales
  SELECT count(*) INTO v_products_active FROM public.products WHERE is_active = true;
  SELECT count(*) INTO v_customers_active FROM public.customers WHERE is_active = true;
  SELECT count(*) INTO v_orders_total FROM public.orders;
  SELECT count(*) INTO v_pending_orders FROM public.orders WHERE status = 'pendiente';

  -- 2. Ventas y pedidos del periodo actual
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 
    'created_at', created_at, 
    'total_amount', total_amount, 
    'payment_method', payment_method
  ) ORDER BY created_at ASC), '[]'::jsonb)
  INTO v_sales 
  FROM public.sales 
  WHERE created_at >= p_start AND created_at <= p_end;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 
    'created_at', created_at, 
    'total_amount', total_amount, 
    'status', status
  )), '[]'::jsonb)
  INTO v_orders 
  FROM public.orders 
  WHERE created_at >= p_start AND created_at <= p_end;

  -- 3. Totales del periodo anterior
  SELECT COALESCE(sum(total_amount), 0) INTO v_prev_sales 
  FROM public.sales 
  WHERE created_at >= p_prev_start AND created_at <= p_prev_end;
  
  SELECT COALESCE(sum(total_amount), 0) INTO v_prev_orders 
  FROM public.orders 
  WHERE status = 'entregado' AND created_at >= p_prev_start AND created_at <= p_prev_end;

  -- 4. Items de ventas y pedidos para top productos
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'quantity', quantity, 
    'product_id', product_id, 
    'sale_id', sale_id
  )), '[]'::jsonb)
  INTO v_sale_items 
  FROM public.sale_items 
  WHERE sale_id IN (
    SELECT id FROM public.sales WHERE created_at >= p_start AND created_at <= p_end
  );

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'quantity', quantity, 
    'product_id', product_id, 
    'order_id', order_id
  )), '[]'::jsonb)
  INTO v_order_items 
  FROM public.order_items 
  WHERE order_id IN (
    SELECT id FROM public.orders WHERE status = 'entregado' AND created_at >= p_start AND created_at <= p_end
  );

  -- 5. Nombres de productos
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 
    'name', name
  )), '[]'::jsonb)
  INTO v_products 
  FROM public.products 
  WHERE id IN (
    SELECT product_id FROM public.sale_items 
    WHERE sale_id IN (SELECT id FROM public.sales WHERE created_at >= p_start AND created_at <= p_end)
    UNION
    SELECT product_id FROM public.order_items 
    WHERE order_id IN (SELECT id FROM public.orders WHERE status = 'entregado' AND created_at >= p_start AND created_at <= p_end)
  );

  -- 6. Retornar todo empaquetado
  RETURN jsonb_build_object(
    'systemStats', jsonb_build_object(
      'productsActive', v_products_active,
      'customersActive', v_customers_active,
      'ordersTotal', v_orders_total,
      'pendingOrders', v_pending_orders
    ),
    'sales', v_sales,
    'orders', v_orders,
    'previousPeriodTotal', v_prev_sales + v_prev_orders,
    'saleItems', v_sale_items,
    'orderItems', v_order_items,
    'products', v_products
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reports_raw_data(timestamptz, timestamptz, timestamptz, timestamptz) TO authenticated;

commit;
