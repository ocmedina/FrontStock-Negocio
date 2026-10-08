import { createClient } from '@/lib/server';
import { createLooseAdminClient } from '@/lib/admin';
import { hasPermission, type Permission, type Role } from '@/lib/permissions';

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    email: string | null;
    role: Role;
    is_active: boolean;
  };
  overrides: Record<string, boolean>;
}

/**
 * Obtiene el contexto de autenticación y perfil del usuario actual desde las cookies de la petición.
 * Retorna null si no hay sesión o el usuario está inactivo.
 */
export async function getCurrentAuthUser(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    // Usar cliente admin para leer el perfil de forma fidedigna y evitar problemas de RLS
    const admin = createLooseAdminClient();
    const [profileRes, overridesRes] = await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, username, email, role, is_active')
        .eq('id', user.id)
        .single(),
      admin
        .from('user_permissions')
        .select('permission, granted')
        .eq('profile_id', user.id),
    ]);

    if (profileRes.error || !profileRes.data) {
      return null;
    }

    const profileData = profileRes.data as any;
    if (profileData.is_active === false) {
      return null;
    }

    const overrides: Record<string, boolean> = {};
    for (const row of overridesRes.data || []) {
      overrides[row.permission] = row.granted;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        id: profileData.id,
        full_name: profileData.full_name,
        username: profileData.username,
        email: profileData.email,
        role: profileData.role as Role,
        is_active: profileData.is_active ?? true,
      },
      overrides,
    };
  } catch (error) {
    console.error('[getCurrentAuthUser] Error al verificar autenticación:', error);
    return null;
  }
}

/**
 * Exige que el usuario esté autenticado y activo. Si no, lanza un error.
 */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getCurrentAuthUser();
  if (!ctx) {
    throw new Error('No autorizado: sesión no válida o expirada.');
  }
  return ctx;
}

/**
 * Exige que el usuario tenga un permiso específico (contemplando rol y overrides).
 */
export async function requirePermission(permission: Permission): Promise<AuthContext> {
  const ctx = await requireAuth();
  const allowed = hasPermission(ctx.profile.role, permission, ctx.overrides);
  if (!allowed) {
    throw new Error(`Permiso denegado: no tienes permiso para ${permission}.`);
  }
  return ctx;
}

/**
 * Exige que el usuario tenga rol de administrador.
 */
export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (ctx.profile.role !== 'administrador') {
    throw new Error('Permiso denegado: se requiere rol de Administrador.');
  }
  return ctx;
}
