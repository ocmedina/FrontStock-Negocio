"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FaShoppingCart,
  FaFileInvoiceDollar,
  FaExclamationTriangle,
  FaCheckCircle,
  FaReceipt,
  FaArrowRight,
} from "react-icons/fa";
import { formatCurrency } from "@/lib/numberFormat";

export type PendingVoucher = {
  id: string;
  type: "order" | "sale";
  created_at: string;
  total_amount: number;
  amount_pending: number;
};

interface CustomerPendingVouchersProps {
  vouchers: PendingVoucher[];
}

export default function CustomerPendingVouchers({
  vouchers,
}: CustomerPendingVouchersProps) {
  const [filter, setFilter] = useState<"all" | "order" | "sale">("all");

  const ordersCount = useMemo(
    () => vouchers.filter((v) => v.type === "order").length,
    [vouchers]
  );
  const salesCount = useMemo(
    () => vouchers.filter((v) => v.type === "sale").length,
    [vouchers]
  );

  const ordersDebt = useMemo(
    () =>
      vouchers
        .filter((v) => v.type === "order")
        .reduce((sum, v) => sum + Number(v.amount_pending || 0), 0),
    [vouchers]
  );

  const salesDebt = useMemo(
    () =>
      vouchers
        .filter((v) => v.type === "sale")
        .reduce((sum, v) => sum + Number(v.amount_pending || 0), 0),
    [vouchers]
  );

  const totalDebt = ordersDebt + salesDebt;

  const filteredVouchers = useMemo(() => {
    let list = vouchers;
    if (filter !== "all") {
      list = vouchers.filter((v) => v.type === filter);
    }
    return [...list].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [vouchers, filter]);

  if (vouchers.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 text-center">
        <FaCheckCircle className="text-emerald-500 text-3xl mx-auto mb-2 opacity-80" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Cuenta Corriente al Día
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Este cliente no posee comprobantes pendientes de pago.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <FaExclamationTriangle className="text-amber-500" /> Comprobantes
            Pendientes en Cuenta Corriente
          </h2>
          <p className="text-3xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ventas de mostrador y pedidos de reparto unificados en la cuenta
            corriente del cliente ({vouchers.length} comprobantes con saldo).
          </p>
        </div>

        {/* Resumen Total */}
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
          <span className="text-3xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            Total a Cobrar:
          </span>
          <span className="text-sm font-black text-amber-700 dark:text-amber-300">
            {formatCurrency(totalDebt)}
          </span>
        </div>
      </div>

      {/* Selector de Filtro / Pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex flex-wrap sm:flex-nowrap p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl text-xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              filter === "all"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FaReceipt className="text-3xs" />
            Todos ({vouchers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("order")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              filter === "order"
                ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FaShoppingCart className="text-3xs" />
            Pedidos ({ordersCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("sale")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              filter === "sale"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FaFileInvoiceDollar className="text-3xs" />
            Ventas ({salesCount})
          </button>
        </div>

        {/* Subtotales explicativos */}
        <div className="flex flex-wrap items-center gap-2.5 text-3xs font-medium text-slate-500 dark:text-slate-400 px-1">
          {ordersCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              Pedidos:{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                {formatCurrency(ordersDebt)}
              </strong>
            </span>
          )}
          {salesCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
              Mostrador:{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                {formatCurrency(salesDebt)}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Lista Unificada de Comprobantes */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800">
        {filteredVouchers.map((item) => {
          const isOrder = item.type === "order";
          const linkUrl = isOrder
            ? `/dashboard/pedidos/${item.id}`
            : `/dashboard/ventas/${item.id}`;

          return (
            <div
              key={`${item.type}-${item.id}`}
              className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
            >
              {/* Información del Comprobante */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5 border ${
                    isOrder
                      ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-200/60 dark:border-amber-900/40"
                      : "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 border-indigo-200/60 dark:border-indigo-900/40"
                  }`}
                >
                  {isOrder ? <FaShoppingCart /> : <FaFileInvoiceDollar />}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-3xs font-extrabold border uppercase tracking-wider ${
                        isOrder
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/15 dark:text-amber-400 dark:border-amber-900/40"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/15 dark:text-indigo-400 dark:border-indigo-900/40"
                      }`}
                    >
                      {isOrder ? "📦 Pedido" : "🏪 Venta Mostrador"}
                    </span>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      #{item.id?.substring(0, 8)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 text-3xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                    <span>
                      Fecha:{" "}
                      {new Date(item.created_at).toLocaleDateString("es-AR")}
                    </span>
                    <span>•</span>
                    <span>Total: {formatCurrency(item.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Saldo y Enlace */}
              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <div className="text-left sm:text-right">
                  <span className="text-3xs text-slate-400 uppercase tracking-wider block">
                    Saldo Pendiente
                  </span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400 block mt-0.5">
                    {formatCurrency(item.amount_pending)}
                  </span>
                </div>

                <Link
                  href={linkUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-3xs font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <span>Ver detalle</span>
                  <FaArrowRight className="text-4xs" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
