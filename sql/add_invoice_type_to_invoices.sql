-- Migration: Add Argentine invoicing columns to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS invoice_type text DEFAULT 'B',
ADD COLUMN IF NOT EXISTS customer_cuit text,
ADD COLUMN IF NOT EXISTS customer_iva_condition text;

-- Add comment explaining columns
COMMENT ON COLUMN public.invoices.invoice_type IS 'Tipo de factura: A, B o C';
COMMENT ON COLUMN public.invoices.customer_cuit IS 'CUIT del cliente registrado en la factura';
COMMENT ON COLUMN public.invoices.customer_iva_condition IS 'Condición ante el IVA del cliente registrado en la factura';
