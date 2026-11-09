-- Sucursales - Etapa 1: solo tablas base.
-- Ejecutar individualmente en Supabase SQL Editor.
-- No contiene BEGIN/COMMIT para evitar revertir otras etapas.

CREATE TABLE IF NOT EXISTS public.branches (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.branches (name, description, is_active)
VALUES
  ('Sucursal actual', 'Sucursal donde se encontraba el stock existente', true),
  ('Sucursal nueva', 'Sucursal pendiente de inauguración', false)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.branch_stock (
  branch_id BIGINT NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, product_id)
);
