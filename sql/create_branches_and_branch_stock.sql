-- ============================================================================
-- Migración: Sucursales y stock separado
-- FrontStock
--
-- NOTA: para Supabase se recomienda ejecutar los scripts divididos:
--   01_create_branches_schema.sql
--   02_create_branches_functions.sql
--
-- Catálogo de productos y clientes compartido.
-- Existencias, movimientos y operaciones separados por sucursal.
-- La migración conserva products.stock en "Sucursal actual" como compatibilidad
-- con pantallas todavía no migradas; el stock real queda en branch_stock.
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

CREATE INDEX IF NOT EXISTS idx_branch_stock_product ON public.branch_stock(product_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.registers
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.cash_shifts
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_registers_branch_id ON public.registers(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch_created_at ON public.sales(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_branch_created_at ON public.orders(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_branch_created_at ON public.purchases(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_branch_created_at ON public.stock_movements(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_date ON public.expenses(branch_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_shifts_branch_status ON public.cash_shifts(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_movements_branch_created_at ON public.cash_movements(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_branch_date ON public.daily_reports(branch_id, report_date DESC);

-- Las cuentas existentes no administrativas comienzan en la sucursal abierta.
UPDATE public.profiles
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL
  AND role <> 'administrador';

-- Las cajas existentes se consideran parte de la sucursal abierta.
UPDATE public.registers
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL;

-- Conserva el stock histórico en la sucursal abierta. No sobreescribe una
-- distribución que ya haya sido cargada manualmente.
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

-- Las operaciones históricas se atribuyen a la sucursal abierta.
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

UPDATE public.expenses
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL;

UPDATE public.cash_shifts
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL;

UPDATE public.cash_movements
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL;

UPDATE public.daily_reports
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Sucursal actual')
WHERE branch_id IS NULL;

CREATE OR REPLACE FUNCTION public.resolve_record_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_row JSONB := to_jsonb(NEW);
  v_actor_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    v_actor_id := COALESCE(
      NULLIF(v_row->>'profile_id', '')::UUID,
      NULLIF(v_row->>'user_id', '')::UUID,
      auth.uid()
    );

    IF v_actor_id IS NOT NULL THEN
      SELECT branch_id INTO NEW.branch_id
      FROM public.profiles
      WHERE id = v_actor_id;
    END IF;
  END IF;

  IF NEW.branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.branches WHERE id = NEW.branch_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'La sucursal de la operación no existe o está inactiva';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_resolve_branch ON public.sales;
CREATE TRIGGER trg_sales_resolve_branch
BEFORE INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.resolve_record_branch();

DROP TRIGGER IF EXISTS trg_orders_resolve_branch ON public.orders;
CREATE TRIGGER trg_orders_resolve_branch
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.resolve_record_branch();

DROP TRIGGER IF EXISTS trg_purchases_resolve_branch ON public.purchases;
CREATE TRIGGER trg_purchases_resolve_branch
BEFORE INSERT ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.resolve_record_branch();

DROP TRIGGER IF EXISTS trg_expenses_resolve_branch ON public.expenses;
CREATE TRIGGER trg_expenses_resolve_branch
BEFORE INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.resolve_record_branch();

DROP TRIGGER IF EXISTS trg_cash_shifts_resolve_branch ON public.cash_shifts;
CREATE TRIGGER trg_cash_shifts_resolve_branch
BEFORE INSERT ON public.cash_shifts
FOR EACH ROW EXECUTE FUNCTION public.resolve_record_branch();

DROP TRIGGER IF EXISTS trg_cash_movements_resolve_branch ON public.cash_movements;
CREATE TRIGGER trg_cash_movements_resolve_branch
BEFORE INSERT ON public.cash_movements
FOR EACH ROW EXECUTE FUNCTION public.resolve_record_branch();

CREATE OR REPLACE FUNCTION public.touch_branch_stock_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_branch_stock_updated_at ON public.branch_stock;
CREATE TRIGGER trg_branch_stock_updated_at
BEFORE UPDATE ON public.branch_stock
FOR EACH ROW EXECUTE FUNCTION public.touch_branch_stock_updated_at();

CREATE OR REPLACE FUNCTION public.refresh_legacy_product_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id UUID := CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END;
BEGIN
  UPDATE public.products
  SET stock = COALESCE((
    SELECT SUM(stock)
    FROM public.branch_stock
    WHERE product_id = v_product_id
  ), 0)
  WHERE id = v_product_id;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_branch_stock_refresh_product ON public.branch_stock;
CREATE TRIGGER trg_branch_stock_refresh_product
AFTER INSERT OR UPDATE OR DELETE ON public.branch_stock
FOR EACH ROW EXECUTE FUNCTION public.refresh_legacy_product_stock();

CREATE OR REPLACE FUNCTION public.resolve_branch_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT branch_id INTO NEW.branch_id
    FROM public.profiles
    WHERE id = COALESCE(NEW.user_id, auth.uid());
  END IF;

  IF NEW.branch_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar la sucursal del movimiento de stock';
  END IF;

  IF NEW.movement_type <> 'transferencia' THEN
    INSERT INTO public.branch_stock (branch_id, product_id, stock)
    VALUES (NEW.branch_id, NEW.product_id, 0)
    ON CONFLICT (branch_id, product_id) DO NOTHING;

    SELECT stock INTO v_current_stock
    FROM public.branch_stock
    WHERE branch_id = NEW.branch_id AND product_id = NEW.product_id
    FOR UPDATE;

    IF v_current_stock + NEW.quantity < 0 THEN
      RAISE EXCEPTION 'Stock insuficiente en la sucursal';
    END IF;

    NEW.previous_stock := v_current_stock;
    NEW.new_stock := v_current_stock + NEW.quantity;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_branch_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.movement_type <> 'transferencia' THEN
    UPDATE public.branch_stock
    SET stock = stock + NEW.quantity
    WHERE branch_id = NEW.branch_id AND product_id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolve_branch_stock_movement ON public.stock_movements;
CREATE TRIGGER trg_resolve_branch_stock_movement
BEFORE INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.resolve_branch_stock_movement();

DROP TRIGGER IF EXISTS trg_apply_branch_stock_movement ON public.stock_movements;
CREATE TRIGGER trg_apply_branch_stock_movement
AFTER INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_branch_stock_movement();

CREATE OR REPLACE FUNCTION public.clone_branch_stock(
  p_source_branch_id BIGINT,
  p_target_branch_id BIGINT,
  p_product_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_copied_count INTEGER := 0;
BEGIN
  IF p_source_branch_id IS NULL OR p_target_branch_id IS NULL THEN
    RAISE EXCEPTION 'Debe indicar la sucursal origen y destino';
  END IF;

  IF p_source_branch_id = p_target_branch_id THEN
    RETURN 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.branches
    WHERE id = p_source_branch_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'La sucursal origen no existe o no está activa';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.branches
    WHERE id = p_target_branch_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'La sucursal destino no existe o no está activa';
  END IF;

  INSERT INTO public.branch_stock (branch_id, product_id, stock, stock_minimo, updated_at)
  SELECT
    p_target_branch_id,
    bs.product_id,
    bs.stock,
    bs.stock_minimo,
    now()
  FROM public.branch_stock bs
  WHERE bs.branch_id = p_source_branch_id
    AND (
      p_product_ids IS NULL
      OR array_length(p_product_ids, 1) IS NULL
      OR bs.product_id = ANY (p_product_ids)
    )
  ON CONFLICT (branch_id, product_id) DO NOTHING;

  GET DIAGNOSTICS v_copied_count = ROW_COUNT;
  RETURN v_copied_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clone_branch_stock(BIGINT, BIGINT, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_branch_stock(BIGINT, BIGINT, UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.transfer_branch_stock(
  p_product_id UUID,
  p_from_branch_id BIGINT,
  p_to_branch_id BIGINT,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_from_stock INTEGER;
  v_to_stock INTEGER;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  IF p_from_branch_id = p_to_branch_id THEN
    RAISE EXCEPTION 'La sucursal de origen y destino deben ser distintas';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad a transferir debe ser mayor a cero';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.branches
    WHERE id IN (p_from_branch_id, p_to_branch_id)
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Ambas sucursales deben estar activas para transferir stock';
  END IF;

  SELECT stock INTO v_from_stock
  FROM public.branch_stock
  WHERE branch_id = p_from_branch_id AND product_id = p_product_id
  FOR UPDATE;

  IF v_from_stock IS NULL OR v_from_stock < p_quantity THEN
    RAISE EXCEPTION 'Stock insuficiente en la sucursal de origen';
  END IF;

  INSERT INTO public.branch_stock (branch_id, product_id, stock)
  VALUES (p_to_branch_id, p_product_id, 0)
  ON CONFLICT (branch_id, product_id) DO NOTHING;

  UPDATE public.branch_stock
  SET stock = stock - p_quantity
  WHERE branch_id = p_from_branch_id AND product_id = p_product_id;

  UPDATE public.branch_stock
  SET stock = stock + p_quantity
  WHERE branch_id = p_to_branch_id AND product_id = p_product_id
  RETURNING stock INTO v_to_stock;

  INSERT INTO public.stock_movements (
    product_id, user_id, branch_id, movement_type, quantity,
    previous_stock, new_stock, reference_id, notes
  )
  VALUES
    (p_product_id, v_user_id, p_from_branch_id, 'transferencia', -p_quantity,
     v_from_stock, v_from_stock - p_quantity, p_to_branch_id::TEXT, p_notes),
    (p_product_id, v_user_id, p_to_branch_id, 'transferencia', p_quantity,
     v_to_stock - p_quantity, v_to_stock, p_from_branch_id::TEXT, p_notes);

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'from_branch_id', p_from_branch_id,
    'to_branch_id', p_to_branch_id,
    'quantity', p_quantity
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transfer_branch_stock(UUID, BIGINT, BIGINT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_branch_stock(UUID, BIGINT, BIGINT, INTEGER, TEXT) TO authenticated;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_branches" ON public.branches;
DROP POLICY IF EXISTS "authenticated_manage_branches" ON public.branches;
DROP POLICY IF EXISTS "authenticated_read_branch_stock" ON public.branch_stock;
DROP POLICY IF EXISTS "authenticated_manage_branch_stock" ON public.branch_stock;

CREATE POLICY "authenticated_read_branches"
  ON public.branches FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_manage_branches"
  ON public.branches FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'administrador'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'administrador'
  ));

CREATE POLICY "authenticated_read_branch_stock"
  ON public.branch_stock FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_manage_branch_stock"
  ON public.branch_stock FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('administrador', 'supervendedor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('administrador', 'supervendedor')
  ));

COMMIT;
