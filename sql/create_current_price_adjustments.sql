-- Permite que un administrador cobre aumentos de precio en comprobantes con saldo.
-- Los precios originales de los renglones no se sobrescriben: cada aumento queda
-- como un débito separado en la cuenta corriente y en el historial de pagos.

CREATE TABLE IF NOT EXISTS public.price_adjustment_items (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  order_item_id BIGINT REFERENCES public.order_items(id) ON DELETE CASCADE,
  sale_item_id BIGINT REFERENCES public.sale_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  previous_unit_price NUMERIC(12,2) NOT NULL,
  applied_unit_price NUMERIC(12,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  adjustment_amount NUMERIC(12,2) NOT NULL CHECK (adjustment_amount > 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT price_adjustment_items_one_source CHECK (
    (order_item_id IS NOT NULL AND sale_item_id IS NULL AND order_id IS NOT NULL AND sale_id IS NULL)
    OR
    (sale_item_id IS NOT NULL AND order_item_id IS NULL AND sale_id IS NOT NULL AND order_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_price_adjustment_items_order_item
  ON public.price_adjustment_items(order_item_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_price_adjustment_items_sale_item
  ON public.price_adjustment_items(sale_item_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_price_adjustment_items_customer_history
  ON public.price_adjustment_items(created_at DESC);

ALTER TABLE public.price_adjustment_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.apply_current_price_adjustments(
  p_order_ids UUID[] DEFAULT '{}'::UUID[],
  p_sale_ids UUID[] DEFAULT '{}'::UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_order_id UUID;
  v_sale_id UUID;
  v_order RECORD;
  v_sale RECORD;
  v_item RECORD;
  v_customer_type TEXT;
  v_previous_unit_price NUMERIC(12,2);
  v_current_unit_price NUMERIC(12,2);
  v_line_adjustment NUMERIC(12,2);
  v_record_adjustment NUMERIC(12,2);
  v_adjusted_orders INTEGER := 0;
  v_adjusted_sales INTEGER := 0;
  v_adjusted_records INTEGER := 0;
  v_total_adjustment NUMERIC(12,2) := 0;
  v_details JSONB := '[]'::JSONB;
  v_short_id TEXT;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT role INTO v_actor_role
  FROM public.profiles
  WHERE id = v_actor_id AND COALESCE(is_active, true) = true;

  IF v_actor_role IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'Solo un administrador puede aplicar ajustes de precio';
  END IF;

  IF COALESCE(cardinality(p_order_ids), 0) + COALESCE(cardinality(p_sale_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Selecciona al menos un pedido o una venta';
  END IF;

  IF COALESCE(cardinality(p_order_ids), 0) + COALESCE(cardinality(p_sale_ids), 0) > 200 THEN
    RAISE EXCEPTION 'Puedes actualizar hasta 200 comprobantes por operación';
  END IF;

  -- Los pedidos cancelados o sin saldo no se modifican. El precio original de
  -- cada renglón queda intacto; solo se agrega el aumento al total y al saldo.
  FOR v_order_id IN
    SELECT DISTINCT x
    FROM unnest(COALESCE(p_order_ids, '{}'::UUID[])) AS x
    ORDER BY x
  LOOP
    SELECT id, customer_id, total_amount, amount_pending, status
      INTO v_order
    FROM public.orders
    WHERE id = v_order_id
    FOR UPDATE;

    IF NOT FOUND OR v_order.customer_id IS NULL
       OR COALESCE(v_order.amount_pending, 0) <= 0
       OR v_order.status = 'cancelado' THEN
      CONTINUE;
    END IF;

    SELECT customer_type INTO v_customer_type
    FROM public.customers
    WHERE id = v_order.customer_id;

    v_record_adjustment := 0;

    FOR v_item IN
      SELECT oi.id, oi.product_id, oi.quantity, COALESCE(oi.price, oi.unit_price, 0) AS original_price,
             p.price_minorista, p.price_mayorista
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = v_order_id
      ORDER BY oi.id
      FOR UPDATE OF oi
    LOOP
      SELECT applied_unit_price INTO v_previous_unit_price
      FROM public.price_adjustment_items
      WHERE order_item_id = v_item.id
      ORDER BY id DESC
      LIMIT 1;

      v_previous_unit_price := COALESCE(v_previous_unit_price, v_item.original_price);
      v_current_unit_price := CASE
        WHEN v_customer_type = 'mayorista'
          THEN COALESCE(v_item.price_mayorista, v_previous_unit_price)
        ELSE COALESCE(v_item.price_minorista, v_previous_unit_price)
      END;
      v_line_adjustment := ROUND(
        GREATEST(v_current_unit_price - v_previous_unit_price, 0) * v_item.quantity,
        2
      );

      IF v_line_adjustment > 0 THEN
        INSERT INTO public.price_adjustment_items (
          order_id, order_item_id, product_id, previous_unit_price,
          applied_unit_price, quantity, adjustment_amount, created_by
        ) VALUES (
          v_order_id, v_item.id, v_item.product_id, v_previous_unit_price,
          v_current_unit_price, v_item.quantity, v_line_adjustment, v_actor_id
        );
        v_record_adjustment := v_record_adjustment + v_line_adjustment;
      END IF;
    END LOOP;

    IF v_record_adjustment > 0 THEN
      UPDATE public.orders
      SET total_amount = COALESCE(total_amount, 0) + v_record_adjustment,
          amount_pending = COALESCE(amount_pending, 0) + v_record_adjustment,
          updated_at = now()
      WHERE id = v_order_id;

      v_short_id := LEFT(v_order_id::TEXT, 8);
      INSERT INTO public.payments (
        customer_id, order_id, type, amount, payment_method, comment, created_at
      ) VALUES (
        v_order.customer_id, v_order_id, 'compra', v_record_adjustment,
        'ajuste_precio',
        'Ajuste de precio a valores actuales - Pedido #' || v_short_id,
        now()
      );

      UPDATE public.customers
      SET debt = COALESCE(debt, 0) + v_record_adjustment
      WHERE id = v_order.customer_id;

      v_adjusted_orders := v_adjusted_orders + 1;
      v_adjusted_records := v_adjusted_records + 1;
      v_total_adjustment := v_total_adjustment + v_record_adjustment;
      v_details := v_details || jsonb_build_array(jsonb_build_object(
        'type', 'order', 'id', v_order_id, 'adjustment', v_record_adjustment
      ));
    END IF;
  END LOOP;

  -- Ventas de mostrador anuladas o saldadas quedan excluidas.
  FOR v_sale_id IN
    SELECT DISTINCT x
    FROM unnest(COALESCE(p_sale_ids, '{}'::UUID[])) AS x
    ORDER BY x
  LOOP
    SELECT id, customer_id, total_amount, amount_pending, is_cancelled
      INTO v_sale
    FROM public.sales
    WHERE id = v_sale_id
    FOR UPDATE;

    IF NOT FOUND OR v_sale.customer_id IS NULL
       OR COALESCE(v_sale.amount_pending, 0) <= 0
       OR COALESCE(v_sale.is_cancelled, false) THEN
      CONTINUE;
    END IF;

    SELECT customer_type INTO v_customer_type
    FROM public.customers
    WHERE id = v_sale.customer_id;

    v_record_adjustment := 0;

    FOR v_item IN
      SELECT si.id, si.product_id, si.quantity, si.price AS original_price,
             p.price_minorista, p.price_mayorista
      FROM public.sale_items si
      JOIN public.products p ON p.id = si.product_id
      WHERE si.sale_id = v_sale_id
      ORDER BY si.id
      FOR UPDATE OF si
    LOOP
      SELECT applied_unit_price INTO v_previous_unit_price
      FROM public.price_adjustment_items
      WHERE sale_item_id = v_item.id
      ORDER BY id DESC
      LIMIT 1;

      v_previous_unit_price := COALESCE(v_previous_unit_price, v_item.original_price);
      v_current_unit_price := CASE
        WHEN v_customer_type = 'mayorista'
          THEN COALESCE(v_item.price_mayorista, v_previous_unit_price)
        ELSE COALESCE(v_item.price_minorista, v_previous_unit_price)
      END;
      v_line_adjustment := ROUND(
        GREATEST(v_current_unit_price - v_previous_unit_price, 0) * v_item.quantity,
        2
      );

      IF v_line_adjustment > 0 THEN
        INSERT INTO public.price_adjustment_items (
          sale_id, sale_item_id, product_id, previous_unit_price,
          applied_unit_price, quantity, adjustment_amount, created_by
        ) VALUES (
          v_sale_id, v_item.id, v_item.product_id, v_previous_unit_price,
          v_current_unit_price, v_item.quantity, v_line_adjustment, v_actor_id
        );
        v_record_adjustment := v_record_adjustment + v_line_adjustment;
      END IF;
    END LOOP;

    IF v_record_adjustment > 0 THEN
      UPDATE public.sales
      SET total_amount = COALESCE(total_amount, 0) + v_record_adjustment,
          amount_pending = COALESCE(amount_pending, 0) + v_record_adjustment
      WHERE id = v_sale_id;

      v_short_id := LEFT(v_sale_id::TEXT, 8);
      INSERT INTO public.payments (
        customer_id, sale_id, type, amount, payment_method, comment, created_at
      ) VALUES (
        v_sale.customer_id, v_sale_id, 'compra', v_record_adjustment,
        'ajuste_precio',
        'Ajuste de precio a valores actuales - Venta #' || v_short_id,
        now()
      );

      UPDATE public.customers
      SET debt = COALESCE(debt, 0) + v_record_adjustment
      WHERE id = v_sale.customer_id;

      v_adjusted_sales := v_adjusted_sales + 1;
      v_adjusted_records := v_adjusted_records + 1;
      v_total_adjustment := v_total_adjustment + v_record_adjustment;
      v_details := v_details || jsonb_build_array(jsonb_build_object(
        'type', 'sale', 'id', v_sale_id, 'adjustment', v_record_adjustment
      ));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'adjusted_orders', v_adjusted_orders,
    'adjusted_sales', v_adjusted_sales,
    'adjusted_records', v_adjusted_records,
    'total_adjustment', v_total_adjustment,
    'details', v_details
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_current_price_adjustments(UUID[], UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_current_price_adjustments(UUID[], UUID[]) TO authenticated;
