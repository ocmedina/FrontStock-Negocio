"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/numberFormat";
import PDFDownloadButton from "@/components/pdf/PDFDownloadButton";
import { FaArrowLeft, FaCalendarAlt, FaPrint, FaUser } from "react-icons/fa";

type BudgetItem = {
  quantity: number;
  price: number;
  products: { name: string } | null;
};

type BudgetDetail = {
  id: string;
  created_at: string;
  total_amount: number;
  status: string | null;
  customers: {
    full_name: string | null;
    customer_type?: string | null;
    phone?: string | null;
    address?: string | null;
    reference?: string | null;
  } | null;
  budget_items: BudgetItem[] | null;
};

const statusStyles: Record<string, string> = {
  activo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  vencido: "bg-red-50 text-red-700 border-red-200",
  cancelado: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function BudgetDetailClient({ budget }: { budget: BudgetDetail }) {
  const [printFormat, setPrintFormat] = useState<"A4" | "thermal">("A4");

  const items = budget.budget_items ?? [];
  const statusKey = (budget.status || "activo").toLowerCase();
  const statusClass = statusStyles[statusKey] || statusStyles.activo;

  const orderData = useMemo(() => {
    return {
      id: budget.id,
      created_at: budget.created_at,
      total_amount: budget.total_amount,
      customers: budget.customers,
      order_items: items,
      document_title: "Presupuesto",
      document_number_label: "Numero de Presupuesto",
      document_footer_note: "Este presupuesto fue generado por Frontio Web Solutions",
    };
  }, [budget, items]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <Link
                href="/dashboard/presupuestos"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <FaArrowLeft /> Volver a presupuestos
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50 mt-3">
                Presupuesto #{budget.id.slice(0, 8)}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-slate-400 mt-2">
                <span className="inline-flex items-center gap-2">
                  <FaCalendarAlt /> {new Date(budget.created_at).toLocaleDateString("es-AR")}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusClass}`}>
                  {budget.status || "activo"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-slate-400 uppercase">
                Total
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-50">
                {formatCurrency(budget.total_amount || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="font-semibold text-gray-900 dark:text-slate-50">
                Items del presupuesto
              </h2>
            </div>
            {items.length === 0 ? (
              <div className="p-6 text-gray-500 dark:text-slate-400">
                No hay productos cargados.
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {items.map((item, index) => {
                  const subtotal = (item.price || 0) * (item.quantity || 0);
                  return (
                    <div key={`${item.products?.name}-${index}`} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-50">
                          {item.products?.name || "Producto"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                          Cantidad: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {formatCurrency(item.price || 0)} c/u
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-slate-50">
                          {formatCurrency(subtotal)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 dark:text-slate-50 flex items-center gap-2">
                <FaUser /> Cliente
              </h2>
              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-slate-300">
                <p className="font-semibold text-gray-900 dark:text-slate-50">
                  {budget.customers?.full_name || "Sin cliente"}
                </p>
                {budget.customers?.customer_type && (
                  <p>Tipo: {budget.customers.customer_type}</p>
                )}
                {budget.customers?.phone && <p>Tel: {budget.customers.phone}</p>}
                {budget.customers?.address && <p>Direccion: {budget.customers.address}</p>}
                {budget.customers?.reference && <p>Referencia: {budget.customers.reference}</p>}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-slate-50 flex items-center gap-2">
                  <FaPrint /> Descargar PDF
                </h2>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  Formato
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => setPrintFormat("thermal")}
                  className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                    printFormat === "thermal"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 dark:border-slate-700"
                  }`}
                >
                  80mm
                </button>
                <button
                  onClick={() => setPrintFormat("A4")}
                  className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                    printFormat === "A4"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 dark:border-slate-700"
                  }`}
                >
                  A4
                </button>
              </div>
              <div className="mt-4">
                <PDFDownloadButton
                  orderData={orderData}
                  printFormat={printFormat}
                  fileNamePrefix="presupuesto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
