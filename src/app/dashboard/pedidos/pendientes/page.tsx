"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  FaArrowLeft,
  FaDollarSign,
  FaUser,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaShoppingCart,
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimes,
  FaCreditCard,
  FaClipboardList,
} from "react-icons/fa";
import toast from "react-hot-toast";

type PedidoPendiente = {
  id: string;
  created_at: string;
  total_amount: number;
  amount_paid: number;
  amount_pending: number;
  payment_method: string;
  status: string;
  customer_name: string;
  customer_id: string;
  profile_name: string;
};

export default function PedidosPendientesPage() {
  const [pedidos, setPedidos] = useState<PedidoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPedido, setSelectedPedido] = useState<PedidoPendiente | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentComment, setPaymentComment] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchPedidosPendientes();
  }, []);

  const fetchPedidosPendientes = async () => {
    setLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
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

      if (ordersError) throw ordersError;

      const pedidosFormateados = (ordersData || []).map((order: any) => ({
        id: order.id,
        created_at: order.created_at,
        total_amount: order.total_amount,
        amount_paid: order.amount_paid || 0,
        amount_pending: order.amount_pending || 0,
        payment_method: order.payment_method,
        status: order.status,
        customer_name: order.customers?.full_name || "Sin cliente",
        customer_id: order.customer_id,
        profile_name: order.profiles?.full_name || "Desconocido",
      }));

      setPedidos(pedidosFormateados);
    } catch (error: any) {
      console.error("Error fetching pending orders:", error);
      toast.error("Error al cargar los pedidos con saldo.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendiente":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900/50";
      case "entregado":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/50";
      case "cancelado":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/10 dark:text-rose-400 dark:border-rose-900/50";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pendiente":
        return "Pendiente";
      case "entregado":
        return "Entregado";
      case "cancelado":
        return "Cancelado";
      default:
        return status;
    }
  };

  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleOpenPayment = (pedido: PedidoPendiente) => {
    setSelectedPedido(pedido);
    setShowPaymentModal(true);
    setPaymentAmount(pedido.amount_pending.toString()); // Pre-fill with the full pending balance
    setPaymentComment("");
  };

  const handleClosePayment = () => {
    setShowPaymentModal(false);
    setSelectedPedido(null);
    setPaymentAmount("");
    setPaymentComment("");
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPedido) return;

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Ingresa un monto válido.");
      return;
    }

    if (amount > selectedPedido.amount_pending) {
      toast.error(`El monto no puede exceder el saldo de ${formatCurrency(selectedPedido.amount_pending)}`);
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

      const newAmountPaid = selectedPedido.amount_paid + amount;
      const newAmountPending = selectedPedido.amount_pending - amount;

      // Actualizar el pedido en la base de datos
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          amount_paid: newAmountPaid,
          amount_pending: newAmountPending,
        })
        .eq("id", selectedPedido.id);

      if (updateError) throw updateError;

      // Registrar el pago en la tabla de pagos
      const { error: paymentError } = await supabase.from("payments").insert({
        customer_id: selectedPedido.customer_id,
        type: "pago",
        amount: amount,
        comment: paymentComment || `Pago parcial para Pedido #${selectedPedido.id.slice(0, 8)}`,
        created_at: argentinaTime.toISOString(),
      });

      if (paymentError) throw paymentError;

      toast.success("¡Pago registrado exitosamente!", { id: loadToast });
      handleClosePayment();
      fetchPedidosPendientes(); // Recargar la lista
    } catch (error: any) {
      console.error("Error al registrar pago:", error);
      toast.error(`Error al registrar el pago: ${error.message || "Error desconocido"}`, { id: loadToast });
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-500">Cargando saldos pendientes...</span>
        </div>
      </div>
    );
  }

  const totalPendiente = pedidos.reduce((sum, p) => sum + p.amount_pending, 0);

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-full text-slate-800 dark:text-slate-100">
      <div className="max-w-[1550px] mx-auto space-y-6">
        
        {/* HEADER DE LA SECCIÓN */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Link
              href="/dashboard/pedidos"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 mb-2 transition-colors"
            >
              <FaArrowLeft /> Volver a Pedidos
            </Link>
            <h1 className="text-xl font-black text-gray-900 dark:text-slate-50 flex items-center gap-2">
              <FaExclamationTriangle className="text-amber-550 text-lg" /> Pedidos con Saldo Pendiente
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Listado consolidado de cuentas corrientes pendientes de cobro ({pedidos.length} pedidos detectados).
            </p>
          </div>
          
          <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/40 rounded-xl px-5 py-3.5 flex flex-col justify-center min-w-[200px]">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Total Deuda Acumulada</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-450 mt-0.5">
              {formatCurrency(totalPendiente)}
            </span>
          </div>
        </div>

        {/* LISTA DE PEDIDOS PENDIENTES */}
        {pedidos.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 py-16 text-center">
            <FaCheckCircle className="text-5xl text-emerald-500 mx-auto mb-4 opacity-80" />
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
              ¡Sin deudas pendientes!
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Excelente. Todos los pedidos registrados han sido pagados en su totalidad.
            </p>
          </div>
        ) : (
          <>
            {/* VISTA DE TARJETAS MÓVILES */}
            <div className="lg:hidden space-y-4">
              {pedidos.map((pedido) => (
                <div
                  key={pedido.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-150 dark:border-slate-800 overflow-hidden"
                >
                  <div className="bg-slate-50/60 dark:bg-slate-900/50 p-4 border-b border-slate-150 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <Link
                          href={`/dashboard/clientes/${pedido.customer_id}`}
                          className="text-sm font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                        >
                          <FaUser className="text-slate-450" />
                          {pedido.customer_name}
                        </Link>
                        <p className="text-[10px] text-slate-500 dark:text-slate-455 mt-0.5">
                          Vendedor: {pedido.profile_name}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-3xs font-extrabold border ${getStatusBadge(
                          pedido.status
                        )}`}
                      >
                        {getStatusLabel(pedido.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-3xs text-slate-450 dark:text-slate-500 mt-1.5">
                      <FaCalendarAlt />
                      <span>
                        {new Date(pedido.created_at).toLocaleDateString("es-AR")} a las{" "}
                        {new Date(pedido.created_at).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3.5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block">Total Original</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-205">
                          {formatCurrency(pedido.total_amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block">Total Pagado</span>
                        <span className="text-sm font-bold text-emerald-600">
                          {formatCurrency(pedido.amount_paid)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 dark:bg-amber-950/10 rounded-xl p-3 border border-amber-100/50 dark:border-amber-900/30">
                      <span className="text-[9px] font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">Saldo Pendiente</span>
                      <span className="text-xl font-black text-amber-600 dark:text-amber-450 mt-0.5 block">
                        {formatCurrency(pedido.amount_pending)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1.5">
                      <button
                        onClick={() => handleOpenPayment(pedido)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-center text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <FaDollarSign /> Liquidar
                      </button>
                      <Link
                        href={`/dashboard/pedidos/${pedido.id}`}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-center text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <FaShoppingCart /> Ver Detalle
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* VISTA DE TABLA DESKTOP */}
            <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-850">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-4.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><FaCalendarAlt /> Fecha</span>
                      </th>
                      <th className="px-6 py-4.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><FaUser /> Cliente</span>
                      </th>
                      <th className="px-6 py-4.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><FaClipboardList /> Vendedor</span>
                      </th>
                      <th className="px-6 py-4.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">
                        Estado
                      </th>
                      <th className="px-6 py-4.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">
                        Total Pedido
                      </th>
                      <th className="px-6 py-4.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">
                        Pagado
                      </th>
                      <th className="px-6 py-4.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">
                        <span className="flex items-center justify-end gap-1.5"><FaDollarSign /> Pendiente</span>
                      </th>
                      <th className="px-6 py-4.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-48">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {pedidos.map((pedido) => (
                      <tr
                        key={pedido.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors"
                      >
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {new Date(pedido.created_at).toLocaleDateString("es-AR")}
                          </div>
                          <div className="text-[10px] text-slate-450 dark:text-slate-500 font-mono mt-0.5">
                            {new Date(pedido.created_at).toLocaleTimeString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <Link
                            href={`/dashboard/clientes/${pedido.customer_id}`}
                            className="font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline"
                          >
                            {pedido.customer_name}
                          </Link>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-slate-650 dark:text-slate-350">
                          {pedido.profile_name}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-lg text-3xs font-extrabold border ${getStatusBadge(
                              pedido.status
                            )}`}
                          >
                            {getStatusLabel(pedido.status)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right font-bold text-slate-700 dark:text-slate-300">
                          {formatCurrency(pedido.total_amount)}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right font-bold text-emerald-600">
                          {formatCurrency(pedido.amount_paid)}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right">
                          <div className="font-extrabold text-amber-600 dark:text-amber-500">
                            {formatCurrency(pedido.amount_pending)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {((pedido.amount_pending / pedido.total_amount) * 100).toFixed(0)}% pendiente
                          </div>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenPayment(pedido)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors shadow-sm"
                            >
                              <FaDollarSign /> Liquidar
                            </button>
                            <Link
                              href={`/dashboard/pedidos/${pedido.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-lg transition-colors border"
                            >
                              <FaShoppingCart /> Detalle
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/50 dark:bg-slate-950/30 text-xs">
                    <tr className="border-t border-slate-200 dark:border-slate-800">
                      <td
                        colSpan={6}
                        className="px-6 py-4.5 text-right font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                      >
                        Total Deuda Pendiente:
                      </td>
                      <td className="px-6 py-4.5 text-right font-black text-amber-600 dark:text-amber-450">
                        {formatCurrency(totalPendiente)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TARJETAS DE ESTADÍSTICAS DEL PIE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Pedidos con Deuda",
              value: pedidos.length,
              icon: <FaShoppingCart className="text-indigo-500" />,
              accent: "border-l-2 border-indigo-500",
            },
            {
              title: "Total Facturado en Deuda",
              value: formatCurrency(pedidos.reduce((sum, p) => sum + p.total_amount, 0)),
              icon: <FaMoneyBillWave className="text-slate-550" />,
              accent: "border-l-2 border-slate-500",
            },
            {
              title: "Total Cobrado Parcial",
              value: formatCurrency(pedidos.reduce((sum, p) => sum + p.amount_paid, 0)),
              icon: <FaDollarSign className="text-emerald-500" />,
              accent: "border-l-2 border-emerald-500",
            },
            {
              title: "Pedidos Aún Pendientes",
              value: pedidos.filter((p) => p.status === "pendiente").length,
              icon: <FaCalendarAlt className="text-amber-500" />,
              accent: "border-l-2 border-amber-500",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 border border-slate-100 dark:border-slate-800 ${stat.accent} flex items-center justify-between`}
            >
              <div>
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">{stat.title}</span>
                <span className="text-lg font-extrabold text-slate-800 dark:text-slate-50 mt-1 block">
                  {stat.value}
                </span>
              </div>
              <div className="text-2xl p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100/50 dark:border-slate-850">
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* MODAL DE PAGO (LIQUIDACIÓN RÁPIDA) */}
      {showPaymentModal && selectedPedido && (
        <div className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-md w-full overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/60 dark:bg-slate-900/40">
              <div>
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
                  Registrar Pago de Pedido
                </h3>
                <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5">
                  Pedido #{selectedPedido.id.slice(0, 8)} · Cliente: {selectedPedido.customer_name}
                </p>
              </div>
              <button
                onClick={handleClosePayment}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-450 hover:text-slate-750 dark:hover:text-white rounded-lg transition-colors"
                title="Cerrar modal"
              >
                <FaTimes className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50/50 dark:bg-amber-950/15 rounded-xl p-4 border border-amber-100 dark:border-amber-900/30 flex justify-between items-center text-xs">
                <div>
                  <span className="font-extrabold text-amber-800 dark:text-amber-400 block uppercase tracking-wider text-[9px]">Saldo Pendiente</span>
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-450 mt-1 block">
                    {formatCurrency(selectedPedido.amount_pending)}
                  </span>
                </div>
                <div className="text-right space-y-0.5 text-slate-450 dark:text-slate-400 text-[10px]">
                  <div>Total: {formatCurrency(selectedPedido.total_amount)}</div>
                  <div>Pagado: {formatCurrency(selectedPedido.amount_paid)}</div>
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      id="payment-amount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="block w-full pl-7 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 text-sm font-bold focus:outline-none transition-all"
                      placeholder="0.00"
                      required
                      max={selectedPedido.amount_pending}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="payment-comment"
                    className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Comentario u Observaciones
                  </label>
                  <input
                    type="text"
                    id="payment-comment"
                    value={paymentComment}
                    onChange={(e) => setPaymentComment(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 text-xs focus:outline-none transition-all"
                    placeholder="Ej. Pago parcial en transferencia"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleClosePayment}
                    disabled={processingPayment}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
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
