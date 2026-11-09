-- Sucursales - Etapa 3: migrar datos existentes.
-- Ejecutar después de 01b_add_branch_columns.sql.
-- Ejecutar cada bloque UPDATE por separado si alguna tabla es muy grande.

UPDATE public.profiles
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL
  AND role <> 'administrador';

UPDATE public.registers
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL;

INSERT INTO public.branch_stock (branch_id, product_id, stock, stock_minimo)
SELECT
  (SELECT id FROM public.branches WHERE name = 'Sucursal actual'),
  p.id,
  GREATEST(COALESCE(p.stock, 0), 0),
  p.stock_minimo
FROM public.products p
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
