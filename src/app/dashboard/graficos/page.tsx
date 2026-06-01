// src/app/dashboard/graficos/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import {
  FaChartLine,
  FaChartPie,
  FaStore,
  FaTruck,
  FaBox,
  FaDollarSign,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaEquals,
} from "react-icons/fa";
import toast from "react-hot-toast";

const COLORS = [
  "#4f46e5", // Indigo
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#ef4444", // Rose
  "#8b5cf6", // Purple
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200/10 dark:border-slate-800/80 p-3 rounded-2xl shadow-xl space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color || entry.fill }}
              />
              <span className="text-xs font-semibold text-slate-350">
                {entry.name}:{" "}
                <span className="font-bold text-white">
                  {typeof entry.value === "number"
                    ? entry.value.toLocaleString("es-AR", {
                        style: entry.name.toLowerCase().includes("cantidad") || entry.name.toLowerCase().includes("unidades") || entry.name.toLowerCase().includes("vendido") ? undefined : "currency",
                        currency: "ARS",
                        minimumFractionDigits: 0,
                      })
                    : entry.value}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function GraficosPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month"); // 'week', 'month', 'year'

  // Datos
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [localVsReparto, setLocalVsReparto] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalSales: 0,
    localSales: 0,
    repartoSales: 0,
    growth: 0,
  });

  useEffect(() => {
    fetchAllData();
  }, [dateRange]);

  const getDateRange = () => {
    const now = new Date();
    const argDate = new Date(
      now.toLocaleString("en-US", {
        timeZone: "America/Argentina/Buenos_Aires",
      })
    );

    let startDate = new Date(argDate);

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
    const loadingToast = toast.loading("Cargando datos...");

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

      // Queries en paralelo con carga anidada de items para evitar límites de longitud de URL en POSTGREST
      const [salesRes, ordersRes, prevSalesRes, prevOrdersRes] = await Promise.all([
        supabase
          .from("sales")
          .select("id, created_at, total_amount, payment_method, sale_items (quantity, product_id)")
          .gte("created_at", start)
          .lte("created_at", end)
          .order("created_at", { ascending: true }),
        (supabase as any)
          .from("orders")
          .select("id, created_at, total_amount, status, order_items (quantity, product_id)")
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
      ]);

      if (salesRes.error) throw salesRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (prevSalesRes.error) throw prevSalesRes.error;
      if (prevOrdersRes.error) throw prevOrdersRes.error;

      const sales = salesRes.data || [];
      const orders = ordersRes.data || [];
      const deliveredOrders = orders.filter((o: any) => o.status === "entregado");

      // Mapeo local de items desde la respuesta anidada
      const saleItems = sales.flatMap((s: any) =>
        (s.sale_items || []).map((item: any) => ({
          quantity: item.quantity,
          product_id: item.product_id,
          sale_id: s.id,
        }))
      );

      const orderItems = deliveredOrders.flatMap((o: any) =>
        (o.order_items || []).map((item: any) => ({
          quantity: item.quantity,
          product_id: item.product_id,
          order_id: o.id,
        }))
      );

      const productIds = Array.from(
        new Set(
          [...saleItems, ...orderItems]
            .map((item: any) => item.product_id)
            .filter(Boolean)
        )
      );

      let products: any[] = [];
      if (productIds.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("id, name")
          .in("id", productIds);

        if (productsError) throw productsError;
        products = productsData || [];
      }

      const previousPeriodTotal =
        (prevSalesRes.data || []).reduce(
          (sum, s) => sum + Number(s.total_amount),
          0
        ) +
        (prevOrdersRes.data || []).reduce(
          (sum: number, o: any) => sum + Number(o.total_amount),
          0
        );

      processData(
        sales,
        orders,
        saleItems,
        orderItems,
        products,
        previousPeriodTotal
      );

      toast.success("Datos cargados correctamente", { id: loadingToast });
    } catch (err: any) {
      console.error("Error al cargar datos:", err);
      toast.error(err?.message || "Error al cargar datos", {
        id: loadingToast,
      });
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

    // 1. Ventas por día (Local vs Reparto)
    const dayMap: Record<
      string,
      { date: string; local: number; reparto: number }
    > = {};

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

    const salesByDayData = Object.values(dayMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // 2. Balance Local vs Reparto
    const totalLocal = sales.reduce(
      (sum, s) => sum + Number(s.total_amount),
      0
    );
    const totalReparto = deliveredOrders.reduce(
      (sum: number, o: any) => sum + Number(o.total_amount),
      0
    );
    const total = totalLocal + totalReparto;

    const localVsRepartoData = [
      { name: "Local", value: totalLocal, color: "#10b981" },
      { name: "Reparto", value: totalReparto, color: "#3b82f6" },
    ];

    // 3. Top productos
    const productTotals: Record<string, number> = {};

    // Crear sets de IDs de ventas y pedidos del período
    const saleIds = new Set(sales.map((s) => s.id));
    const orderIds = new Set(deliveredOrders.map((o: any) => o.id));

    saleItems.forEach((item) => {
      if (saleIds.has(item.sale_id)) {
        const nombre = productMap.get(item.product_id) || "Desconocido";
        productTotals[nombre] =
          (productTotals[nombre] || 0) + Number(item.quantity);
      }
    });

    orderItems.forEach((item: any) => {
      if (orderIds.has(item.order_id)) {
        const nombre = productMap.get(item.product_id) || "Desconocido";
        productTotals[nombre] =
          (productTotals[nombre] || 0) + Number(item.quantity);
      }
    });

    const topProductsData = Object.entries(productTotals)
      .map(([name, quantity]) => ({ name, quantity: quantity as number }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // 4. Métodos de pago
    const paymentTotals: Record<string, number> = {};

    sales.forEach((s) => {
      const method = s.payment_method || "Efectivo";
      paymentTotals[method] =
        (paymentTotals[method] || 0) + Number(s.total_amount);
    });

    const paymentMethodsData = Object.entries(paymentTotals).map(
      ([method, amount]) => ({ method, amount })
    );

    // 5. Tendencia mensual (últimos 6 meses)
    const monthlyMap: Record<
      string,
      { month: string; local: number; reparto: number }
    > = {};

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

    // 6. Calcular estadísticas y tendencia

    const growth =
      previousPeriodTotal > 0
        ? ((total - previousPeriodTotal) / previousPeriodTotal) * 100
        : total > 0 ? 100 : 0;

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
    });
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-650 animate-spin"></div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Cargando métricas de negocio...</h3>
          <p className="text-xs text-slate-450 dark:text-slate-400">Esto tomará solo unos instantes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Banner de Cabecera con Segmented Controls */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <FaChartLine className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Dashboard de Análisis
              </h1>
              <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Visualización integral del rendimiento comercial y logístico
              </p>
            </div>
          </div>

          {/* Segmented control para el rango de fechas */}
          <div className="flex bg-slate-100 dark:bg-slate-950/80 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 self-start md:self-auto relative z-10 shadow-inner">
            {[
              { id: "week", label: "7 días" },
              { id: "month", label: "30 días" },
              { id: "year", label: "1 año" },
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => setDateRange(range.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 uppercase tracking-wider ${
                  dateRange === range.id
                    ? "bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-450 shadow-xs border-b border-indigo-500/15"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Malla de Tarjetas de Estadísticas (Stats Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Total General */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Ingresos Totales
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                <FaDollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              $
              {stats.totalSales.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-medium">Facturación acumulada en el rango</p>
          </div>

          {/* Card 2: Ventas Local */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Ventas Local
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                <FaStore className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              $
              {stats.localSales.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-medium">Transacciones realizadas en sucursal</p>
          </div>

          {/* Card 3: Ventas Reparto */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Ventas Reparto
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                <FaTruck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              $
              {stats.repartoSales.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-medium">Pedidos despachados por logística</p>
          </div>

          {/* Card 4: Crecimiento */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Desempeño / Tendencia
              </span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                stats.growth > 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : stats.growth < 0
                  ? "bg-rose-500/10 text-rose-650 dark:text-rose-450"
                  : "bg-slate-500/10 text-slate-550"
              }`}>
                {stats.growth > 0 ? (
                  <FaArrowUp className="w-4 h-4" />
                ) : stats.growth < 0 ? (
                  <FaArrowDown className="w-4 h-4" />
                ) : (
                  <FaEquals className="w-4 h-4" />
                )}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {stats.growth > 0 ? "+" : ""}
                {stats.growth.toFixed(1)}%
              </p>
              <span className={`text-2xs font-extrabold px-1.5 py-0.5 rounded-md ${
                stats.growth >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-650 dark:text-rose-450"
              }`}>
                {stats.growth >= 0 ? "Alza" : "Baja"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Comparado al período anterior equivalente</p>
          </div>
        </div>

        {/* Gráfico 1: Evolución Diaria de Ventas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
              <FaChartLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Evolución de Ventas Diarias
              </h2>
              <p className="text-xs text-slate-450 dark:text-slate-400">
                Histórico temporal de ventas presenciales en Local vs Repartos a domicilio
              </p>
            </div>
          </div>

          <div className="w-full">
            {salesByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={380}>
                <AreaChart data={salesByDay} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLocal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="colorReparto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800/60" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    tickFormatter={(value) => `$${value.toLocaleString("es-AR", { notation: "compact" })}`}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle" 
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, fontWeight: 700 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="local"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#colorLocal)"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Ventas Local"
                  />
                  <Area
                    type="monotone"
                    dataKey="reparto"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#colorReparto)"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Logística/Reparto"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                <span className="text-3xl">📈</span>
                <p className="text-sm font-semibold">No se registran datos comerciales para el período seleccionado</p>
              </div>
            )}
          </div>
        </div>

        {/* Fila: Distribución (Pie) y Métodos de Pago (Bar) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Distribución de Ventas (Donut) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <FaChartPie className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Distribución por Canal
                  </h2>
                  <p className="text-xs text-slate-450 dark:text-slate-400">
                    Proporción de ingresos generados en Local físico vs red de Repartos
                  </p>
                </div>
              </div>

              <div className="relative flex items-center justify-center min-h-[300px]">
                {localVsReparto.length > 0 && localVsReparto.some((d) => d.value > 0) ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={localVsReparto}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={105}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {localVsReparto.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 dark:text-slate-500">
                        Facturado
                      </span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                        ${stats.totalSales.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                    <span className="text-3xl">📊</span>
                    <p className="text-sm font-semibold">Sin distribución de canales disponible</p>
                  </div>
                )}
              </div>
            </div>

            {/* Leyenda premium abajo */}
            {localVsReparto.length > 0 && localVsReparto.some((d) => d.value > 0) && (
              <div className="flex justify-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                {localVsReparto.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-350">
                      {item.name} ({(item.value / (stats.totalSales || 1) * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Métodos de Pago (BarChart) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <FaDollarSign className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Métodos de Pago Utilizados
                </h2>
                <p className="text-xs text-slate-450 dark:text-slate-400">
                  Volumen monetario segmentado según el tipo de cobro efectuado
                </p>
              </div>
            </div>

            {paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={paymentMethods} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800/60" vertical={false} />
                  <XAxis
                    dataKey="method"
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    tickFormatter={(value) => `$${value.toLocaleString("es-AR", { notation: "compact" })}`}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Monto Recaudado" maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                <span className="text-3xl">💰</span>
                <p className="text-sm font-semibold">No se registran transacciones en el período</p>
              </div>
            )}
          </div>
        </div>

        {/* Top 10 Productos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FaBox className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Top 10 Productos Más Vendidos
              </h2>
              <p className="text-xs text-slate-450 dark:text-slate-400">
                Detalle por unidades entregadas de los productos líderes en ventas
              </p>
            </div>
          </div>

          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={topProducts} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800/60" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: "#64748b", fontWeight: 700 }}
                  angle={-30}
                  textAnchor="end"
                  axisLine={false}
                  tickLine={false}
                  height={60}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="quantity" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Unidades Vendidas" maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
              <span className="text-3xl">📦</span>
              <p className="text-sm font-semibold">Sin registros de ventas de productos</p>
            </div>
          )}
        </div>

        {/* Tendencia Mensual (6 meses) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FaChartLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Tendencia Mensual Acumulada
              </h2>
              <p className="text-xs text-slate-450 dark:text-slate-400">
                Histórico consolidado mes a mes de los últimos 6 meses para analizar estacionalidad
              </p>
            </div>
          </div>

          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyTrend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800/60" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                  tickFormatter={(value) => `$${value.toLocaleString("es-AR", { notation: "compact" })}`}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle" 
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, fontWeight: 700 }}
                />
                <Line
                  type="monotone"
                  dataKey="local"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Ventas Local"
                  dot={{ r: 4, strokeWidth: 0, fill: "#10b981" }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="reparto"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Logística/Reparto"
                  dot={{ r: 4, strokeWidth: 0, fill: "#3b82f6" }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
              <span className="text-3xl">📈</span>
              <p className="text-sm font-semibold">Sin registros históricos de tendencia</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
