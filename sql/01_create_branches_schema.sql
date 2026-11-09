-- ============================================================================
-- Sucursales - Parte 1 de 2: tablas, columnas y migración de datos
-- Ejecutar primero en Supabase SQL Editor.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.branches (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.branches (name, description, is_active)
VALUES
  ('Sucursal actual', 'Sucursal donde se encontraba el stock existente', true),
  ('Sucursal nueva', 'Sucursal pendiente de inauguración', false)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.branch_stock (
  branch_id BIGINT NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_stock_product
  ON public.branch_stock(product_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_id BIGINT
  REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.registers
  ADD COLUMN IF NOT EXISTS branch_id BIGINT
  REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS branch_id BIGINT
  REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS branch_id BIGINT
  REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS branch_id BIGINT
  REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS branch_id BIGINT
  REFERENCES public.branches(id) ON DELETE RESTRICT;

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

-- Tablas opcionales: si ya existen, se les agrega branch_id.
DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    ALTER TABLE public.expenses
      ADD COLUMN IF NOT EXISTS branch_id BIGINT
      REFERENCES public.branches(id) ON DELETE RESTRICT;
    CREATE INDEX IF NOT EXISTS idx_expenses_branch_date
      ON public.expenses(branch_id, date DESC);
  END IF;

  IF to_regclass('public.cash_shifts') IS NOT NULL THEN
    ALTER TABLE public.cash_shifts
      ADD COLUMN IF NOT EXISTS branch_id BIGINT
      REFERENCES public.branches(id) ON DELETE RESTRICT;
    CREATE INDEX IF NOT EXISTS idx_cash_shifts_branch_status
      ON public.cash_shifts(branch_id, status);
  END IF;

  IF to_regclass('public.cash_movements') IS NOT NULL THEN
    ALTER TABLE public.cash_movements
      ADD COLUMN IF NOT EXISTS branch_id BIGINT
      REFERENCES public.branches(id) ON DELETE RESTRICT;
    CREATE INDEX IF NOT EXISTS idx_cash_movements_branch_created_at
      ON public.cash_movements(branch_id, created_at DESC);
  END IF;

  IF to_regclass('public.daily_reports') IS NOT NULL THEN
    ALTER TABLE public.daily_reports
      ADD COLUMN IF NOT EXISTS branch_id BIGINT
      REFERENCES public.branches(id) ON DELETE RESTRICT;
    CREATE INDEX IF NOT EXISTS idx_daily_reports_branch_date
      ON public.daily_reports(branch_id, report_date DESC);
  END IF;
END $$;

-- Los usuarios no administradores y las cajas existentes comienzan en la
-- sucursal abierta. La sucursal nueva queda sin stock.
UPDATE public.profiles
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL
  AND role <> 'administrador';

UPDATE public.registers
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL;

INSERT INTO public.branch_stock (branch_id, product_id, stock, stock_minimo)
SELECT
  b.id,
  p.id,
  GREATEST(COALESCE(p.stock, 0), 0),
  p.stock_minimo
FROM public.branches b
CROSS JOIN public.products p
WHERE b.name = 'Sucursal actual'
ON CONFLICT (branch_id, product_id) DO NOTHING;

UPDATE public.sales
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL;

UPDATE public.orders
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL;

UPDATE public.purchases
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL;

UPDATE public.stock_movements
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL;

DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    UPDATE public.expenses
    SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
    WHERE branch_id IS NULL;
  END IF;
  IF to_regclass('public.cash_shifts') IS NOT NULL THEN
    UPDATE public.cash_shifts
    SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
    WHERE branch_id IS NULL;
  END IF;
  IF to_regclass('public.cash_movements') IS NOT NULL THEN
    UPDATE public.cash_movements
    SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
    WHERE branch_id IS NULL;
  END IF;
  IF to_regclass('public.daily_reports') IS NOT NULL THEN
    UPDATE public.daily_reports
    SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
    WHERE branch_id IS NULL;
  END IF;
END $$;

COMMIT;
