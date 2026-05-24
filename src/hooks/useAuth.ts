import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { hasPermission, type Role } from '@/lib/permissions';

const PROFILE_SELECT = 'id, full_name, username, email, role, is_active, permissions, permissions_allow, permissions_deny';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [rolePermissions, setRolePermissions] = useState<{ allow: string[]; deny: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;
    let rolePermissionsChannel: ReturnType<typeof supabase.channel> | null = null;

    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', userId)
        .single();

      if (!error) return data;

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select('id, full_name, username, email, role, is_active')
        .eq('id', userId)
        .single();

      if (fallbackError) {
        console.warn('Error fetching profile:', fallbackError);
        return null;
      }

      return fallbackData;
    };

    const fetchRolePermissions = async (role: string | null | undefined) => {
      if (!role) {
        setRolePermissions(null);
        return;
      }

      const { data, error } = await supabase
        .from('role_permissions')
        .select('permissions_allow, permissions_deny')
        .eq('role', role)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching role permissions:', error);
        setRolePermissions(null);
        return;
      }

      setRolePermissions({
        allow: data?.permissions_allow ?? [],
        deny: data?.permissions_deny ?? [],
      });
    };

    const attachProfileSubscription = (userId: string) => {
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }

      profileChannel = supabase
        .channel(`profile-updates-${Math.random().toString(36).substring(7)}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            if (payload.new) {
              setProfile(payload.new);
              fetchRolePermissions(payload.new.role);
              attachRolePermissionsSubscription(payload.new.role);
            }
          }
        )
        .subscribe();
    };

    const attachRolePermissionsSubscription = (role: string | null | undefined) => {
      if (!role) return;

      if (rolePermissionsChannel) {
        supabase.removeChannel(rolePermissionsChannel);
      }

      rolePermissionsChannel = supabase
        .channel(`role-permissions-updates-${Math.random().toString(36).substring(7)}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'role_permissions',
            filter: `role=eq.${role}`,
          },
          (payload) => {
            if (payload.new) {
              setRolePermissions({
                allow: payload.new.permissions_allow ?? [],
                deny: payload.new.permissions_deny ?? [],
              });
            }
          }
        )
        .subscribe();
    };

    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const profile = await fetchProfile(user.id);
        const roleFromMetadata = user.user_metadata?.role as string | undefined;
        const resolvedRole = profile?.role ?? roleFromMetadata ?? null;

        setUser(user);
        setProfile(profile || (roleFromMetadata ? { id: user.id, role: roleFromMetadata } : null));
        attachProfileSubscription(user.id);
        fetchRolePermissions(resolvedRole);
        attachRolePermissionsSubscription(resolvedRole);
      } else {
        setUser(null);
        setProfile(null);
        setRolePermissions(null);
        if (profileChannel) {
          supabase.removeChannel(profileChannel);
          profileChannel = null;
        }
        if (rolePermissionsChannel) {
          supabase.removeChannel(rolePermissionsChannel);
          rolePermissionsChannel = null;
        }
      }
      setLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          const roleFromMetadata = session.user.user_metadata?.role as string | undefined;
          const resolvedRole = profile?.role ?? roleFromMetadata ?? null;

          setUser(session.user);
          setProfile(profile || (roleFromMetadata ? { id: session.user.id, role: roleFromMetadata } : null));
          attachProfileSubscription(session.user.id);
          fetchRolePermissions(resolvedRole);
          attachRolePermissionsSubscription(resolvedRole);
        } else {
          setUser(null);
          setProfile(null);
          setRolePermissions(null);
          if (profileChannel) {
            supabase.removeChannel(profileChannel);
            profileChannel = null;
          }
          if (rolePermissionsChannel) {
            supabase.removeChannel(rolePermissionsChannel);
            rolePermissionsChannel = null;
          }
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
      if (rolePermissionsChannel) {
        supabase.removeChannel(rolePermissionsChannel);
      }
    };
  }, []);

  const can = useCallback((permission: keyof typeof import('@/lib/permissions').PERMISSIONS) => {
    const legacyAllow = Array.isArray(profile?.permissions) ? profile.permissions : [];
    const allow = Array.isArray(profile?.permissions_allow) ? profile.permissions_allow : [];
    const deny = Array.isArray(profile?.permissions_deny) ? profile.permissions_deny : [];
    const allowSet = new Set([...legacyAllow, ...allow]);
    const roleAllow = rolePermissions?.allow ?? [];
    const roleDeny = rolePermissions?.deny ?? [];

    if (deny.includes(permission)) return false;
    if (allowSet.has(permission)) return true;
    if (roleDeny.includes(permission)) return false;
    if (roleAllow.includes(permission)) return true;

    return hasPermission(profile?.role, permission);
  }, [profile, rolePermissions]);

  return useMemo(() => ({
    user,
    profile,
    role: profile?.role as Role,
    loading,
    can,
    isAdmin: profile?.role === 'administrador',
  }), [user, profile, loading, can]);
}