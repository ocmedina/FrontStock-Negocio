-- Sucursales - Etapa 5 opcional: claves foráneas.
-- Ejecutar solo después de completar 01c y 01d.
-- Estas restricciones no son necesarias para probar la separación de stock.
-- Si alguna espera por locks, dejar esta etapa para una ventana de mantenimiento.

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.registers
  ADD CONSTRAINT registers_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id)
  ON DELETE RESTRICT
  NOT VALID;

DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;

  IF to_regclass('public.cash_shifts') IS NOT NULL THEN
    ALTER TABLE public.cash_shifts
      ADD CONSTRAINT cash_shifts_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;

  IF to_regclass('public.cash_movements') IS NOT NULL THEN
    ALTER TABLE public.cash_movements
      ADD CONSTRAINT cash_movements_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;

  IF to_regclass('public.daily_reports') IS NOT NULL THEN
    ALTER TABLE public.daily_reports
      ADD CONSTRAINT daily_reports_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;
