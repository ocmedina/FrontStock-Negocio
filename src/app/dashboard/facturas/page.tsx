'use client'

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import LazyInvoiceDownloadButton from '@/components/pdf/InvoiceDownloadButton';
import { FaPrint, FaSpinner, FaFileInvoice } from 'react-icons/fa';

type SettingsMap = Record<string, string>;

type InvoiceListRow = {
  id: string;
  created_at: string;
  invoice_number: string;
  customer_data: {
    full_name?: string;
  } | null;
  total_amount: number;
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

    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .select('id, invoice_number, created_at, customer_data, items_data, total_amount')
      .eq('id', invoiceId)
      .single();

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [invoicesRes, settingsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, created_at, invoice_number, customer_data, total_amount')
          .order('created_at', { ascending: false }),
        supabase.from('settings').select('key, value'),
      ]);

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

    fetchData();
  }, []);

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
                      {invoice.invoice_number}
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
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      {invoice.invoice_number}
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
    </div>
  );
}
