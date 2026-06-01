"use client";

import { FaTimes } from "react-icons/fa";
import { formatCurrency } from "@/lib/numberFormat";
import { Supplier } from "../types";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  total: number;
  customerName: string;
  cartItemsCount: number;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  amountPaid: string;
  setAmountPaid: (amount: string) => void;
  useMixedPayment: boolean;
  setUseMixedPayment: (value: boolean) => void;
  paymentMethods: Array<{ method: string; amount: string }>;
  setPaymentMethods: (
    methods: Array<{ method: string; amount: string }>
  ) => void;
  handleAddPaymentMethod: () => void;
  handleRemovePaymentMethod: (index: number) => void;
  handleUpdatePaymentMethod: (
    index: number,
    field: "method" | "amount",
    value: string
  ) => void;
  getTotalPaidFromMixed: () => number;
  loading: boolean;
  payToSupplier: boolean;
  setPayToSupplier: (value: boolean) => void;
  selectedSupplierId: string | null;
  setSelectedSupplierId: (id: string | null) => void;
  suppliers: Supplier[];
}

export default function PaymentModal({
  isOpen,
  onClose,
  onConfirm,
  total,
  customerName,
  cartItemsCount,
  paymentMethod,
  setPaymentMethod,
  amountPaid,
  setAmountPaid,
  useMixedPayment,
  setUseMixedPayment,
  paymentMethods,
  setPaymentMethods,
  handleAddPaymentMethod,
  handleRemovePaymentMethod,
  handleUpdatePaymentMethod,
  getTotalPaidFromMixed,
  loading,
  payToSupplier,
  setPayToSupplier,
  selectedSupplierId,
  setSelectedSupplierId,
  suppliers,
}: PaymentModalProps) {
  if (!isOpen) return null;

  const debtDifference = useMixedPayment
    ? total - getTotalPaidFromMixed()
    : total - (parseFloat(amountPaid) || 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[90vh] overflow-y-auto transform transition-all scale-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Finalizar Venta
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Confirma el pago y registra la venta.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-full p-2 transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
          {/* Summary panel */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Total a pagar
              </p>
              <p className="text-4xl font-bold text-emerald-800 dark:text-emerald-200 mt-2">
                {formatCurrency(total)}
              </p>
              <div className="mt-4 space-y-2 text-sm text-emerald-800/80 dark:text-emerald-200/80">
                <p>
                  Cliente: <span className="font-semibold text-emerald-900 dark:text-emerald-100">{customerName}</span>
                </p>
                <p>
                  Items: <span className="font-semibold text-emerald-900 dark:text-emerald-100">{cartItemsCount}</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Atajos</span>
                <div className="flex gap-3">
                  <span>
                    <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border font-sans">
                      F12
                    </kbd>{" "}
                    Cerrar
                  </span>
                  <span>
                    <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border font-sans">
                      F2
                    </kbd>{" "}
                    Confirmar
                  </span>
                </div>
              </div>
            </div>

            {debtDifference > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">Saldo pendiente</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(debtDifference)}
                </p>
              </div>
            )}

            {debtDifference < 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-700">Cambio a devolver</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {formatCurrency(Math.abs(debtDifference))}
                </p>
              </div>
            )}
          </div>

          {/* Form panel */}
          <div className="space-y-6">

          {!useMixedPayment ? (
            <div className="space-y-6">
              {/* Método de pago simple */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-2 uppercase tracking-wide">
                  Método de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPaymentMethod(value);
                    if (value === "mixtos") {
                      setUseMixedPayment(true);
                    } else if (value === "cuenta_corriente") {
                      setAmountPaid("0");
                    } else {
                      setAmountPaid(total.toFixed(2));
                    }
                  }}
                  className="w-full p-4 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-emerald-400"
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="tarjeta_debito">💳 Tarjeta de Débito</option>
                  <option value="tarjeta_credito">💳 Tarjeta de Crédito</option>
                  <option value="transferencia">🏦 Transferencia</option>
                  <option value="mercado_pago">📱 Mercado Pago</option>
                  <option value="mixtos">🔀 Pagos Mixtos</option>
                  <option value="cuenta_corriente">
                    📋 Cuenta Corriente (Fiado)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-2 uppercase tracking-wide">
                  Monto Pagado
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 font-bold text-lg">
                    $
                  </span>
                  <input
                    id="amountPaid"
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full pl-16 p-4 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-2xl font-bold text-gray-800 dark:text-slate-100 shadow-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              {/* Pagos mixtos */}
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                    Pagos Mixtos
                  </h3>
                  <button
                    onClick={() => {
                      setUseMixedPayment(false);
                      setPaymentMethod("efectivo");
                      setAmountPaid(total.toFixed(2));
                    }}
                    className="text-sm px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    Cancelar Mixto
                  </button>
                </div>

                <div className="space-y-4">
                  {paymentMethods.map((pm, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <select
                        value={pm.method}
                        onChange={(e) =>
                          handleUpdatePaymentMethod(
                            index,
                            "method",
                            e.target.value
                          )
                        }
                        className="flex-1 p-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta_debito">Débito</option>
                        <option value="tarjeta_credito">Crédito</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="mercado_pago">Mercado Pago</option>
                      </select>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400">
                          $
                        </span>
                        <input
                          type="number"
                          value={pm.amount}
                          onChange={(e) =>
                            handleUpdatePaymentMethod(
                              index,
                              "amount",
                              e.target.value
                            )
                          }
                          className="w-full pl-7 p-3 border border-gray-300 dark:border-slate-600 rounded-lg font-medium bg-white dark:bg-slate-900"
                          placeholder="0.00"
                        />
                      </div>
                      <button
                        onClick={() => handleRemovePaymentMethod(index)}
                        className="text-red-500 hover:text-red-700 p-2"
                        disabled={paymentMethods.length <= 1}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddPaymentMethod}
                    className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 font-medium transition-colors"
                  >
                    + Agregar otro método
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Total Acumulado:
                  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(getTotalPaidFromMixed())}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Pago directo a proveedor */}
          {paymentMethod !== "cuenta_corriente" && (
            <div className="border-t border-gray-100 dark:border-slate-800 pt-6">
              <div
                className={`transition-all duration-300 ${payToSupplier
                  ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-700/30"
                  : "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                  } p-5 rounded-xl border`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="payToSupplier"
                    checked={payToSupplier}
                    onChange={(e) => {
                      setPayToSupplier(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedSupplierId(null);
                      }
                    }}
                    className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500 border-gray-300 dark:border-slate-600 dark:bg-slate-700"
                  />
                  <label
                    htmlFor="payToSupplier"
                    className="flex-1 cursor-pointer select-none"
                  >
                    <div className="font-bold text-gray-900 dark:text-slate-100">
                      Pagar directo a proveedor
                    </div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">
                      El dinero ingresa y se paga automáticamente a un proveedor
                    </div>
                  </label>
                </div>

                {payToSupplier && (
                  <div className="mt-3 animate-slideDown">
                    <select
                      value={selectedSupplierId || ""}
                      onChange={(e) =>
                        setSelectedSupplierId(e.target.value || null)
                      }
                      className="w-full p-3 border border-yellow-300 dark:border-yellow-700/50 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                      required
                    >
                      <option value="">Seleccione un proveedor...</option>
                      {suppliers
                        .filter((s) => (s.debt || 0) > 0)
                        .map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name} - Deuda: $
                            {formatCurrency(supplier.debt || 0).replace("$", "")}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Indicadores de deuda/cambio */}
          {/* Botones */}
          <div className="flex gap-4 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-[2] py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
            >
              {loading ? (
                <>Procesando...</>
              ) : (
                <>
                  Confirmar Venta
                  <span className="text-xs bg-white/20 px-2 py-1 rounded border border-white/30">
                    F2
                  </span>
                </>
              )}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
