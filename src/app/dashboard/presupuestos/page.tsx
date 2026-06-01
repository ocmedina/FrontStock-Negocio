"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import PDFDownloadButton from "@/components/pdf/PDFDownloadButton";
import {
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaPlus,
  FaPrint,
  FaSpinner,
  FaTimes,
  FaUser,
} from "react-icons/fa";

type BudgetRow = {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  customers: { full_name: string } | null;
};

type BudgetDetail = {
  id: string;
  created_at: string;
  total_amount: number;
  customers: any;
  budget_items: Array<{
    quantity: number;
    price: number;
    products: { name: string } | null;
  }>;
};

function BudgetPrintModal({
  budgetId,
  onClose,
}: {
  budgetId: string | null;
  onClose: () => void;
}) {
  const [budgetData, setBudgetData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [printFormat, setPrintFormat] = useState<"A4" | "thermal">("thermal");

  useEffect(() => {
    const fetchBudget = async () => {
      if (!budgetId) {
        setBudgetData(null);
        return;
      }

      setLoading(true);
      const { data } = await (supabase as any)
        .from("budgets")
        .select(
          `
            id,
            created_at,
            total_amount,
            customers (*),
            budget_items ( quantity, price, products ( name ) )
          `
        )
        .eq("id", budgetId)
        .single();

      const detail = (data || null) as BudgetDetail | null;

      if (detail) {
        setBudgetData({
          id: detail.id,
          created_at: detail.created_at,
          total_amount: detail.total_amount,
          customers: detail.customers,
          order_items: detail.budget_items || [],
          document_title: "Presupuesto",
          document_number_label: "Número de Presupuesto",
          document_footer_note:
            "Este presupuesto fue generado por Frontio Web Solutions",
        });
      } else {
        setBudgetData(null);
      }

      setLoading(false);
    };

    fetchBudget();
  }, [budgetId]);

  if (!budgetId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-white dark:from-slate-900 dark:to-slate-900 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">
              Descargar Presupuesto
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Elegi el formato de impresion
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-10 text-center text-gray-600 dark:text-slate-300">
              <FaSpinner className="animate-spin text-2xl mx-auto mb-3" />
              Cargando presupuesto...
            </div>
          ) : budgetData ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => setPrintFormat("thermal")}
                  className={`p-3 rounded-xl border transition-all ${
                    printFormat === "thermal"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "border-gray-300 dark:border-slate-700"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">🧾</div>
                    <div className="font-semibold text-sm">80mm</div>
                    <div className="text-xs">Termica</div>
                  </div>
                </button>

                <button
                  onClick={() => setPrintFormat("A4")}
                  className={`p-3 rounded-xl border transition-all ${
                    printFormat === "A4"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "border-gray-300 dark:border-slate-700"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">📄</div>
                    <div className="font-semibold text-sm">A4</div>
                    <div className="text-xs">Estandar</div>
                  </div>
                </button>
              </div>

              <PDFDownloadButton
                orderData={budgetData}
                printFormat={printFormat}
                fileNamePrefix="presupuesto"
              />
            </>
          ) : (
            <p className="text-gray-600 dark:text-slate-300">No se pudo cargar el presupuesto.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBudgetIdForPrint, setSelectedBudgetIdForPrint] = useState<string | null>(null);

  useEffect(() => {
    const loadBudgets = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("budgets")
        .select("id, created_at, total_amount, status, customers(full_name)")
        .order("created_at", { ascending: false })
        .limit(50);

      setBudgets((data || []) as BudgetRow[]);
      setLoading(false);
    };

    loadBudgets();
  }, []);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700/80 dark:text-blue-300/80">
                Modulo de presupuestos
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-50 mt-1 flex items-center gap-3">
                <FaFileInvoiceDollar className="text-blue-600" /> Presupuestos
              </h1>
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                Crea, comparte y descarga presupuestos en segundos.
              </p>
            </div>

            <Link
              href="/dashboard/presupuestos/nuevo"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold flex items-center gap-2"
            >
              <FaPlus /> Nuevo Presupuesto
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-slate-50">Ultimos presupuestos</h2>
            <span className="text-xs text-gray-500 dark:text-slate-400">{budgets.length} resultados</span>
          </div>

          {loading ? (
            <div className="p-6 text-gray-500 dark:text-slate-400">Cargando presupuestos...</div>
          ) : budgets.length === 0 ? (
            <div className="p-6 text-gray-500 dark:text-slate-400">Todavia no hay presupuestos creados.</div>
          ) : (
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              {budgets.map((budget) => (
                <div key={budget.id} className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                        #{budget.id.slice(0, 8)}
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-slate-50 mt-1">
                        {budget.customers?.full_name || "Sin cliente"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <FaCalendarAlt /> {new Date(budget.created_at).toLocaleDateString("es-AR")}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-slate-50">
                        ${Number(budget.total_amount || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 uppercase">{budget.status || "activo"}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedBudgetIdForPrint(budget.id)}
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <FaPrint /> PDF
                    </button>
                    <Link
                      href={`/dashboard/presupuestos/${budget.id}`}
                      className="text-xs text-blue-700 dark:text-blue-300 font-semibold hover:text-blue-800"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BudgetPrintModal
        budgetId={selectedBudgetIdForPrint}
        onClose={() => setSelectedBudgetIdForPrint(null)}
      />
    </div>
  );
}
