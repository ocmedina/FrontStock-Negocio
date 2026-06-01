"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import InvoiceDownloadButton from "@/components/pdf/InvoiceDownloadButton";
import {
  FaFileInvoiceDollar,
  FaSpinner,
  FaArrowLeft,
  FaCalendarAlt,
  FaUser,
  FaUserTie,
  FaShoppingCart,
  FaHashtag,
  FaDollarSign,
  FaReceipt,
  FaBoxes,
} from "react-icons/fa";
import { createInvoiceFromSale } from "@/app/actions/invoiceActions";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";

export default function SaleDetailsClient({ sale }: { sale: any }) {
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoadingCheck(true);

      // 1. Verificar sesión
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast.error("Tu sesión expiró. Por favor, vuelve a iniciar sesión.");
        setLoadingCheck(false);
        return;
      }

      // 2. Traer configuración
      const { data: settingsData } = await supabase
        .from("settings")
        .select("key, value");
      if (isMounted && settingsData) {
        const settingsMap = settingsData.reduce(
          (acc, s) => ({ ...acc, [s.key]: s.value }),
          {}
        );
        setSettings(settingsMap);
      }

      // 3. Verificar si ya existe factura
      const { data: existingInvoice } = await supabase
        .from("invoices")
        .select("id, invoice_number, created_at, customer_data, items_data, total_amount")
        .eq("sale_id", sale.id)
        .maybeSingle();

      if (isMounted) {
        setInvoiceData(existingInvoice);
        setLoadingCheck(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [sale.id]);

  const handleGenerateInvoice = async () => {
    setLoadingGenerate(true);

    // 1. Chequear sesión antes de generar
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      toast.error("Tu sesión expiró. Por favor, vuelve a iniciar sesión.");
      setLoadingGenerate(false);
      return;
    }

    // 2. Generar factura
    const result = await createInvoiceFromSale(sale.id);
    if (result.success) {
      toast.success(result.message);
      setInvoiceData(result.invoiceData);
    } else {
      toast.error(result.message);
    }

    setLoadingGenerate(false);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-full">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3 mb-2">
                <FaReceipt className="text-blue-600" /> Detalle de Venta
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                <FaHashtag className="text-gray-400" />
                <span className="font-mono bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                  {sale.id}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/ventas"
                className="px-5 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:from-gray-200 hover:to-gray-300 dark:hover:from-slate-600 dark:hover:to-slate-500 transition-all shadow-sm hover:shadow-md font-medium flex items-center gap-2"
              >
                <FaArrowLeft /> Volver al Historial
              </Link>

              {loadingCheck ? (
                <span className="px-5 py-2.5 text-gray-500 dark:text-slate-400 flex items-center gap-2 bg-gray-100 dark:bg-slate-800 rounded-lg">
                  <FaSpinner className="animate-spin" /> Cargando...
                </span>
              ) : invoiceData ? (
                <InvoiceDownloadButton
                  invoiceData={invoiceData}
                  settings={settings}
                  fileName={`factura_${invoiceData.invoice_number}.pdf`}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transition-all"
                  readyLabel="Descargar Factura"
                />
              ) : (
                <button
                  onClick={handleGenerateInvoice}
                  disabled={loadingGenerate}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl transition-all"
                >
                  {loadingGenerate ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaFileInvoiceDollar />
                  )}
                  {loadingGenerate ? "Generando..." : "Generar Factura"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* INFORMACIÓN DE LA VENTA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Fecha */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                <FaCalendarAlt className="text-2xl text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                  Fecha de Venta
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-slate-50">
                  {new Date(sale.created_at).toLocaleDateString("es-AR")}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {new Date(sale.created_at).toLocaleTimeString("es-AR")}
                </p>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-lg">
                <FaUser className="text-2xl text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Cliente</p>
                <p className="text-lg font-bold text-gray-900 dark:text-slate-50">
                  {sale.customers?.full_name ?? "Sin cliente"}
                </p>
              </div>
            </div>
          </div>

          {/* Vendedor */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
                <FaUserTie className="text-2xl text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Vendedor</p>
                <p className="text-lg font-bold text-gray-900 dark:text-slate-50">
                  {sale.profiles?.full_name ?? "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TABLA DE PRODUCTOS */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-3">
              <FaShoppingCart className="text-blue-600" /> Productos Vendidos
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaBoxes /> Producto
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaHashtag /> Cantidad
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaDollarSign /> Precio Unit.
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaDollarSign /> Subtotal
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                {(sale.sale_items || []).map((item: any, index: number) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-slate-50">
                      {item.products?.name ?? "Producto borrado"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {item.quantity} unidades
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300 font-medium">
                      ${item.price?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-slate-50">
                      ${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-4 text-right text-base font-bold text-gray-900 dark:text-slate-50 uppercase"
                  >
                    Total de la Venta
                  </td>
                  <td className="px-6 py-4 text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-lg">
                      <FaDollarSign className="text-xl" />
                      <span className="text-2xl font-bold">
                        {sale.total_amount?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
