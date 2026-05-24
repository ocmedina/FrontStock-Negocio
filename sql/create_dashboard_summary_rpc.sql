-- =====================================================
-- Función RPC: get_dashboard_summary
-- Consolida las ~10 queries del dashboard en 1 sola
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-05-08
-- =====================================================

begin;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
  p_start_of_month timestamptz,
  p_start_of_next_month timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_product_count   bigint;
  v_client_count    bigint;
  v_total_orders    bigint;
  v_sales_month     numeric;
  v_order_sales     numeric;
  v_orders_debt     numeric;
  v_sales_debt      numeric;
  v_debt_customers  bigint;
  v_pending_orders  jsonb;
  v_critical_stock  jsonb;
  v_recent_sales    jsonb;
BEGIN
  -- Conteos básicos
  SELECT count(*) INTO v_product_count
    FROM public.products WHERE is_active = true;

  SELECT count(*) INTO v_client_count
    FROM public.customers WHERE is_active = true;

  SELECT count(*) INTO v_total_orders
    FROM public.orders;

  -- Ventas del mes (mostrador)
  SELECT COALESCE(sum(total_amount), 0) INTO v_sales_month
    FROM public.sales
   WHERE created_at >= p_start_of_month
     AND created_at <  p_start_of_next_month;

  -- Ventas del mes (reparto/pedidos entregados)
  SELECT COALESCE(sum(total_amount), 0) INTO v_order_sales
    FROM public.orders
   WHERE status = 'entregado'
     AND created_at >= p_start_of_month
     AND created_at <  p_start_of_next_month;

  -- Deuda pendiente de pedidos
  SELECT COALESCE(sum(amount_pending), 0) INTO v_orders_debt
    FROM public.orders
   WHERE amount_pending > 0
     AND status != 'cancelado';

  -- Deuda pendiente de ventas cuenta corriente
  SELECT COALESCE(sum(amount_pending), 0) INTO v_sales_debt
    FROM public.sales
   WHERE payment_method = 'cuenta_corriente'
     AND is_cancelled = false
     AND amount_pending > 0;

  -- Clientes únicos con deuda
  SELECT count(DISTINCT customer_id) INTO v_debt_customers
    FROM (
      SELECT customer_id FROM public.orders
       WHERE amount_pending > 0 AND status != 'cancelado'
       UNION
      SELECT customer_id FROM public.sales
       WHERE payment_method = 'cuenta_corriente'
         AND is_cancelled = false
         AND amount_pending > 0
    ) AS debtors;

  -- Pedidos pendientes (últimos 5)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_pending_orders
    FROM (
      SELECT o.id, o.created_at,
             jsonb_build_object('id', c.id, 'full_name', c.full_name) AS customers
        FROM public.orders o
        LEFT JOIN public.customers c ON c.id = o.customer_id
       WHERE o.status = 'pendiente'
       ORDER BY o.created_at DESC
       LIMIT 5
    ) t;

  -- Productos con stock crítico (≤5, activos, top 5)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_critical_stock
    FROM (
      SELECT name, stock, id
        FROM public.products
       WHERE is_active = true AND stock <= 5
       ORDER BY stock ASC
       LIMIT 5
    ) t;

  -- Ventas recientes (últimas 5)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_recent_sales
    FROM (
      SELECT s.id, s.total_amount, s.created_at,
             jsonb_build_object('full_name', c.full_name) AS customers
        FROM public.sales s
        LEFT JOIN public.customers c ON c.id = s.customer_id
       ORDER BY s.created_at DESC
       LIMIT 5
    ) t;

  RETURN jsonb_build_object(
    'productCount',          v_product_count,
    'clientCount',           v_client_count,
    'totalOrders',           v_total_orders,
    'totalSales',            v_sales_month,
    'totalOrderSales',       v_order_sales,
    'totalOrdersDebt',       v_orders_debt,
    'totalSalesDebt',        v_sales_debt,
    'customersWithDebtCount', v_debt_customers,
    'pendingOrders',         v_pending_orders,
    'criticalStockProducts', v_critical_stock,
    'recentSales',           v_recent_sales
  );
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(timestamptz, timestamptz) TO authenticated;

commit;
