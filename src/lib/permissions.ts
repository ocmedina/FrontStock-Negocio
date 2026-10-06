// src/lib/permissions.ts
// Sistema de roles + permisos granulares
// Los permisos base son definidos por rol.
// Cada permiso puede ser sobreescrito individualmente por usuario
// via la tabla user_permissions (granted=true/false).

export const ROLES = {
  ADMIN: 'administrador',
  SUPERVENDEDOR: 'supervendedor',
  VENDEDOR: 'vendedor',
  REPARTIDOR: 'repartidor',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// ─── Catálogo de permisos ─────────────────────────────────────────────────────
// Cada clave representa un permiso. El valor es la lista de roles que lo tienen
// por defecto. Los overrides por usuario se aplican encima de esto.

export const PERMISSIONS = {
  // ── Usuarios ──────────────────────────────────────────────────────────
  VER_USUARIOS:           [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  CREAR_USUARIOS:         [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  EDITAR_USUARIOS:        [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  CAMBIAR_ROLES:          [ROLES.ADMIN],
  GESTIONAR_PERMISOS:     [ROLES.ADMIN],

  // ── Ventas ────────────────────────────────────────────────────────────
  CREAR_VENTAS:           [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR],
  VER_VENTAS:             [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR],
  ANULAR_VENTAS:          [ROLES.ADMIN, ROLES.SUPERVENDEDOR],

  // ── Productos ─────────────────────────────────────────────────────────
  VER_PRODUCTOS:          [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR],
  CREAR_PRODUCTOS:        [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  EDITAR_PRODUCTOS:       [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  ELIMINAR_PRODUCTOS:     [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  VER_PRECIO_COSTO:       [ROLES.ADMIN, ROLES.SUPERVENDEDOR],

  // ── Clientes ──────────────────────────────────────────────────────────
  VER_CLIENTES:           [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR],
  CREAR_CLIENTES:         [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR],
  EDITAR_CLIENTES:        [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR],
  ELIMINAR_CLIENTES:      [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  VER_DEUDA_CLIENTES:     [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR],

  // ── Inventario / Stock ────────────────────────────────────────────────
  VER_INVENTARIO:         [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR],
  AJUSTAR_STOCK:          [ROLES.ADMIN, ROLES.SUPERVENDEDOR],

  // ── Compras / Proveedores ─────────────────────────────────────────────
  VER_PROVEEDORES:        [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  CREAR_COMPRAS:          [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  VER_COMPRAS:            [ROLES.ADMIN, ROLES.SUPERVENDEDOR],

  // ── Reportes y Gráficos ───────────────────────────────────────────────
  VER_REPORTES:           [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  VER_GRAFICOS:           [ROLES.ADMIN, ROLES.SUPERVENDEDOR],

  // ── Configuración ─────────────────────────────────────────────────────
  VER_CONFIGURACION:      [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  EDITAR_CONFIGURACION:   [ROLES.ADMIN],

  // ── Facturas / Comprobantes ───────────────────────────────────────────
  VER_FACTURAS:           [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR],
  CREAR_FACTURAS:         [ROLES.ADMIN, ROLES.SUPERVENDEDOR],

  // ── Presupuestos ──────────────────────────────────────────────────────
  VER_PRESUPUESTOS:       [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR],
  CREAR_PRESUPUESTOS:     [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR],

  // ── Pedidos / Reparto ─────────────────────────────────────────────────
  VER_PEDIDOS:            [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR, ROLES.REPARTIDOR],
  CREAR_PEDIDOS:          [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR],
  EDITAR_PEDIDOS:         [ROLES.ADMIN, ROLES.SUPERVENDEDOR, ROLES.VENDEDOR],
  CANCELAR_PEDIDOS:       [ROLES.ADMIN, ROLES.SUPERVENDEDOR],

  // ── Cierre y Cajas ────────────────────────────────────────────────────
  VER_CIERRE_CAJA:        [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  GESTIONAR_CAJAS:        [ROLES.ADMIN],
  CAMBIAR_CAJA:           [ROLES.ADMIN, ROLES.SUPERVENDEDOR],

  // ── Dashboard ─────────────────────────────────────────────────────────
  VER_DASHBOARD:          [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  VER_DASHBOARD_COMPLETO: [ROLES.ADMIN, ROLES.SUPERVENDEDOR],
  VER_DASHBOARD_LIMITADO: [ROLES.VENDEDOR, ROLES.REPARTIDOR],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ─── Labels amigables para la UI ─────────────────────────────────────────────

export const PERMISSION_LABELS: Record<Permission, string> = {
  VER_USUARIOS:           'Ver usuarios',
  CREAR_USUARIOS:         'Crear usuarios',
  EDITAR_USUARIOS:        'Editar usuarios',
  CAMBIAR_ROLES:          'Cambiar roles',
  GESTIONAR_PERMISOS:     'Gestionar permisos',

  CREAR_VENTAS:           'Crear ventas',
  VER_VENTAS:             'Ver historial de ventas',
  ANULAR_VENTAS:          'Anular ventas',

  VER_PRODUCTOS:          'Ver productos',
  CREAR_PRODUCTOS:        'Crear productos',
  EDITAR_PRODUCTOS:       'Editar productos',
  ELIMINAR_PRODUCTOS:     'Eliminar productos',
  VER_PRECIO_COSTO:       'Ver precio de costo',

  VER_CLIENTES:           'Ver clientes',
  CREAR_CLIENTES:         'Crear clientes',
  EDITAR_CLIENTES:        'Editar clientes',
  ELIMINAR_CLIENTES:      'Eliminar clientes',
  VER_DEUDA_CLIENTES:     'Ver deuda de clientes',

  VER_INVENTARIO:         'Ver inventario',
  AJUSTAR_STOCK:          'Ajustar stock manualmente',

  VER_PROVEEDORES:        'Ver proveedores',
  CREAR_COMPRAS:          'Registrar compras',
  VER_COMPRAS:            'Ver compras',

  VER_REPORTES:           'Ver reportes',
  VER_GRAFICOS:           'Ver gráficos',

  VER_CONFIGURACION:      'Ver configuración',
  EDITAR_CONFIGURACION:   'Editar configuración del sistema',

  VER_FACTURAS:           'Ver facturas',
  CREAR_FACTURAS:         'Crear facturas',

  VER_PRESUPUESTOS:       'Ver presupuestos',
  CREAR_PRESUPUESTOS:     'Crear presupuestos',

  VER_PEDIDOS:            'Ver pedidos / reparto',
  CREAR_PEDIDOS:          'Crear pedidos',
  EDITAR_PEDIDOS:         'Editar pedidos',
  CANCELAR_PEDIDOS:       'Cancelar pedidos',

  VER_CIERRE_CAJA:        'Ver cierre de caja',
  GESTIONAR_CAJAS:        'Administrar puestos de caja',
  CAMBIAR_CAJA:           'Cambiar puesto de caja activo',

  VER_DASHBOARD:          'Acceso al Dashboard',
  VER_DASHBOARD_COMPLETO: 'Ver dashboard completo',
  VER_DASHBOARD_LIMITADO: 'Ver dashboard básico',
};

// ─── Grupos de permisos para la UI ───────────────────────────────────────────

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: '💰 Ventas',
    permissions: ['CREAR_VENTAS', 'VER_VENTAS', 'ANULAR_VENTAS'],
  },
  {
    label: '📦 Productos',
    permissions: ['VER_PRODUCTOS', 'CREAR_PRODUCTOS', 'EDITAR_PRODUCTOS', 'ELIMINAR_PRODUCTOS', 'VER_PRECIO_COSTO'],
  },
  {
    label: '👤 Clientes',
    permissions: ['VER_CLIENTES', 'CREAR_CLIENTES', 'EDITAR_CLIENTES', 'ELIMINAR_CLIENTES', 'VER_DEUDA_CLIENTES'],
  },
  {
    label: '📋 Inventario',
    permissions: ['VER_INVENTARIO', 'AJUSTAR_STOCK'],
  },
  {
    label: '🚚 Compras y Proveedores',
    permissions: ['VER_PROVEEDORES', 'CREAR_COMPRAS', 'VER_COMPRAS'],
  },
  {
    label: '📊 Panel y Reportes',
    permissions: ['VER_DASHBOARD', 'VER_REPORTES', 'VER_GRAFICOS', 'VER_CIERRE_CAJA'],
  },
  {
    label: '🧾 Documentos',
    permissions: ['VER_FACTURAS', 'CREAR_FACTURAS', 'VER_PRESUPUESTOS', 'CREAR_PRESUPUESTOS'],
  },
  {
    label: '🚀 Pedidos / Reparto',
    permissions: ['VER_PEDIDOS', 'CREAR_PEDIDOS', 'EDITAR_PEDIDOS', 'CANCELAR_PEDIDOS'],
  },
  {
    label: '⚙️ Administración',
    permissions: ['VER_CONFIGURACION', 'EDITAR_CONFIGURACION', 'VER_USUARIOS', 'CREAR_USUARIOS', 'EDITAR_USUARIOS', 'CAMBIAR_ROLES', 'GESTIONAR_PERMISOS', 'GESTIONAR_CAJAS', 'CAMBIAR_CAJA'],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Verifica si un rol tiene un permiso base (sin overrides de usuario).
 */
export function roleHasPermission(
  role: Role | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

/**
 * Verifica si un usuario tiene un permiso, aplicando overrides.
 * @param role - Rol del usuario
 * @param permission - Clave del permiso
 * @param overrides - Mapa de overrides desde user_permissions { permission: granted }
 */
export function hasPermission(
  role: Role | null | undefined,
  permission: Permission | string,
  overrides?: Record<string, boolean>
): boolean {
  if (!role) return false;

  // Si hay un override explícito para este usuario, tiene prioridad total
  if (overrides && permission in overrides) {
    return overrides[permission as Permission];
  }

  // Si no hay override, usar el permiso base del rol
  const perm = permission as Permission;
  if (!(perm in PERMISSIONS)) return false;
  return (PERMISSIONS[perm] as readonly string[]).includes(role);
}

export function isAdmin(role: Role | null | undefined): boolean {
  return role === ROLES.ADMIN;
}

/**
 * Devuelve el mapa de permisos efectivos de un usuario
 * combinando los defaults del rol con los overrides.
 */
export function getEffectivePermissions(
  role: Role | null | undefined,
  overrides: Record<string, boolean>
): Record<Permission, boolean> {
  const result = {} as Record<Permission, boolean>;
  for (const perm of Object.keys(PERMISSIONS) as Permission[]) {
    result[perm] = hasPermission(role, perm, overrides);
  }
  return result;
}
