-- Add supplier_id to brands table to link brands to suppliers
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_brands_supplier_id ON public.brands(supplier_id);
