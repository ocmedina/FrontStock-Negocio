-- ============================================
-- CREAR TABLA SUPPLIER_PAYMENTS
-- ============================================
-- Esta tabla registra los pagos realizados a los proveedores

-- Eliminar la tabla si existe para recrearla
DROP TABLE IF EXISTS supplier_payments CASCADE;

CREATE TABLE supplier_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'efectivo',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_id ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_created_at ON supplier_payments(created_at);

-- Habilitar RLS
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Users can view all supplier payments"
ON supplier_payments FOR SELECT
USING (true);

CREATE POLICY "Users can insert supplier payments"
ON supplier_payments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update supplier payments"
ON supplier_payments FOR UPDATE
USING (true);

CREATE POLICY "Users can delete supplier payments"
ON supplier_payments FOR DELETE
USING (true);
