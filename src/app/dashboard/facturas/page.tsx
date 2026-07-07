'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import LazyInvoiceDownloadButton from '@/components/pdf/InvoiceDownloadButton';
import { FaPrint, FaSpinner, FaFileInvoice, FaPlus, FaTimes, FaFileInvoiceDollar, FaUser, FaIdCard, FaReceipt } from 'react-icons/fa';
import { createInvoiceFromSale } from '@/app/actions/invoiceActions';

type SettingsMap = Record<string, string>;

type InvoiceListRow = {
  id: string;
  created_at: string;
  invoice_number: string;
  customer_data: {
    full_name?: string;
    invoice_type?: string;
  } | null;
  total_amount: number;
  invoice_type?: string;
};

function InvoiceRowDownloadButton({
  invoiceId,
  settings,
}: {
  invoiceId: string;
  settings: SettingsMap;
}) {
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchInvoice = async () => {
    setLoading(true);

    let { data: invData, error: invError } = await supabase
      .from('invoices')
      .select('id, invoice_number, created_at, customer_data, items_data, total_amount, invoice_type, customer_cuit, customer_iva_condition')
      .eq('id', invoiceId)
      .single();

    if (invError) {
      // Retry without invoice_type columns in case migration was not run yet
      const retryRes = await supabase
        .from('invoices')
        .select('id, invoice_number, created_at, customer_data, items_data, total_amount')
        .eq('id', invoiceId)
        .single();
      invData = retryRes.data;
      invError = retryRes.error;
    }

    if (invError) {
      toast.error('Error al cargar la factura para PDF.');
      setLoading(false);
      return;
    }

    setInvoiceData(invData);
    setLoading(false);
  };

  if (invoiceData) {
    return (
      <LazyInvoiceDownloadButton
        invoiceData={invoiceData}
        settings={settings}
        fileName={`factura_${invoiceData.invoice_number}.pdf`}
        readyLabel='Descargar PDF'
        loadingLabel='Generando...'
        className='inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-xs hover:scale-[1.02]'
      />
    );
  }

  return (
    <button
      onClick={fetchInvoice}
      disabled={loading}
      className='inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50'
    >
      {loading ? (
        <FaSpinner className='animate-spin w-3 h-3' />
      ) : (
        <>
          <FaPrint className='w-3 h-3' /> Generar PDF
        </>
      )}
    </button>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);

  // Modal and creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingSales, setPendingSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [invoiceType, setInvoiceType] = useState("B");
  const [customerCuit, setCustomerCuit] = useState("");
  const [customerIvaCondition, setCustomerIvaCondition] = useState("Consumidor Final");
  const [generating, setGenerating] = useState(false);
  const [taxRateVal, setTaxRateVal] = useState(21.00);

  const fetchData = async () => {
    setLoading(true);

    let invoicesRes = await supabase
      .from('invoices')
      .select('id, created_at, invoice_number, customer_data, total_amount, invoice_type')
      .order('created_at', { ascending: false });

    if (invoicesRes.error) {
      // Fallback retry without invoice_type in case migration wasn't run yet
      invoicesRes = await supabase
        .from('invoices')
        .select('id, created_at, invoice_number, customer_data, total_amount')
        .order('created_at', { ascending: false });
    }

    const settingsRes = await supabase.from('settings').select('key, value');

    if (invoicesRes.error) {
      toast.error('Error al cargar las facturas.');
    } else {
      setInvoices((invoicesRes.data || []) as InvoiceListRow[]);
    }

    if (settingsRes.error) {
      toast.error('Error al cargar configuracion para PDF.');
    } else {
      const map = (settingsRes.data || []).reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as SettingsMap);

      setSettings(map);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadPendingSales = async () => {
    setLoadingSales(true);
    try {
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id, created_at, total_amount, customer_id, customers (id, full_name, cuit, iva_condition, customer_type)')
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('sale_id');

      if (invoicesError) throw invoicesError;

      const invoicedSaleIds = new Set(invoicesData?.map(i => i.sale_id).filter(Boolean));
      const pending = (salesData || []).filter(sale => !invoicedSaleIds.has(sale.id));
      setPendingSales(pending);
    } catch (err: any) {
      console.error("Error loading pending sales:", err);
      toast.error("Error al cargar las ventas pendientes.");
    } finally {
      setLoadingSales(false);
    }
  };

  const handleSaleChange = (saleId: string) => {
    setSelectedSaleId(saleId);
    const sale = pendingSales.find(s => s.id === saleId);
    if (sale) {
      const customer = sale.customers;
      if (customer) {
        setCustomerCuit(customer.cuit || "");
        setCustomerIvaCondition(customer.iva_condition || "Consumidor Final");
        const isMayorista = customer.customer_type === "mayorista";
        setInvoiceType(isMayorista ? "A" : "B");
      } else {
        setCustomerCuit("");
        setCustomerIvaCondition("Consumidor Final");
        setInvoiceType("B");
      }
    } else {
      setCustomerCuit("");
      setCustomerIvaCondition("Consumidor Final");
      setInvoiceType("B");
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedSaleId) {
      toast.error("Seleccioná una venta primero.");
      return;
    }
    if (invoiceType === "A" && !customerCuit.trim()) {
      toast.error("La Factura A requiere ingresar el CUIT del cliente.");
      return;
    }

    setGenerating(true);
    try {
      const result = await createInvoiceFromSale(
        selectedSaleId,
        invoiceType,
        customerCuit,
        customerIvaCondition,
        taxRateVal
      );
      if (result.success) {
        toast.success("Factura generada exitosamente.");
        setShowCreateModal(false);
        setSelectedSaleId("");
        fetchData();
      } else {
        toast.error(result.message || "Error al generar factura.");
      }
    } catch (err: any) {
      console.error("Error generating invoice:", err);
      toast.error("Error al generar factura.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8 text-slate-800 dark:text-slate-100 p-1 md:p-4">
      
      {/* Cabecera Premium */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <FaFileInvoice className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Historial de Facturas
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-550 dark:text-slate-400 mt-0.5">
              Consulta, comprobación y descarga de comprobantes emitidos en PDF
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            loadPendingSales();
          }}
          className="relative z-10 px-5 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-2 text-sm"
        >
          <FaPlus /> Crear Factura
        </button>
      </div>

      {/* Listado de Facturas */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs overflow-hidden">
        {/* Vista Escritorio */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/70 dark:bg-slate-900/60 text-slate-550 dark:text-slate-400 uppercase tracking-widest font-black text-[10px] border-b border-slate-100 dark:border-slate-800/80">
              <tr>
                <th className="px-6 py-4">Fecha de Emisión</th>
                <th className="px-6 py-4">Número de Factura</th>
                <th className="px-6 py-4">Cliente / Razón Social</th>
                <th className="px-6 py-4 text-right">Importe Total</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-550 dark:text-slate-400 animate-pulse font-semibold">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 rounded-full border-2 border-slate-350 border-t-rose-500 animate-spin"></div>
                      <span className="text-xs">Cargando historial de facturas...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-450 dark:text-slate-500 font-semibold text-xs">
                    No se han registrado facturas en el sistema.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr 
                    key={invoice.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {new Date(invoice.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-slate-850 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{invoice.invoice_number}</span>
                        <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-md uppercase
                          ${(invoice.invoice_type || invoice.customer_data?.invoice_type || 'B') === 'A' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                            : (invoice.invoice_type || invoice.customer_data?.invoice_type || 'B') === 'B'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                          {invoice.invoice_type || invoice.customer_data?.invoice_type || 'B'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {invoice.customer_data?.full_name ?? 'Cliente General'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-black text-slate-900 dark:text-white">
                      ${invoice.total_amount?.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <InvoiceRowDownloadButton invoiceId={invoice.id} settings={settings} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Vista Móvil (Tarjetas) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-850">
          {loading ? (
            <div className="px-6 py-12 text-center text-slate-550 dark:text-slate-400 animate-pulse font-semibold">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-slate-350 border-t-rose-500 animate-spin"></div>
                <span className="text-xs">Cargando facturas...</span>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-450 dark:text-slate-500 font-semibold text-xs">
              No se han registrado facturas en el sistema.
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="text-3xs font-extrabold tracking-widest text-rose-500 uppercase">Factura</span>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{invoice.invoice_number}</span>
                      <span className={`inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-md uppercase
                        ${(invoice.invoice_type || invoice.customer_data?.invoice_type || 'B') === 'A' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                          : (invoice.invoice_type || invoice.customer_data?.invoice_type || 'B') === 'B'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {invoice.invoice_type || invoice.customer_data?.invoice_type || 'B'}
                      </span>
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border px-2 py-0.5 rounded-lg">
                    {new Date(invoice.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center gap-2 pt-1">
                  <div>
                    <span className="text-3xs text-slate-450 block uppercase font-bold">Cliente</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {invoice.customer_data?.full_name ?? 'Cliente General'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-3xs text-slate-450 block uppercase font-bold">Total</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      ${invoice.total_amount?.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
                
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-850 flex justify-end">
                  <InvoiceRowDownloadButton invoiceId={invoice.id} settings={settings} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL CREACIÓN DE FACTURA DESDE LA SECCIÓN FACTURAS */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black flex items-center gap-2">
                  <FaFileInvoiceDollar /> Crear Factura de Venta
                </h3>
                <p className="text-xs text-white/80 mt-1">
                  Emití un comprobante A, B o C seleccionando una venta registrada.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Selección de Venta */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Seleccionar Venta Pendiente
                </label>
                {loadingSales ? (
                  <div className="flex items-center gap-2 text-sm text-slate-550 py-2.5">
                    <FaSpinner className="animate-spin text-rose-500" />
                    <span>Buscando ventas pendientes de facturar...</span>
                  </div>
                ) : pendingSales.length === 0 ? (
                  <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/40 p-3 rounded-xl">
                    ⚠️ No hay ventas registradas pendientes de facturar.
                  </div>
                ) : (
                  <select
                    value={selectedSaleId}
                    onChange={(e) => handleSaleChange(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500/25 focus:border-rose-500 outline-none text-sm font-semibold transition-all"
                  >
                    <option value="">-- Seleccioná una venta --</option>
                    {pendingSales.map((sale) => (
                      <option key={sale.id} value={sale.id}>
                        {new Date(sale.created_at).toLocaleDateString("es-AR")} - {sale.customers?.full_name || "Consumidor Final"} (Total: ${sale.total_amount})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedSaleId && (
                <>
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
                              ? 'border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-950/40 dark:text-rose-400 ring-2 ring-rose-500/20'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          Factura {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Condición de IVA */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                      <FaUser className="w-3 h-3 text-rose-500" /> Condición IVA del Cliente
                    </label>
                    <select
                      value={customerIvaCondition}
                      onChange={(e) => setCustomerIvaCondition(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500/25 focus:border-rose-500 outline-none text-sm font-semibold transition-all"
                    >
                      <option value="Consumidor Final">Consumidor Final</option>
                      <option value="Responsable Inscripto">Responsable Inscripto</option>
                      <option value="Monotributista">Monotributista</option>
                      <option value="Exento">IVA Exento</option>
                    </select>
                  </div>

                  {/* CUIT / CUIL / DNI */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                      <FaIdCard className="w-3 h-3 text-rose-500" /> CUIT / CUIL / DNI del Cliente {invoiceType === 'A' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={customerCuit}
                      onChange={(e) => setCustomerCuit(e.target.value)}
                      placeholder={invoiceType === 'A' ? "Ej: 30-12345678-9 (Requerido)" : "Ej: 20-98765432-1 (Opcional)"}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500/25 focus:border-rose-500 outline-none text-sm font-semibold transition-all"
                    />
                  </div>

                  {/* Alícuota IVA general */}
                  {(invoiceType === 'A' || invoiceType === 'B') && (
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                        Alícuota IVA general (para el cálculo de la factura)
                      </label>
                      <select
                        value={taxRateVal}
                        onChange={(e) => setTaxRateVal(parseFloat(e.target.value))}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500/25 focus:border-rose-500 outline-none text-sm font-semibold transition-all"
                      >
                        <option value={21.00}>21.0% (Tasa General)</option>
                        <option value={10.50}>10.5% (Tasa Reducida)</option>
                        <option value={27.00}>27.0% (Tasa Incrementada)</option>
                        <option value={0.00}>0.0% / Exento</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Acciones */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGenerateInvoice}
                  disabled={generating || !selectedSaleId}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl disabled:opacity-50 transition-all text-xs uppercase tracking-wider shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
                >
                  {generating ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaReceipt />
                  )}
                  {generating ? 'Generando...' : 'Generar Comprobante'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
