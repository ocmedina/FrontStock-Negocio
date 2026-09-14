"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/numberFormat";
import {
  FaReceipt,
  FaMoneyBillWave,
  FaTrash,
  FaEdit,
  FaTable,
  FaThList,
  FaCalendarAlt,
  FaShoppingCart,
  FaFileInvoiceDollar,
  FaArrowUp,
  FaArrowDown,
  FaInfoCircle,
} from "react-icons/fa";
import { useRouter } from "next/navigation";

interface Payment {
  id: number | string;
  amount: number;
  created_at: string;
  type: string;
  customer_id: string;
  payment_method: string | null;
  comment: string | null;
}

interface PaymentHistoryListProps {
  initialPayments: Payment[];
}

export default function PaymentHistoryList({ initialPayments }: PaymentHistoryListProps) {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [cancellingPaymentId, setCancellingPaymentId] = useState<number | string | null>(null);
  const [viewMode, setViewMode] = useState<"ledger" | "cards">("ledger");

  // Edit Modal State
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMethod, setEditMethod] = useState("");
  const [editComment, setEditComment] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Keep local state aligned when parent server data refreshes.
  useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);

  const handleCancelPayment = async (payment: Payment) => {
    if (payment.payment_method === "anulado") return;

    if (!payment || !payment.id) {
      alert("Error: El id del pago no está disponible.");
      return;
    }

    if (
      !window.confirm(
        `¿Está seguro de anular este pago de ${formatCurrency(
          payment.amount
        )}? Esta acción restaurará la deuda al cliente.`
      )
    ) {
      return;
    }

    setCancellingPaymentId(payment.id);

    try {
      const { data: txData, error: txError } = await supabase.rpc(
        "cancel_customer_payment_transaction",
        { p_payment_id: payment.id }
      );

      if (txError) throw txError;

      const result = (txData || {}) as { remaining_unrestored?: number | null };
      const remainingUnrestored = Number(result.remaining_unrestored || 0);

      if (remainingUnrestored > 0.01) {
        alert(
          `Pago anulado exitosamente.\nParte del monto no pudo restaurarse: ${formatCurrency(
            remainingUnrestored
          )}`
        );
      } else {
        alert("Pago anulado exitosamente. La deuda ha sido restaurada.");
      }

      // Update local state to reflect change immediately
      setPayments((prev) =>
        prev.map((p) => (p.id === payment.id ? { ...p, payment_method: "anulado" } : p))
      );

      router.refresh();
    } catch (error: any) {
      console.error("Error cancelling payment details:", error);
      const errorMessage =
        error?.message || (typeof error === "string" ? error : "Error desconocido");
      alert("Error al anular el pago: " + errorMessage);
    } finally {
      setCancellingPaymentId(null);
    }
  };

  const handleOpenEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setEditAmount(Math.abs(payment.amount).toString());
    setEditMethod(payment.payment_method || "efectivo");
    setEditComment(payment.comment || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || !editingPayment.id) return;

    const newAmt = parseFloat(editAmount);
    if (isNaN(newAmt) || newAmt <= 0) {
      alert("El monto debe ser un número válido mayor a 0.");
      return;
    }

    setSavingEdit(true);

    try {
      const { data: txData, error: txError } = await supabase.rpc(
        "edit_customer_payment_transaction",
        {
          p_payment_id: editingPayment.id,
          p_new_amount: newAmt,
          p_new_payment_method: editMethod,
          p_new_comment: editComment,
        }
      );

      if (txError) throw txError;

      alert("Pago editado correctamente.");

      // Update local state
      setPayments((prev) =>
        prev.map((p) =>
          p.id === editingPayment.id
            ? {
                ...p,
                amount: newAmt,
                payment_method: editMethod,
                comment: editComment,
              }
            : p
        )
      );

      setEditingPayment(null);
      router.refresh();
    } catch (error: any) {
      console.error("Error editing payment details:", error);
      const errorMessage =
        error?.message || (typeof error === "string" ? error : "Error desconocido");
      alert("Error al editar el pago: " + errorMessage);
    } finally {
      setSavingEdit(false);
    }
  };

  // Compute accounting ledger: Debe, Haber and cumulative running balance
  const ledgerData = useMemo(() => {
    if (!payments || payments.length === 0) return [];

    // Chronological order (oldest first) to compute running balance
    const chronological = [...payments].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let runningBalance = 0;
    const computed = chronological.map((p) => {
      const isCancelled = p.payment_method === "anulado";
      const isCompra = p.type === "compra";
      const debe = !isCancelled && isCompra ? Math.abs(p.amount) : 0;
      const haber = !isCancelled && !isCompra ? Math.abs(p.amount) : 0;

      if (!isCancelled) {
        runningBalance += debe - haber;
      }

      // Check origin from comment or id
      const commentLower = (p.comment || "").toLowerCase();
      const idStr = String(p.id).toLowerCase();
      const isOrder = idStr.startsWith("order-") || commentLower.includes("pedido");
      const isSale = idStr.startsWith("sale-") || commentLower.includes("venta");

      return {
        ...p,
        isCancelled,
        isCompra,
        isOrder,
        isSale,
        debe,
        haber,
        runningBalance,
      };
    });

    // Return newest first for display, each retaining its historically computed running balance
    return computed.reverse();
  }, [payments]);

  // Totals
  const totalDebe = useMemo(() => {
    return ledgerData.reduce((sum, item) => sum + item.debe, 0);
  }, [ledgerData]);

  const totalHaber = useMemo(() => {
    return ledgerData.reduce((sum, item) => sum + item.haber, 0);
  }, [ledgerData]);

  const currentFinalBalance = totalDebe - totalHaber;

  if (!payments || payments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">No hay movimientos registrados</p>
        <p className="text-gray-300 dark:text-slate-500 text-sm mt-2">
          Los pagos y compras en cuenta corriente aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* HEADER CONMUTADOR DE VISTAS Y TOTALES RESUMIDOS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-full sm:w-auto">
          <button
            onClick={() => setViewMode("ledger")}
            className={`flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === "ledger"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <FaTable className="text-[11px]" />
            Extracto Contable
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === "cards"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <FaThList className="text-[11px]" />
            Vista Tarjetas
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs px-1">
          <span className="text-slate-400 font-medium">Movimientos:</span>
          <span className="font-extrabold text-slate-700 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg">
            {payments.length}
          </span>
        </div>
      </div>

      {/* EXTRACTO CONTABLE (DEBE / HABER / SALDO) */}
      {viewMode === "ledger" ? (
        <div className="space-y-3">
          {/* Tarjetas resumen del extracto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                  Total Compras (Debe +)
                </span>
                <span className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
                  {formatCurrency(totalDebe)}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm shrink-0">
                <FaArrowUp />
              </div>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                  Total Pagos (Haber -)
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {formatCurrency(totalHaber)}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm shrink-0">
                <FaArrowDown />
              </div>
            </div>

            <div
              className={`rounded-xl p-3.5 border flex items-center justify-between ${
                currentFinalBalance > 0.01
                  ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 text-amber-700 dark:text-amber-400"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-80">
                  Saldo de Cta. Cte.
                </span>
                <span className="text-lg font-black mt-0.5 block">
                  {formatCurrency(currentFinalBalance)}
                </span>
              </div>
              <div className="text-[10px] font-bold px-2 py-1 rounded-md bg-white/70 dark:bg-slate-800/80 shadow-xs shrink-0">
                {currentFinalBalance > 0.01 ? "Deuda Activa" : "Al Día"}
              </div>
            </div>
          </div>

          {/* VISTA MÓVIL DEL EXTRACTO CONTABLE (Cards diseñadas para teléfonos) */}
          <div className="block lg:hidden space-y-3">
            {ledgerData.map((item) => (
              <div
                key={`mobile-ledger-${item.id}`}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 ${
                  item.isCancelled ? "opacity-60 bg-slate-50/50 dark:bg-slate-950/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.isCancelled ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          ANULADO
                        </span>
                      ) : item.isCompra ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            item.isOrder
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                          }`}
                        >
                          {item.isOrder ? <FaShoppingCart className="text-[9px]" /> : <FaFileInvoiceDollar className="text-[9px]" />}
                          {item.isOrder ? "📦 Pedido Fiado" : "🏪 Venta Mostrador"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <FaMoneyBillWave className="text-[9px]" /> Pago Recibido
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 ${
                        item.isCancelled ? "line-through text-slate-400" : ""
                      }`}
                    >
                      {item.comment || (item.isCompra ? "Compra a Crédito" : "Cobro de Saldo")}
                    </p>
                  </div>

                  <div className="text-right text-[10px] text-slate-400 shrink-0 font-mono">
                    <div>{new Date(item.created_at).toLocaleDateString("es-AR")}</div>
                    <div>
                      {new Date(item.created_at).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                {/* 3 Métricas del movimiento */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <div>
                    <span className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                      Debe (+)
                    </span>
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
                      {item.debe > 0 ? formatCurrency(item.debe) : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      Haber (-)
                    </span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      {item.haber > 0 ? formatCurrency(item.haber) : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                      Saldo
                    </span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
                      {item.isCancelled ? "—" : formatCurrency(item.runningBalance)}
                    </span>
                  </div>
                </div>

                {!item.isCancelled && !item.isCompra && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                    >
                      <FaEdit /> Editar
                    </button>
                    <button
                      onClick={() => handleCancelPayment(item)}
                      disabled={cancellingPaymentId === item.id}
                      className="px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1"
                    >
                      {cancellingPaymentId === item.id ? (
                        <div className="animate-spin h-3.5 w-3.5 border-2 border-rose-500 border-t-transparent rounded-full"></div>
                      ) : (
                        <>
                          <FaTrash /> Anular
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* TABLA DE EXTRACTO CONTABLE (ESCRITORIO) */}
          <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Concepto / Detalle
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider w-28">
                      Debe (+)
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider w-28">
                      Haber (-)
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider w-32">
                      Saldo Acumulado
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {ledgerData.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors ${
                        item.isCancelled ? "bg-slate-50/50 dark:bg-slate-950/40 opacity-60" : ""
                      }`}
                    >
                      {/* Fecha */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(item.created_at).toLocaleDateString("es-AR")}
                        </div>
                        <div className="text-[10px] text-slate-450 dark:text-slate-500 font-mono">
                          {new Date(item.created_at).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Concepto */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.isCancelled ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              ANULADO
                            </span>
                          ) : item.isCompra ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                item.isOrder
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                              }`}
                            >
                              {item.isOrder ? <FaShoppingCart className="text-[9px]" /> : <FaFileInvoiceDollar className="text-[9px]" />}
                              {item.isOrder ? "📦 Pedido Fiado" : "🏪 Venta Mostrador"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <FaMoneyBillWave className="text-[9px]" /> Pago Recibido
                            </span>
                          )}

                          <span
                            className={`font-semibold text-slate-800 dark:text-slate-100 ${
                              item.isCancelled ? "line-through text-slate-400" : ""
                            }`}
                          >
                            {item.comment || (item.isCompra ? "Compra a Crédito" : "Cobro de Saldo")}
                          </span>
                        </div>
                        {item.payment_method && item.payment_method !== "anulado" && !item.isCompra && (
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5 block">
                            Medio: <strong className="capitalize">{item.payment_method}</strong>
                          </span>
                        )}
                      </td>

                      {/* Debe (+) */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-rose-600 dark:text-rose-400">
                        {item.debe > 0 ? `+${formatCurrency(item.debe)}` : "-"}
                      </td>

                      {/* Haber (-) */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {item.haber > 0 ? `-${formatCurrency(item.haber)}` : "-"}
                      </td>

                      {/* Saldo Acumulado */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {item.isCancelled ? (
                          <span className="text-[11px] text-slate-400 italic">No computa</span>
                        ) : (
                          <span
                            className={`font-black text-xs ${
                              item.runningBalance > 0.01
                                ? "text-slate-900 dark:text-slate-100"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {formatCurrency(item.runningBalance)}
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {!item.isCancelled && !item.isCompra && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Editar pago"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleCancelPayment(item)}
                              disabled={cancellingPaymentId === item.id}
                              className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                              title="Anular pago"
                            >
                              {cancellingPaymentId === item.id ? (
                                <div className="animate-spin h-3.5 w-3.5 border-2 border-rose-500 border-t-transparent rounded-full"></div>
                              ) : (
                                <FaTrash />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-950 font-bold text-xs">
                  <tr className="border-t border-slate-200 dark:border-slate-800">
                    <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-wider text-slate-500">
                      Totales del extracto:
                    </td>
                    <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-black">
                      +{formatCurrency(totalDebe)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-black">
                      -{formatCurrency(totalHaber)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-50 font-black text-sm">
                      {formatCurrency(currentFinalBalance)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (

        /* VISTA CLÁSICA DE TARJETAS */
        <div className="space-y-3">
          {payments.map((payment) => {
            const isCompra = payment.type === "compra";
            const isCancelled = payment.payment_method === "anulado";

            return (
              <div
                key={payment.id}
                className={`flex justify-between items-center p-4 border border-slate-200 dark:border-slate-800 rounded-2xl transition ${
                  isCancelled
                    ? "bg-slate-50 dark:bg-slate-900 opacity-70"
                    : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`p-3 rounded-xl ${
                      isCancelled
                        ? "bg-slate-200 dark:bg-slate-800 text-slate-500"
                        : isCompra
                        ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                        : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                    }`}
                  >
                    {isCompra ? <FaReceipt className="text-lg" /> : <FaMoneyBillWave className="text-lg" />}
                  </div>
                  <div>
                    <p
                      className={`font-bold text-sm ${
                        isCancelled
                          ? "text-slate-400 line-through"
                          : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {isCompra ? "🛒 Compra en Cuenta Corriente (Fiado)" : "💰 Pago Recibido"}
                      {isCancelled && (
                        <span className="ml-2 text-[10px] bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 px-2 py-0.5 rounded-md no-underline font-black">
                          ANULADO
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(() => {
                        try {
                          const d = new Date(payment.created_at);
                          return isNaN(d.getTime())
                            ? "Fecha no disponible"
                            : d.toLocaleString("es-AR", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              });
                        } catch {
                          return "Fecha no disponible";
                        }
                      })()}
                    </p>
                    {payment.comment && (
                      <p className="text-xs text-slate-450 dark:text-slate-400 italic mt-0.5">
                        "{payment.comment}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right flex items-center gap-4">
                  <div>
                    <p
                      className={`font-black text-lg ${
                        isCancelled
                          ? "text-slate-400 line-through"
                          : isCompra
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isCompra ? "+" : "-"}
                      {formatCurrency(Math.abs(payment.amount))}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400">
                      {isCancelled
                        ? "Anulado"
                        : isCompra
                        ? "Suma a la deuda"
                        : "Resta a la deuda"}
                    </p>
                  </div>

                  {!isCancelled && !isCompra && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(payment)}
                        className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Editar pago"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleCancelPayment(payment)}
                        disabled={cancellingPaymentId === payment.id}
                        className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        title="Anular pago"
                      >
                        {cancellingPaymentId === payment.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-rose-500 border-t-transparent rounded-full"></div>
                        ) : (
                          <FaTrash />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de edición */}
      {editingPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200/50 dark:border-slate-800/80 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
              <div>
                <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">
                  Editar Pago
                </h3>
                <p className="text-[11px] text-slate-500 font-bold dark:text-slate-400 mt-0.5">
                  Modificar comprobante de pago
                </p>
              </div>
              <button
                onClick={() => setEditingPayment(null)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-200 mb-2 uppercase tracking-wide">
                  Monto del Pago
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="block w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-bold text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-200 mb-2 uppercase tracking-wide">
                  Método de Pago
                </label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none text-sm font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="mercado_pago">Mercado Pago</option>
                  <option value="cheque">Cheque</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-200 mb-2 uppercase tracking-wide">
                  Comentario / Nota
                </label>
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  placeholder="Nota opcional sobre el cobro..."
                  className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none text-xs h-20 resize-none font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {savingEdit ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
