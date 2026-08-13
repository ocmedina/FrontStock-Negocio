-- Agregar columna promotion a la tabla order_items si no existe
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS promotion JSONB DEFAULT NULL;

-- Actualizar la función para manejar el cambio de estado de un pedido y actualizar el stock considerando promociones
CREATE OR REPLACE FUNCTION handle_order_status_change(
  order_id_param UUID,
  new_status_param TEXT
) RETURNS VOID AS $$
DECLARE
  current_status TEXT;
  item RECORD;
  v_current_stock INTEGER;
  v_user_id UUID;
  v_promo_applied BOOLEAN;
  v_total_gift_qty INTEGER;
  v_gift_product_id UUID;
  v_total_stock_needed INTEGER;
  v_gift_current_stock INTEGER;
  v_gift_product_name TEXT;
BEGIN
  SELECT status INTO current_status FROM orders WHERE id = order_id_param;

  v_user_id := auth.uid();

  IF current_status = new_status_param THEN
    RETURN;
  END IF;

  -- CASO 1: Marcar como ENTREGADO (Se DESCUENTA stock)
  IF new_status_param = 'entregado' AND current_status != 'entregado' THEN
    FOR item IN SELECT product_id, quantity, promotion FROM order_items WHERE order_id = order_id_param LOOP
      v_promo_applied := COALESCE((item.promotion->>'applied')::boolean, false);
      v_total_gift_qty := COALESCE((item.promotion->>'totalGiftQuantity')::integer, 0);

      IF item.promotion->>'giftProductId' IS NOT NULL AND (item.promotion->>'giftProductId') != '' THEN
        v_gift_product_id := (item.promotion->>'giftProductId')::uuid;
      ELSE
        v_gift_product_id := item.product_id;
      END IF;

      -- Determinar stock necesario del producto principal
      IF v_promo_applied AND v_total_gift_qty > 0 AND v_gift_product_id = item.product_id THEN
        v_total_stock_needed := item.quantity + v_total_gift_qty;
      ELSE
        v_total_stock_needed := item.quantity;
      END IF;

      SELECT stock INTO v_current_stock FROM products WHERE id = item.product_id FOR UPDATE;

      UPDATE products 
      SET stock = stock - v_total_stock_needed 
      WHERE id = item.product_id;

      -- Registrar movimiento (Venta)
      INSERT INTO stock_movements (
        product_id,
        user_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        reference_id,
        notes
      ) VALUES (
        item.product_id,
        v_user_id,
        'venta',
        -item.quantity,
        v_current_stock,
        v_current_stock - item.quantity,
        order_id_param::text,
        'Entrega de pedido #' || left(order_id_param::text, 8)
      );

      -- Si hay regalo del mismo producto
      IF v_promo_applied AND v_total_gift_qty > 0 AND v_gift_product_id = item.product_id THEN
        INSERT INTO stock_movements (
          product_id,
          user_id,
          movement_type,
          quantity,
          previous_stock,
          new_stock,
          reference_id,
          notes
        ) VALUES (
          item.product_id,
          v_user_id,
          'promocion',
          -v_total_gift_qty,
          v_current_stock - item.quantity,
          v_current_stock - v_total_stock_needed,
          order_id_param::text,
          'Regalo por promoción en Pedido #' || left(order_id_param::text, 8)
        );
      END IF;

      -- Si el regalo es un producto DISTINTO
      IF v_promo_applied AND v_total_gift_qty > 0 AND v_gift_product_id != item.product_id THEN
        SELECT stock INTO v_gift_current_stock FROM products WHERE id = v_gift_product_id FOR UPDATE;

        UPDATE products 
        SET stock = stock - v_total_gift_qty 
        WHERE id = v_gift_product_id;

        INSERT INTO stock_movements (
          product_id,
          user_id,
          movement_type,
          quantity,
          previous_stock,
          new_stock,
          reference_id,
          notes
        ) VALUES (
          v_gift_product_id,
          v_user_id,
          'promocion',
          -v_total_gift_qty,
          v_gift_current_stock,
          v_gift_current_stock - v_total_gift_qty,
          order_id_param::text,
          'Regalo por promoción en Pedido #' || left(order_id_param::text, 8)
        );
      END IF;
    END LOOP;
  END IF;

  -- CASO 2: Desmarcar como ENTREGADO (Se DEVUELVE stock)
  IF current_status = 'entregado' AND new_status_param != 'entregado' THEN
    FOR item IN SELECT product_id, quantity, promotion FROM order_items WHERE order_id = order_id_param LOOP
      v_promo_applied := COALESCE((item.promotion->>'applied')::boolean, false);
      v_total_gift_qty := COALESCE((item.promotion->>'totalGiftQuantity')::integer, 0);

      IF item.promotion->>'giftProductId' IS NOT NULL AND (item.promotion->>'giftProductId') != '' THEN
        v_gift_product_id := (item.promotion->>'giftProductId')::uuid;
      ELSE
        v_gift_product_id := item.product_id;
      END IF;

      IF v_promo_applied AND v_total_gift_qty > 0 AND v_gift_product_id = item.product_id THEN
        v_total_stock_needed := item.quantity + v_total_gift_qty;
      ELSE
        v_total_stock_needed := item.quantity;
      END IF;

      SELECT stock INTO v_current_stock FROM products WHERE id = item.product_id FOR UPDATE;

      UPDATE products 
      SET stock = stock + v_total_stock_needed 
      WHERE id = item.product_id;

      INSERT INTO stock_movements (
        product_id,
        user_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        reference_id,
        notes
      ) VALUES (
        item.product_id,
        v_user_id,
        'devolucion',
        v_total_stock_needed,
        v_current_stock,
        v_current_stock + v_total_stock_needed,
        order_id_param::text,
        'Cancelación/Reversión de entrega de pedido #' || left(order_id_param::text, 8)
      );

      IF v_promo_applied AND v_total_gift_qty > 0 AND v_gift_product_id != item.product_id THEN
        SELECT stock INTO v_gift_current_stock FROM products WHERE id = v_gift_product_id FOR UPDATE;

        UPDATE products 
        SET stock = stock + v_total_gift_qty 
        WHERE id = v_gift_product_id;

        INSERT INTO stock_movements (
          product_id,
          user_id,
          movement_type,
          quantity,
          previous_stock,
          new_stock,
          reference_id,
          notes
        ) VALUES (
          v_gift_product_id,
          v_user_id,
          'devolucion',
          v_total_gift_qty,
          v_gift_current_stock,
          v_gift_current_stock + v_total_gift_qty,
          order_id_param::text,
          'Cancelación/Reversión de regalo en pedido #' || left(order_id_param::text, 8)
        );
      END IF;
    END LOOP;
  END IF;

  UPDATE orders SET status = new_status_param WHERE id = order_id_param;

END;
$$ LANGUAGE plpgsql;
