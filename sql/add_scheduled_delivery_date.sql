ALTER TABLE orders
ADD COLUMN IF NOT EXISTS scheduled_delivery_date DATE;

UPDATE orders
SET scheduled_delivery_date = (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
WHERE scheduled_delivery_date IS NULL;

COMMENT ON COLUMN orders.scheduled_delivery_date IS
  'Fecha prevista para realizar el reparto';
