"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/numberFormat";
import {
  FaArrowLeft,
  FaDollarSign,
  FaUser,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaShoppingCart,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimes,
  FaSearch,
  FaExternalLinkAlt,
  FaFilter,
  FaLayerGroup,
  FaPlus,
} from "react-icons/fa";
import toast from "react-hot-toast";

export interface UnifiedPendingVoucher {
  id: string;
  origin: "order" | "sale";
  created_at: string;
  total_amount: number;
  amount_paid: number;
  amount_pending: number;
  payment_method: string;
  customer_id: string;
  customer_name: string;
  seller_name: string;
  status?: string; // For orders: 'pendiente', 'entregado', etc.
}

interface UnifiedPendingVouchersListProps {
  initialTab?: "all" | "orders" | "sales";
  pageTitle?: string;
  pageSubtitle?: string;
  backHref?: string;
  backLabel?: string;
}

export default function UnifiedPendingVouchersList({
  initialTab = "all",
  pageTitle,
  pageSubtitle,
  backHref = "/dashboard/pedidos",
  backLabel = "Volver",
}: UnifiedPendingVouchersListProps) {
  const [vouchers, setVouchers] = useState<UnifiedPendingVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "orders" | "sales">(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  // Modal State
  const [selectedVoucher, setSelectedVoucher] = useState<UnifiedPendingVoucher | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentComment, setPaymentComment] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchPendingVouchers();
  }, []);

  const fetchPendingVouchers = async () => {
    setLoading(true);
    try {
      // 1. Fetch pending orders
      const ordersPromise = supabase
        .from("orders")
        .select(
          `
          id,
          created_at,
          total_amount,
          amount_paid,
          amount_pending,
          payment_method,
          status,
          customer_id,
          customers ( full_name ),
          profiles ( full_name )
        `
        )
        .gt("amount_pending", 0)
        .neq("status", "cancelado")
        .order("created_at", { ascending: false });

      // 2. Fetch pending sales with safe is_cancelled check
      const salesPromise = (async () => {
        const { data: salesData, error: salesError } = await (supabase as any)
          .from("sales")
          .select(
            `
            id,
            created_at,
            total_amount,
            amount_paid,
            amount_pending,
            payment_method,
            customer_id,
            customers ( full_name ),
            profiles ( full_name ),
            is_cancelled
          `
          )
          .gt("amount_pending", 0)
          .order("created_at", { ascending: false });

        if (!salesError && salesData) {
          return (salesData as any[]).filter((s) => !s.is_cancelled);
        }

        // Fallback without is_cancelled column if schema doesn't have it
        const { data: fallbackData } = await (supabase as any)
          .from("sales")
          .select(
            `
            id,
            created_at,
            total_amount,
            amount_paid,
            amount_pending,
            payment_method,
            customer_id,
            customers ( full_name ),
            profiles ( full_name )
          `
          )
          .gt("amount_pending", 0)
          .order("created_at", { ascending: false });

        return (fallbackData || []) as any[];
      })();

      const [{ data: ordersData, error: ordersError }, salesRows] = await Promise.all([
        ordersPromise,
        salesPromise,
      ]);

      if (ordersError) {
        console.error("Error loading pending orders:", ordersError);
      }

      const formattedOrders: UnifiedPendingVoucher[] = (ordersData || []).map((o: any) => ({
        id: o.id,
        origin: "order",
        created_at: o.created_at,
        total_amount: Number(o.total_amount || 0),
        amount_paid: Number(o.amount_paid || 0),
        amount_pending: Number(o.amount_pending || 0),
        payment_method: o.payment_method || "fiado",
        customer_id: o.customer_id,
        customer_name: o.customers?.full_name || "Cliente sin nombre",
        seller_name: o.profiles?.full_name || "Desconocido",
        status: o.status,
      }));

      const formattedSales: UnifiedPendingVoucher[] = (salesRows || []).map((s: any) => ({
        id: s.id,
        origin: "sale",
        created_at: s.created_at,
        total_amount: Number(s.total_amount || 0),
        amount_paid: Number(s.amount_paid || 0),
        amount_pending: Number(s.amount_pending || 0),
        payment_method: s.payment_method || "cuenta_corriente",
        customer_id: s.customer_id,
        customer_name: s.customers?.full_name || "Cliente sin nombre",
        seller_name: s.profiles?.full_name || "Desconocido",
      }));

      const combined = [...formattedOrders, ...formattedSales].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setVouchers(combined);
    } catch (error: any) {
      console.error("Error fetching pending vouchers:", error);
      toast.error("Error al cargar los comprobantes pendientes.");
    } finally {
      setLoading(false);
    }
  };

  // Stats calculation
  const totalOrders = useMemo(() => vouchers.filter((v) => v.origin === "order"), [vouchers]);
  const totalSales = useMemo(() => vouchers.filter((v) => v.origin === "sale"), [vouchers]);

  const totalPendingAll = useMemo(
    () => vouchers.reduce((sum, v) => sum + v.amount_pending, 0),
    [vouchers]
  );
  const totalPendingOrders = useMemo(
    () => totalOrders.reduce((sum, v) => sum + v.amount_pending, 0),
    [totalOrders]
  );
  const totalPendingSales = useMemo(
    () => totalSales.reduce((sum, v) => sum + v.amount_pending, 0),
    [totalSales]
  );

  const uniqueDebtorsCount = useMemo(() => {
    const ids = new Set(vouchers.map((v) => v.customer_id).filter(Boolean));
    return ids.size;
  }, [vouchers]);

  // Filtering & Sorting
  const filteredVouchers = useMemo(() => {
    return vouchers
      .filter((v) => {
        if (activeTab === "orders" && v.origin !== "order") return false;
        if (activeTab === "sales" && v.origin !== "sale") return false;

        if (searchTerm.trim() !== "") {
          const q = searchTerm.toLowerCase();
          const matchCustomer = v.customer_name.toLowerCase().includes(q);
          const matchId = v.id.toLowerCase().includes(q);
          const matchSeller = v.seller_name.toLowerCase().includes(q);
          return matchCustomer || matchId || matchSeller;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === "date_asc") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === "amount_desc") {
          return b.amount_pending - a.amount_pending;
        }
        if (sortBy === "amount_asc") {
          return a.amount_pending - b.amount_pending;
        }
        return 0;
      });
  }, [vouchers, activeTab, searchTerm, sortBy]);

  // Payment Handlers
  const handleOpenPayment = (voucher: UnifiedPendingVoucher) => {
    setSelectedVoucher(voucher);
    setShowPaymentModal(true);
    setPaymentAmount(voucher.amount_pending.toString());
    setPaymentComment("");
  };

  const handleClosePayment = () => {
    setShowPaymentModal(false);
    setSelectedVoucher(null);
    setPaymentAmount("");
    setPaymentComment("");
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVoucher) return;

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Ingresa un monto válido.");
      return;
    }

    if (amount > selectedVoucher.amount_pending + 0.01) {
      toast.error(
        `El monto no puede exceder el saldo pendiente (${formatCurrency(selectedVoucher.amount_pending)})`
      );
      return;
    }

    setProcessingPayment(true);
    const loadToast = toast.loading("Registrando pago...");

    try {
      const now = new Date();
      const argentinaTime = new Date(
        now.toLocaleString("en-US", {
          timeZone: "America/Argentina/Buenos_Aires",
        })
      );

      const newAmountPaid = selectedVoucher.amount_paid + amount;
      const newAmountPending = Math.max(0, selectedVoucher.amount_pending - amount);

      if (selectedVoucher.origin === "order") {
        // Update Order
        const { error: orderErr } = await supabase
          .from("orders")
          .update({
            amount_paid: newAmountPaid,
            amount_pending: newAmountPending,
          })
          .eq("id", selectedVoucher.id);

        if (orderErr) throw orderErr;

        // Insert into payments
        const { error: payErr } = await supabase.from("payments").insert({
          customer_id: selectedVoucher.customer_id,
          order_id: selectedVoucher.id,
          type: "pago",
          amount: amount,
          comment:
            paymentComment ||
            `Pago a Pedido #${selectedVoucher.id.slice(0, 8)} (Cta. Cte.)`,
          created_at: argentinaTime.toISOString(),
        });

        if (payErr) throw payErr;
      } else {
        // Update Sale
        const { error: saleErr } = await supabase
          .from("sales")
          .update({
            amount_paid: newAmountPaid,
            amount_pending: newAmountPending,
          })
          .eq("id", selectedVoucher.id);

        if (saleErr) throw saleErr;

        // Insert into payments
        const { error: payErr } = await supabase.from("payments").insert({
          customer_id: selectedVoucher.customer_id,
          type: "pago",
          amount: amount,
          comment:
            paymentComment ||
            `Pago de Venta Mostrador #${selectedVoucher.id.slice(0, 8)} (Cta. Cte.)`,
          created_at: argentinaTime.toISOString(),
        });

        if (payErr) throw payErr;
      }

      toast.success("¡Pago registrado exitosamente!", { id: loadToast });
      handleClosePayment();
      fetchPendingVouchers();
    } catch (error: any) {
      console.error("Error al registrar pago:", error);
      toast.error(`Error al registrar el pago: ${error.message || "Error desconocido"}`, {
        id: loadToast,
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-500">
            Cargando comprobantes pendientes unificados...
          </span>
        </div>
      </div>
    );
  }

  const defaultTitle =
    activeTab === "orders"
      ? "Pedidos con Saldo en Cta. Cte."
      : activeTab === "sales"
      ? "Ventas Mostrador con Saldo en Cta. Cte."
      : "Hub Unificado de Comprobantes con Saldo (Fiados / Cta. Cte.)";

  const defaultSubtitle =
    "Gestión centralizada de todos los fiados y cuentas corrientes de pedidos de reparto y ventas de mostrador.";

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 mb-2 transition-colors"
          >
            <FaArrowLeft /> {backLabel}
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
            <FaExclamationTriangle className="text-amber-500 text-xl flex-shrink-0" />
            <span>{pageTitle || defaultTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {pageSubtitle || defaultSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl px-5 py-3 flex flex-col justify-center min-w-[200px]">
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
              Total Deuda Unificada
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {formatCurrency(totalPendingAll)}
            </span>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-500/80 mt-0.5">
              {vouchers.length} comprobantes en {uniqueDebtorsCount} clientes
            </span>
          </div>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab("all")}
          className={`cursor-pointer bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all shadow-sm ${
            activeTab === "all"
              ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-indigo-100 dark:shadow-none"
              : "border-slate-200/70 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 block">
                Total Cartera Fiada
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-50 mt-1 block">
                {formatCurrency(totalPendingAll)}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 block">
                {vouchers.length} comprobantes totales
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg">
              <FaLayerGroup />
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("orders")}
          className={`cursor-pointer bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all shadow-sm ${
            activeTab === "orders"
              ? "border-amber-500 ring-2 ring-amber-500/20 shadow-amber-100 dark:shadow-none"
              : "border-slate-200/70 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                📦 Pedidos de Reparto
              </span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                {formatCurrency(totalPendingOrders)}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 block">
                {totalOrders.length} pedidos fiados
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
              <FaShoppingCart />
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("sales")}
          className={`cursor-pointer bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all shadow-sm ${
            activeTab === "sales"
              ? "border-purple-500 ring-2 ring-purple-500/20 shadow-purple-100 dark:shadow-none"
              : "border-slate-200/70 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400 block">
                🏪 Ventas Mostrador
              </span>
              <span className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 block">
                {formatCurrency(totalPendingSales)}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 block">
                {totalSales.length} ventas en cta. cte.
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg">
              <FaFileInvoiceDollar />
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/clientes/deudores"
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 block">
                Clientes Deudores
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-50 mt-1 block">
                {uniqueDebtorsCount} Clientes
              </span>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 inline-flex items-center gap-1 group-hover:underline">
                Ver Cartera Completa <FaExternalLinkAlt className="text-[9px]" />
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
              <FaUser />
            </div>
          </div>
        </Link>
      </div>

      {/* CONTROLES, PESTAÑAS Y BÚSQUEDA */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Pestañas de Filtro */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <FaLayerGroup /> Todos ({vouchers.length})
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "orders"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/60"
              }`}
            >
              <FaShoppingCart /> Pedidos ({totalOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("sales")}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "sales"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/60"
              }`}
            >
              <FaFileInvoiceDollar /> Mostrador ({totalSales.length})
            </button>
          </div>

          {/* Accesos rápidos a crear venta/pedido */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/ventas/nueva"
              className="flex-1 sm:flex-initial justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
            >
              <FaPlus className="text-[10px]" /> Nueva Venta
            </Link>
            <Link
              href="/dashboard/pedidos/nuevo"
              className="flex-1 sm:flex-initial justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
            >
              <FaPlus className="text-[10px]" /> Nuevo Pedido
            </Link>
          </div>
        </div>

        {/* Barra de búsqueda y ordenamiento */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 w-full">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, ID de comprobante o vendedor..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <FaFilter className="text-[10px]" /> Orden:
            </span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="date_desc">Más recientes primero</option>
              <option value="date_asc">Más antiguos primero</option>
              <option value="amount_desc">Mayor saldo adeudado</option>
              <option value="amount_asc">Menor saldo adeudado</option>
            </select>
          </div>
        </div>
      </div>

      {/* LISTA O TABLA DE COMPROBANTES */}
      {filteredVouchers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 py-16 text-center">
          <FaCheckCircle className="text-5xl text-emerald-500 mx-auto mb-4 opacity-80" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {searchTerm ? "No hay resultados para tu búsqueda" : "¡Sin deudas pendientes!"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {searchTerm
              ? `No encontramos ningún comprobante que coincida con "${searchTerm}".`
              : "Excelente. No hay comprobantes con saldo pendiente en esta sección."}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <>
          {/* VISTA MÓVIL (TARJETAS) */}
          <div className="lg:hidden space-y-3.5">
            {filteredVouchers.map((v) => {
              const isOrder = v.origin === "order";
              const detailHref = isOrder
                ? `/dashboard/pedidos/${v.id}`
                : `/dashboard/ventas/${v.id}`;

              return (
                <div
                  key={`${v.origin}-${v.id}`}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden"
                >
                  <div className="p-4 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-150 dark:border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                            isOrder
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60"
                              : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60"
                          }`}
                        >
                          {isOrder ? <FaShoppingCart className="text-[9px]" /> : <FaFileInvoiceDollar className="text-[9px]" />}
                          {isOrder ? "📦 Pedido" : "🏪 Venta Mostrador"}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          #{v.id.slice(0, 8)}
                        </span>
                      </div>
                      <Link
                        href={`/dashboard/clientes/${v.customer_id}`}
                        className="text-sm font-black text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                      >
                        <FaUser className="text-[11px] text-slate-400" />
                        {v.customer_name}
                      </Link>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">
                        Vendedor: {v.seller_name}
                      </p>
                    </div>

                    <div className="text-right text-[10px] text-slate-450 dark:text-slate-500">
                      <div className="flex items-center justify-end gap-1">
                        <FaCalendarAlt />
                        <span>{new Date(v.created_at).toLocaleDateString("es-AR")}</span>
                      </div>
                      <span className="font-mono">
                        {new Date(v.created_at).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block">
                          Total Facturado
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(v.total_amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block">
                          Pagado
                        </span>
                        <span className="text-sm font-bold text-emerald-600">
                          {formatCurrency(v.amount_paid)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                          Saldo Pendiente
                        </span>
                        <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                          {formatCurrency(v.amount_pending)}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700/80 dark:text-amber-400/80 bg-amber-100/60 dark:bg-amber-900/40 px-2 py-0.5 rounded-lg">
                        {((v.amount_pending / v.total_amount) * 100).toFixed(0)}% adeudado
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleOpenPayment(v)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-center text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <FaDollarSign /> Liquidar
                      </button>
                      <Link
                        href={detailHref}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-center text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                      >
                        {isOrder ? <FaShoppingCart /> : <FaFileInvoiceDollar />} Ver Detalle
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* VISTA ESCRITORIO (TABLA) */}
          <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tipo / ID
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <FaCalendarAlt /> Fecha
                      </span>
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <FaUser /> Cliente
                      </span>
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Vendedor
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Total Comprobante
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Pagado
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center justify-end gap-1.5">
                        <FaDollarSign /> Saldo Pendiente
                      </span>
                    </th>
                    <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-44">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredVouchers.map((v) => {
                    const isOrder = v.origin === "order";
                    const detailHref = isOrder
                      ? `/dashboard/pedidos/${v.id}`
                      : `/dashboard/ventas/${v.id}`;

                    return (
                      <tr
                        key={`${v.origin}-${v.id}`}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                isOrder
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60"
                                  : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60"
                              }`}
                            >
                              {isOrder ? (
                                <FaShoppingCart className="text-[9px]" />
                              ) : (
                                <FaFileInvoiceDollar className="text-[9px]" />
                              )}
                              {isOrder ? "Pedido" : "Mostrador"}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              #{v.id.slice(0, 8)}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {new Date(v.created_at).toLocaleDateString("es-AR")}
                          </div>
                          <div className="text-[10px] text-slate-450 dark:text-slate-500 font-mono">
                            {new Date(v.created_at).toLocaleTimeString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <Link
                            href={`/dashboard/clientes/${v.customer_id}`}
                            className="font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline"
                          >
                            {v.customer_name}
                          </Link>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                          {v.seller_name}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-right font-bold text-slate-700 dark:text-slate-300">
                          {formatCurrency(v.total_amount)}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-right font-bold text-emerald-600">
                          {formatCurrency(v.amount_paid)}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="font-black text-amber-600 dark:text-amber-400 text-sm">
                            {formatCurrency(v.amount_pending)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {((v.amount_pending / v.total_amount) * 100).toFixed(0)}% adeudado
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenPayment(v)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm"
                            >
                              <FaDollarSign /> Cobrar
                            </button>
                            <Link
                              href={detailHref}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                              title="Ver detalle del comprobante"
                            >
                              Detalle
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50/70 dark:bg-slate-950/40 text-xs">
                  <tr className="border-t border-slate-200 dark:border-slate-800">
                    <td
                      colSpan={6}
                      className="px-5 py-4 text-right font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                    >
                      Total Pendiente ({filteredVouchers.length} comprobantes):
                    </td>
                    <td className="px-5 py-4 text-right font-black text-amber-600 dark:text-amber-400 text-base">
                      {formatCurrency(
                        filteredVouchers.reduce((sum, v) => sum + v.amount_pending, 0)
                      )}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL DE PAGO UNIFICADO */}
      {showPaymentModal && selectedVoucher && (
        <div className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/60">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      selectedVoucher.origin === "order"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                    }`}
                  >
                    {selectedVoucher.origin === "order" ? "📦 Pedido" : "🏪 Venta Mostrador"}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    #{selectedVoucher.id.slice(0, 8)}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Registrar Cobro de Saldo
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Cliente: <strong className="text-indigo-600 dark:text-indigo-400">{selectedVoucher.customer_name}</strong>
                </p>
              </div>
              <button
                onClick={handleClosePayment}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-xl p-4 border border-amber-200/80 dark:border-amber-900/40 flex justify-between items-center text-xs">
                <div>
                  <span className="font-extrabold text-amber-800 dark:text-amber-400 block uppercase tracking-wider text-[9px]">
                    Saldo Adeudado
                  </span>
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
                    {formatCurrency(selectedVoucher.amount_pending)}
                  </span>
                </div>
                <div className="text-right space-y-0.5 text-slate-500 dark:text-slate-400 text-[10px]">
                  <div>Total: {formatCurrency(selectedVoucher.total_amount)}</div>
                  <div>Pagado: {formatCurrency(selectedVoucher.amount_paid)}</div>
                </div>
              </div>

              <form onSubmit={handleRegisterPayment} className="space-y-4">
                <div className="space-y-1">
                  <label
                    htmlFor="payment-amount"
                    className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Monto Recibido ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      id="payment-amount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="block w-full pl-7 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 text-sm font-bold focus:outline-none transition-all"
                      placeholder="0.00"
                      required
                      max={selectedVoucher.amount_pending}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="payment-comment"
                    className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Observación / Concepto
                  </label>
                  <input
                    type="text"
                    id="payment-comment"
                    value={paymentComment}
                    onChange={(e) => setPaymentComment(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 text-xs focus:outline-none transition-all"
                    placeholder={`Ej. Pago ${
                      selectedVoucher.origin === "order" ? "del reparto" : "en mostrador"
                    } en efectivo`}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClosePayment}
                    disabled={processingPayment}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={processingPayment}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    {processingPayment ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <FaCheckCircle />
                        Confirmar Pago
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
