-- Los pagos de proveedores previos a la separación de sucursales pertenecen
-- a Sucursal Wenceslao Núñez (ID 1, verificado en public.branches).
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
  WHERE id = 1
    AND lower(name) LIKE '%wenceslao%'
  LIMIT 1;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'La sucursal ID 1 no existe o no corresponde a Wenceslao. No se modificó ningún pago.';
  END IF;

  UPDATE public.supplier_payments
  SET branch_id = v_branch_id
  WHERE branch_id IS NULL;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  RAISE NOTICE 'Pagos históricos asignados a Sucursal Wenceslao Núñez: %', v_updated_rows;
END;
$$;

COMMIT;
