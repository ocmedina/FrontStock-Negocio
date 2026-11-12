-- Los pagos de proveedores previos a la separación de sucursales pertenecen
-- a Wenceslao Núñez. Asignarlos corrige el saldo por sucursal, que resta los
-- pagos únicamente cuando tienen branch_id.
-- Idempotente: solo modifica pagos que todavía están sin sucursal.

BEGIN;

DO $$
DECLARE
  v_branch_id BIGINT;
  v_updated_rows INTEGER;
BEGIN
  SELECT id
    INTO v_branch_id
  FROM public.branches
  WHERE lower(trim(name)) = lower(trim('Wenceslao Núñez'))
  ORDER BY id
  LIMIT 1;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró la sucursal Wenceslao Núñez. No se modificó ningún pago.';
  END IF;

  UPDATE public.supplier_payments
  SET branch_id = v_branch_id
  WHERE branch_id IS NULL;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  RAISE NOTICE 'Pagos históricos asignados a Wenceslao Núñez: %', v_updated_rows;
END;
$$;

COMMIT;
