-- ============================================================================
-- Migración: Habilitar Supabase Realtime en la tabla Products
-- FrontStock - 2026-10-06
-- ============================================================================
-- Permite que los cambios de stock en Caja 1 se transmitan instantáneamente
-- a la pantalla de Caja 2 sin recargar la página.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END $$;
