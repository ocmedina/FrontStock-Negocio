-- ============================================================================
-- Corrección Inmediata: Eliminar sobrecarga duplicada de finalize_sale_transaction
-- FrontStock - 2026-10-06
-- ============================================================================
-- Este script elimina la versión anterior (de 18 parámetros) de la función,
-- dejando únicamente la versión unificada de 19 parámetros con soporte para cajas.
-- ============================================================================

-- 1. Eliminar la versión vieja de 18 parámetros
DROP FUNCTION IF EXISTS public.finalize_sale_transaction(
  UUID,
  UUID,
  NUMERIC,
  TEXT,
  NUMERIC,
  TIMESTAMPTZ,
  JSONB,
  BOOLEAN,
  JSONB,
  BOOLEAN,
  UUID,
  TEXT,
  TEXT,
  INT,
  TEXT,
  NUMERIC,
  NUMERIC,
  JSONB
);

-- 2. Asegurar que la versión de 19 parámetros tenga los permisos correctos
GRANT EXECUTE ON FUNCTION public.finalize_sale_transaction(
  UUID,
  UUID,
  NUMERIC,
  TEXT,
  NUMERIC,
  TIMESTAMPTZ,
  JSONB,
  BOOLEAN,
  JSONB,
  BOOLEAN,
  UUID,
  TEXT,
  TEXT,
  INT,
  TEXT,
  NUMERIC,
  NUMERIC,
  JSONB,
  BIGINT
) TO authenticated;
