-- =====================================================
-- Migration: Sale Vouchers Module (AFIP/ARCA Argentina)
-- =====================================================

BEGIN;

-- 1. Table: voucher_types
CREATE TABLE IF NOT EXISTS public.voucher_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT, -- AFIP code (e.g. '001', '006')
  letter TEXT -- 'A', 'B', 'C', 'P', 'R', etc.
);

-- Seed initial voucher types
INSERT INTO public.voucher_types (id, name, code, letter) VALUES
  ('FA', 'Factura A', '001', 'A'),
  ('FB', 'Factura B', '006', 'B'),
  ('FC', 'Factura C', '011', 'C'),
  ('NCA', 'Nota de Crédito A', '003', 'A'),
  ('NCB', 'Nota de Crédito B', '008', 'B'),
  ('NCC', 'Nota de Crédito C', '013', 'C'),
  ('NDA', 'Nota de Débito A', '002', 'A'),
  ('NDB', 'Nota de Débito B', '007', 'B'),
  ('NDC', 'Nota de Débito C', '012', 'C'),
  ('PR', 'Presupuesto', NULL, 'P'),
  ('RE', 'Remito', NULL, 'R')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  letter = EXCLUDED.letter;

-- 2. Table: tax_rates
CREATE TABLE IF NOT EXISTS public.tax_rates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  rate NUMERIC(5,2) NOT NULL UNIQUE
);

-- Seed default Argentine tax rates
INSERT INTO public.tax_rates (id, name, rate) VALUES
  (1, '21%', 21.00),
  (2, '10.5%', 10.50),
  (3, '27%', 27.00),
  (4, 'Exento / 0%', 0.00)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rate = EXCLUDED.rate;

-- 3. Table: voucher_sequences
CREATE TABLE IF NOT EXISTS public.voucher_sequences (
  voucher_type_id TEXT NOT NULL REFERENCES public.voucher_types(id) ON DELETE CASCADE,
  point_of_sale INT NOT NULL DEFAULT 1,
  next_number INT NOT NULL DEFAULT 1,
  PRIMARY KEY (voucher_type_id, point_of_sale)
);

-- Seed default sequence for POS 1
INSERT INTO public.voucher_sequences (voucher_type_id, point_of_sale, next_number) VALUES
  ('FA', 1, 1),
  ('FB', 1, 1),
  ('FC', 1, 1),
  ('NCA', 1, 1),
  ('NCB', 1, 1),
  ('NCC', 1, 1),
  ('NDA', 1, 1),
  ('NDB', 1, 1),
  ('NDC', 1, 1),
  ('PR', 1, 1),
  ('RE', 1, 1)
ON CONFLICT (voucher_type_id, point_of_sale) DO NOTHING;

-- 4. Alter: sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS voucher_type_id TEXT REFERENCES public.voucher_types(id);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS voucher_number TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS point_of_sale INT DEFAULT 1;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cae TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cae_due_date DATE;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Emitido' CHECK (status IN ('Pendiente', 'Emitido', 'Anulado'));
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS subtotal_neto NUMERIC(12,2);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS iva_amount NUMERIC(12,2);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS iva_breakdown JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS observations TEXT;

-- 5. Alter: sale_items table
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS tax_rate_id INT REFERENCES public.tax_rates(id);
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS iva_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS subtotal_neto NUMERIC(12,2);

-- 6. Alter: customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cuit TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS iva_condition TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS locality TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS province TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_voucher_type ON public.sales(voucher_type_id);
CREATE INDEX IF NOT EXISTS idx_sales_voucher_number ON public.sales(voucher_number);
CREATE INDEX IF NOT EXISTS idx_sale_items_tax_rate ON public.sale_items(tax_rate_id);

-- 7. RLS policies activation & grants
ALTER TABLE public.voucher_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_voucher_types" ON public.voucher_types;
CREATE POLICY "auth_select_voucher_types" ON public.voucher_types FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_select_tax_rates" ON public.tax_rates;
CREATE POLICY "auth_select_tax_rates" ON public.tax_rates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_all_voucher_sequences" ON public.voucher_sequences;
CREATE POLICY "auth_all_voucher_sequences" ON public.voucher_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON public.voucher_types TO authenticated;
GRANT ALL ON public.tax_rates TO authenticated;
GRANT ALL ON public.voucher_sequences TO authenticated;
GRANT USAGE, SELECT ON public.tax_rates_id_seq TO authenticated;

-- 8. Upgraded function: finalize_sale_transaction
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
  p_iva_breakdown JSONB DEFAULT '[]'::JSONB
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

  -- Thread-safe numbering block: lock sequence table row
  INSERT INTO public.voucher_sequences (voucher_type_id, point_of_sale, next_number)
  VALUES (p_voucher_type_id, p_point_of_sale, 1)
  ON CONFLICT (voucher_type_id, point_of_sale) DO NOTHING;

  SELECT next_number INTO v_next_num
  FROM public.voucher_sequences
  WHERE voucher_type_id = p_voucher_type_id AND point_of_sale = p_point_of_sale
  FOR UPDATE;

  -- Formats as 0001-00000001
  v_voucher_number := LPAD(p_point_of_sale::TEXT, 4, '0') || '-' || LPAD(v_next_num::TEXT, 8, '0');

  UPDATE public.voucher_sequences
  SET next_number = next_number + 1
  WHERE voucher_type_id = p_voucher_type_id AND point_of_sale = p_point_of_sale;

  -- Insert sale with voucher headers
  INSERT INTO public.sales (
    customer_id,
    profile_id,
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
    COALESCE(p_total_amount, 0),
    p_payment_method,
    COALESCE(p_amount_paid, 0),
    v_debt_generated,
    COALESCE(p_created_at, now()),
    p_voucher_type_id,
    v_voucher_number,
    p_point_of_sale,
    'Emitido',
    COALESCE(p_subtotal_neto, 0),
    COALESCE(p_iva_amount, 0),
    COALESCE(p_iva_breakdown, '[]'::JSONB),
    p_observations
  )
  RETURNING id INTO v_sale_id;

  -- Insert sale items
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

  -- Update Customer Accounts
  UPDATE public.customers
  SET debt = COALESCE(debt, 0) + v_debt_generated
  WHERE id = p_customer_id
  RETURNING debt INTO v_new_customer_debt;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado: %', p_customer_id;
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

  -- Handle Supplier direct transfer (mixed flow support)
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
    'voucher_number', v_voucher_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_sale_transaction(
  UUID, UUID, NUMERIC, TEXT, NUMERIC, TIMESTAMPTZ, JSONB, BOOLEAN, JSONB, BOOLEAN, UUID, TEXT, TEXT, INT, TEXT, NUMERIC, NUMERIC, JSONB
) TO authenticated;

COMMIT;
