-- ============================================================
-- Programa de Referidos - FrontStock
-- Ejecutar este script en el SQL Editor de Supabase
-- ============================================================

-- 1. Tabla de configuración global del programa
CREATE TABLE IF NOT EXISTS referral_settings (
  id SERIAL PRIMARY KEY,
  referrer_discount_percent NUMERIC DEFAULT 15,
  referred_discount_percent NUMERIC DEFAULT 10,
  max_referrals_per_customer INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  expiration_days INTEGER DEFAULT 90,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración por defecto
INSERT INTO referral_settings (referrer_discount_percent, referred_discount_percent, max_referrals_per_customer, is_active, expiration_days)
VALUES (15, 10, 5, true, 90)
ON CONFLICT DO NOTHING;

-- 2. Tabla de referidos
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  referred_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  referral_code VARCHAR(12) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'completed', 'expired')),
  referrer_discount_percent NUMERIC DEFAULT 15,
  referred_discount_percent NUMERIC DEFAULT 10,
  referrer_discount_used BOOLEAN DEFAULT FALSE,
  referred_discount_used BOOLEAN DEFAULT FALSE,
  referrer_sale_id UUID,
  referred_sale_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_customer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read referrals" ON referrals;
DROP POLICY IF EXISTS "Authenticated users can insert referrals" ON referrals;
DROP POLICY IF EXISTS "Authenticated users can update referrals" ON referrals;
DROP POLICY IF EXISTS "Authenticated users can read referral_settings" ON referral_settings;
DROP POLICY IF EXISTS "Authenticated users can update referral_settings" ON referral_settings;

CREATE POLICY "Authenticated users can read referrals" ON referrals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert referrals" ON referrals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('administrador', 'supervendedor')
    )
  );

CREATE POLICY "Authenticated users can update referrals" ON referrals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('administrador', 'supervendedor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('administrador', 'supervendedor')
    )
  );

CREATE POLICY "Authenticated users can read referral_settings" ON referral_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update referral_settings" ON referral_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('administrador', 'supervendedor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('administrador', 'supervendedor')
    )
  );

-- La landing pública consulta mediante una Server Action con service_role.
-- No se expone la tabla completa a la clave anónima.
DROP POLICY IF EXISTS "Anyone can read referrals by code" ON referrals;
DROP POLICY IF EXISTS "Anyone can read referral_settings" ON referral_settings;

CREATE OR REPLACE FUNCTION public.claim_referral_for_customer(
  p_referral_code TEXT,
  p_referred_customer_id UUID
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral referrals%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT *
    INTO v_referral
  FROM referrals
  WHERE referral_code = upper(trim(p_referral_code))
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código inválido o ya utilizado';
  END IF;

  IF v_referral.expires_at IS NOT NULL AND v_referral.expires_at < NOW() THEN
    UPDATE referrals
    SET status = 'expired'
    WHERE id = v_referral.id;
    RAISE EXCEPTION 'Este código de referido ha expirado';
  END IF;

  IF v_referral.referrer_customer_id = p_referred_customer_id THEN
    RAISE EXCEPTION 'Un cliente no puede referirse a sí mismo';
  END IF;

  UPDATE referrals
  SET referred_customer_id = p_referred_customer_id,
      status = 'registered'
  WHERE id = v_referral.id;

  RETURN jsonb_build_object(
    'id', v_referral.id,
    'referral_code', v_referral.referral_code,
    'referred_discount_percent', v_referral.referred_discount_percent,
    'status', 'registered'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_referral_for_customer(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_referral_for_customer(TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_referral_discount(
  p_referral_id UUID,
  p_role TEXT,
  p_sale_id UUID
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_referrer_id UUID;
  v_referred_id UUID;
  v_referrer_used BOOLEAN;
  v_referred_used BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_role NOT IN ('referrer', 'referred') THEN
    RAISE EXCEPTION 'Rol de referido inválido';
  END IF;

  SELECT customer_id
    INTO v_customer_id
  FROM sales
  WHERE id = p_sale_id
    AND profile_id = auth.uid();

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'La venta no pertenece al usuario autenticado';
  END IF;

  SELECT referrer_customer_id, referred_customer_id,
         referrer_discount_used, referred_discount_used
    INTO v_referrer_id, v_referred_id, v_referrer_used, v_referred_used
  FROM referrals
  WHERE id = p_referral_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referido no encontrado';
  END IF;

  IF p_role = 'referrer' THEN
    IF v_referrer_id <> v_customer_id OR v_referrer_used
       OR NOT EXISTS (
         SELECT 1 FROM referrals
         WHERE id = p_referral_id AND status IN ('registered', 'completed')
       ) THEN
      RAISE EXCEPTION 'Descuento de referidor no disponible';
    END IF;

    UPDATE referrals
    SET referrer_discount_used = TRUE,
        referrer_sale_id = p_sale_id
    WHERE id = p_referral_id;
  ELSE
    IF v_referred_id IS NULL OR v_referred_id <> v_customer_id OR v_referred_used
       OR NOT EXISTS (
         SELECT 1 FROM referrals
         WHERE id = p_referral_id AND status = 'registered'
       ) THEN
      RAISE EXCEPTION 'Descuento de referido no disponible';
    END IF;

    UPDATE referrals
    SET referred_discount_used = TRUE,
        referred_sale_id = p_sale_id
    WHERE id = p_referral_id;
  END IF;

  SELECT referrer_discount_used, referred_discount_used
    INTO v_referrer_used, v_referred_used
  FROM referrals
  WHERE id = p_referral_id;

  IF v_referrer_used AND v_referred_used THEN
    UPDATE referrals
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = p_referral_id;
  END IF;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_referral_discount(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_referral_discount(UUID, TEXT, UUID) TO authenticated;
