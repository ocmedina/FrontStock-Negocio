-- Sucursales - Etapa 2: agregar columnas.
-- Ejecutar después de 01a_create_branches_tables.sql.
-- Esta etapa agrega solo columnas. No crea claves foráneas ni escanea tablas
-- grandes; las restricciones se agregan en 01e, después del backfill.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_id BIGINT;

ALTER TABLE public.registers
  ADD COLUMN IF NOT EXISTS branch_id BIGINT;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS branch_id BIGINT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS branch_id BIGINT;

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS branch_id BIGINT;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS branch_id BIGINT;

DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    ALTER TABLE public.expenses
      ADD COLUMN IF NOT EXISTS branch_id BIGINT;
  END IF;

  IF to_regclass('public.cash_shifts') IS NOT NULL THEN
    ALTER TABLE public.cash_shifts
      ADD COLUMN IF NOT EXISTS branch_id BIGINT;
  END IF;

  IF to_regclass('public.cash_movements') IS NOT NULL THEN
    ALTER TABLE public.cash_movements
      ADD COLUMN IF NOT EXISTS branch_id BIGINT;
  END IF;

  IF to_regclass('public.daily_reports') IS NOT NULL THEN
    ALTER TABLE public.daily_reports
      ADD COLUMN IF NOT EXISTS branch_id BIGINT;
  END IF;
END $$;
