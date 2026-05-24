import { createClient } from "@/lib/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PERMISSIONS, ROLES, hasPermission } from "@/lib/permissions";
import {
  FaBoxes,
  FaUsers,
  FaDolly,
  FaCashRegister,
  FaArrowRight,
  FaStore,
  FaTruck,
  FaChartPie,
  FaBalanceScale,
} from "react-icons/fa";
import QuickActionsHeader from "@/components/QuickActionsHeader";

// --- Tipos ---
type CustomerRow = {
  id: string;
  full_name: string;
};

type OrderRow = {
  id: string;
  customers: CustomerRow | null;
};

type ProductRow = {
  name: string;
  stock: number;
  id: string;
};

type SaleRow = {
  total_amount: number;
  created_at: string;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// --- Componente de tarjeta simple ---
function DashboardCard({
  title,
  value,
  icon,
  note,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  note: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-slate-50">{value}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-slate-400 mt-1">{note}</p>
        </div>
        <div className="text-gray-300 dark:text-gray-600 dark:text-slate-300 text-2xl">{icon}</div>
      </div>
    </div>
  );
}

// --- Obtener datos del dashboard ---
type AccessState = {
  role: string | null;
  legacyAllow: string[];
  profileAllow: string[];
  profileDeny: string[];
  roleAllow: string[];
  roleDeny: string[];
};

async function getUserAccess(supabase: SupabaseClient): Promise<AccessState> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return {
      role: null,
      legacyAllow: [],
      profileAllow: [],
      profileDeny: [],
      roleAllow: [],
      roleDeny: [],
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, permissions, permissions_allow, permissions_deny")
    .eq("id", session.user.id)
    .single();

  const role =
    (profile?.role as string | undefined) ??
    (session.user.user_metadata?.role as string | undefined) ??
    null;

  const { data: rolePermissions } = role
    ? await supabase
        .from("role_permissions")
        .select("permissions_allow, permissions_deny")
        .eq("role", role)
        .maybeSingle()
    : { data: null };

  return {
    role,
    legacyAllow: Array.isArray(profile?.permissions) ? profile.permissions : [],
    profileAllow: Array.isArray(profile?.permissions_allow)
      ? profile.permissions_allow
      : [],
    profileDeny: Array.isArray(profile?.permissions_deny)
      ? profile.permissions_deny
      : [],
    roleAllow: Array.isArray(rolePermissions?.permissions_allow)
      ? rolePermissions.permissions_allow
      : [],
    roleDeny: Array.isArray(rolePermissions?.permissions_deny)
      ? rolePermissions.permissions_deny
      : [],
  };
}

function canPermission(
  access: AccessState,
  permission: keyof typeof PERMISSIONS
) {
  const allowSet = new Set([...access.legacyAllow, ...access.profileAllow]);

  if (access.profileDeny.includes(permission)) return false;
  if (allowSet.has(permission)) return true;
  if (access.roleDeny.includes(permission)) return false;
  if (access.roleAllow.includes(permission)) return true;

  return hasPermission(access.role as any, permission);
}

async function getDashboardData(
  supabase: SupabaseClient,
  options: { isFull: boolean; isRepartidor: boolean }
) {
  const { isFull, isRepartidor } = options;

  // Obtener fecha en zona horaria Argentina
  const now = new Date();
  const argDate = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  );

  const firstDayOfMonth = new Date(
    argDate.getFullYear(),
    argDate.getMonth(),
    1
  );
  const firstDayOfNextMonth = new Date(
    argDate.getFullYear(),
    argDate.getMonth() + 1,
    1
  );

  // Formatear fechas con zona horaria Argentina
  const startOfMonth = `${firstDayOfMonth.toISOString().split("T")[0]
    }T00:00:00-03:00`;
  const startOfNextMonth = `${firstDayOfNextMonth.toISOString().split("T")[0]
    }T00:00:00-03:00`;

  // --- Optimización: usar RPC para dashboard completo (1 query en vez de 10) ---
  if (isFull) {
    const { data: summary, error: rpcError } = await supabase.rpc(
      "get_dashboard_summary",
      {
        p_start_of_month: startOfMonth,
        p_start_of_next_month: startOfNextMonth,
      }
    );

    if (!rpcError && summary) {
      const totalOrdersDebt = Number(summary.totalOrdersDebt) || 0;
      const totalSalesDebt = Number(summary.totalSalesDebt) || 0;

      return {
        productCount: Number(summary.productCount) || 0,
        clientCount: Number(summary.clientCount) || 0,
        totalOrders: Number(summary.totalOrders) || 0,
        totalSales: Number(summary.totalSales) || 0,
        totalOrderSales: Number(summary.totalOrderSales) || 0,
        totalDebt: totalOrdersDebt + totalSalesDebt,
        customersWithDebtCount: Number(summary.customersWithDebtCount) || 0,
        pendingOrders: (summary.pendingOrders || []) as any[],
        criticalStockProducts: (summary.criticalStockProducts || []) as any[],
        recentSales: (summary.recentSales || []) as any[],
      };
    }

    // Fallback: si la RPC falla (ej. no existe aún), usar queries individuales
    console.warn("Dashboard RPC fallback — usando queries individuales:", rpcError?.message);
  }

  // --- Fallback para acceso limitado o si la RPC no está disponible ---
  const emptyCount = Promise.resolve({ count: 0 } as any);
  const emptyList = Promise.resolve({ data: [] } as any);

  const [
    productCountRes,
    clientCountRes,
    totalOrdersRes,
    salesThisMonthRes,
    ordersThisMonthRes,
    pendingOrdersRes,
    criticalStockProductsRes,
    recentSalesRes,
    ordersWithDebtRes,
    salesWithDebtRes,
  ] = await Promise.all([
    isFull
      ? supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
      : emptyCount,
    isFull
      ? supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
      : emptyCount,
    isFull
      ? supabase
          .from("orders" as any)
          .select("id", { count: "exact", head: true })
      : emptyCount,
    !isRepartidor
      ? supabase
          .from("sales")
          .select("total_amount")
          .gte("created_at", startOfMonth)
          .lt("created_at", startOfNextMonth)
      : emptyList,
    isFull
      ? supabase
          .from("orders" as any)
          .select("total_amount")
          .eq("status", "entregado")
          .gte("created_at", startOfMonth)
          .lt("created_at", startOfNextMonth)
      : emptyList,
    supabase
      .from("orders" as any)
      .select("id, customers ( id, full_name ), created_at")
      .eq("status", "pendiente")
      .order("created_at", { ascending: false })
      .limit(5),
    !isRepartidor
      ? supabase
          .from("products")
          .select("name, stock, id")
          .eq("is_active", true)
          .lte("stock", 5)
          .order("stock", { ascending: true })
          .limit(5)
      : emptyList,
    !isRepartidor
      ? supabase
          .from("sales")
          .select("id, total_amount, created_at, customers ( full_name )")
          .order("created_at", { ascending: false })
          .limit(5)
      : emptyList,
    isFull
      ? supabase
          .from("orders" as any)
          .select("amount_pending, customer_id")
          .gt("amount_pending", 0)
          .neq("status", "cancelado")
      : emptyList,
    isFull
      ? supabase
          .from("sales")
          .select("amount_pending, customer_id")
          .eq("payment_method", "cuenta_corriente")
          .gt("amount_pending", 0)
          .eq("is_cancelled", false)
      : emptyList,
  ]);

  const salesThisMonth = salesThisMonthRes.data;

  const totalSales =
    salesThisMonth?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) ??
    0;

  // Obtener pedidos entregados del mes (ventas de reparto)
  const ordersThisMonth = ordersThisMonthRes.data;

  const totalOrderSales =
    ordersThisMonth?.reduce(
      (sum: number, order: any) => sum + (order.total_amount || 0),
      0
    ) ?? 0;

  // Total de deuda pendiente (pedidos con cualquier método de pago + ventas cuenta corriente)
  // Obtener TODOS los pedidos con deuda pendiente (sin filtrar por cliente activo ni método de pago)
  const ordersWithDebt = ordersWithDebtRes.data;

  // Obtener TODAS las ventas en cuenta corriente con deuda pendiente (sin filtrar por cliente activo)
  const salesWithDebt = salesWithDebtRes.data;

  // Sumar deuda total
  const totalOrdersDebt =
    ordersWithDebt?.reduce(
      (sum: number, order: any) => sum + (order.amount_pending || 0),
      0
    ) ?? 0;

  const totalSalesDebt =
    salesWithDebt?.reduce(
      (sum: number, sale: any) => sum + (sale.amount_pending || 0),
      0
    ) ?? 0;

  const totalDebt = totalOrdersDebt + totalSalesDebt;

  // Contar clientes únicos con deuda
  const customersWithDebtSet = new Set<string>();
  ordersWithDebt?.forEach((order: any) => {
    if (order.customer_id) customersWithDebtSet.add(order.customer_id);
  });
  salesWithDebt?.forEach((sale: any) => {
    if (sale.customer_id) customersWithDebtSet.add(sale.customer_id);
  });
  const customersWithDebtCount = customersWithDebtSet.size;

  return {
    productCount: productCountRes.count ?? 0,
    clientCount: clientCountRes.count ?? 0,
    totalOrders: totalOrdersRes.count ?? 0,
    totalSales,
    totalOrderSales,
    totalDebt,
    customersWithDebtCount,
    pendingOrders: pendingOrdersRes.data ?? [],
    criticalStockProducts: criticalStockProductsRes.data ?? [],
    recentSales: recentSalesRes.data ?? [],
  };
}

// --- Página principal ---
export default async function DashboardPage() {
  const supabase = await createClient();
  const access = await getUserAccess(supabase);
  const role = access.role;
  const canFull = canPermission(access, "VER_DASHBOARD_COMPLETO");
  const canLimited = canPermission(access, "VER_DASHBOARD_LIMITADO");
  const canDashboard = canFull || canLimited;
  const isRepartidor = role === ROLES.REPARTIDOR;

  if (isRepartidor) {
    redirect("/reparto");
  }

  if (!canDashboard) {
    redirect("/dashboard/ventas/nueva");
  }

  const isFull = canFull;

  const {
    productCount,
    clientCount,
    totalOrders,
    totalSales,
    totalOrderSales,
    totalDebt,
    customersWithDebtCount,
    pendingOrders,
    criticalStockProducts,
    recentSales,
  } = await getDashboardData(supabase, { isFull, isRepartidor });

  const currentMonth = new Date().toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">

      {/* Acciones Rápidas como Header */}
      {!isRepartidor && <QuickActionsHeader />}

      {isRepartidor && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <FaTruck className="text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-200">Modo reparto</p>
              <p className="text-base font-semibold text-gray-800 dark:text-slate-100">
                Solo se muestran entregas y pedidos pendientes
              </p>
            </div>
          </div>
          <Link
            href="/reparto"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
          >
            Ir a Reparto <FaArrowRight />
          </Link>
        </div>
      )}

      {/* Tarjetas principales */}
      {isFull && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title="Ventas del Mes"
            value={`$${totalSales.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            icon={<FaCashRegister />}
            note={currentMonth}
          />
          <DashboardCard
            title="Pedidos Totales"
            value={totalOrders}
            icon={<FaDolly />}
            note="Historicos"
          />
          <DashboardCard
            title="Productos Activos"
            value={productCount}
            icon={<FaBoxes />}
            note="En catalogo"
          />
          <DashboardCard
            title="Clientes Activos"
            value={clientCount}
            icon={<FaUsers />}
            note="Registrados"
          />
        </div>
      )}

      {!isRepartidor && !isFull && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title="Ventas del Mes"
            value={`$${totalSales.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            icon={<FaCashRegister />}
            note={currentMonth}
          />
          <DashboardCard
            title="Pedidos Pendientes"
            value={pendingOrders.length}
            icon={<FaDolly />}
            note="Pendientes"
          />
          <DashboardCard
            title="Stock Critico"
            value={criticalStockProducts.length}
            icon={<FaBoxes />}
            note="Productos"
          />
          <DashboardCard
            title="Ventas Recientes"
            value={recentSales.length}
            icon={<FaCashRegister />}
            note="Ultimas 5"
          />
        </div>
      )}

      {/* Balance: Ventas Local vs Reparto */}
      {isFull && (
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-purple-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 p-6 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-900">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <FaBalanceScale className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">
              Balance de Ventas del Mes
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-300">{currentMonth}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ventas Local */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-md border-2 border-green-200 dark:border-green-900">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <FaStore className="text-green-600 dark:text-green-400 text-lg" />
              </div>
              <h4 className="font-bold text-gray-800 dark:text-slate-100">Ventas Local</h4>
            </div>
            <p className="text-3xl font-bold text-green-600 mb-2">
              $
              {totalSales.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-300 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full"
                  style={{
                    width: `${totalSales + totalOrderSales > 0
                      ? (totalSales / (totalSales + totalOrderSales)) * 100
                      : 0
                      }%`,
                  }}
                />
              </div>
              <span className="text-sm font-bold text-gray-700 dark:text-slate-200">
                {totalSales + totalOrderSales > 0
                  ? (
                    (totalSales / (totalSales + totalOrderSales)) *
                    100
                  ).toFixed(1)
                  : 0}
                %
              </span>
            </div>
          </div>

          {/* Ventas Reparto */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-md border-2 border-blue-200 dark:border-blue-900">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FaTruck className="text-blue-600 dark:text-blue-400 text-lg" />
              </div>
              <h4 className="font-bold text-gray-800 dark:text-slate-100">Ventas Reparto</h4>
            </div>
            <p className="text-3xl font-bold text-blue-600 mb-2">
              $
              {totalOrderSales.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-300 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full"
                  style={{
                    width: `${totalSales + totalOrderSales > 0
                      ? (totalOrderSales / (totalSales + totalOrderSales)) *
                      100
                      : 0
                      }%`,
                  }}
                />
              </div>
              <span className="text-sm font-bold text-gray-700 dark:text-slate-200">
                {totalSales + totalOrderSales > 0
                  ? (
                    (totalOrderSales / (totalSales + totalOrderSales)) *
                    100
                  ).toFixed(1)
                  : 0}
                %
              </span>
            </div>
          </div>

          {/* Total Combinado */}
          <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl p-5 shadow-md text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center">
                <FaChartPie className="text-purple-600 text-lg" />
              </div>
              <h4 className="font-bold">Total General</h4>
            </div>
            <p className="text-3xl font-bold mb-2">
              $
              {(totalSales + totalOrderSales).toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <FaStore className="text-xs" />
                {totalSales > 0
                  ? Math.round(
                    (totalSales / (totalSales + totalOrderSales)) * 100
                  )
                  : 0}
                %
              </span>
              <span>+</span>
              <span className="flex items-center gap-1">
                <FaTruck className="text-xs" />
                {totalOrderSales > 0
                  ? Math.round(
                    (totalOrderSales / (totalSales + totalOrderSales)) * 100
                  )
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>

        {/* Indicador de dominancia */}
        {totalSales + totalOrderSales > 0 && (
          <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-purple-200 dark:border-purple-900">
            <p className="text-sm text-gray-700 dark:text-slate-300">
              <span className="font-bold">
                {totalSales > totalOrderSales ? (
                  <span className="text-green-600">
                    🏪 Las ventas locales dominan este mes
                  </span>
                ) : totalOrderSales > totalSales ? (
                  <span className="text-blue-600">
                    🚚 Las ventas de reparto dominan este mes
                  </span>
                ) : (
                  <span className="text-purple-600">
                    ⚖️ Las ventas están equilibradas
                  </span>
                )}
              </span>
              {" - "}
              Diferencia: $
              {Math.abs(totalSales - totalOrderSales).toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        )}
      </div>
      )}

      {/* Tarjeta de Cuenta Corriente */}
      {isFull && totalDebt > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-6 rounded-lg shadow-sm border-2 border-orange-200 dark:border-orange-900">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📋</span>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
                  Cuenta Corriente Pendiente
                </h3>
              </div>
              <p className="text-3xl font-bold text-red-600 mb-1">
                $
                {totalDebt.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                {customersWithDebtCount}{" "}
                {customersWithDebtCount === 1 ? "cliente" : "clientes"} con
                deuda pendiente
              </p>
            </div>
            <Link
              href="/dashboard/clientes?filter=with_debt"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              Ver Clientes <FaArrowRight />
            </Link>
          </div>
        </div>
      )}

      {/* Grid de información */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pedidos Pendientes */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100">
              Pedidos Pendientes
            </h2>
            {pendingOrders.length > 0 && (
              <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-semibold px-2 py-1 rounded-full">
                {pendingOrders.length}
              </span>
            )}
          </div>
          <div className="p-4">
            {pendingOrders.length > 0 ? (
              <ul className="space-y-3">
                {pendingOrders.map((order: any) => (
                  <li
                    key={order.id}
                    className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-700 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {order.customers?.full_name ?? "Cliente N/A"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        {order.created_at &&
                          new Date(order.created_at).toLocaleDateString(
                            "es-ES"
                          )}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/pedidos/${order.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                    >
                      Ver <FaArrowRight className="text-xs" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">No hay pedidos pendientes</p>
              </div>
            )}
          </div>
        </div>

        {/* Stock Crítico */}
        {!isRepartidor && (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100">
              Stock Crítico
            </h2>
            {criticalStockProducts.length > 0 && (
              <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold px-2 py-1 rounded-full">
                {criticalStockProducts.length}
              </span>
            )}
          </div>
          <div className="p-4">
            {criticalStockProducts.length > 0 ? (
              <ul className="space-y-3">
                {criticalStockProducts.map((product) => (
                  <li
                    key={product.id}
                    className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-700 last:border-0 last:pb-0"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate pr-2">
                      {product.name}
                    </span>
                    <span
                      className={`text-sm font-semibold px-2 py-1 rounded ${product.stock === 0
                        ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        : product.stock <= 2
                          ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                          : "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                        }`}
                    >
                      {product.stock} u.
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">Stock en buen estado</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Últimas Ventas */}
        {!isRepartidor && (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100">
              Últimas Ventas
            </h2>
          </div>
          <div className="p-4">
            {recentSales.length > 0 ? (
              <ul className="space-y-3">
                {recentSales.map((sale: any) => (
                  <li
                    key={sale.id}
                    className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-700 last:border-0 last:pb-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                        {sale.customers?.full_name ?? "Cliente N/A"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        {sale.created_at &&
                          new Date(sale.created_at).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        $
                        {sale.total_amount?.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <Link
                        href={`/dashboard/ventas/${sale.id}`}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Ver detalle
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">No hay ventas recientes</p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
