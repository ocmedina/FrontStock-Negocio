ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_failure_reason TEXT,
ADD COLUMN IF NOT EXISTS delivery_failure_notes TEXT;

COMMENT ON COLUMN orders.delivery_failure_reason IS
  'Motivo por el que un pedido no pudo entregarse';
COMMENT ON COLUMN orders.delivery_failure_notes IS
  'Observaciones adicionales de una entrega fallida';
