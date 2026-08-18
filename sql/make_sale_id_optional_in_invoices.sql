-- Migration: Make sale_id optional in invoices table for direct/standalone invoices
ALTER TABLE public.invoices ALTER COLUMN sale_id DROP NOT NULL;
