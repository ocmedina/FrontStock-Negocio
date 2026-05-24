"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import {
  FaArrowDown,
  FaArrowUp,
  FaBox,
  FaBoxes,
  FaCalendarAlt,
  FaChartLine,
  FaChartPie,
  FaDollarSign,
  FaEquals,
  FaListUl,
  FaShoppingCart,
  FaStore,
  FaTruck,
  FaUsers,
} from "react-icons/fa";
import toast from "react-hot-toast";

type DateRange = "week" | "month" | "year";

type SystemStats = {
  productsActive: number;
  customersActive: number;
  ordersTotal: number;
  pendingOrders: number;
};

type SalesStats = {
  totalSales: number;
  localSales: number;
  repartoSales: number;
  growth: number;
  transactions: number;
  avgTicket: number;
};

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

const RANGE_LABELS: Record<DateRange, string> = {
  week: "Ultimos 7 dias",
  month: "Ultimos 30 dias",
  year: "Ultimo ano",
};

const formatCurrency = (value: number) =>
  value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatNumber = (value: number) => value.toLocaleString("es-AR");

const getErrorMessage = (error: unknown) => {
  if (!error) return "Error desconocido";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in (error as Record<string, unknown>)) {
    return String((error as Record<string, unknown>).message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Error desconocido";
  }
};

export default function ReportsCharts({ variant = "section" }: { variant?: "section" | "page" }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("month");

  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [localVsReparto, setLocalVsReparto] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);

  const [stats, setStats] = useState<SalesStats>({
    totalSales: 0,
    localSales: 0,
    repartoSales: 0,
    growth: 0,
    transactions: 0,
    avgTicket: 0,
  });

  const [systemStats, setSystemStats] = useState<SystemStats>({
    productsActive: 0,
    customersActive: 0,
    ordersTotal: 0,
    pendingOrders: 0,
  });

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const getDateRange = () => {
    const now = new Date();
    const argDate = new Date(
      now.toLocaleString("en-US", {
        timeZone: "America/Argentina/Buenos_Aires",
      })
    );

    const startDate = new Date(argDate);

    if (dateRange === "week") {
      startDate.setDate(argDate.getDate() - 7);
    } else if (dateRange === "month") {
      startDate.setMonth(argDate.getMonth() - 1);
    } else if (dateRange === "year") {
      startDate.setFullYear(argDate.getFullYear() - 1);
    }

    return {
      start: startDate.toISOString(),
      end: argDate.toISOString(),
    };
  };

  const fetchAllData = async () => {
    setLoading(true);
    const loadingToast = toast.loading("Cargando reportes...");

    try {
      const { start, end } = getDateRange();

      const { start: prevStart, end: prevEnd } = (() => {
        const currentStart = new Date(start);
        const currentEnd = new Date(end);
        const diff = currentEnd.getTime() - currentStart.getTime();

        const prevEndDate = new Date(currentStart);
        prevEndDate.setMilliseconds(prevEndDate.getMilliseconds() - 1);

        const prevStartDate = new Date(prevEndDate);
        prevStartDate.setMilliseconds(prevStartDate.getMilliseconds() - diff);

        return {
          start: prevStartDate.toISOString(),
          end: prevEndDate.toISOString(),
        };
      })();

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_reports_raw_data",
        {
          p_start: start,
          p_end: end,
          p_prev_start: prevStart,
          p_prev_end: prevEnd,
        }
      );

      let systemStatsObj, sales, orders, saleItems, orderItems, products, previousPeriodTotal;

      if (!rpcError && rpcData) {
        // Usar datos de la RPC
        const data = typeof rpcData === "string" ? JSON.parse(rpcData) : rpcData;
        systemStatsObj = data.systemStats;
        sales = data.sales || [];
        orders = data.orders || [];
        previousPeriodTotal = data.previousPeriodTotal || 0;
        saleItems = data.saleItems || [];
        orderItems = data.orderItems || [];
        products = data.products || [];
        
        setSystemStats({
          productsActive: systemStatsObj.productsActive || 0,
          customersActive: systemStatsObj.customersActive || 0,
          ordersTotal: systemStatsObj.ordersTotal || 0,
          pendingOrders: systemStatsObj.pendingOrders || 0,
        });
      } else {
        // FALLBACK: si la RPC falla o no existe, usar las queries originales
        console.warn("RPC get_reports_raw_data falló o no existe. Usando fallback.", rpcError);
        
        const [
          salesRes,
          ordersRes,
          prevSalesRes,
          prevOrdersRes,
          productsCountRes,
          customersCountRes,
          ordersCountRes,
          pendingOrdersRes,
        ] = await Promise.all([
          supabase
            .from("sales")
            .select("id, created_at, total_amount, payment_method")
            .gte("created_at", start)
            .lte("created_at", end)
            .order("created_at", { ascending: true }),
          (supabase as any)
            .from("orders")
            .select("id, created_at, total_amount, status")
            .gte("created_at", start)
            .lte("created_at", end),
          supabase
            .from("sales")
            .select("total_amount")
            .gte("created_at", prevStart)
            .lte("created_at", prevEnd),
          (supabase as any)
            .from("orders")
            .select("total_amount")
            .eq("status", "entregado")
            .gte("created_at", prevStart)
            .lte("created_at", prevEnd),
          supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true),
          supabase
            .from("customers")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true),
          (supabase as any)
            .from("orders")
            .select("id", { count: "exact", head: true }),
          (supabase as any)
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("status", "pendiente"),
        ]);

        if (salesRes.error) throw new Error(`ventas: ${getErrorMessage(salesRes.error)}`);
        if (ordersRes.error) throw new Error(`pedidos: ${getErrorMessage(ordersRes.error)}`);

        setSystemStats({
          productsActive: productsCountRes.error ? 0 : productsCountRes.count ?? 0,
          customersActive: customersCountRes.error ? 0 : customersCountRes.count ?? 0,
          ordersTotal: ordersCountRes.error ? 0 : ordersCountRes.count ?? 0,
          pendingOrders: pendingOrdersRes.error ? 0 : pendingOrdersRes.count ?? 0,
        });

        sales = salesRes.data || [];
        orders = ordersRes.data || [];
        const deliveredOrders = orders.filter((o: any) => o.status === "entregado");

        const saleIds = sales.map((s) => s.id);
        const orderIds = deliveredOrders.map((o: any) => o.id);
        const emptyResult = { data: [] as any[], error: null as any };

        const [saleItemsRes, orderItemsRes] = await Promise.all([
          saleIds.length > 0
            ? supabase
                .from("sale_items")
                .select("quantity, product_id, sale_id")
                .in("sale_id", saleIds)
            : Promise.resolve(emptyResult),
          orderIds.length > 0
            ? (supabase as any)
                .from("order_items")
                .select("quantity, product_id, order_id")
                .in("order_id", orderIds)
            : Promise.resolve(emptyResult),
        ]);

        saleItems = saleItemsRes.error ? [] : saleItemsRes.data || [];
        orderItems = orderItemsRes.error ? [] : orderItemsRes.data || [];

        const productIds = Array.from(
          new Set(
            [...saleItems, ...orderItems]
              .map((item: any) => item.product_id)
              .filter(Boolean)
          )
        );

        products = [];
        if (productIds.length > 0) {
          const { data: productsData } = await supabase
            .from("products")
            .select("id, name")
            .in("id", productIds);
          products = productsData || [];
        }

        previousPeriodTotal =
          (prevSalesRes.data || []).reduce((sum, s) => sum + Number(s.total_amount), 0) +
          (prevOrdersRes.data || []).reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);
      }

      processData(
        sales,
        orders,
        saleItems,
        orderItems,
        products,
        previousPeriodTotal
      );

      toast.success("Reportes actualizados", { id: loadingToast });
    } catch (err: any) {
      console.error("Error al cargar reportes:", err);
      toast.error(getErrorMessage(err) || "Error al cargar reportes", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const processData = (
    sales: any[],
    orders: any[],
    saleItems: any[],
    orderItems: any[],
    products: any[],
    previousPeriodTotal: number
  ) => {
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    const dayMap: Record<string, { date: string; local: number; reparto: number }> = {};

    sales.forEach((s) => {
      const date = s.created_at.split("T")[0];
      if (!dayMap[date]) dayMap[date] = { date, local: 0, reparto: 0 };
      dayMap[date].local += Number(s.total_amount);
    });

    const deliveredOrders = orders.filter((o: any) => o.status === "entregado");
    deliveredOrders.forEach((o: any) => {
      const date = o.created_at.split("T")[0];
      if (!dayMap[date]) dayMap[date] = { date, local: 0, reparto: 0 };
      dayMap[date].reparto += Number(o.total_amount);
    });

    const salesByDayData = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    const totalLocal = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const totalReparto = deliveredOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);
    const total = totalLocal + totalReparto;

    const localVsRepartoData = [
      { name: "Local", value: totalLocal, color: "#10b981" },
      { name: "Reparto", value: totalReparto, color: "#3b82f6" },
    ];

    const productTotals: Record<string, number> = {};

    const saleIds = new Set(sales.map((s) => s.id));
    const orderIds = new Set(deliveredOrders.map((o: any) => o.id));

    saleItems.forEach((item) => {
      if (saleIds.has(item.sale_id)) {
        const nombre = productMap.get(item.product_id) || "Desconocido";
        productTotals[nombre] = (productTotals[nombre] || 0) + Number(item.quantity);
      }
    });

    orderItems.forEach((item: any) => {
      if (orderIds.has(item.order_id)) {
        const nombre = productMap.get(item.product_id) || "Desconocido";
        productTotals[nombre] = (productTotals[nombre] || 0) + Number(item.quantity);
      }
    });

    const topProductsData = Object.entries(productTotals)
      .map(([name, quantity]) => ({ name, quantity: quantity as number }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const paymentTotals: Record<string, number> = {};

    sales.forEach((s) => {
      const method = s.payment_method || "Efectivo";
      paymentTotals[method] = (paymentTotals[method] || 0) + Number(s.total_amount);
    });

    const paymentMethodsData = Object.entries(paymentTotals).map(([method, amount]) => ({
      method: method.replace(/_/g, " "),
      amount,
    }));

    const monthlyMap: Record<string, { month: string; local: number; reparto: number }> = {};

    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().substring(0, 7);
    });

    last6Months.forEach((month) => {
      monthlyMap[month] = { month, local: 0, reparto: 0 };
    });

    sales.forEach((s) => {
      const month = s.created_at.substring(0, 7);
      if (monthlyMap[month]) {
        monthlyMap[month].local += Number(s.total_amount);
      }
    });

    deliveredOrders.forEach((o: any) => {
      const month = o.created_at.substring(0, 7);
      if (monthlyMap[month]) {
        monthlyMap[month].reparto += Number(o.total_amount);
      }
    });

    const monthlyTrendData = Object.values(monthlyMap);

    const growth =
      previousPeriodTotal > 0 ? ((total - previousPeriodTotal) / previousPeriodTotal) * 100 : total > 0 ? 100 : 0;

    const transactions = sales.length + deliveredOrders.length;
    const avgTicket = transactions > 0 ? total / transactions : 0;

    setSalesByDay(salesByDayData);
    setLocalVsReparto(localVsRepartoData);
    setTopProducts(topProductsData);
    setPaymentMethods(paymentMethodsData);
    setMonthlyTrend(monthlyTrendData);
    setStats({
      totalSales: total,
      localSales: totalLocal,
      repartoSales: totalReparto,
      growth,
      transactions,
      avgTicket,
    });
  };

  const wrapperClass =
    variant === "page"
      ? "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-950 p-6"
      : "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-950 p-6 rounded-2xl shadow-lg print:hidden";

  if (loading) {
    return (
      <div className={wrapperClass}>
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-slate-100 mb-6 flex items-center gap-3">
            <FaChartLine className="text-blue-600" />
            Reportes y Graficos
          </h2>
          <div className="flex items-center justify-center h-72">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-slate-300">Cargando datos...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={wrapperClass}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-slate-100 mb-2 flex items-center gap-3">
            <FaChartLine className="text-blue-600" />
            Reportes y Graficos
          </h2>
          <p className="text-gray-600 dark:text-slate-300">
            Ventas, tendencias y estado general del sistema
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setDateRange("week")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              dateRange === "week"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
          >
            <FaCalendarAlt className="inline mr-2" />
            Semana
          </button>
          <button
            onClick={() => setDateRange("month")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              dateRange === "month"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
          >
            <FaCalendarAlt className="inline mr-2" />
            Mes
          </button>
          <button
            onClick={() => setDateRange("year")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              dateRange === "year"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
          >
            <FaCalendarAlt className="inline mr-2" />
            Ano
          </button>
          <span className="px-3 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            {RANGE_LABELS[dateRange]}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="bg-white/90 rounded-lg p-2 w-fit mb-3">
              <FaDollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-green-100 text-xs uppercase">Total General</p>
            <p className="text-2xl font-bold">${formatCurrency(stats.totalSales)}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="bg-white/90 rounded-lg p-2 w-fit mb-3">
              <FaStore className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-blue-100 text-xs uppercase">Ventas Local</p>
            <p className="text-2xl font-bold">${formatCurrency(stats.localSales)}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="bg-white/90 rounded-lg p-2 w-fit mb-3">
              <FaTruck className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-purple-100 text-xs uppercase">Ventas Reparto</p>
            <p className="text-2xl font-bold">${formatCurrency(stats.repartoSales)}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="bg-white/90 rounded-lg p-2 w-fit mb-3">
              {stats.growth > 0 ? (
                <FaArrowUp className="w-5 h-5 text-orange-600" />
              ) : stats.growth < 0 ? (
                <FaArrowDown className="w-5 h-5 text-orange-600" />
              ) : (
                <FaEquals className="w-5 h-5 text-orange-600" />
              )}
            </div>
            <p className="text-orange-100 text-xs uppercase">Tendencia</p>
            <p className="text-2xl font-bold">{stats.growth > 0 ? "+" : ""}{stats.growth.toFixed(1)}%</p>
          </div>

          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-5 text-white shadow-lg">
            <div className="bg-white/90 rounded-lg p-2 w-fit mb-3">
              <FaListUl className="w-5 h-5 text-slate-700" />
            </div>
            <p className="text-slate-200 text-xs uppercase">Transacciones</p>
            <p className="text-2xl font-bold">{formatNumber(stats.transactions)}</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-500 to-sky-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="bg-white/90 rounded-lg p-2 w-fit mb-3">
              <FaDollarSign className="w-5 h-5 text-cyan-600" />
            </div>
            <p className="text-cyan-100 text-xs uppercase">Ticket Promedio</p>
            <p className="text-2xl font-bold">${formatCurrency(stats.avgTicket)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 mr-3">
              <FaChartLine className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">Evolucion de Ventas Diarias</h3>
              <p className="text-gray-500 dark:text-slate-400 text-sm">Comparacion Local vs Reparto</p>
            </div>
          </div>
          {salesByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={salesByDay}>
                <defs>
                  <linearGradient id="colorLocal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorReparto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value: number) => `$${formatCurrency(value)}`}
                  labelStyle={{ color: "#fff", fontWeight: "bold" }}
                />
                <Area
                  type="monotone"
                  dataKey="local"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#colorLocal)"
                  activeDot={{ r: 8 }}
                  name="Local"
                />
                <Area
                  type="monotone"
                  dataKey="reparto"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#colorReparto)"
                  activeDot={{ r: 8 }}
                  name="Reparto"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">Sin datos disponibles para este periodo</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="bg-purple-100 rounded-lg p-2 mr-3">
                <FaChartPie className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">Distribucion de Ventas</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Balance Local vs Reparto</p>
              </div>
            </div>
            {localVsReparto.length > 0 && localVsReparto.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={localVsReparto}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) =>
                      `${entry.name}: ${((entry.value / stats.totalSales) * 100).toFixed(1)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {localVsReparto.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => `$${formatCurrency(value)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-400 text-lg">Sin datos disponibles</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="bg-green-100 rounded-lg p-2 mr-3">
                <FaDollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">Metodos de Pago</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Distribucion por metodo</p>
              </div>
            </div>
            {paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={paymentMethods}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="method" tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => `$${formatCurrency(value)}`}
                    labelStyle={{ color: "#fff", fontWeight: "bold" }}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-400 text-lg">Sin datos disponibles</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-orange-100 rounded-lg p-2 mr-3">
              <FaBox className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">Top 10 Productos</h3>
              <p className="text-gray-500 dark:text-slate-400 text-sm">Mas vendidos por cantidad</p>
            </div>
          </div>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} angle={-45} textAnchor="end" height={100} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value: number) => [`${value} unidades`, "Vendido"]}
                  labelStyle={{ color: "#fff", fontWeight: "bold" }}
                />
                <Bar dataKey="quantity" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">Sin datos de productos disponibles</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-indigo-100 rounded-lg p-2 mr-3">
              <FaChartLine className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">Tendencia Mensual</h3>
              <p className="text-gray-500 dark:text-slate-400 text-sm">Ultimos 6 meses</p>
            </div>
          </div>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value: number) => `$${formatCurrency(value)}`}
                  labelStyle={{ color: "#fff", fontWeight: "bold" }}
                />
                <Line type="monotone" dataKey="local" stroke="#10b981" strokeWidth={3} name="Local" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="reparto" stroke="#3b82f6" strokeWidth={3} name="Reparto" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">Sin datos disponibles</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6">
          <div className="flex items-center mb-6">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 mr-3">
              <FaChartLine className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">Estado del Sistema</h3>
              <p className="text-gray-500 dark:text-slate-400 text-sm">Resumen general de la operacion</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm mb-1">
                <FaBoxes /> Productos activos
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatNumber(systemStats.productsActive)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm mb-1">
                <FaUsers /> Clientes activos
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatNumber(systemStats.customersActive)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm mb-1">
                <FaShoppingCart /> Pedidos totales
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatNumber(systemStats.ordersTotal)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm mb-1">
                <FaChartLine /> Pedidos pendientes
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatNumber(systemStats.pendingOrders)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
