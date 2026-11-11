-- Permite asignar usuarios y cajas por sucursal, conservando la selección global.
-- No modifica roles ni políticas de acceso existentes.

BEGIN;

ALTER TABLE public.registers
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE RESTRICT;

UPDATE public.registers
SET branch_id = COALESCE(
  (SELECT id FROM public.branches WHERE name = 'Sucursal actual' ORDER BY id LIMIT 1),
  (SELECT id FROM public.branches WHERE is_active ORDER BY id LIMIT 1)
)
WHERE branch_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.registers'::regclass AND conname = 'registers_name_key'
  ) THEN
    ALTER TABLE public.registers DROP CONSTRAINT registers_name_key;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS registers_branch_name_key
  ON public.registers(branch_id, lower(name))
  WHERE branch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS registers_branch_id_id_key
  ON public.registers(branch_id, id);

CREATE TABLE IF NOT EXISTS public.profile_branch_assignments (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_branch_assignments_branch
  ON public.profile_branch_assignments(branch_id, profile_id);

ALTER TABLE public.profile_branch_assignments ENABLE ROW LEVEL SECURITY;

INSERT INTO public.profile_branch_assignments(profile_id, branch_id)
SELECT id, branch_id
FROM public.profiles
WHERE branch_id IS NOT NULL
  AND COALESCE(role, '') <> 'administrador'
ON CONFLICT (profile_id, branch_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.profile_register_assignments (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  register_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, branch_id),
  CONSTRAINT profile_register_assignments_register_branch_fkey
    FOREIGN KEY (branch_id, register_id)
    REFERENCES public.registers(branch_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profile_register_assignments_branch_register
  ON public.profile_register_assignments(branch_id, register_id);

ALTER TABLE public.profile_register_assignments ENABLE ROW LEVEL SECURITY;

INSERT INTO public.profile_register_assignments(profile_id, branch_id, register_id)
SELECT p.id, r.branch_id, p.register_id
FROM public.profiles p
JOIN public.registers r ON r.id = p.register_id
WHERE p.register_id IS NOT NULL
  AND r.branch_id IS NOT NULL
ON CONFLICT (profile_id, branch_id) DO NOTHING;

COMMENT ON TABLE public.profile_branch_assignments IS
  'Sucursales habilitadas para cada usuario. Sin filas significa acceso global a sucursales activas.';
COMMENT ON TABLE public.profile_register_assignments IS
  'Caja fija de cada usuario dentro de cada sucursal; un usuario puede tener una distinta por sucursal.';

COMMIT;

