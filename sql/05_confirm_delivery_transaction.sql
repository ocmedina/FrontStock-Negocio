-- Confirmación atómica de entrega, cobro y deuda.
-- Ejecutar después de 04_fix_order_branch_stock.sql.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.confirm_delivery_transaction(
  p_order_id UUID,
  p_branch_id BIGINT,
  p_amount_paid NUMERIC,
  p_payment_method TEXT,
  p_cash NUMERIC DEFAULT 0,
  p_transfer NUMERIC DEFAULT 0,
  p_debt_item_id UUID DEFAULT NULL,
  p_debt_item_type TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_user_id UUID := auth.uid();
  v_user_role TEXT;
  v_user_branch_id BIGINT;
  v_total NUMERIC;
  v_pending NUMERIC;
  v_customer_debt NUMERIC;
  v_register_id BIGINT;
  v_shift_id BIGINT;
  v_debt_pending NUMERIC;
  v_debt_customer_id UUID;
  v_debt_branch_id BIGINT;
  v_debt_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_branch_id IS NULL OR p_branch_id <= 0 THEN
    RAISE EXCEPTION 'Sucursal inválida';
  END IF;

  SELECT role, branch_id
    INTO v_user_role, v_user_branch_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado';
  END IF;

  IF v_user_role NOT IN ('administrador', 'supervendedor')
     AND v_user_branch_id IS DISTINCT FROM p_branch_id THEN
    RAISE EXCEPTION 'No tienes permiso para operar esta sucursal';
  END IF;

  SELECT *
    INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;
  IF v_order.branch_id IS DISTINCT FROM p_branch_id THEN
    RAISE EXCEPTION 'El pedido pertenece a otra sucursal';
  END IF;
  IF v_order.status <> 'pendiente' THEN
    RAISE EXCEPTION 'El pedido ya fue procesado';
  END IF;

  v_total := COALESCE(v_order.total_amount, 0);
  IF COALESCE(p_amount_paid, 0) < 0 OR p_amount_paid > v_total THEN
    RAISE EXCEPTION 'El monto recibido no es válido';
  END IF;

  IF p_debt_item_id IS NOT NULL AND p_debt_item_type = 'order' THEN
    SELECT customer_id, amount_pending, branch_id, status
      INTO v_debt_customer_id, v_debt_pending, v_debt_branch_id, v_debt_status
    FROM public.orders
    WHERE id = p_debt_item_id
    FOR UPDATE;
    IF NOT FOUND OR v_debt_customer_id <> v_order.customer_id THEN
      RAISE EXCEPTION 'La factura anterior no pertenece al cliente';
    END IF;
    IF v_debt_branch_id IS DISTINCT FROM p_branch_id THEN
      RAISE EXCEPTION 'La factura anterior pertenece a otra sucursal';
    END IF;
    IF v_debt_status = 'cancelado' THEN
      RAISE EXCEPTION 'No se puede cobrar una factura anterior cancelada';
    END IF;
    IF v_debt_pending <= 0 THEN
      RAISE EXCEPTION 'La factura anterior no tiene saldo pendiente';
    END IF;
    IF v_debt_pending < p_amount_paid THEN
      RAISE EXCEPTION 'El pago supera el saldo de la factura anterior';
    END IF;
  ELSIF p_debt_item_id IS NOT NULL THEN
    RAISE EXCEPTION 'Tipo de factura anterior inválido';
  END IF;

  IF lower(trim(COALESCE(p_payment_method, ''))) = 'mixto' THEN
    IF p_cash < 0 OR p_transfer < 0
       OR abs(COALESCE(p_cash, 0) + COALESCE(p_transfer, 0) - p_amount_paid) > 0.01 THEN
      RAISE EXCEPTION 'El detalle del pago mixto no coincide';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.payments
    WHERE order_id = p_order_id AND type = 'compra'
  ) THEN
    INSERT INTO public.payments (customer_id, order_id, type, amount, comment)
    VALUES (v_order.customer_id, p_order_id, 'compra', v_total, 'Pedido ' || left(p_order_id::TEXT, 8));
  END IF;

  IF p_debt_item_id IS NOT NULL THEN
    UPDATE public.orders
    SET amount_paid = coalesce(amount_paid, 0) + p_amount_paid,
        amount_pending = greatest(0, amount_pending - p_amount_paid)
    WHERE id = p_debt_item_id;
    IF lower(trim(COALESCE(p_payment_method, ''))) = 'mixto' THEN
      IF COALESCE(p_cash, 0) > 0 THEN
        INSERT INTO public.payments (customer_id, order_id, type, amount, payment_method, comment)
        VALUES (v_order.customer_id, p_debt_item_id, 'pago', p_cash, 'efectivo',
          'Pago en entrega aplicado a factura anterior');
      END IF;
      IF COALESCE(p_transfer, 0) > 0 THEN
        INSERT INTO public.payments (customer_id, order_id, type, amount, payment_method, comment)
        VALUES (v_order.customer_id, p_debt_item_id, 'pago', p_transfer, 'transferencia',
          'Pago en entrega aplicado a factura anterior');
      END IF;
    ELSE
      INSERT INTO public.payments (customer_id, order_id, type, amount, payment_method, comment)
      VALUES (v_order.customer_id, p_debt_item_id, 'pago', p_amount_paid, p_payment_method,
        'Pago en entrega aplicado a factura anterior');
    END IF;
  ELSIF lower(trim(COALESCE(p_payment_method, ''))) = 'mixto' THEN
    IF COALESCE(p_cash, 0) > 0 THEN
      INSERT INTO public.payments (customer_id, order_id, type, amount, payment_method, comment)
      VALUES (v_order.customer_id, p_order_id, 'pago', p_cash, 'efectivo', 'Pago en entrega (mixto)');
    END IF;
    IF COALESCE(p_transfer, 0) > 0 THEN
      INSERT INTO public.payments (customer_id, order_id, type, amount, payment_method, comment)
      VALUES (v_order.customer_id, p_order_id, 'pago', p_transfer, 'transferencia', 'Pago en entrega (mixto)');
    END IF;
  ELSIF COALESCE(p_amount_paid, 0) > 0 THEN
    INSERT INTO public.payments (customer_id, order_id, type, amount, payment_method, comment)
    VALUES (v_order.customer_id, p_order_id, 'pago', p_amount_paid, p_payment_method, 'Pago en entrega');
  END IF;

  IF p_debt_item_id IS NULL THEN
    IF p_amount_paid > coalesce(v_order.amount_pending, v_total) THEN
      RAISE EXCEPTION 'El monto recibido supera el saldo pendiente del pedido';
    END IF;
    v_pending := greatest(0, coalesce(v_order.amount_pending, v_total) - coalesce(p_amount_paid, 0));
  ELSE
    v_pending := coalesce(v_order.amount_pending, v_total);
  END IF;
  UPDATE public.orders
  SET payment_method = p_payment_method,
      amount_paid = CASE
        WHEN p_debt_item_id IS NULL THEN coalesce(v_order.amount_paid, 0) + p_amount_paid
        ELSE coalesce(v_order.amount_paid, 0)
      END,
      amount_pending = v_pending
  WHERE id = p_order_id;

  PERFORM public.handle_order_status_change(p_order_id, 'entregado');

  IF COALESCE(p_cash, 0) > 0 THEN
    SELECT register_id
      INTO v_register_id
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_register_id IS NOT NULL THEN
      SELECT id
        INTO v_shift_id
      FROM public.cash_shifts
      WHERE register_id = v_register_id
        AND branch_id = p_branch_id
        AND status = 'open'
      ORDER BY opened_at DESC
      LIMIT 1;

      INSERT INTO public.cash_movements (
        register_id, branch_id, shift_id, profile_id, type, amount, reason
      )
      VALUES (
        v_register_id, p_branch_id, v_shift_id, v_user_id, 'ingreso', p_cash,
        'Cobro de reparto - pedido ' || left(p_order_id::TEXT, 8)
      );
    END IF;
  END IF;

  SELECT
    COALESCE((
      SELECT SUM(COALESCE(o.amount_pending, 0))
      FROM public.orders o
      WHERE o.customer_id = v_order.customer_id
        AND o.status <> 'cancelado'
        AND o.amount_pending > 0
    ), 0)
    +
    COALESCE((
      SELECT SUM(COALESCE(s.amount_pending, 0))
      FROM public.sales s
      WHERE s.customer_id = v_order.customer_id
        AND COALESCE(s.is_cancelled, false) = false
        AND s.amount_pending > 0
    ), 0)
    INTO v_customer_debt;

  UPDATE public.customers
  SET debt = v_customer_debt
  WHERE id = v_order.customer_id;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'branch_id', p_branch_id,
    'amount_paid', p_amount_paid,
    'amount_pending', v_pending,
    'customer_debt', v_customer_debt
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_delivery_transaction(UUID, BIGINT, NUMERIC, TEXT, NUMERIC, NUMERIC, UUID, TEXT)
  TO authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_delivery_transaction(UUID, BIGINT, NUMERIC, TEXT, NUMERIC, NUMERIC, UUID, TEXT)
  FROM PUBLIC;
