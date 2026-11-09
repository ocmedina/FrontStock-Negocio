-- Datos comerciales propios de cada sucursal para remitos y comprobantes.
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS fantasy_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS locality TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS cuit TEXT,
  ADD COLUMN IF NOT EXISTS iibb TEXT,
  ADD COLUMN IF NOT EXISTS iva_condition TEXT,
  ADD COLUMN IF NOT EXISTS start_date TEXT,
  ADD COLUMN IF NOT EXISTS point_of_sale INTEGER,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE OR REPLACE FUNCTION public.increment_branch_stock(
  p_branch_id BIGINT,
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INTEGER;
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_role NOT IN ('administrador', 'supervendedor') THEN
    RAISE EXCEPTION 'No tienes permiso para modificar el stock de una sucursal';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.branches
    WHERE id = p_branch_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'La sucursal no existe o está inactiva';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  INSERT INTO public.branch_stock (branch_id, product_id, stock)
  VALUES (p_branch_id, p_product_id, 0)
  ON CONFLICT (branch_id, product_id) DO NOTHING;

  UPDATE public.branch_stock
  SET stock = stock + p_quantity
  WHERE branch_id = p_branch_id AND product_id = p_product_id
  RETURNING stock INTO v_stock;

  RETURN v_stock;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_branch_stock(BIGINT, UUID, INTEGER) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_branch_stock(BIGINT, UUID, INTEGER) FROM PUBLIC;
