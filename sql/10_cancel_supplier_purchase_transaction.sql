-- Anula una factura de proveedor en una sola transacción:
-- devuelve stock en la sucursal original y revierte la cuenta corriente.
BEGIN;

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID,
  ADD COLUMN IF NOT EXISTS cancellation_credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.cancel_purchase_transaction(
  p_purchase_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_purchase RECORD;
  v_item RECORD;
  v_previous_stock INTEGER;
  v_new_stock INTEGER;
  v_credit_amount NUMERIC(12,2);
BEGIN
  IF p_purchase_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Factura y usuario son requeridos';
  END IF;

  SELECT
    id,
    supplier_id,
    branch_id,
    total_amount,
    amount_paid,
    COALESCE(is_cancelled, false) AS is_cancelled
  INTO v_purchase
  FROM public.purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la factura %', p_purchase_id;
  END IF;

  IF v_purchase.is_cancelled THEN
    RETURN jsonb_build_object(
      'purchase_id', p_purchase_id,
      'already_cancelled', true,
      'branch_id', v_purchase.branch_id
    );
  END IF;

  IF v_purchase.branch_id IS NULL THEN
    RAISE EXCEPTION 'La factura no tiene sucursal; no se modificó el stock ni la deuda';
  END IF;

  IF v_purchase.total_amount < 0 THEN
    RAISE EXCEPTION 'El total de la factura no es válido';
  END IF;

  PERFORM 1
  FROM public.suppliers
  WHERE id = v_purchase.supplier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el proveedor de la factura';
  END IF;

  FOR v_item IN
    SELECT
      pi.product_id,
      p.name AS product_name,
      SUM(pi.quantity)::INTEGER AS quantity
    FROM public.purchase_items pi
    JOIN public.products p ON p.id = pi.product_id
    WHERE pi.purchase_id = p_purchase_id
    GROUP BY pi.product_id, p.name
    ORDER BY pi.product_id
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'La factura contiene una cantidad inválida para %', v_item.product_name;
    END IF;

    INSERT INTO public.branch_stock (branch_id, product_id, stock)
    VALUES (v_purchase.branch_id, v_item.product_id, 0)
    ON CONFLICT (branch_id, product_id) DO NOTHING;

    SELECT COALESCE(stock, 0)
    INTO v_previous_stock
    FROM public.branch_stock
    WHERE branch_id = v_purchase.branch_id
      AND product_id = v_item.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se pudo bloquear el stock de % en la sucursal', v_item.product_name;
    END IF;

    IF v_previous_stock < v_item.quantity THEN
      RAISE EXCEPTION
        'No se puede anular la factura: quedan % unidades de % en esta sucursal y se necesitan %',
        v_previous_stock,
        v_item.product_name,
        v_item.quantity;
    END IF;

    v_new_stock := v_previous_stock - v_item.quantity;

    UPDATE public.branch_stock
    SET stock = v_new_stock,
        updated_at = now()
    WHERE branch_id = v_purchase.branch_id
      AND product_id = v_item.product_id;

    INSERT INTO public.stock_movements (
      product_id,
      user_id,
      branch_id,
      movement_type,
      quantity,
      previous_stock,
      new_stock,
      reference_id,
      notes
    ) VALUES (
      v_item.product_id,
      p_actor_id,
      v_purchase.branch_id,
      'anulacion_compra',
      -v_item.quantity,
      v_previous_stock,
      v_new_stock,
      p_purchase_id::TEXT,
      'Reversión de factura de proveedor #' || LEFT(p_purchase_id::TEXT, 8)
    );
  END LOOP;

  -- El pago inicial de la compra queda como crédito; el saldo abierto se elimina.
  v_credit_amount := LEAST(
    GREATEST(COALESCE(v_purchase.amount_paid, 0), 0),
    GREATEST(COALESCE(v_purchase.total_amount, 0), 0)
  );

  UPDATE public.purchases
  SET is_cancelled = true,
      cancelled_at = now(),
      cancelled_by = p_actor_id,
      cancellation_credit_amount = v_credit_amount
  WHERE id = p_purchase_id;

  -- Las compras y los pagos existentes mantienen este saldo acumulado heredado.
  UPDATE public.suppliers
  SET debt = COALESCE(debt, 0) - v_purchase.total_amount
  WHERE id = v_purchase.supplier_id;

  RETURN jsonb_build_object(
    'purchase_id', p_purchase_id,
    'already_cancelled', false,
    'branch_id', v_purchase.branch_id,
    'credit_amount', v_credit_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_purchase_transaction(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_purchase_transaction(UUID, UUID) TO service_role;

COMMIT;
