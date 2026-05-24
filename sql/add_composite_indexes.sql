-- =====================================================
-- Índices compuestos para optimización de consultas
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-05-08
-- =====================================================

begin;

-- Dashboard: ventas del mes (filtro por fecha + cancelación)
CREATE INDEX IF NOT EXISTS idx_sales_created_cancelled
  ON public.sales(created_at, is_cancelled);

-- Dashboard: deuda pendiente de pedidos (parcial)
CREATE INDEX IF NOT EXISTS idx_orders_pending_status
  ON public.orders(status, amount_pending)
  WHERE amount_pending > 0;

-- Dashboard: deuda pendiente de ventas cuenta corriente (parcial)
CREATE INDEX IF NOT EXISTS idx_sales_cc_pending
  ON public.sales(payment_method, is_cancelled, amount_pending)
  WHERE payment_method = 'cuenta_corriente' AND is_cancelled = false AND amount_pending > 0;

-- Pedidos: filtro por estado + fecha (la query más usada en /pedidos)
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON public.orders(status, created_at DESC);

-- Ventas: filtro por fecha + método de pago (historial de ventas)
CREATE INDEX IF NOT EXISTS idx_sales_date_method
  ON public.sales(created_at, payment_method);

-- Clientes: búsqueda por nombre con is_active (listado paginado)
CREATE INDEX IF NOT EXISTS idx_customers_active_name
  ON public.customers(is_active, full_name);

-- Productos: búsqueda activos con stock (listado + estadísticas)
CREATE INDEX IF NOT EXISTS idx_products_active_stock
  ON public.products(is_active, stock, name);

-- Sale items: cobertura para JOINs frecuentes en reportes
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_product
  ON public.sale_items(sale_id, product_id, quantity);

-- Movimientos de caja: filtro por tipo + fecha (cierre de caja / fondo inicial)
CREATE INDEX IF NOT EXISTS idx_cash_movements_type_date
  ON public.cash_movements(type, created_at);

-- Pagos: filtro por tipo + fecha (reportes diarios)
CREATE INDEX IF NOT EXISTS idx_payments_type_date
  ON public.payments(type, created_at);

commit;
