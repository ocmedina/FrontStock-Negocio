// src/hooks/useAuth.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { hasPermission, type Role, type Permission } from '@/lib/permissions';

const PROFILE_SELECT = 'id, full_name, username, email, role, is_active';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchPermissionOverrides = useCallback(async (profileId: string) => {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('permission, granted')
      .eq('profile_id', profileId);

    if (error) {
      console.error('[useAuth] Error loading permission overrides:', error);
      setPermissionOverrides({});
      return;
    }

    if (data) {
      const map: Record<string, boolean> = {};
      for (const row of data) {
        map[row.permission] = row.granted;
      }
      setPermissionOverrides(map);
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .single();
    return data;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const applySession = async (sessionUser: any | null) => {
      if (!sessionUser) {
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setPermissionOverrides({});
        }
        return;
      }

      const profile = await fetchProfile(sessionUser.id);
      const roleFromMetadata = sessionUser.user_metadata?.role as string | undefined;
      const resolvedProfile = profile || (
        roleFromMetadata
          ? { id: sessionUser.id, role: roleFromMetadata }
          : null
      );

      if (!isMounted) return;

      setUser(sessionUser);
      setProfile(resolvedProfile);
      setPermissionOverrides({});

      if (resolvedProfile?.id) {
        await fetchPermissionOverrides(resolvedProfile.id);
      }
    };

    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        await applySession(data.user);
      } catch (error) {
        console.error('[useAuth] Error loading authenticated user:', error);
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setPermissionOverrides({});
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // No hacer consultas a Supabase directamente dentro de este callback:
        // el cliente puede mantener un lock interno durante la notificación.
        setTimeout(() => {
          if (!isMounted) return;

          void applySession(session?.user ?? null)
            .catch((error) => {
              console.error('[useAuth] Error processing auth state change:', error);
              if (isMounted) {
                setUser(null);
                setProfile(null);
                setPermissionOverrides({});
              }
            })
            .finally(() => {
              if (isMounted) setLoading(false);
            });
        }, 0);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchPermissionOverrides]);

  /**
   * Verifica si el usuario tiene un permiso,
   * aplicando primero overrides individuales y luego el rol base.
   */
  const can = useCallback(
    (permission: Permission | string): boolean => {
      return hasPermission(profile?.role, permission as Permission, permissionOverrides);
    },
    [profile?.role, permissionOverrides]
  );

  /**
   * Fuerza la recarga de permisos (útil después de que el admin edita permisos).
   */
  const refreshPermissions = useCallback(async () => {
    if (profile?.id) {
      await fetchPermissionOverrides(profile.id);
    }
  }, [profile?.id, fetchPermissionOverrides]);

  return {
    user,
    profile,
    role: profile?.role as Role,
    loading,
    can,
    isAdmin: profile?.role === 'administrador',
    permissionOverrides,
    refreshPermissions,
  };
}