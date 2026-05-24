-- Add payment_method column to supplier_payments if missing

alter table public.supplier_payments
  add column if not exists payment_method text not null default 'efectivo';
