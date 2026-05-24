'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'
import { FaUserPlus, FaUserShield } from 'react-icons/fa'
import { createEmployee } from '@/app/actions/userActions'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'
import ChangePasswordModal from '@/components/ChangePasswordModal'
import { PERMISSIONS, ROLES } from '@/lib/permissions'

const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Array<keyof typeof PERMISSIONS>
const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: 'Administrador' },
  { value: ROLES.SUPERVENDEDOR, label: 'Supervendedor' },
  { value: ROLES.VENDEDOR, label: 'Vendedor' },
  { value: ROLES.REPARTIDOR, label: 'Repartidor' },
]

const formatPermissionLabel = (key: string) =>
  key
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

function ToggleSwitch({
  checked,
  label,
  onChange,
  activeClass,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
  activeClass: string
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? activeClass : 'bg-gray-200 dark:bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </span>
      <span className="text-xs text-gray-600 dark:text-slate-300">{label}</span>
    </label>
  )
}

function PermissionSwitchRow({
  label,
  allow,
  deny,
  onAllowChange,
  onDenyChange,
}: {
  label: string
  allow: boolean
  deny: boolean
  onAllowChange: (checked: boolean) => void
  onDenyChange: (checked: boolean) => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gray-200 dark:border-slate-700 rounded-lg p-3">
      <span className="text-sm text-gray-800 dark:text-slate-200">{label}</span>
      <div className="flex flex-wrap items-center gap-4">
        <ToggleSwitch
          checked={allow}
          label="Permitir"
          onChange={onAllowChange}
          activeClass="bg-green-500"
        />
        <ToggleSwitch
          checked={deny}
          label="Bloquear"
          onChange={onDenyChange}
          activeClass="bg-red-500"
        />
      </div>
    </div>
  )
}

const getRolePermissions = (role: string) =>
  PERMISSION_KEYS.filter((permission) =>
    (PERMISSIONS[permission] as readonly string[]).includes(role)
  )

const TEMPLATE_OPTIONS = [
  {
    key: 'admin',
    label: 'Admin completo',
    allow: [...PERMISSION_KEYS],
    deny: [] as string[],
  },
  {
    key: 'supervendedor',
    label: 'Supervendedor',
    allow: getRolePermissions(ROLES.SUPERVENDEDOR),
  },
  {
    key: 'vendedor',
    label: 'Vendedor',
    allow: getRolePermissions(ROLES.VENDEDOR),
  },
  {
    key: 'repartidor',
    label: 'Repartidor',
    allow: getRolePermissions(ROLES.REPARTIDOR),
  },
]
  .map((template) => ({
    ...template,
    deny: template.deny ?? PERMISSION_KEYS.filter((key) => !template.allow.includes(key)),
  }))
  .concat({ key: 'custom', label: 'Personalizado', allow: [], deny: [] })

/* ==============================
   MODAL: NUEVO USUARIO
============================== */
function NewUserModal({
  isOpen,
  onClose,
  onUserCreated,
}: {
  isOpen: boolean
  onClose: () => void
  onUserCreated: () => void
}) {
  const [loading, setLoading] = useState(false)
  if (!isOpen) return null

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    const result = await createEmployee(formData)
    setLoading(false)

    if (result.success) {
      toast.success(result.message)
      onUserCreated()
      onClose()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Crear Nuevo Empleado</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:text-slate-100"
          >
            ✕
          </button>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              Nombre Completo
            </label>
            <input
              name="fullName"
              required
              className="mt-1 w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md"
              placeholder="Juan Pérez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              Usuario
            </label>
            <input
              name="username"
              pattern="[a-zA-Z0-9._-]+"
              required
              className="mt-1 w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md"
              placeholder="juan.perez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md"
              placeholder="juan@empresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              Contraseña Temporal
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md"
              placeholder="******"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              Rol
            </label>
            <select
              name="role"
              defaultValue="vendedor"
              required
              className="mt-1 w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md"
            >
              <option value="vendedor">Vendedor</option>
              <option value="administrador">Administrador</option>
              <option value="repartidor">Repartidor</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ==============================
   MODAL: PERMISOS
============================== */
function UserPermissionsModal({
  isOpen,
  onClose,
  user,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  user: any | null
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [allowList, setAllowList] = useState<string[]>([])
  const [denyList, setDenyList] = useState<string[]>([])
  const [templateKey, setTemplateKey] = useState('custom')

  useEffect(() => {
    if (!isOpen || !user) return
    const legacyAllow = Array.isArray(user.permissions) ? user.permissions : []
    const currentAllow = Array.isArray(user.permissions_allow)
      ? user.permissions_allow
      : []
    const currentDeny = Array.isArray(user.permissions_deny)
      ? user.permissions_deny
      : []

    const mergedAllow = Array.from(new Set([...legacyAllow, ...currentAllow]))
    setAllowList(mergedAllow)
    setDenyList(currentDeny)

    const normalize = (list: string[]) => [...new Set(list)].sort().join('|')
    const match = TEMPLATE_OPTIONS.find(
      (template) =>
        template.key !== 'custom' &&
        normalize(template.allow) === normalize(mergedAllow) &&
        normalize(template.deny) === normalize(currentDeny)
    )
    setTemplateKey(match?.key ?? 'custom')
  }, [isOpen, user])

  if (!isOpen || !user) return null

  const setPermissionState = (key: string, state: 'inherit' | 'allow' | 'deny') => {
    setAllowList((prev) => {
      const next = prev.filter((item) => item !== key)
      return state === 'allow' ? [...next, key] : next
    })
    setDenyList((prev) => {
      const next = prev.filter((item) => item !== key)
      return state === 'deny' ? [...next, key] : next
    })
    setTemplateKey('custom')
  }

  const handleTemplateChange = (key: string) => {
    setTemplateKey(key)
    if (key === 'custom') return
    const template = TEMPLATE_OPTIONS.find((item) => item.key === key)
    if (!template) return
    setAllowList([...template.allow])
    setDenyList([...template.deny])
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        permissions: allowList,
        permissions_allow: allowList,
        permissions_deny: denyList,
      })
      .eq('id', user.id)

    if (error) {
      toast.error('Error al guardar permisos')
    } else {
      toast.success('Permisos actualizados')
      onSaved()
      onClose()
    }
    setSaving(false)
  }

  const allowSet = new Set(allowList)
  const denySet = new Set(denyList)
  const inheritCount = Math.max(0, PERMISSION_KEYS.length - allowSet.size - denySet.size)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-xl w-full max-w-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Permisos del Usuario</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {user.full_name || user.username || 'Usuario'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:text-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 text-sm text-gray-600 dark:text-slate-300">
          Usa los switches para permitir o bloquear. Si ambos estan apagados, hereda del rol.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-slate-400">Permitir</p>
            <p className="text-lg font-bold text-green-600">{allowSet.size}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-slate-400">Bloquear</p>
            <p className="text-lg font-bold text-red-600">{denySet.size}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-slate-400">Heredados</p>
            <p className="text-lg font-bold text-slate-600 dark:text-slate-200">{inheritCount}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <label className="text-xs text-gray-500 dark:text-slate-400">Plantilla</label>
            <select
              value={templateKey}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm"
            >
              {TEMPLATE_OPTIONS.map((template) => (
                <option key={template.key} value={template.key}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PERMISSION_KEYS.map((permissionKey) => (
            <PermissionSwitchRow
              key={permissionKey}
              label={formatPermissionLabel(permissionKey)}
              allow={allowList.includes(permissionKey)}
              deny={denyList.includes(permissionKey)}
              onAllowChange={(checked) =>
                setPermissionState(permissionKey, checked ? 'allow' : 'inherit')
              }
              onDenyChange={(checked) =>
                setPermissionState(permissionKey, checked ? 'deny' : 'inherit')
              }
            />
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ==============================
   PÁGINA PRINCIPAL DE USUARIOS
============================== */
function UsersPageContent() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false)
  const [permissionsUser, setPermissionsUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const { can, isAdmin, user: currentUser } = useAuth()
  const [roleConfigRole, setRoleConfigRole] = useState(ROLES.VENDEDOR)
  const [roleAllowList, setRoleAllowList] = useState<string[]>([])
  const [roleDenyList, setRoleDenyList] = useState<string[]>([])
  const [roleConfigLoading, setRoleConfigLoading] = useState(false)
  const [roleConfigSaving, setRoleConfigSaving] = useState(false)
  const [permissionsTab, setPermissionsTab] = useState<'permisos' | 'usuarios'>('permisos')

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('id', { ascending: false })

    if (error) toast.error('Error al cargar usuarios')
    else setUsers(data || [])
    setLoading(false)
  }

  const loadRoleConfig = async (role: string) => {
    if (!isAdmin) return
    setRoleConfigLoading(true)
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permissions_allow, permissions_deny')
      .eq('role', role)
      .maybeSingle()

    if (error) {
      toast.error('Error al cargar permisos del rol')
      setRoleAllowList([])
      setRoleDenyList([])
    } else {
      setRoleAllowList(data?.permissions_allow ?? [])
      setRoleDenyList(data?.permissions_deny ?? [])
    }
    setRoleConfigLoading(false)
  }

  const setRolePermissionState = (
    key: string,
    state: 'inherit' | 'allow' | 'deny'
  ) => {
    setRoleAllowList((prev) => {
      const next = prev.filter((item) => item !== key)
      return state === 'allow' ? [...next, key] : next
    })
    setRoleDenyList((prev) => {
      const next = prev.filter((item) => item !== key)
      return state === 'deny' ? [...next, key] : next
    })
  }

  const handleRoleConfigSave = async () => {
    if (!isAdmin) return
    setRoleConfigSaving(true)
    const { error } = await supabase
      .from('role_permissions')
      .upsert({
        role: roleConfigRole,
        permissions_allow: roleAllowList,
        permissions_deny: roleDenyList,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      toast.error('Error al guardar permisos del rol')
    } else {
      toast.success('Permisos del rol actualizados')
    }
    setRoleConfigSaving(false)
  }

  const handleRoleConfigReset = () => {
    setRoleAllowList([])
    setRoleDenyList([])
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    loadRoleConfig(roleConfigRole)
  }, [roleConfigRole, isAdmin])

  const handleRoleChange = async (id: string, newRole: string) => {
    if (!can('CAMBIAR_ROLES')) {
      toast.error('Sin permisos para cambiar roles')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id)
    if (error) toast.error('Error al actualizar rol')
    else {
      toast.success('Rol actualizado')
      fetchUsers()
    }
  }

  const handleStatusChange = async (id: string, current: boolean) => {
    if (!can('EDITAR_USUARIOS')) {
      toast.error('Sin permisos para cambiar estado')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !current })
      .eq('id', id)
    if (error) toast.error('Error al actualizar estado')
    else {
      toast.success('Estado actualizado')
      fetchUsers()
    }
  }

  const openPasswordModal = (user: any) => {
    if (!can('EDITAR_USUARIOS')) {
      toast.error('Sin permisos para cambiar contraseñas')
      return
    }
    setSelectedUser(user)
    setIsPasswordModalOpen(true)
  }

  const openPermissionsModal = (user: any) => {
    if (!isAdmin) {
      toast.error('Solo el administrador puede modificar permisos')
      return
    }
    if (currentUser?.id && currentUser.id === user.id) {
      toast.error('No puedes modificar tus propios permisos')
      return
    }
    setPermissionsUser(user)
    setIsPermissionsModalOpen(true)
  }

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !term ||
      [u.full_name, u.username, u.email]
        .filter(Boolean)
        .some((value: string) => value.toLowerCase().includes(term))

    const matchesRole = roleFilter === 'all' || u.role === roleFilter

    const isActive = u.is_active !== false
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' ? isActive : !isActive)

    return matchesSearch && matchesRole && matchesStatus
  })

  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.is_active !== false).length
  const inactiveUsers = totalUsers - activeUsers
  const roleAllowSet = new Set(roleAllowList)
  const roleDenySet = new Set(roleDenyList)
  const roleInheritCount = Math.max(0, PERMISSION_KEYS.length - roleAllowSet.size - roleDenySet.size)
  const selectedRoleLabel =
    ROLE_OPTIONS.find((role) => role.value === roleConfigRole)?.label ?? roleConfigRole

  const usersContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Usuarios</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{totalUsers}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Activos</p>
          <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Inactivos</p>
          <p className="text-2xl font-bold text-red-600">{inactiveUsers}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-lg p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, usuario o email"
          className="w-full lg:max-w-sm p-2 border border-gray-300 dark:border-slate-600 rounded-md"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full lg:w-48 p-2 border border-gray-300 dark:border-slate-600 rounded-md"
        >
          <option value="all">Todos los roles</option>
          <option value="administrador">Administrador</option>
          <option value="supervendedor">Supervendedor</option>
          <option value="vendedor">Vendedor</option>
          <option value="repartidor">Repartidor</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full lg:w-48 p-2 border border-gray-300 dark:border-slate-600 rounded-md"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow-sm rounded-2xl border border-gray-100 dark:border-slate-800 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 text-xs">
          <thead className="bg-gray-50/80 dark:bg-slate-950 text-gray-500 dark:text-slate-300 uppercase text-[11px] tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Permisos</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-10">
                  Cargando...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500 dark:text-slate-400">
                  No hay usuarios que coincidan con el filtro
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-50/80 dark:hover:bg-slate-900/40 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">
                    {u.full_name}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-slate-200">{u.username}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{u.email || '-'}</td>
                  <td className="px-4 py-3">
                    {can('CAMBIAR_ROLES') ? (
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value)
                        }
                        className="border border-gray-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs bg-white dark:bg-slate-900"
                      >
                        <option value="vendedor">Vendedor</option>
                        <option value="supervendedor">Supervendedor</option>
                        <option value="administrador">Administrador</option>
                        <option value="repartidor">Repartidor</option>
                      </select>
                    ) : (
                      u.role
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const allowCount = Array.isArray(u.permissions_allow)
                        ? u.permissions_allow.length
                        : Array.isArray(u.permissions)
                          ? u.permissions.length
                          : 0
                      const denyCount = Array.isArray(u.permissions_deny)
                        ? u.permissions_deny.length
                        : 0

                      if (allowCount === 0 && denyCount === 0) {
                        return <span className="text-[11px] text-gray-400">—</span>
                      }

                      return (
                        <div className="flex flex-wrap gap-1.5">
                          {allowCount > 0 && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                              Permitir {allowCount}
                            </span>
                          )}
                          {denyCount > 0 && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                              Bloquear {denyCount}
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active !== false ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        Activo
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      {isAdmin && (
                        <button
                          onClick={() => openPermissionsModal(u)}
                          className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200"
                        >
                          Permisos
                        </button>
                      )}
                      {can('EDITAR_USUARIOS') && (
                        <button
                          onClick={() => openPasswordModal(u)}
                          className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          Cambiar clave
                        </button>
                      )}
                      {can('EDITAR_USUARIOS') && (
                        <button
                          onClick={() => handleStatusChange(u.id, u.is_active !== false)}
                          className={`text-[11px] px-2.5 py-0.5 rounded-full ${
                            u.is_active !== false
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
                          }`}
                        >
                          {u.is_active !== false ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
        {can('CREAR_USUARIOS') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FaUserPlus /> Crear Usuario
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <FaUserShield />
              </div>
              <div>
                <h2 className="text-lg font-bold">Gestion de Permisos</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Configura que puede hacer cada rol en tu organizacion.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRoleConfigReset}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Restablecer
              </button>
              <button
                onClick={handleRoleConfigSave}
                disabled={roleConfigSaving}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              >
                {roleConfigSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setPermissionsTab('permisos')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                permissionsTab === 'permisos'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-slate-200'
              }`}
            >
              Permisos
            </button>
            <button
              type="button"
              onClick={() => setPermissionsTab('usuarios')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                permissionsTab === 'usuarios'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-slate-200'
              }`}
            >
              Usuarios
            </button>
          </div>

          {permissionsTab === 'permisos' ? (
            <div className="space-y-4">
              <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Subseccion 1: Seleccion de Rol
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setRoleConfigRole(role.value)}
                      aria-pressed={roleConfigRole === role.value}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        roleConfigRole === role.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Subseccion 2: Matriz de Modulos
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                    Usa los switches para permitir o bloquear. Si ambos estan apagados, hereda del sistema.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Permitir</p>
                    <p className="text-xl font-bold text-green-600">{roleAllowSet.size}</p>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Bloquear</p>
                    <p className="text-xl font-bold text-red-600">{roleDenySet.size}</p>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Heredados</p>
                    <p className="text-xl font-bold text-slate-600 dark:text-slate-200">
                      {roleInheritCount}
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Rol</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                      {selectedRoleLabel}
                    </p>
                  </div>
                </div>

                {roleConfigLoading ? (
                  <div className="text-center py-6 text-sm text-gray-500 dark:text-slate-400">
                    Cargando permisos del rol...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PERMISSION_KEYS.map((permissionKey) => (
                      <PermissionSwitchRow
                        key={permissionKey}
                        label={formatPermissionLabel(permissionKey)}
                        allow={roleAllowList.includes(permissionKey)}
                        deny={roleDenyList.includes(permissionKey)}
                        onAllowChange={(checked) =>
                          setRolePermissionState(permissionKey, checked ? 'allow' : 'inherit')
                        }
                        onDenyChange={(checked) =>
                          setRolePermissionState(permissionKey, checked ? 'deny' : 'inherit')
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            usersContent
          )}
        </div>
      )}

      {!isAdmin && usersContent}

      {/* MODALES */}
      <NewUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUserCreated={fetchUsers}
      />
      {permissionsUser && (
        <UserPermissionsModal
          isOpen={isPermissionsModalOpen}
          onClose={() => {
            setIsPermissionsModalOpen(false)
            setPermissionsUser(null)
          }}
          user={permissionsUser}
          onSaved={fetchUsers}
        />
      )}
      {selectedUser && (
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => {
            setIsPasswordModalOpen(false)
            setSelectedUser(null)
          }}
          user={selectedUser}
        />
      )}
    </div>
  )
}

export default function UsersPage() {
  return (
    <ProtectedRoute permission="VER_USUARIOS">
      <UsersPageContent />
    </ProtectedRoute>
  )
}
