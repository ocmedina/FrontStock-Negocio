-- Deuda de proveedores separada por sucursal.
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.supplier_payments
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_purchases_supplier_branch
  ON public.purchases(supplier_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_branch
  ON public.supplier_payments(supplier_id, branch_id);

COMMENT ON COLUMN public.supplier_payments.branch_id IS
  'Sucursal que origina el pago. NULL indica un pago histórico pendiente de conciliar.';
