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

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceType, setInvoiceType] = useState("B");
  const [customerCuit, setCustomerCuit] = useState("");
  const [customerIvaCondition, setCustomerIvaCondition] = useState("Consumidor Final");

  useEffect(() => {
    if (sale?.customers) {
      const isMayorista = sale.customers.customer_type === "mayorista";
      setInvoiceType(isMayorista ? "A" : "B");
      setCustomerIvaCondition(isMayorista ? "Responsable Inscripto" : "Consumidor Final");
    }
  }, [sale]);

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
        .select("id, invoice_number, created_at, customer_data, items_data, total_amount, invoice_type, customer_cuit, customer_iva_condition, observations")
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
    if (invoiceType === "A" && !customerCuit.trim()) {
      toast.error("La Factura A requiere ingresar el CUIT del cliente.");
      return;
    }

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
    const result = await createInvoiceFromSale(
      sale.id,
      invoiceType,
      customerCuit,
      customerIvaCondition
    );
    if (result.success) {
      toast.success(result.message);
      setInvoiceData(result.invoiceData);
      setShowInvoiceModal(false);
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
                  onClick={() => setShowInvoiceModal(true)}
                  disabled={loadingGenerate}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl transition-all"
                >
                  <FaFileInvoiceDollar />
                  Generar Factura
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

      {/* MODAL DE GENERACIÓN DE FACTURA (A/B/C) */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <h3 className="text-xl font-black flex items-center gap-2">
                <FaFileInvoiceDollar /> Generar Factura
              </h3>
              <p className="text-xs text-white/80 mt-1">
                Seleccioná el tipo de comprobante y los datos fiscales del receptor.
              </p>
            </div>
            
            <div className="p-6 space-y-4 text-slate-800 dark:text-slate-100">
              {/* Tipo de Factura */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Tipo de Factura
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['A', 'B', 'C'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setInvoiceType(type);
                        if (type === 'A') {
                          setCustomerIvaCondition('Responsable Inscripto');
                        } else if (type === 'B') {
                          setCustomerIvaCondition('Consumidor Final');
                        } else {
                          setCustomerIvaCondition('Monotributista');
                        }
                      }}
                      className={`py-3 text-sm font-black rounded-xl border transition-all ${
                        invoiceType === type
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-400 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Factura {type}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed font-medium">
                  {invoiceType === 'A' && 'Emitida por Responsable Inscripto a Responsable Inscripto. Discrimina IVA 21%.'}
                  {invoiceType === 'B' && 'Emitida por Responsable Inscripto a Consumidores Finales o Exentos. IVA incluido.'}
                  {invoiceType === 'C' && 'Emitida por Monotributistas. No contiene conceptos de IVA.'}
                </p>
              </div>

              {/* Condicion de IVA */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Condición IVA del Cliente
                </label>
                <select
                  value={customerIvaCondition}
                  onChange={(e) => setCustomerIvaCondition(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-semibold transition-all"
                >
                  <option value="Consumidor Final">Consumidor Final</option>
                  <option value="Responsable Inscripto">Responsable Inscripto</option>
                  <option value="Monotributista">Monotributista</option>
                  <option value="Exento">IVA Exento</option>
                </select>
              </div>

              {/* CUIT / CUIL / DNI */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  CUIT / CUIL / DNI del Cliente {invoiceType === 'A' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={customerCuit}
                  onChange={(e) => setCustomerCuit(e.target.value)}
                  placeholder={invoiceType === 'A' ? "Ej: 30-12345678-9 (Requerido)" : "Ej: 20-98765432-1 (Opcional)"}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-semibold transition-all"
                />
              </div>

              {/* Acciones del Modal */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGenerateInvoice}
                  disabled={loadingGenerate}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold rounded-xl disabled:opacity-50 transition-all text-xs uppercase tracking-wider shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
                >
                  {loadingGenerate ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaFileInvoiceDollar />
                  )}
                  {loadingGenerate ? 'Generando...' : 'Generar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
