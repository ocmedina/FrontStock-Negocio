-- Corrección de operaciones de pedidos para usar el stock de la sucursal.
-- Ejecutar después de 03_add_branch_business_data.sql.

CREATE OR REPLACE FUNCTION public.handle_order_status_change(
  order_id_param UUID,
  new_status_param TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status TEXT;
  order_branch_id BIGINT;
  item RECORD;
  gift_stock INTEGER;
  current_stock INTEGER;
  user_id UUID := auth.uid();
  gift_product_id UUID;
  gift_quantity INTEGER;
  total_stock_needed INTEGER;
  user_role TEXT;
  user_branch_id BIGINT;
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT status, branch_id
    INTO current_status, order_branch_id
  FROM public.orders
  WHERE id = order_id_param
  FOR UPDATE;

  IF current_status IS NULL THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;
  IF order_branch_id IS NULL THEN
    RAISE EXCEPTION 'El pedido no tiene una sucursal asignada';
  END IF;
  SELECT role, branch_id INTO user_role, user_branch_id
  FROM public.profiles
  WHERE id = user_id;
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado';
  END IF;
  IF user_role NOT IN ('administrador', 'supervendedor')
     AND user_branch_id IS DISTINCT FROM order_branch_id THEN
    RAISE EXCEPTION 'No tienes permiso para operar pedidos de esta sucursal';
  END IF;
  IF current_status = new_status_param THEN
    RETURN;
  END IF;

  IF new_status_param = 'entregado' AND current_status <> 'entregado' THEN
    FOR item IN
      SELECT product_id, quantity, promotion
      FROM public.order_items
      WHERE order_id = order_id_param
    LOOP
      gift_quantity := COALESCE((item.promotion->>'totalGiftQuantity')::INTEGER, 0);
      IF NULLIF(item.promotion->>'giftProductId', '') IS NOT NULL THEN
        gift_product_id := (item.promotion->>'giftProductId')::UUID;
      ELSE
        gift_product_id := item.product_id;
      END IF;

      total_stock_needed := item.quantity;
      IF COALESCE((item.promotion->>'applied')::BOOLEAN, false)
         AND gift_quantity > 0
         AND gift_product_id = item.product_id THEN
        total_stock_needed := item.quantity + gift_quantity;
      END IF;

      INSERT INTO public.branch_stock (branch_id, product_id, stock)
      VALUES (order_branch_id, item.product_id, 0)
      ON CONFLICT (branch_id, product_id) DO NOTHING;

      SELECT stock INTO current_stock
      FROM public.branch_stock
      WHERE branch_id = order_branch_id AND product_id = item.product_id
      FOR UPDATE;

      IF current_stock < total_stock_needed THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto %', item.product_id;
      END IF;

      UPDATE public.branch_stock
      SET stock = stock - total_stock_needed
      WHERE branch_id = order_branch_id AND product_id = item.product_id;

      INSERT INTO public.stock_movements (
        product_id, user_id, branch_id, movement_type, quantity,
        previous_stock, new_stock, reference_id, notes
      )
      VALUES (
        item.product_id, user_id, order_branch_id, 'venta', -item.quantity,
        current_stock, current_stock - item.quantity, order_id_param::TEXT,
        'Entrega de pedido #' || left(order_id_param::TEXT, 8)
      );

      IF total_stock_needed > item.quantity THEN
        INSERT INTO public.stock_movements (
          product_id, user_id, branch_id, movement_type, quantity,
          previous_stock, new_stock, reference_id, notes
        )
        VALUES (
          item.product_id, user_id, order_branch_id, 'promocion', -gift_quantity,
          current_stock - item.quantity, current_stock - total_stock_needed,
          order_id_param::TEXT, 'Regalo por promoción en pedido #' || left(order_id_param::TEXT, 8)
        );
      END IF;

      IF gift_product_id <> item.product_id AND gift_quantity > 0
         AND COALESCE((item.promotion->>'applied')::BOOLEAN, false) THEN
        INSERT INTO public.branch_stock (branch_id, product_id, stock)
        VALUES (order_branch_id, gift_product_id, 0)
        ON CONFLICT (branch_id, product_id) DO NOTHING;

        SELECT stock INTO gift_stock
        FROM public.branch_stock
        WHERE branch_id = order_branch_id AND product_id = gift_product_id
        FOR UPDATE;

        IF gift_stock < gift_quantity THEN
          RAISE EXCEPTION 'Stock insuficiente para el producto de regalo %', gift_product_id;
        END IF;

        UPDATE public.branch_stock
        SET stock = stock - gift_quantity
        WHERE branch_id = order_branch_id AND product_id = gift_product_id;

        INSERT INTO public.stock_movements (
          product_id, user_id, branch_id, movement_type, quantity,
          previous_stock, new_stock, reference_id, notes
        )
        VALUES (
          gift_product_id, user_id, order_branch_id, 'promocion', -gift_quantity,
          gift_stock, gift_stock - gift_quantity, order_id_param::TEXT,
          'Regalo por promoción en pedido #' || left(order_id_param::TEXT, 8)
        );
      END IF;
    END LOOP;
  ELSIF current_status = 'entregado' AND new_status_param <> 'entregado' THEN
    FOR item IN
      SELECT product_id, quantity, promotion
      FROM public.order_items
      WHERE order_id = order_id_param
    LOOP
      gift_quantity := COALESCE((item.promotion->>'totalGiftQuantity')::INTEGER, 0);
      IF NULLIF(item.promotion->>'giftProductId', '') IS NOT NULL THEN
        gift_product_id := (item.promotion->>'giftProductId')::UUID;
      ELSE
        gift_product_id := item.product_id;
      END IF;

      total_stock_needed := item.quantity;
      IF COALESCE((item.promotion->>'applied')::BOOLEAN, false)
         AND gift_quantity > 0
         AND gift_product_id = item.product_id THEN
        total_stock_needed := item.quantity + gift_quantity;
      END IF;

      INSERT INTO public.branch_stock (branch_id, product_id, stock)
      VALUES (order_branch_id, item.product_id, 0)
      ON CONFLICT (branch_id, product_id) DO NOTHING;

      SELECT stock INTO current_stock
      FROM public.branch_stock
      WHERE branch_id = order_branch_id AND product_id = item.product_id
      FOR UPDATE;

      UPDATE public.branch_stock
      SET stock = stock + total_stock_needed
      WHERE branch_id = order_branch_id AND product_id = item.product_id;

      INSERT INTO public.stock_movements (
        product_id, user_id, branch_id, movement_type, quantity,
        previous_stock, new_stock, reference_id, notes
      )
      VALUES (
        item.product_id, user_id, order_branch_id, 'devolucion', total_stock_needed,
        current_stock, current_stock + total_stock_needed, order_id_param::TEXT,
        'Reversión de entrega de pedido #' || left(order_id_param::TEXT, 8)
      );

      IF gift_product_id <> item.product_id AND gift_quantity > 0
         AND COALESCE((item.promotion->>'applied')::BOOLEAN, false) THEN
        INSERT INTO public.branch_stock (branch_id, product_id, stock)
        VALUES (order_branch_id, gift_product_id, 0)
        ON CONFLICT (branch_id, product_id) DO NOTHING;

        SELECT stock INTO gift_stock
        FROM public.branch_stock
        WHERE branch_id = order_branch_id AND product_id = gift_product_id
        FOR UPDATE;

        UPDATE public.branch_stock
        SET stock = stock + gift_quantity
        WHERE branch_id = order_branch_id AND product_id = gift_product_id;

        INSERT INTO public.stock_movements (
          product_id, user_id, branch_id, movement_type, quantity,
          previous_stock, new_stock, reference_id, notes
        )
        VALUES (
          gift_product_id, user_id, order_branch_id, 'devolucion', gift_quantity,
          gift_stock, gift_stock + gift_quantity, order_id_param::TEXT,
          'Reversión de regalo en pedido #' || left(order_id_param::TEXT, 8)
        );
      END IF;
    END LOOP;
  END IF;

  UPDATE public.orders
  SET status = new_status_param
  WHERE id = order_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_branch_stock(
  p_branch_id BIGINT,
  p_product_id UUID,
  p_delta INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
  user_role TEXT;
  user_branch_id BIGINT;
BEGIN
  SELECT role, branch_id INTO user_role, user_branch_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF auth.uid() IS NULL OR user_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  IF user_role NOT IN ('administrador', 'supervendedor')
     AND user_branch_id IS DISTINCT FROM p_branch_id THEN
    RAISE EXCEPTION 'No tienes permiso para modificar esta sucursal';
  END IF;
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'El ajuste de stock no puede ser cero';
  END IF;

  INSERT INTO public.branch_stock (branch_id, product_id, stock)
  VALUES (p_branch_id, p_product_id, 0)
  ON CONFLICT (branch_id, product_id) DO NOTHING;

  SELECT stock INTO current_stock
  FROM public.branch_stock
  WHERE branch_id = p_branch_id AND product_id = p_product_id
  FOR UPDATE;

  new_stock := current_stock + p_delta;
  IF new_stock < 0 THEN
    RAISE EXCEPTION 'El ajuste dejaría el stock en negativo';
  END IF;

  UPDATE public.branch_stock
  SET stock = new_stock
  WHERE branch_id = p_branch_id AND product_id = p_product_id;

  RETURN new_stock;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_order_status_change(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_branch_stock(BIGINT, UUID, INTEGER) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.adjust_branch_stock(BIGINT, UUID, INTEGER) FROM PUBLIC;
