-- ============================================================================
-- Migración: Control de Efectivo, Turnos de Caja (Shifts), Movimientos y Arqueo
-- FrontStock - 2026-10-06
-- ============================================================================

BEGIN;

-- 1. Tabla de Sesiones / Turnos de Caja (cash_shifts)
CREATE TABLE IF NOT EXISTS public.cash_shifts (
  id              BIGSERIAL PRIMARY KEY,
  register_id     BIGINT NOT NULL REFERENCES public.registers(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  initial_cash    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (initial_cash >= 0),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at       TIMESTAMPTZ,
  closed_by       UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  cash_sales      NUMERIC(12,2) DEFAULT 0,
  cash_inflow     NUMERIC(12,2) DEFAULT 0,
  cash_outflow    NUMERIC(12,2) DEFAULT 0,
  expected_cash   NUMERIC(12,2) DEFAULT 0,
  counted_cash    NUMERIC(12,2),
  difference      NUMERIC(12,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_shifts_register_status 
  ON public.cash_shifts(register_id, status);

CREATE INDEX IF NOT EXISTS idx_cash_shifts_opened_at 
  ON public.cash_shifts(opened_at DESC);

-- 2. Tabla de Movimientos de Caja (cash_movements)
-- Puede ya existir de versiones anteriores, agregamos columnas de forma idempotente
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id          BIGSERIAL PRIMARY KEY,
  register_id BIGINT REFERENCES public.registers(id) ON DELETE CASCADE,
  profile_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('ingreso', 'egreso')),
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS shift_id BIGINT REFERENCES public.cash_shifts(id) ON DELETE SET NULL;

ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS register_id BIGINT REFERENCES public.registers(id) ON DELETE CASCADE;

ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS reason TEXT;

CREATE INDEX IF NOT EXISTS idx_cash_movements_shift_id 
  ON public.cash_movements(shift_id);

CREATE INDEX IF NOT EXISTS idx_cash_movements_register_created 
  ON public.cash_movements(register_id, created_at DESC);

-- 3. RLS y Permisos
ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_cash_shifts" ON public.cash_shifts;
DROP POLICY IF EXISTS "auth_all_cash_shifts" ON public.cash_shifts;

CREATE POLICY "auth_select_cash_shifts"
  ON public.cash_shifts FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_all_cash_shifts"
  ON public.cash_shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_cash_movements" ON public.cash_movements;
DROP POLICY IF EXISTS "auth_all_cash_movements" ON public.cash_movements;

CREATE POLICY "auth_select_cash_movements"
  ON public.cash_movements FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_all_cash_movements"
  ON public.cash_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON public.cash_shifts TO authenticated;
GRANT ALL ON public.cash_movements TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.cash_shifts_id_seq TO authenticated;

COMMIT;
