// src/components/RegisterPayment.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/numberFormat";
import { useRouter } from "next/navigation";
import { FaCalendarAlt, FaReceipt, FaShoppingBag } from "react-icons/fa";

interface RegisterPaymentProps {
  customerId: string;
  currentDebt: number;
  onSuccess?: () => void;
}

type PendingItem = {
  id: string;
  type: 'order' | 'sale';
  created_at: string;
  total_amount: number;
  amount_pending: number;
  description?: string; // For sales
  payment_method?: string; // For sales
};

export default function RegisterPayment({
  customerId,
  currentDebt,
  onSuccess,
}: RegisterPaymentProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  // New Modes
  const [paymentMode, setPaymentMode] = useState<"automatic" | "specific">("automatic");
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({}); // ID -> Amount to pay
  const [expandedItems, setExpandedItems] = useState<boolean>(false);

  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [mixedPayments, setMixedPayments] = useState([{ method: "efectivo", amount: "" }]);

  useEffect(() => {
    if (customerId) {
      fetchPendingItems();
    }
  }, [customerId]);

  const fetchPendingItems = async () => {
    // 1. Fetch pending orders
    const { data: orders } = await supabase
      .from("orders")
      .select("id, amount_pending, total_amount, created_at")
      .eq("customer_id", customerId)
      .gt("amount_pending", 0)
      .neq("status", "cancelado")
      .order("created_at", { ascending: true });

    // 2. Fetch pending sales (current account)
    const { data: sales } = await supabase
      .from("sales")
      .select("id, amount_pending, total_amount, created_at, payment_method")
      .eq("customer_id", customerId)
      .eq("payment_method", "cuenta_corriente")
      .eq("is_cancelled", false)
      .gt("amount_pending", 0)
      .order("created_at", { ascending: true });

    const unitedItems: PendingItem[] = [
      ...(orders?.map(o => ({ ...o, type: 'order' as const })) || []),
      ...(sales?.map(s => ({ ...s, type: 'sale' as const })) || [])
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    setPendingItems(unitedItems);
  };

  const handleAddMixedPayment = () => {
    setMixedPayments([...mixedPayments, { method: "efectivo", amount: "" }]);
  };

  const handleRemoveMixedPayment = (index: number) => {
    setMixedPayments(mixedPayments.filter((_, i) => i !== index));
  };

  const handleMixedPaymentChange = (index: number, field: "method" | "amount", value: string) => {
    const newPayments = [...mixedPayments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    setMixedPayments(newPayments);
  };

  const getTotalMixedAmount = () => {
    return mixedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  };

  const handleToggleItem = (item: PendingItem) => {
    const newSelected = { ...selectedItems };
    if (newSelected[item.id]) {
      delete newSelected[item.id];
    } else {
      newSelected[item.id] = item.amount_pending; // Default to full pending amount
    }
    setSelectedItems(newSelected);
  };

  const handleItemAmountChange = (id: string, value: string) => {
    const val = parseFloat(value);
    if (isNaN(val)) return;

    const newSelected = { ...selectedItems, [id]: val };
    setSelectedItems(newSelected);
  };

  const getSpecificTotal = () => {
    return Object.values(selectedItems).reduce((sum, val) => sum + val, 0);
  };

  // Sync main amount with specific total if in specific mode
  useEffect(() => {
    if (paymentMode === 'specific') {
      setAmount(getSpecificTotal().toString());
    }
  }, [selectedItems, paymentMode]);


  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine total amount and methods to process
    let finalAmount = 0;
    let methodsToProcess: { method: string; amount: number }[] = [];

    if (paymentMethod === "mixto") {
      finalAmount = getTotalMixedAmount();

      if (finalAmount <= 0) {
        alert("El monto total debe ser mayor a 0.");
        return;
      }

      methodsToProcess = mixedPayments.map(p => ({
        method: p.method,
        amount: parseFloat(p.amount) || 0
      })).filter(p => p.amount > 0);

      const specificSum = paymentMode === 'specific' ? getSpecificTotal() : 0;
      if (paymentMode === 'specific' && Math.abs(finalAmount - specificSum) > 0.1) {
        alert(`El total de los métodos de pago (${formatCurrency(finalAmount)}) no coincide con el total de los items seleccionados (${formatCurrency(specificSum)}).`);
        return;
      }

    } else {
      // In specific mode, finalAmount is derived from selected items input
      if (paymentMode === 'specific') {
        finalAmount = getSpecificTotal();
      } else {
        finalAmount = parseFloat(amount);
      }

      if (!finalAmount || finalAmount <= 0) {
        alert("Por favor, ingresa un monto válido a pagar.");
        return;
      }
      methodsToProcess = [{ method: paymentMethod, amount: finalAmount }];
    }

    if (finalAmount > currentDebt + 0.1) {
      // Allow slight overpayment tolerance, but generally warn
      if (!confirm(`El monto (${formatCurrency(finalAmount)}) es mayor a la deuda registrada (${formatCurrency(currentDebt)}). ¿Desea continuar de todas formas (esto generará saldo a favor)?`)) {
        return;
      }
    }

    setLoading(true);

    try {
      const now = new Date();
      const argentinaTime = new Date(
        now.toLocaleString("en-US", {
          timeZone: "America/Argentina/Buenos_Aires",
        })
      );

      const paymentComment =
        comment ||
        (paymentMethod === "mixto"
          ? "Pago Mixto"
          : paymentMode === "specific"
          ? "Pago Específico"
          : "Pago a cuenta");

      const allocationsPayload =
        paymentMode === "specific"
          ? Object.entries(selectedItems)
              .map(([itemId, payAmount]) => {
                const item = pendingItems.find((pending) => pending.id === itemId);
                if (!item || payAmount <= 0) return null;

                return {
                  item_id: item.id,
                  item_type: item.type,
                  amount: payAmount,
                };
              })
              .filter(Boolean)
          : [];

      const { data: txData, error: txError } = await supabase.rpc(
        "register_customer_payment_transaction",
        {
          p_customer_id: customerId,
          p_total_amount: finalAmount,
          p_created_at: argentinaTime.toISOString(),
          p_comment: paymentComment,
          p_methods: methodsToProcess,
          p_mode: paymentMode,
          p_allocations: allocationsPayload,
        }
      );

      if (txError) throw txError;

      const result = (txData || {}) as { unapplied_amount?: number | null };
      const unappliedAmount = Number(result.unapplied_amount || 0);

      if (unappliedAmount > 0.01) {
        alert(
          `¡Pago registrado exitosamente!\nMonto sin aplicar: ${formatCurrency(
            unappliedAmount
          )}`
        );
      } else {
        alert("¡Pago registrado exitosamente!");
      }

      setAmount("");
      setComment("");
      setPaymentMethod("efectivo");
      setMixedPayments([{ method: "efectivo", amount: "" }]);
      setSelectedItems({});

      // Refresh
      fetchPendingItems(); // Refresh local list
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      console.error("Error al registrar pago:", error);
      alert(`Error al registrar el pago: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg">
      {/* Toggle Mode */}
      <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
        <button
          type="button"
          onClick={() => setPaymentMode("automatic")}
          className={`
            flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-md transition-all
            ${paymentMode === "automatic"
              ? "bg-white dark:bg-slate-700 text-green-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            }
          `}
        >
          <span>⚡ Pago Automático</span>
        </button>
        <button
          type="button"
          onClick={() => setPaymentMode("specific")}
          className={`
            flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-md transition-all
            ${paymentMode === "specific"
              ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            }
          `}
        >
          <span>📝 Seleccionar Pedidos</span>
        </button>
      </div >

      <form onSubmit={handleRegisterPayment} className="space-y-6">

        {/* SPECIFIC MODE Item List */}
        {paymentMode === "specific" && (
          <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div
              className="bg-gray-50 dark:bg-slate-800 px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-750 transition"
              onClick={() => setExpandedItems(!expandedItems)}
            >
              <span className="font-bold text-gray-700 dark:text-slate-200 flex items-center gap-2">
                <FaReceipt className="text-gray-400" />
                Deudas Pendientes ({pendingItems.length})
              </span>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {expandedItems ? "Ocultar lista" : "Mostrar lista"}
              </span>
            </div>

            <div className={`overflow-y-auto transition-all duration-300 ${!expandedItems && pendingItems.length > 3 ? 'max-h-[200px]' : 'max-h-[400px]'}`}>
              {pendingItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-slate-400 text-sm">
                  No hay pedidos pendientes.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {pendingItems.map((item) => {
                    const isSelected = !!selectedItems[item.id];
                    return (
                      <div
                        key={item.id}
                        className={`
                                p-4 flex items-center gap-4 transition-colors cursor-pointer
                                ${isSelected ? 'bg-blue-50/50 dark:bg-slate-800/80' : 'hover:bg-gray-50 dark:hover:bg-slate-800/30'}
                            `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleItem(item)}
                          className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />

                        <div className="flex-1" onClick={() => !isSelected && handleToggleItem(item)}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${item.type === 'order'
                              ? 'bg-orange-50 border-orange-100 text-orange-700 dark:bg-orange-900/20 dark:border-orange-900/50 dark:text-orange-400'
                              : 'bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-900/50 dark:text-indigo-400'
                              }`}>
                              {item.type === 'order' ? 'PEDIDO' : 'VENTA'}
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 flex justify-between w-full pr-2">
                            <span>Total: {formatCurrency(item.total_amount)}</span>
                            <span className="font-semibold text-gray-700 dark:text-slate-300">
                              Pendiente: <span className="text-red-600">{formatCurrency(item.amount_pending)}</span>
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-28 animate-in fade-in slide-in-from-right-4 duration-200">
                            <label className="text-[10px] text-gray-500 mb-1 block">A pagar:</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                              <input
                                type="number"
                                value={selectedItems[item.id]}
                                onChange={(e) => handleItemAmountChange(item.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full pl-5 pr-2 py-1.5 text-right text-sm font-semibold border border-blue-200 dark:border-blue-800 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900"
                                step="0.01"
                                max={item.amount_pending}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {paymentMode === "specific" && (
              <div className="bg-blue-50 dark:bg-slate-900 border-t border-blue-100 dark:border-slate-800 p-4 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Seleccionado:</span>
                <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(getSpecificTotal())}</span>
              </div>
            )}
          </div>
        )}

        {/* Automatic Mode Amount Input */}
        {paymentMethod !== "mixto" && paymentMode === 'automatic' && (
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
            <label
              htmlFor="amount"
              className="block text-sm font-bold text-gray-700 dark:text-slate-200 mb-2"
            >
              Monto a Pagar
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-lg">$</span>
              <input
                type="number"
                step="0.01"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-bold"
                placeholder="0.00"
                required={paymentMethod !== "mixto"}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 text-right">
              Deuda Total: <span className="font-semibold text-red-600">{formatCurrency(currentDebt)}</span>
            </p>
          </div>
        )}

        {/* Payment Method Selector */}
        <div>
          <label
            htmlFor="paymentMethod"
            className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2"
          >
            Método de Pago
          </label>
          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              if (e.target.value === "mixto" && amount) {
                // Pre-fill first split with current amount if exists
                setMixedPayments([{ method: "efectivo", amount: amount }]);
              }
            }}
            className="block w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base bg-white dark:bg-slate-800"
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="mercado_pago">Mercado Pago</option>
            <option value="cheque">Cheque</option>
            <option value="mixto">Mixto</option>
            <option value="cuenta_corriente">Cuenta Corriente (Fiado)</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {paymentMethod === "mixto" && (
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-3 border border-gray-200 dark:border-slate-700">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Desglose del Pago</p>

            {mixedPayments.map((p, index) => (
              <div key={index} className="flex gap-2 items-center">
                <select
                  value={p.method}
                  onChange={(e) => handleMixedPaymentChange(index, "method", e.target.value)}
                  className="flex-1 px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="mercado_pago">Mercado Pago</option>
                  <option value="cheque">Cheque</option>
                  <option value="otro">Otro</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={p.amount}
                  onChange={(e) => handleMixedPaymentChange(index, "amount", e.target.value)}
                  className="w-24 px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm"
                  placeholder="$0.00"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveMixedPayment(index)}
                  className="text-red-500 hover:text-red-700 px-1"
                  disabled={mixedPayments.length <= 1}
                >
                  &times;
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddMixedPayment}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              + Agregar otro método
            </button>

            <div className="pt-2 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center text-sm font-bold">
              <span className="text-gray-700 dark:text-slate-300">Total:</span>
              <span className={getTotalMixedAmount() > currentDebt ? "text-red-500" : "text-green-600"}>
                {formatCurrency(getTotalMixedAmount())}
              </span>
            </div>
            {paymentMode === "specific" && (
              <p className="text-xs text-blue-600 text-right mt-1">
                Objetivo: {formatCurrency(getSpecificTotal())}
              </p>
            )}
          </div>
        )}

        <div>
          <label
            htmlFor="comment"
            className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2"
          >
            Comentario (Opcional)
          </label>
          <input
            type="text"
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="block w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base"
            placeholder="Ej: Entrega semanal"
          />
        </div>

        <button
          type="submit"
          disabled={loading || (paymentMode === 'specific' && getSpecificTotal() === 0)}
          className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 shadow-lg transition-all text-base disabled:cursor-not-allowed"
        >
          {loading ? "Registrando..." : `Registrar Pago ${paymentMode === 'specific' ? `(${formatCurrency(getSpecificTotal())})` : ''}`}
        </button>
      </form>
    </div >
  );
}
