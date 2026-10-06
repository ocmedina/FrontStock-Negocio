'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { type Role, PERMISSIONS } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: keyof typeof PERMISSIONS;
  requiredRole?: Role;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  permission, 
  requiredRole,
  fallback 
}: ProtectedRouteProps) {
  const { profile, loading, can } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/login');
    }
  }, [loading, profile, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500 dark:text-slate-400">Cargando...</div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const homeRoute = can('VER_DASHBOARD') ? '/dashboard' : '/dashboard/ventas/nueva';
  const homeLabel = can('VER_DASHBOARD') ? 'Volver al Dashboard' : 'Ir a Nueva Venta';

  // Verificar permiso específico
  if (permission && !can(permission)) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">Acceso Denegado</h2>
          <p className="text-red-600 mb-4">No tienes permisos para acceder a esta sección.</p>
          <button 
            onClick={() => router.push(homeRoute)} 
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            {homeLabel}
          </button>
        </div>
      </div>
    );
  }

  // Verificar rol específico
  if (requiredRole && profile.role !== requiredRole) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">Acceso Denegado</h2>
          <p className="text-red-600 mb-4">Esta sección es solo para {requiredRole}s.</p>
          <button 
            onClick={() => router.push(homeRoute)} 
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            {homeLabel}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}