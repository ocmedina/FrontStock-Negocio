"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/numberFormat";
import { FaReceipt, FaMoneyBillWave, FaTrash, FaEdit } from "react-icons/fa";
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
        if (payment.payment_method === 'anulado') return;

        if (!payment || !payment.id) {
            alert("Error: El id del pago no está disponible.");
            return;
        }

        if (!window.confirm(`¿Está seguro de anular este pago de ${formatCurrency(payment.amount)}? Esta acción restaurará la deuda al cliente.`)) {
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
                    `Pago anulado exitosamente.\nParte del monto no pudo restaurarse: ${formatCurrency(remainingUnrestored)}`
                );
            } else {
                alert("Pago anulado exitosamente. La deuda ha sido restaurada.");
            }

            // Update local state to reflect change immediately
            setPayments(prev => prev.map(p =>
                p.id === payment.id ? { ...p, payment_method: 'anulado' } : p
            ));

            router.refresh(); // Refresh server components (like the debt totals)

        } catch (error: any) {
            console.error("Error cancelling payment details:", error);
            const errorMessage = error?.message || (typeof error === 'string' ? error : "Error desconocido");
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
                    p_new_comment: editComment
                }
            );

            if (txError) throw txError;

            alert("Pago editado correctamente.");

            // Update local state
            setPayments(prev => prev.map(p =>
                p.id === editingPayment.id ? { ...p, amount: newAmt, payment_method: editMethod, comment: editComment } : p
            ));

            setEditingPayment(null);
            router.refresh();
        } catch (error: any) {
            console.error("Error editing payment details:", error);
            const errorMessage = error?.message || (typeof error === 'string' ? error : "Error desconocido");
            alert("Error al editar el pago: " + errorMessage);
        } finally {
            setSavingEdit(false);
        }
    };

    if (!payments || payments.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400 text-lg">
                    No hay movimientos registrados
                </p>
                <p className="text-gray-300 text-sm mt-2">
                    Los pagos y compras aparecerán aquí
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {payments.map((payment) => {
                const isCompra = payment.type === "compra";
                const isCancelled = payment.payment_method === 'anulado';

                return (
                    <div
                        key={payment.id}
                        className={`flex justify-between items-center p-4 border border-gray-200 dark:border-slate-700 rounded-lg transition ${isCancelled ? 'bg-gray-50 dark:bg-slate-900 opacity-75' : 'hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className={`p-3 rounded-full ${isCancelled ? "bg-gray-200 dark:bg-slate-800" :
                                    isCompra ? "bg-red-100" : "bg-green-100"
                                    }`}
                            >
                                {isCompra ? (
                                    <FaReceipt className={`text-xl ${isCancelled ? 'text-gray-500' : 'text-red-600'}`} />
                                ) : (
                                    <FaMoneyBillWave className={`text-xl ${isCancelled ? 'text-gray-500' : 'text-green-600'}`} />
                                )}
                            </div>
                            <div>
                                <p className={`font-semibold ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-800 dark:text-slate-100'}`}>
                                    {isCompra ? "🛒 Compra a Crédito" : "💰 Pago Recibido"}
                                    {isCancelled && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full no-underline">ANULADO</span>}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-slate-400">
                                    {new Date(payment.created_at).toLocaleString("es-AR", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                    })}
                                </p>
                                {payment.comment && (
                                    <p className="text-xs text-gray-400 italic mt-1">
                                        "{payment.comment}"
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                            <div>
                                <p
                                    className={`font-bold text-xl ${isCancelled ? "text-gray-400 line-through" :
                                        isCompra ? "text-red-600" : "text-green-600"
                                        }`}
                                >
                                    {isCompra ? "+" : "-"}
                                    {formatCurrency(Math.abs(payment.amount))}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                    {isCancelled ? "Movimiento anulado" : (isCompra ? "Suma a la deuda" : "Resta a la deuda")}
                                </p>
                            </div>

                            {!isCancelled && !isCompra && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleOpenEdit(payment)}
                                        className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        title="Editar pago"
                                    >
                                        <FaEdit />
                                    </button>
                                    <button
                                        onClick={() => handleCancelPayment(payment)}
                                        disabled={cancellingPaymentId === payment.id}
                                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Anular pago"
                                    >
                                        {cancellingPaymentId === payment.id ? (
                                            <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full"></div>
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
                                className="w-7 h-7 flex items-center justify-center text-slate-450 hover:text-slate-750 dark:text-slate-500 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xl font-bold"
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
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
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
