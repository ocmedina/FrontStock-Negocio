-- ============================================================================
-- Sucursales - Parte 2 de 2: funciones, triggers, transferencias y políticas
-- Ejecutar después de 01_create_branches_schema.sql.
-- ============================================================================

BEGIN;

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
    SELECT 1 FROM public.branches
    WHERE id = NEW.branch_id AND is_active = true
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

DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_expenses_resolve_branch ON public.expenses;
    CREATE TRIGGER trg_expenses_resolve_branch
    BEFORE INSERT ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.resolve_record_branch();
  END IF;
  IF to_regclass('public.cash_shifts') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_cash_shifts_resolve_branch ON public.cash_shifts;
    CREATE TRIGGER trg_cash_shifts_resolve_branch
    BEFORE INSERT ON public.cash_shifts
    FOR EACH ROW EXECUTE FUNCTION public.resolve_record_branch();
  END IF;
  IF to_regclass('public.cash_movements') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_cash_movements_resolve_branch ON public.cash_movements;
    CREATE TRIGGER trg_cash_movements_resolve_branch
    BEFORE INSERT ON public.cash_movements
    FOR EACH ROW EXECUTE FUNCTION public.resolve_record_branch();
  END IF;
END $$;

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
    SELECT SUM(stock) FROM public.branch_stock WHERE product_id = v_product_id
  ), 0)
  WHERE id = v_product_id;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_branch_stock_refresh_product ON public.branch_stock;
CREATE TRIGGER trg_branch_stock_refresh_product
AFTER INSERT OR UPDATE OR DELETE ON public.branch_stock
FOR EACH ROW EXECUTE FUNCTION public.refresh_legacy_product_stock();

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
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
  IF p_from_branch_id = p_to_branch_id THEN
    RAISE EXCEPTION 'Las sucursales deben ser distintas';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.branches
    WHERE id IN (p_from_branch_id, p_to_branch_id) AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Ambas sucursales deben estar activas';
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
