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
    const { data } = await supabase
      .from('user_permissions')
      .select('permission, granted')
      .eq('profile_id', profileId);

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
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const profile = await fetchProfile(user.id);
        const roleFromMetadata = user.user_metadata?.role as string | undefined;
        const resolvedProfile = profile || (roleFromMetadata ? { id: user.id, role: roleFromMetadata } : null);

        setUser(user);
        setProfile(resolvedProfile);

        if (resolvedProfile?.id) {
          await fetchPermissionOverrides(resolvedProfile.id);
        }
      } else {
        setUser(null);
        setProfile(null);
        setPermissionOverrides({});
      }
      setLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          const roleFromMetadata = session.user.user_metadata?.role as string | undefined;
          const resolvedProfile = profile || (roleFromMetadata ? { id: session.user.id, role: roleFromMetadata } : null);

          setUser(session.user);
          setProfile(resolvedProfile);

          if (resolvedProfile?.id) {
            await fetchPermissionOverrides(resolvedProfile.id);
          }
        } else {
          setUser(null);
          setProfile(null);
          setPermissionOverrides({});
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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