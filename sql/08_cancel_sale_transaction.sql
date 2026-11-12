-- Anula una venta en una sola transacción: restituye el inventario de la
-- sucursal de origen, conserva anulados los movimientos de pago y recalcula deuda.
-- La llamada desde la aplicación se hace con service role después de verificar
-- ANULAR_VENTAS en la acción de servidor.

BEGIN;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS branch_id BIGINT;

CREATE OR REPLACE FUNCTION public.cancel_sale_transaction(
  p_sale_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sale RECORD;
  v_item RECORD;
  v_previous_stock INTEGER;
  v_new_stock INTEGER;
  v_restore_quantity INTEGER;
  v_sale_has_stock_movements BOOLEAN;
  v_customer_debt NUMERIC(12,2);
BEGIN
  IF p_sale_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Venta y usuario son requeridos';
  END IF;

  SELECT id, customer_id, branch_id, COALESCE(is_cancelled, false) AS is_cancelled
  INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la venta %', p_sale_id;
  END IF;

  IF v_sale.is_cancelled THEN
    RETURN jsonb_build_object('sale_id', p_sale_id, 'already_cancelled', true);
  END IF;

  IF v_sale.customer_id IS NOT NULL THEN
    PERFORM 1 FROM public.customers WHERE id = v_sale.customer_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se encontró el cliente asociado a la venta';
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.stock_movements sm
    WHERE sm.reference_id = p_sale_id::TEXT
      AND sm.branch_id IS NOT DISTINCT FROM v_sale.branch_id
      AND sm.movement_type IN ('venta', 'promocion')
      AND sm.quantity < 0
  ) INTO v_sale_has_stock_movements;

  FOR v_item IN
    SELECT si.product_id, si.quantity, p.name, p.sku
    FROM public.sale_items si
    JOIN public.products p ON p.id = si.product_id
    WHERE si.sale_id = p_sale_id
    ORDER BY si.product_id
    FOR UPDATE OF si, p
  LOOP
    -- Estos productos no descuentan inventario en finalize_sale_transaction.
    IF COALESCE(LOWER(v_item.name), '') LIKE '%alimento suelto%'
      OR COALESCE(LOWER(v_item.name), '') LIKE '%alimento a granel%'
      OR UPPER(COALESCE(v_item.sku, '')) IN ('SUELTO', 'GRANEL') THEN
      CONTINUE;
    END IF;

    IF v_sale_has_stock_movements THEN
      -- Las ventas nuevas registran por separado unidades vendidas y regalos;
      -- sumar ambos movimientos devuelve exactamente lo que se descontó.
      SELECT COALESCE(SUM(-sm.quantity), 0)::INTEGER
      INTO v_restore_quantity
      FROM public.stock_movements sm
      WHERE sm.reference_id = p_sale_id::TEXT
        AND sm.product_id = v_item.product_id
        AND sm.branch_id IS NOT DISTINCT FROM v_sale.branch_id
        AND sm.movement_type IN ('venta', 'promocion')
        AND sm.quantity < 0;
      IF v_restore_quantity <= 0 THEN
        CONTINUE;
      END IF;
    ELSE
      -- Ventas históricas sin kardex: solo se conoce la cantidad vendida.
      v_restore_quantity := GREATEST(COALESCE(v_item.quantity, 0), 0);
      IF v_restore_quantity = 0 THEN
        CONTINUE;
      END IF;
    END IF;

    IF v_sale.branch_id IS NOT NULL THEN
      INSERT INTO public.branch_stock (branch_id, product_id, stock)
      VALUES (v_sale.branch_id, v_item.product_id, 0)
      ON CONFLICT (branch_id, product_id) DO NOTHING;

      SELECT COALESCE(stock, 0) INTO v_previous_stock
      FROM public.branch_stock
      WHERE branch_id = v_sale.branch_id AND product_id = v_item.product_id
      FOR UPDATE;

      v_new_stock := v_previous_stock + v_restore_quantity;
      UPDATE public.branch_stock
      SET stock = v_new_stock
      WHERE branch_id = v_sale.branch_id AND product_id = v_item.product_id;
    ELSE
      -- Compatibilidad para comprobantes anteriores a la separación por sucursal.
      SELECT COALESCE(stock, 0) INTO v_previous_stock
      FROM public.products
      WHERE id = v_item.product_id
      FOR UPDATE;

      v_new_stock := v_previous_stock + v_restore_quantity;
      UPDATE public.products SET stock = v_new_stock WHERE id = v_item.product_id;
    END IF;

    INSERT INTO public.stock_movements (
      product_id, user_id, branch_id, movement_type, quantity,
      previous_stock, new_stock, reference_id, notes
    ) VALUES (
      v_item.product_id, p_actor_id, v_sale.branch_id, 'cancelacion',
      v_restore_quantity, v_previous_stock, v_new_stock, p_sale_id::TEXT,
      'Devolución por anulación de venta #' || LEFT(p_sale_id::TEXT, 8)
    );
  END LOOP;

  -- Marcar anulada y retirar su saldo pendiente sin borrar el comprobante.
  UPDATE public.sales
  SET is_cancelled = true,
      amount_pending = 0
  WHERE id = p_sale_id;

  -- Mantener el historial de caja y señalar que sus movimientos fueron anulados.
  UPDATE public.payments
  SET payment_method = 'anulado',
      comment = CONCAT_WS(' · ', NULLIF(comment, ''), 'Venta anulada #' || LEFT(p_sale_id::TEXT, 8))
  WHERE sale_id = p_sale_id
    AND COALESCE(payment_method, '') <> 'anulado';

  IF v_sale.customer_id IS NOT NULL THEN
    SELECT
      COALESCE((
        SELECT SUM(COALESCE(o.amount_pending, 0))
        FROM public.orders o
        WHERE o.customer_id = v_sale.customer_id
          AND COALESCE(o.status, '') <> 'cancelado'
      ), 0)
      +
      COALESCE((
        SELECT SUM(COALESCE(s.amount_pending, 0))
        FROM public.sales s
        WHERE s.customer_id = v_sale.customer_id
          AND COALESCE(s.is_cancelled, false) = false
      ), 0)
    INTO v_customer_debt;

    UPDATE public.customers
    SET debt = v_customer_debt
    WHERE id = v_sale.customer_id;
  END IF;

  RETURN jsonb_build_object(
    'sale_id', p_sale_id,
    'already_cancelled', false,
    'branch_id', v_sale.branch_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_sale_transaction(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sale_transaction(UUID, UUID) TO service_role;

COMMIT;
