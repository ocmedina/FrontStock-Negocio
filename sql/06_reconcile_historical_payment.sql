-- Imputación manual de pagos históricos que no tenían factura asociada.
-- Ejecutar después de create_register_customer_payment_transaction.sql.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON public.payments(sale_id);

CREATE OR REPLACE FUNCTION public.reconcile_historical_payment(
  p_payment_id BIGINT,
  p_item_id UUID,
  p_item_type TEXT,
  p_branch_id BIGINT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_customer_id UUID;
  v_pending NUMERIC;
  v_item_branch_id BIGINT;
  v_new_debt NUMERIC;
  v_user_branch_id BIGINT;
  v_user_role TEXT;
  v_item_status TEXT;
  v_item_cancelled BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  IF p_item_type NOT IN ('order', 'sale') THEN
    RAISE EXCEPTION 'Tipo de factura inválido';
  END IF;
  SELECT branch_id, role INTO v_user_branch_id, v_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  IF p_branch_id IS NULL OR p_branch_id <= 0 THEN
    RAISE EXCEPTION 'Sucursal inválida';
  END IF;
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado';
  END IF;
  IF v_user_role NOT IN ('administrador', 'supervendedor')
     AND v_user_branch_id IS DISTINCT FROM p_branch_id THEN
    RAISE EXCEPTION 'No puede conciliar pagos de otra sucursal';
  END IF;

  SELECT *
    INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
    AND type = 'pago'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago no encontrado';
  END IF;
  IF v_payment.order_id IS NOT NULL OR v_payment.sale_id IS NOT NULL THEN
    RAISE EXCEPTION 'El pago ya está imputado';
  END IF;
  IF v_payment.amount IS NULL OR v_payment.amount <= 0
     OR lower(coalesce(v_payment.payment_method, '')) = 'anulado' THEN
    RAISE EXCEPTION 'El pago no es válido para conciliar';
  END IF;

  IF p_item_type = 'order' THEN
    SELECT customer_id, amount_pending, branch_id, status
      INTO v_customer_id, v_pending, v_item_branch_id, v_item_status
    FROM public.orders
    WHERE id = p_item_id
    FOR UPDATE;
  ELSE
    SELECT customer_id, amount_pending, branch_id, is_cancelled
      INTO v_customer_id, v_pending, v_item_branch_id, v_item_cancelled
    FROM public.sales
    WHERE id = p_item_id
    FOR UPDATE;
  END IF;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  IF p_item_type = 'order' AND v_item_status = 'cancelado' THEN
    RAISE EXCEPTION 'No se puede imputar a un pedido cancelado';
  END IF;
  IF p_item_type = 'sale' AND coalesce(v_item_cancelled, false) THEN
    RAISE EXCEPTION 'No se puede imputar a una venta cancelada';
  END IF;
  IF v_payment.customer_id <> v_customer_id THEN
    RAISE EXCEPTION 'La factura no pertenece al cliente del pago';
  END IF;
  IF v_item_branch_id IS DISTINCT FROM p_branch_id THEN
    RAISE EXCEPTION 'La factura no pertenece a la sucursal seleccionada';
  END IF;
  IF coalesce(v_pending, 0) <= 0 THEN
    RAISE EXCEPTION 'La factura no tiene saldo pendiente';
  END IF;
  IF v_payment.amount > v_pending THEN
    RAISE EXCEPTION 'El pago supera el saldo pendiente de la factura';
  END IF;

  IF p_item_type = 'order' THEN
    UPDATE public.orders
    SET amount_paid = coalesce(amount_paid, 0) + v_payment.amount,
        amount_pending = greatest(0, amount_pending - v_payment.amount)
    WHERE id = p_item_id;
    UPDATE public.payments
    SET order_id = p_item_id
    WHERE id = p_payment_id;
  ELSE
    UPDATE public.sales
    SET amount_paid = coalesce(amount_paid, 0) + v_payment.amount,
        amount_pending = greatest(0, amount_pending - v_payment.amount)
    WHERE id = p_item_id;
    UPDATE public.payments
    SET sale_id = p_item_id
    WHERE id = p_payment_id;
  END IF;

  SELECT
    COALESCE((SELECT sum(amount_pending) FROM public.orders
      WHERE customer_id = v_customer_id AND status <> 'cancelado' AND amount_pending > 0), 0)
    +
    COALESCE((SELECT sum(amount_pending) FROM public.sales
      WHERE customer_id = v_customer_id AND coalesce(is_cancelled, false) = false AND amount_pending > 0), 0)
    INTO v_new_debt;

  UPDATE public.customers SET debt = v_new_debt WHERE id = v_customer_id;

  RETURN jsonb_build_object('payment_id', p_payment_id, 'item_id', p_item_id, 'new_customer_debt', v_new_debt);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_historical_payment(BIGINT, UUID, TEXT, BIGINT)
  TO authenticated;
