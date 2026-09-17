import { createClient } from "@/lib/server";
import Link from "next/link";
import {
  FaBoxes,
  FaUsers,
  FaDolly,
  FaCashRegister,
  FaArrowRight,
  FaTruckLoading,
} from "react-icons/fa";
import { Scale, Store, Truck, PieChart } from "lucide-react";
import QuickActionsHeader from "@/components/QuickActionsHeader";
import ChristmasCountdown from "@/components/ChristmasCountdown";
import WelcomeModal from "@/components/WelcomeModal";

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
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-50 mt-1">
            {value}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
            {note}
          </p>
        </div>
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white flex items-center justify-center text-xl shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

// --- Obtener datos del dashboard ---
async function getDashboardData() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "";
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    displayName = profile?.full_name?.trim() || "";
  }

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
    suppliersDebtRes,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active" as any, true),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("is_active" as any, true),
    supabase
      .from("orders" as any)
      .select("id", { count: "exact", head: true }),
    supabase
      .from("sales")
      .select("total_amount")
      .gte("created_at", startOfMonth)
      .lt("created_at", startOfNextMonth),
    supabase
      .from("orders" as any)
      .select("total_amount")
      .eq("status", "entregado")
      .gte("created_at", startOfMonth)
      .lt("created_at", startOfNextMonth),
    supabase
      .from("orders" as any)
      .select("id, customers ( id, full_name ), created_at")
      .eq("status", "pendiente")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("products")
      .select("name, stock, id")
      .eq("is_active" as any, true)
      .lte("stock", 5)
      .order("stock", { ascending: true })
      .limit(5),
    supabase
      .from("sales")
      .select("id, total_amount, created_at, customers ( full_name )")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("orders" as any)
      .select("amount_pending, customer_id")
      .gt("amount_pending", 0)
      .neq("status", "cancelado"),
    (supabase as any)
      .from("sales")
      .select("amount_pending, customer_id")
      .gt("amount_pending", 0),
    supabase
      .from("suppliers")
      .select("id, name, debt")
      .eq("is_active", true),
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

  // Calcular deuda con proveedores
  const suppliersData = suppliersDebtRes.data ?? [];
  const totalSupplierDebt = suppliersData
    .filter((s: any) => (s.debt || 0) > 0)
    .reduce((sum: number, s: any) => sum + (s.debt || 0), 0);
  const totalSupplierCredit = suppliersData
    .filter((s: any) => (s.debt || 0) < 0)
    .reduce((sum: number, s: any) => sum + Math.abs(s.debt || 0), 0);
  const suppliersWithDebtCount = suppliersData.filter(
    (s: any) => (s.debt || 0) > 0
  ).length;
  const netSupplierBalance = totalSupplierDebt - totalSupplierCredit;
  // Top 3 proveedores con mayor deuda para mostrar en el dashboard
  const topSuppliersWithDebt = suppliersData
    .filter((s: any) => (s.debt || 0) > 0)
    .sort((a: any, b: any) => (b.debt || 0) - (a.debt || 0))
    .slice(0, 3);

  return {
    productCount: productCountRes.count ?? 0,
    clientCount: clientCountRes.count ?? 0,
    totalOrders: totalOrdersRes.count ?? 0,
    totalSales,
    totalOrderSales,
    totalDebt,
    customersWithDebtCount,
    totalSupplierDebt,
    totalSupplierCredit,
    suppliersWithDebtCount,
    netSupplierBalance,
    topSuppliersWithDebt,
    pendingOrders: pendingOrdersRes.data ?? [],
    criticalStockProducts: criticalStockProductsRes.data ?? [],
    recentSales: recentSalesRes.data ?? [],
    displayName,
  };
}

// --- Página principal ---
export default async function DashboardPage() {
  const {
    productCount,
    clientCount,
    totalOrders,
    totalSales,
    totalOrderSales,
    totalDebt,
    customersWithDebtCount,
    totalSupplierDebt,
    totalSupplierCredit,
    suppliersWithDebtCount,
    netSupplierBalance,
    topSuppliersWithDebt,
    pendingOrders,
    criticalStockProducts,
    recentSales,
    displayName,
  } = await getDashboardData();

  const currentMonth = new Date().toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
  const fullDate = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Modal de Bienvenida */}
      <WelcomeModal />

      {/* Cuenta regresiva navideña */}
      <ChristmasCountdown />

      {/* Hero */}
      <div className="bg-gradient-to-br from-white via-white to-emerald-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
              Panel principal
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-50 mt-1">
              {displayName ? `Hola, ${displayName} 👋` : "Hola 👋"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {fullDate}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Resumen {currentMonth}
            </span>
            {totalDebt > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                Deuda pendiente: ${totalDebt.toLocaleString("es-AR")}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
            note="Históricos"
          />
          <DashboardCard
            title="Productos Activos"
            value={productCount}
            icon={<FaBoxes />}
            note="En catálogo"
          />
          <DashboardCard
            title="Clientes Activos"
            value={clientCount}
            icon={<FaUsers />}
            note="Registrados"
          />
        </div>
      </div>

      {/* Acciones Rápidas */}
      <QuickActionsHeader />

      {/* Balance: Ventas Local vs Reparto */}
      {(() => {
        const grandTotal = totalSales + totalOrderSales;
        const localPct = grandTotal > 0 ? (totalSales / grandTotal) * 100 : 0;
        const orderPct = grandTotal > 0 ? (totalOrderSales / grandTotal) * 100 : 0;
        const diff = Math.abs(totalSales - totalOrderSales);

        return (
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all">
            {/* Header con título y pill de estado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                    Balance de Ventas del Mes
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {currentMonth}
                  </p>
                </div>
              </div>

              {grandTotal > 0 && (
                <div className="inline-flex items-center self-start sm:self-auto gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      totalSales > totalOrderSales
                        ? "bg-emerald-500"
                        : totalOrderSales > totalSales
                        ? "bg-blue-500"
                        : "bg-slate-400"
                    }`}
                  />
                  <span>
                    {totalSales > totalOrderSales ? (
                      <>
                        Mayor volumen en <span className="font-semibold text-slate-800 dark:text-slate-200">Local</span> (+${diff.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </>
                    ) : totalOrderSales > totalSales ? (
                      <>
                        Mayor volumen en <span className="font-semibold text-slate-800 dark:text-slate-200">Reparto</span> (+${diff.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </>
                    ) : (
                      "Ventas 50/50 equilibradas"
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* 3 Tarjetas Minimalistas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
              {/* Tarjeta Ventas Local */}
              <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Store className="w-3.5 h-3.5" />
                      </span>
                      Ventas Local
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                      {localPct.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-3 tabular-nums">
                    $
                    {totalSales.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="mt-4">
                  <div className="h-1.5 w-full bg-slate-200/80 dark:bg-slate-700/60 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${localPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tarjeta Ventas Reparto */}
              <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Truck className="w-3.5 h-3.5" />
                      </span>
                      Ventas Reparto
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
                      {orderPct.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-3 tabular-nums">
                    $
                    {totalOrderSales.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="mt-4">
                  <div className="h-1.5 w-full bg-slate-200/80 dark:bg-slate-700/60 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${orderPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tarjeta Total General */}
              <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <span className="p-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
                        <PieChart className="w-3.5 h-3.5" />
                      </span>
                      Total General
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                      100%
                    </span>
                  </div>
                  <p className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-3 tabular-nums">
                    $
                    {grandTotal.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    Local {Math.round(localPct)}%
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 font-light">+</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    Reparto {Math.round(orderPct)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Barra de proporción combinada */}
            {grandTotal > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Proporción de Facturación
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                    {localPct.toFixed(1)}% Local vs {orderPct.toFixed(1)}% Reparto
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                  <div
                    className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
                    style={{ width: `${localPct}%` }}
                    title={`Ventas Local: ${localPct.toFixed(1)}%`}
                  />
                  <div
                    className="bg-blue-500 h-full rounded-r-full transition-all duration-500"
                    style={{ width: `${orderPct}%` }}
                    title={`Ventas Reparto: ${orderPct.toFixed(1)}%`}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Deudas: Clientes + Proveedores */}
      {(totalDebt > 0 || totalSupplierDebt > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Cuenta Corriente Clientes */}
          {totalDebt > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-6 rounded-2xl shadow-sm border border-orange-200 dark:border-orange-900">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400">
                      <span className="text-lg">📋</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 uppercase tracking-wide">
                      Clientes — Cta. Corriente
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                    ${totalDebt.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {customersWithDebtCount} {customersWithDebtCount === 1 ? "cliente" : "clientes"} con deuda pendiente
                  </p>
                </div>
                <Link
                  href="/dashboard/clientes?filter=with_debt"
                  className="shrink-0 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium text-xs transition-colors flex items-center gap-1.5"
                >
                  Ver <FaArrowRight className="text-[10px]" />
                </Link>
              </div>
            </div>
          )}

          {/* Deuda con Proveedores */}
          {totalSupplierDebt > 0 && (
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 p-6 rounded-2xl shadow-sm border border-rose-200 dark:border-rose-900">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <FaTruckLoading className="text-lg" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 uppercase tracking-wide">
                      Proveedores — Deuda
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-rose-600 dark:text-rose-400 mb-1">
                    ${totalSupplierDebt.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                    {suppliersWithDebtCount} {suppliersWithDebtCount === 1 ? "proveedor" : "proveedores"} con saldo pendiente
                    {totalSupplierCredit > 0 && (
                      <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                        · ${totalSupplierCredit.toLocaleString("es-AR", { minimumFractionDigits: 2 })} a favor
                      </span>
                    )}
                  </p>
                  {topSuppliersWithDebt.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {topSuppliersWithDebt.map((s: any) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/50 truncate max-w-[140px]"
                        >
                          <span className="w-1 h-1 rounded-full bg-rose-400 shrink-0" />
                          {s.name}: ${(s.debt || 0).toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Link
                  href="/dashboard/proveedores?filter=with_debt"
                  className="shrink-0 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium text-xs transition-colors flex items-center gap-1.5"
                >
                  Ver <FaArrowRight className="text-[10px]" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid de información */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pedidos Pendientes */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-orange-100 dark:border-orange-900/40 bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center">
                <FaDolly />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                  Pedidos Pendientes
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Seguimiento del reparto
                </p>
              </div>
            </div>
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
              <div className="text-center text-gray-400 py-8 rounded-xl bg-orange-50/40 dark:bg-orange-950/20">
                <p className="text-sm">No hay pedidos pendientes</p>
              </div>
            )}
          </div>
        </div>

        {/* Stock Crítico */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-red-100 dark:border-red-900/40 bg-gradient-to-r from-red-50 to-white dark:from-red-950/30 dark:to-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 text-white flex items-center justify-center">
                <FaBoxes />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                  Stock Crítico
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Productos por reponer
                </p>
              </div>
            </div>
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
              <div className="text-center text-gray-400 py-8 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20">
                <p className="text-sm">Stock en buen estado</p>
              </div>
            )}
          </div>
        </div>

        {/* Últimas Ventas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-blue-100 dark:border-blue-900/40 bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center">
                <FaCashRegister />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                  Últimas Ventas
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Movimientos recientes
                </p>
              </div>
            </div>
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
              <div className="text-center text-gray-400 py-8 rounded-xl bg-blue-50/40 dark:bg-blue-950/20">
                <p className="text-sm">No hay ventas recientes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
