-- Sucursales - Etapa 4: índices.
-- Ejecutar después de 01c_backfill_branch_data.sql.
-- Crear estos índices de a uno si el proyecto está recibiendo mucho tráfico.

CREATE INDEX IF NOT EXISTS idx_branch_stock_product
  ON public.branch_stock(product_id);

CREATE INDEX IF NOT EXISTS idx_profiles_branch_id
  ON public.profiles(branch_id);

CREATE INDEX IF NOT EXISTS idx_registers_branch_id
  ON public.registers(branch_id);

CREATE INDEX IF NOT EXISTS idx_sales_branch_created_at
  ON public.sales(branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_branch_created_at
  ON public.orders(branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchases_branch_created_at
  ON public.purchases(branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_branch_created_at
  ON public.stock_movements(branch_id, created_at DESC);

DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_expenses_branch_date
      ON public.expenses(branch_id, date DESC);
  END IF;

  IF to_regclass('public.cash_shifts') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_cash_shifts_branch_status
      ON public.cash_shifts(branch_id, status);
  END IF;

  IF to_regclass('public.cash_movements') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_cash_movements_branch_created_at
      ON public.cash_movements(branch_id, created_at DESC);
  END IF;

  IF to_regclass('public.daily_reports') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_daily_reports_branch_date
      ON public.daily_reports(branch_id, report_date DESC);
  END IF;
END $$;
