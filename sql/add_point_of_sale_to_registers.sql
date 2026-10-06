-- ============================================================================
-- Migración: Puntos de Venta Fiscales Independientes por Caja (AFIP / Facturación)
-- FrontStock - 2026-10-06
-- ============================================================================

BEGIN;

-- 1. Agregar columna point_of_sale en registers si no existe
ALTER TABLE public.registers
  ADD COLUMN IF NOT EXISTS point_of_sale INT NOT NULL DEFAULT 1;

-- 2. Asignar Punto de Venta 1 para Caja 1 y Punto de Venta 2 para Caja 2 por defecto
UPDATE public.registers
SET point_of_sale = 1
WHERE name = 'Caja 1' AND point_of_sale = 1;

UPDATE public.registers
SET point_of_sale = 2
WHERE name = 'Caja 2';

-- 3. Crear secuencias independientes para Punto de Venta 2 en voucher_sequences
-- (Caja 1 usa PV 1 y Caja 2 usa PV 2, garantizando numeración correlativa sin colisiones)
INSERT INTO public.voucher_sequences (voucher_type_id, point_of_sale, next_number)
SELECT id, 2, 1
FROM public.voucher_types
ON CONFLICT (voucher_type_id, point_of_sale) DO NOTHING;

-- 4. Actualizar finalize_sale_transaction para resolver el point_of_sale de la caja automáticamente
CREATE OR REPLACE FUNCTION public.finalize_sale_transaction(
  p_customer_id UUID,
  p_profile_id UUID,
  p_total_amount NUMERIC,
  p_payment_method TEXT,
  p_amount_paid NUMERIC,
  p_created_at TIMESTAMPTZ,
  p_items JSONB,
  p_use_mixed_payment BOOLEAN DEFAULT false,
  p_payment_methods JSONB DEFAULT '[]'::JSONB,
  p_pay_to_supplier BOOLEAN DEFAULT false,
  p_selected_supplier_id UUID DEFAULT null,
  p_customer_full_name TEXT DEFAULT null,
  p_voucher_type_id TEXT DEFAULT 'FB',
  p_point_of_sale INT DEFAULT 1,
  p_observations TEXT DEFAULT null,
  p_subtotal_neto NUMERIC DEFAULT 0,
  p_iva_amount NUMERIC DEFAULT 0,
  p_iva_breakdown JSONB DEFAULT '[]'::JSONB,
  p_register_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sale_id UUID;
  v_debt_generated NUMERIC := COALESCE(p_total_amount, 0) - COALESCE(p_amount_paid, 0);
  v_new_customer_debt NUMERIC;
  v_new_supplier_debt NUMERIC;
  v_item RECORD;
  v_payment RECORD;
  v_product_name TEXT;
  v_product_sku TEXT;
  v_current_stock INT;
  v_next_num INT;
  v_voucher_number TEXT;
  v_resolved_register_id BIGINT := p_register_id;
  v_user_register_id BIGINT;
  v_resolved_pos INT := COALESCE(p_point_of_sale, 1);
  v_reg_pos INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_profile_id IS NULL OR auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Perfil inválido para registrar la venta';
  END IF;

  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Cliente requerido';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La venta debe tener al menos un ítem';
  END IF;

  -- Resolución de Caja:
  -- 1. Si no se pasó p_register_id, buscar si el usuario tiene asignada una caja en profiles
  IF v_resolved_register_id IS NULL THEN
    SELECT register_id INTO v_user_register_id FROM public.profiles WHERE id = p_profile_id;
    v_resolved_register_id := v_user_register_id;
  END IF;

  -- 2. Si todavía no hay caja, asignar la primera caja activa disponible (Caja 1)
  IF v_resolved_register_id IS NULL THEN
    SELECT id INTO v_resolved_register_id FROM public.registers WHERE is_active = true ORDER BY id ASC LIMIT 1;
  END IF;

  -- 3. Validar caja y resolver su Punto de Venta fiscal configurado
  IF v_resolved_register_id IS NOT NULL THEN
    SELECT point_of_sale INTO v_reg_pos
    FROM public.registers
    WHERE id = v_resolved_register_id AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'La caja especificada (ID %) no existe o no se encuentra activa', v_resolved_register_id;
    END IF;

    -- Si la caja tiene su propio punto de venta asignado (> 0), utilizarlo prioritariamente
    IF v_reg_pos IS NOT NULL AND v_reg_pos > 0 THEN
      v_resolved_pos := v_reg_pos;
    END IF;
  END IF;

  -- Thread-safe numbering block: lock sequence table row para este punto de venta específico
  INSERT INTO public.voucher_sequences (voucher_type_id, point_of_sale, next_number)
  VALUES (p_voucher_type_id, v_resolved_pos, 1)
  ON CONFLICT (voucher_type_id, point_of_sale) DO NOTHING;

  SELECT next_number INTO v_next_num
  FROM public.voucher_sequences
  WHERE voucher_type_id = p_voucher_type_id AND point_of_sale = v_resolved_pos
  FOR UPDATE;

  -- Formats as 0001-00000001 (o 0002-00000001)
  v_voucher_number := LPAD(v_resolved_pos::TEXT, 4, '0') || '-' || LPAD(v_next_num::TEXT, 8, '0');

  UPDATE public.voucher_sequences
  SET next_number = next_number + 1
  WHERE voucher_type_id = p_voucher_type_id AND point_of_sale = v_resolved_pos;

  -- Insert sale with voucher headers, point_of_sale y register_id
  INSERT INTO public.sales (
    customer_id,
    profile_id,
    register_id,
    total_amount,
    payment_method,
    amount_paid,
    amount_pending,
    created_at,
    voucher_type_id,
    voucher_number,
    point_of_sale,
    status,
    subtotal_neto,
    iva_amount,
    iva_breakdown,
    observations
  )
  VALUES (
    p_customer_id,
    p_profile_id,
    v_resolved_register_id,
    COALESCE(p_total_amount, 0),
    p_payment_method,
    COALESCE(p_amount_paid, 0),
    v_debt_generated,
    COALESCE(p_created_at, now()),
    p_voucher_type_id,
    v_voucher_number,
    v_resolved_pos,
    'Emitido',
    COALESCE(p_subtotal_neto, 0),
    COALESCE(p_iva_amount, 0),
    COALESCE(p_iva_breakdown, '[]'::JSONB),
    p_observations
  )
  RETURNING id INTO v_sale_id;

  -- Insert sale items y lock en stock (ordenados determinísticamente para prevenir deadlocks)
  FOR v_item IN
    SELECT *
    FROM jsonb_to_recordset(p_items) as t(
      product_id UUID,
      quantity INT,
      price NUMERIC,
      tax_rate_id INT,
      subtotal_neto NUMERIC,
      iva_amount NUMERIC
    )
    ORDER BY product_id ASC
  LOOP
    IF v_item.product_id IS NULL OR COALESCE(v_item.quantity, 0) <= 0 THEN
      RAISE EXCEPTION 'Ítem inválido en la venta';
    END IF;

    INSERT INTO public.sale_items (
      sale_id,
      product_id,
      quantity,
      price,
      tax_rate_id,
      subtotal_neto,
      iva_amount
    )
    VALUES (
      v_sale_id,
      v_item.product_id,
      v_item.quantity,
      COALESCE(v_item.price, 0),
      v_item.tax_rate_id,
      COALESCE(v_item.subtotal_neto, COALESCE(v_item.price, 0) * v_item.quantity),
      COALESCE(v_item.iva_amount, 0)
    );

    -- Concurrencia atómica: lock de fila en products para evitar race conditions
    SELECT name, sku, stock INTO v_product_name, v_product_sku, v_current_stock
    FROM public.products
    WHERE id = v_item.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado: %', v_item.product_id;
    END IF;

    -- Adjust stock (excluding food items/bulk if configured as exceptions)
    IF NOT (
      COALESCE(LOWER(v_product_name), '') LIKE '%alimento suelto%'
      OR COALESCE(LOWER(v_product_name), '') LIKE '%alimento a granel%'
      OR UPPER(COALESCE(v_product_sku, '')) IN ('SUELTO', 'GRANEL')
    ) THEN
      IF COALESCE(v_current_stock, 0) < v_item.quantity THEN
        RAISE EXCEPTION 'Stock insuficiente para % (stock actual: %, requerido: %)',
          COALESCE(v_product_name, v_item.product_id::TEXT),
          COALESCE(v_current_stock, 0),
          v_item.quantity;
      END IF;

      UPDATE public.products
      SET stock = stock - v_item.quantity
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  -- Actualizar deuda del cliente ÚNICAMENTE si la venta generó saldo pendiente
  IF v_debt_generated <> 0 THEN
    UPDATE public.customers
    SET debt = COALESCE(debt, 0) + v_debt_generated
    WHERE id = p_customer_id
    RETURNING debt INTO v_new_customer_debt;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cliente no encontrado: %', p_customer_id;
    END IF;
  ELSE
    SELECT debt INTO v_new_customer_debt FROM public.customers WHERE id = p_customer_id;
  END IF;

  -- Create debit/compra payment record if there is amount pending
  IF v_debt_generated > 0 THEN
    INSERT INTO public.payments (
      customer_id,
      sale_id,
      type,
      amount,
      payment_method,
      comment,
      created_at
    )
    VALUES (
      p_customer_id,
      v_sale_id,
      'compra',
      v_debt_generated,
      p_payment_method,
      CASE
        WHEN COALESCE(p_use_mixed_payment, false) THEN 'Venta parcial - pagos mixtos'
        WHEN COALESCE(p_payment_method, '') = 'cuenta_corriente' THEN 'Venta a crédito'
        ELSE 'Venta parcial'
      END,
      COALESCE(p_created_at, now())
    );
  END IF;

  -- Create credit/pago payment record if there is amount paid
  IF COALESCE(p_amount_paid, 0) > 0 THEN
    IF COALESCE(p_use_mixed_payment, false) THEN
      FOR v_payment IN
        SELECT *
        FROM jsonb_to_recordset(COALESCE(p_payment_methods, '[]'::JSONB)) as t(
          method TEXT,
          amount NUMERIC
        )
      LOOP
        IF COALESCE(v_payment.amount, 0) > 0 THEN
          INSERT INTO public.payments (
            customer_id,
            sale_id,
            type,
            amount,
            payment_method,
            comment,
            created_at
          )
          VALUES (
            p_customer_id,
            v_sale_id,
            'pago',
            v_payment.amount,
            v_payment.method,
            FORMAT('Pago con %s', COALESCE(NULLIF(v_payment.method, ''), 'método no especificado')),
            COALESCE(p_created_at, now())
          );
        END IF;
      END LOOP;
    ELSE
      INSERT INTO public.payments (
        customer_id,
        sale_id,
        type,
        amount,
        payment_method,
        comment,
        created_at
      )
      VALUES (
        p_customer_id,
        v_sale_id,
        'pago',
        COALESCE(p_amount_paid, 0),
        p_payment_method,
        FORMAT('Pago con %s', COALESCE(NULLIF(p_payment_method, ''), 'método no especificado')),
        COALESCE(p_created_at, now())
      );
    END IF;
  END IF;

  -- Handle Supplier direct transfer
  IF COALESCE(p_pay_to_supplier, false) AND p_selected_supplier_id IS NOT NULL AND COALESCE(p_amount_paid, 0) > 0 THEN
    UPDATE public.suppliers
    SET debt = COALESCE(debt, 0) - COALESCE(p_amount_paid, 0)
    WHERE id = p_selected_supplier_id
    RETURNING debt INTO v_new_supplier_debt;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Proveedor no encontrado: %', p_selected_supplier_id;
    END IF;

    INSERT INTO public.supplier_payments (
      supplier_id,
      amount,
      payment_method,
      notes,
      created_at
    )
    VALUES (
      p_selected_supplier_id,
      COALESCE(p_amount_paid, 0),
      COALESCE(NULLIF(p_payment_method, ''), 'efectivo'),
      FORMAT('Pago directo de venta %s - Cliente: %s', LEFT(v_sale_id::TEXT, 8), COALESCE(p_customer_full_name, 'N/A')),
      COALESCE(p_created_at, now())
    );
  END IF;

  RETURN jsonb_build_object(
    'sale_id', v_sale_id,
    'debt_generated', v_debt_generated,
    'new_customer_debt', v_new_customer_debt,
    'new_supplier_debt', v_new_supplier_debt,
    'voucher_number', v_voucher_number,
    'point_of_sale', v_resolved_pos,
    'register_id', v_resolved_register_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_sale_transaction(
  UUID, UUID, NUMERIC, TEXT, NUMERIC, TIMESTAMPTZ, JSONB, BOOLEAN, JSONB, BOOLEAN, UUID, TEXT, TEXT, INT, TEXT, NUMERIC, NUMERIC, JSONB, BIGINT
) TO authenticated;

COMMIT;
