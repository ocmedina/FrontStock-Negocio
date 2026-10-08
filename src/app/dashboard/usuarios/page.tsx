'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import {
  FaUserPlus, FaKey, FaShieldAlt, FaToggleOn, FaToggleOff,
  FaUser, FaCheck, FaTimes, FaRedo, FaSearch, FaChevronDown,
} from 'react-icons/fa';
import { createEmployee } from '@/app/actions/userActions';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import {
  listUsers, updateUserRole, updateUserStatus,
  saveUserPermissions, resetUserPermissions,
  type UserWithPermissions,
} from '@/app/actions/userManagementActions';
import {
  ROLES, PERMISSION_GROUPS, PERMISSION_LABELS,
  roleHasPermission, type Role, type Permission,
} from '@/lib/permissions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  administrador: 'Administrador',
  supervendedor: 'Supervisor',
  vendedor: 'Vendedor',
  repartidor: 'Repartidor',
};

const ROLE_COLORS: Record<Role, string> = {
  administrador: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
  supervendedor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
  vendedor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  repartidor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
};

// ─── Modal: Crear usuario ─────────────────────────────────────────────────────

function NewUserModal({ isOpen, onClose, onCreated }: {
  isOpen: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    const result = await createEmployee(formData);
    setLoading(false);
    if (result.success) {
      toast.success(result.message);
      onCreated();
      onClose();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto border border-gray-200 dark:border-slate-700">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-5">
          <div className="flex justify-between items-start gap-3">
            <h2 className="min-w-0 text-xl font-bold text-white flex items-center gap-2">
              <FaUserPlus /> Crear Nuevo Usuario
            </h2>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
          </div>
        </div>

        <form action={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {[
            { name: 'fullName', label: 'Nombre Completo', placeholder: 'Juan Pérez', type: 'text' },
            { name: 'username', label: 'Usuario', placeholder: 'juan.perez', type: 'text', pattern: '[a-zA-Z0-9._-]+' },
            { name: 'email', label: 'Email', placeholder: 'juan@empresa.com', type: 'email' },
            { name: 'password', label: 'Contraseña Temporal', placeholder: '••••••', type: 'password', minLength: 6 },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                {field.label}
              </label>
              <input
                name={field.name}
                type={field.type}
                required
                placeholder={field.placeholder}
                pattern={field.pattern}
                minLength={field.minLength}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Rol</label>
            <select
              name="role"
              defaultValue="vendedor"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            >
              <option value="vendedor">Vendedor</option>
              <option value="supervendedor">Supervisor</option>
              <option value="administrador">Administrador</option>
              <option value="repartidor">Repartidor</option>
            </select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2 border-t border-gray-200 dark:border-slate-700">
            <button type="button" onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 text-sm font-medium transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="w-full sm:w-auto justify-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-all flex items-center gap-2">
              {loading ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando...</> : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Editar permisos ───────────────────────────────────────────────────

function PermissionsModal({ user, onClose, onSaved }: {
  user: UserWithPermissions; onClose: () => void; onSaved: () => void;
}) {
  // Estado local: para cada permiso, el valor efectivo (rol base + override)
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const group of PERMISSION_GROUPS) {
      for (const perm of group.permissions) {
        // Override si existe, sino el default del rol
        map[perm] = perm in user.overrides
          ? user.overrides[perm]
          : roleHasPermission(user.role, perm);
      }
    }
    return map;
  });

  const [role, setRole] = useState<Role>(user.role);
  const [saving, setSaving] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PERMISSION_GROUPS.map((g) => [g.label, true]))
  );

  // Cuando cambia el rol, recalcular los defaults (pero conservar overrides)
  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setPermissions((prev) => {
      const next = { ...prev };
      for (const group of PERMISSION_GROUPS) {
        for (const perm of group.permissions) {
          // Si no hay override guardado, aplicar el nuevo default del rol
          if (!(perm in user.overrides)) {
            next[perm] = roleHasPermission(newRole, perm);
          }
        }
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Actualizar rol si cambió
      if (role !== user.role) {
        const res = await updateUserRole(user.id, role);
        if (!res.success) throw new Error(res.error);
      }

      // Guardar overrides
      const overrideList = Object.entries(permissions).map(([perm, granted]) => ({
        permission: perm as Permission,
        granted,
      }));
      const res = await saveUserPermissions(user.id, role, overrideList);
      if (!res.success) throw new Error(res.error);

      toast.success('Permisos actualizados correctamente');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Resetear todos los permisos a los defaults del rol?')) return;
    setSaving(true);
    const res = await resetUserPermissions(user.id);
    setSaving(false);
    if (res.success) {
      // Recalcular desde el rol base
      const newPerms: Record<string, boolean> = {};
      for (const group of PERMISSION_GROUPS) {
        for (const perm of group.permissions) {
          newPerms[perm] = roleHasPermission(role, perm);
        }
      }
      setPermissions(newPerms);
      toast.success('Permisos reseteados a defaults del rol');
    } else {
      toast.error('Error al resetear permisos');
    }
  };

  const countOverrides = () => {
    return Object.entries(permissions).filter(([perm, val]) =>
      val !== roleHasPermission(role, perm as Permission)
    ).length;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[90vh] flex flex-col border border-gray-200 dark:border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-4 sm:p-5 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaShieldAlt /> Permisos de {user.full_name}
              </h2>
              <p className="text-purple-200 text-sm mt-1">{user.email}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl mt-1">✕</button>
          </div>
        </div>

        {/* Rol selector */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Rol del usuario
              </label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as Role)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-purple-500"
              >
                <option value="vendedor">Vendedor</option>
                <option value="supervendedor">Supervisor</option>
                <option value="administrador">Administrador</option>
                <option value="repartidor">Repartidor</option>
              </select>
            </div>

            {countOverrides() > 0 && (
              <div className="flex items-center gap-2 mt-5">
                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full font-semibold">
                  {countOverrides()} permisos personalizados
                </span>
                <button onClick={handleReset}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                  <FaRedo className="text-[10px]" /> Resetear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Permisos scrollable */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
          {PERMISSION_GROUPS.map((group) => {
            const isOpen = openGroups[group.label];
            const groupGranted = group.permissions.filter((p) => permissions[p]).length;
            const groupTotal = group.permissions.length;

            return (
              <div key={group.label} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">{group.label}</span>
                    <span className="text-xs text-gray-500 dark:text-slate-400 bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                      {groupGranted}/{groupTotal}
                    </span>
                  </div>
                  <FaChevronDown className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Permission rows */}
                {isOpen && (
                  <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {group.permissions.map((perm) => {
                      const granted = permissions[perm];
                      const isDefault = granted === roleHasPermission(role, perm as Permission);
                      return (
                        <div key={perm} className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex-1">
                            <span className={`text-sm ${granted ? 'text-gray-800 dark:text-slate-200' : 'text-gray-400 dark:text-slate-500'}`}>
                              {PERMISSION_LABELS[perm as Permission]}
                            </span>
                            {!isDefault && (
                              <span className="ml-2 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                personalizado
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => setPermissions((prev) => ({ ...prev, [perm]: !prev[perm] }))}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${granted ? 'bg-violet-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${granted ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 flex-shrink-0 bg-gray-50 dark:bg-slate-800/50 rounded-b-2xl">
          <button onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 text-sm font-medium transition-all">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="w-full sm:w-auto justify-center px-5 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 text-sm font-semibold transition-all flex items-center gap-2">
            {saving
              ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              : <><FaCheck /> Guardar Cambios</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

function UsersPageContent() {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState<UserWithPermissions | null>(null);
  const [passwordUser, setPasswordUser] = useState<any>(null);
  const { can, isAdmin } = useAuth();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const result = await listUsers();
    if (result.success && result.data) {
      setUsers(result.data);
    } else {
      toast.error('Error al cargar usuarios');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleStatusChange = async (user: UserWithPermissions) => {
    if (!can('EDITAR_USUARIOS')) {
      toast.error('Sin permisos para cambiar estado');
      return;
    }
    const newStatus = !user.is_active;
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', user.id);

    if (error) {
      toast.error('Error al actualizar estado');
    } else {
      toast.success(newStatus ? 'Usuario activado' : 'Usuario desactivado');
      fetchUsers();
    }
  };

  const filtered = users.filter((u) =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-full">

      {/* Header */}
      <div className="group relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-900/60 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
        <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-violet-50/50 dark:bg-violet-950/20" />
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-3xs text-base">
            <FaUser />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-slate-900 dark:text-slate-50 leading-none">
              Gestión de Usuarios
            </h1>
            <p className="text-xs text-slate-500 mt-1.5">
              {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {can('CREAR_USUARIOS') && (
          <button
            onClick={() => setIsNewUserOpen(true)}
            className="relative z-10 w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 shadow-sm hover:shadow-md transition-all font-semibold text-sm"
          >
            <FaUserPlus /> Crear Usuario
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider hidden md:table-cell">
                  Permisos
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full" />
                      <span className="text-sm text-gray-500 dark:text-slate-400">Cargando usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400 dark:text-slate-500 text-sm">
                    {search ? 'No se encontraron usuarios con ese criterio.' : 'No hay usuarios registrados.'}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const overrideCount = Object.keys(u.overrides).length;
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50/70 dark:hover:bg-slate-800/50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>

                      {/* Nombre */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {u.full_name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                              {u.full_name}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-slate-500">
                              @{u.username} · {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>

                      {/* Permisos (override count) */}
                      <td className="px-6 py-4 hidden md:table-cell">
                        {overrideCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full font-medium">
                            <FaShieldAlt className="text-[10px]" />
                            {overrideCount} personalizado{overrideCount !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-slate-500">Defaults del rol</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${u.is_active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400 border border-gray-200 dark:border-slate-600'
                        }`}>
                          {u.is_active ? <><FaCheck className="text-[10px]" /> Activo</> : <><FaTimes className="text-[10px]" /> Inactivo</>}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {can('GESTIONAR_PERMISOS') && (
                            <button
                              onClick={() => setPermissionsUser(u)}
                              title="Editar permisos"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all"
                            >
                              <FaShieldAlt /> Permisos
                            </button>
                          )}

                          {can('EDITAR_USUARIOS') && (
                            <button
                              onClick={() => setPasswordUser(u)}
                              title="Cambiar contraseña"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
                            >
                              <FaKey />
                            </button>
                          )}

                          {can('EDITAR_USUARIOS') && (
                            <button
                              onClick={() => handleStatusChange(u)}
                              title={u.is_active ? 'Desactivar' : 'Activar'}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${u.is_active
                                ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100'
                                : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                              }`}
                            >
                              {u.is_active ? <FaToggleOff /> : <FaToggleOn />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-slate-700/50 sm:hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-3 px-4 py-16">
              <div className="animate-spin w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full" />
              <span className="text-sm text-gray-500 dark:text-slate-400">Cargando usuarios...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-16 text-center text-gray-400 dark:text-slate-500 text-sm">
              {search ? 'No se encontraron usuarios con ese criterio.' : 'No hay usuarios registrados.'}
            </div>
          ) : (
            filtered.map((u) => {
              const overrideCount = Object.keys(u.overrides).length;

              return (
                <div
                  key={u.id}
                  className={`space-y-4 p-4 ${!u.is_active ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {u.full_name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {u.full_name}
                      </div>
                      <div className="break-all text-xs text-gray-400 dark:text-slate-500">
                        @{u.username} · {u.email}
                      </div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${u.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400 border border-gray-200 dark:border-slate-600'
                    }`}>
                      {u.is_active ? <FaCheck /> : <FaTimes />}
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                    {overrideCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full font-medium">
                        <FaShieldAlt className="text-[10px]" />
                        {overrideCount} personalizado{overrideCount !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-slate-500">Defaults del rol</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                    {can('GESTIONAR_PERMISOS') && (
                      <button
                        onClick={() => setPermissionsUser(u)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all"
                      >
                        <FaShieldAlt /> Permisos
                      </button>
                    )}
                    {can('EDITAR_USUARIOS') && (
                      <button
                        onClick={() => setPasswordUser(u)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
                      >
                        <FaKey /> Contraseña
                      </button>
                    )}
                    {can('EDITAR_USUARIOS') && (
                      <button
                        onClick={() => handleStatusChange(u)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                          u.is_active
                            ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100'
                            : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                        }`}
                      >
                        {u.is_active ? <FaToggleOff /> : <FaToggleOn />}
                        {u.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modales */}
      <NewUserModal
        isOpen={isNewUserOpen}
        onClose={() => setIsNewUserOpen(false)}
        onCreated={fetchUsers}
      />

      {permissionsUser && (
        <PermissionsModal
          user={permissionsUser}
          onClose={() => setPermissionsUser(null)}
          onSaved={fetchUsers}
        />
      )}

      {passwordUser && (
        <ChangePasswordModal
          isOpen={!!passwordUser}
          onClose={() => setPasswordUser(null)}
          user={passwordUser}
        />
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute permission="VER_USUARIOS">
      <UsersPageContent />
    </ProtectedRoute>
  );
}
