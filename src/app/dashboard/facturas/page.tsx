'use client'

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import LazyInvoiceDownloadButton from '@/components/pdf/InvoiceDownloadButton';
import { 
  FaPrint, 
  FaSpinner, 
  FaFileInvoice, 
  FaPlus, 
  FaTimes, 
  FaFileInvoiceDollar, 
  FaUser, 
  FaIdCard, 
  FaReceipt, 
  FaSearch, 
  FaTrash, 
  FaBoxOpen, 
  FaShoppingCart,
  FaCheckCircle,
  FaFilter
} from 'react-icons/fa';
import { createInvoiceFromSale, createDirectInvoice } from '@/app/actions/invoiceActions';

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

type DirectItem = {
  id: string;
  product_id?: string;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
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
      invData = retryRes.data as any;
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

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'from_sale' | 'direct'>('from_sale');

  // Mode 1: From Pending Sale
  const [pendingSales, setPendingSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [saleSearchQuery, setSaleSearchQuery] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [invoiceType, setInvoiceType] = useState('B');
  const [customerCuit, setCustomerCuit] = useState('');
  const [customerIvaCondition, setCustomerIvaCondition] = useState('Consumidor Final');
  const [taxRateVal, setTaxRateVal] = useState(21.00);

  // Mode 2: Direct Invoice
  const [customersCatalog, setCustomersCatalog] = useState<any[]>([]);
  const [productsCatalog, setProductsCatalog] = useState<any[]>([]);
  const [directCustomerMode, setDirectCustomerMode] = useState<'manual' | 'catalog'>('manual');
  const [directSelectedCustomerId, setDirectSelectedCustomerId] = useState('');
  const [directCustomerName, setDirectCustomerName] = useState('');
  const [directCustomerCuit, setDirectCustomerCuit] = useState('');
  const [directCustomerIvaCondition, setDirectCustomerIvaCondition] = useState('Consumidor Final');
  const [directInvoiceType, setDirectInvoiceType] = useState('B');
  const [directTaxRateVal, setDirectTaxRateVal] = useState(21.00);
  const [directObservations, setDirectObservations] = useState('');
  const [directItems, setDirectItems] = useState<DirectItem[]>([
    { id: '1', name: '', quantity: 1, price: 0 }
  ]);

  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    let { data: fetchedInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, created_at, invoice_number, customer_data, total_amount, invoice_type')
      .order('created_at', { ascending: false });

    if (invoicesError) {
      // Fallback retry without invoice_type in case migration wasn't run yet
      const retryRes = await supabase
        .from('invoices')
        .select('id, created_at, invoice_number, customer_data, total_amount')
        .order('created_at', { ascending: false });
      fetchedInvoices = retryRes.data as any;
      invoicesError = retryRes.error;
    }

    const settingsRes = await supabase.from('settings').select('key, value');

    if (invoicesError) {
      toast.error('Error al cargar las facturas.');
    } else {
      setInvoices((fetchedInvoices || []) as InvoiceListRow[]);
    }

    if (settingsRes.error) {
      toast.error('Error al cargar configuración para PDF.');
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

  const loadCatalogs = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        supabase.from('customers').select('id, full_name, cuit, iva_condition, customer_type').eq('is_active', true).order('full_name'),
        supabase.from('products').select('id, name, sku, price_minorista, price_mayorista').eq('is_active', true).order('name')
      ]);

      if (custRes.data) setCustomersCatalog(custRes.data);
      if (prodRes.data) setProductsCatalog(prodRes.data);
    } catch (err) {
      console.error('Error loading catalogs:', err);
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    loadPendingSales();
    loadCatalogs();
  };

  // Filtered sales for Tab 1
  const filteredSales = useMemo(() => {
    if (!saleSearchQuery.trim()) return pendingSales;
    const query = saleSearchQuery.toLowerCase().trim();
    return pendingSales.filter(sale => {
      const customerName = sale.customers?.full_name?.toLowerCase() || 'consumidor final';
      const cuit = sale.customers?.cuit || '';
      const saleId = sale.id.toLowerCase();
      const amount = sale.total_amount?.toString() || '';
      return customerName.includes(query) || cuit.includes(query) || saleId.includes(query) || amount.includes(query);
    });
  }, [pendingSales, saleSearchQuery]);

  const handleSaleSelect = (sale: any) => {
    setSelectedSaleId(sale.id);
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
  };

  const handleGenerateFromSale = async () => {
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

  // Direct Invoice Helpers
  const handleCatalogCustomerChange = (customerId: string) => {
    setDirectSelectedCustomerId(customerId);
    const cust = customersCatalog.find(c => c.id === customerId);
    if (cust) {
      setDirectCustomerName(cust.full_name || '');
      setDirectCustomerCuit(cust.cuit || '');
      setDirectCustomerIvaCondition(cust.iva_condition || 'Consumidor Final');
      if (cust.customer_type === 'mayorista') {
        setDirectInvoiceType('A');
      }
    }
  };

  const handleAddDirectItem = () => {
    setDirectItems(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', quantity: 1, price: 0 }
    ]);
  };

  const handleRemoveDirectItem = (id: string) => {
    if (directItems.length <= 1) {
      toast.error('La factura debe tener al menos un ítem.');
      return;
    }
    setDirectItems(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateDirectItem = (id: string, field: keyof DirectItem, value: any) => {
    setDirectItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      if (field === 'product_id') {
        const prod = productsCatalog.find(p => p.id === value);
        if (prod) {
          return {
            ...item,
            product_id: value,
            name: prod.name,
            sku: prod.sku || '',
            price: Number(prod.price_minorista) || 0
          };
        }
      }

      return { ...item, [field]: value };
    }));
  };

  const directTotalAmount = useMemo(() => {
    return directItems.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
  }, [directItems]);

  const handleGenerateDirectInvoice = async () => {
    if (!directCustomerName.trim()) {
      toast.error('Ingresá el Nombre / Razón Social del cliente.');
      return;
    }

    if (directInvoiceType === 'A' && !directCustomerCuit.trim()) {
      toast.error('La Factura A requiere el CUIT del cliente.');
      return;
    }

    const validItems = directItems.filter(i => i.name.trim() !== '' && Number(i.quantity) > 0 && Number(i.price) >= 0);
    if (validItems.length === 0) {
      toast.error('Completá la descripción y precio de al menos un ítem.');
      return;
    }

    setGenerating(true);
    try {
      const result = await createDirectInvoice({
        customerData: {
          full_name: directCustomerName,
          cuit: directCustomerCuit,
          iva_condition: directCustomerIvaCondition
        },
        itemsData: validItems.map(i => ({
          name: i.name,
          sku: i.sku,
          quantity: Number(i.quantity) || 1,
          price: Number(i.price) || 0
        })),
        invoiceType: directInvoiceType,
        taxRateVal: directTaxRateVal,
        observations: directObservations
      });

      if (result.success) {
        toast.success(result.message || 'Factura directa generada exitosamente.');
        setShowCreateModal(false);
        // Reset direct form
        setDirectCustomerName('');
        setDirectCustomerCuit('');
        setDirectItems([{ id: '1', name: '', quantity: 1, price: 0 }]);
        setDirectObservations('');
        fetchData();
      } else {
        toast.error(result.message || 'Error al generar factura directa.');
      }
    } catch (err: any) {
      console.error('Error generating direct invoice:', err);
      toast.error('Error al generar factura directa.');
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
          onClick={handleOpenCreateModal}
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

      {/* MODAL CREACIÓN DE FACTURA (DOBLE PESTAÑA: DESDE VENTA / DIRECTA) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100 max-h-[92vh] flex flex-col my-auto">
            
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-5 sm:p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-black flex items-center gap-2">
                  <FaFileInvoiceDollar /> Nueva Emisión de Factura
                </h3>
                <p className="text-xs text-white/80 mt-1">
                  Generá un comprobante desde una venta previa o directamente sin asociar venta.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Pestañas de selección */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('from_sale')}
                className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-b-2 ${
                  activeTab === 'from_sale'
                    ? 'border-rose-500 text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FaShoppingCart /> Desde Venta Registrada
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('direct')}
                className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-b-2 ${
                  activeTab === 'direct'
                    ? 'border-rose-500 text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FaFileInvoice /> Factura Directa / Libre
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              
              {/* TAB 1: DESDE VENTA REGISTRADA */}
              {activeTab === 'from_sale' && (
                <div className="space-y-4">
                  {/* Buscador de Ventas */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Buscar Venta Pendiente de Facturar
                    </label>
                    <div className="relative">
                      <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                      <input
                        type="text"
                        value={saleSearchQuery}
                        onChange={(e) => setSaleSearchQuery(e.target.value)}
                        placeholder="Buscar por cliente, CUIT, monto o ID..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500/25 focus:border-rose-500 outline-none text-sm font-semibold transition-all"
                      />
                    </div>
                  </div>

                  {/* Listado de Ventas Filtradas */}
                  <div>
                    {loadingSales ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-550 py-8">
                        <FaSpinner className="animate-spin text-rose-500" />
                        <span>Cargando ventas pendientes...</span>
                      </div>
                    ) : filteredSales.length === 0 ? (
                      <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/40 p-4 rounded-xl text-center">
                        {saleSearchQuery ? "No se encontraron ventas con los filtros ingresados." : "⚠️ No hay ventas pendientes de facturar en el sistema."}
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-850">
                        {filteredSales.map((sale) => {
                          const isSelected = selectedSaleId === sale.id;
                          return (
                            <div
                              key={sale.id}
                              onClick={() => handleSaleSelect(sale)}
                              className={`p-3 rounded-xl cursor-pointer border transition-all flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 ring-1 ring-rose-500'
                                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-900 dark:text-white">
                                    {sale.customers?.full_name || "Consumidor Final"}
                                  </span>
                                  {sale.customers?.cuit && (
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                      CUIT: {sale.customers.cuit}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                                  <span>📅 {new Date(sale.created_at).toLocaleDateString("es-AR")}</span>
                                  <span>ID: {sale.id.substring(0, 8)}...</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-right">
                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                  ${sale.total_amount?.toLocaleString("es-AR")}
                                </span>
                                {isSelected && (
                                  <FaCheckCircle className="text-rose-500 text-lg shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                              className={`py-2.5 text-sm font-black rounded-xl border transition-all ${
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

                      {/* Condición IVA y CUIT */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                            <FaUser className="w-3 h-3 text-rose-500" /> Condición IVA
                          </label>
                          <select
                            value={customerIvaCondition}
                            onChange={(e) => setCustomerIvaCondition(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold"
                          >
                            <option value="Consumidor Final">Consumidor Final</option>
                            <option value="Responsable Inscripto">Responsable Inscripto</option>
                            <option value="Monotributista">Monotributista</option>
                            <option value="Exento">IVA Exento</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                            <FaIdCard className="w-3 h-3 text-rose-500" /> CUIT / CUIL / DNI {invoiceType === 'A' && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={customerCuit}
                            onChange={(e) => setCustomerCuit(e.target.value)}
                            placeholder={invoiceType === 'A' ? "Ej: 30-12345678-9 (Requerido)" : "Ej: 20-98765432-1"}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold"
                          />
                        </div>
                      </div>

                      {/* Alícuota IVA */}
                      {(invoiceType === 'A' || invoiceType === 'B') && (
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Alícuota IVA general
                          </label>
                          <select
                            value={taxRateVal}
                            onChange={(e) => setTaxRateVal(parseFloat(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold"
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
                </div>
              )}

              {/* TAB 2: FACTURA DIRECTA / LIBRE */}
              {activeTab === 'direct' && (
                <div className="space-y-4">
                  {/* Selector / Modo Cliente */}
                  <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <FaUser className="text-rose-500" /> Datos del Cliente
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDirectCustomerMode('manual')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                            directCustomerMode === 'manual'
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Manual
                        </button>
                        <button
                          type="button"
                          onClick={() => setDirectCustomerMode('catalog')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                            directCustomerMode === 'catalog'
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          De Catálogo
                        </button>
                      </div>
                    </div>

                    {directCustomerMode === 'catalog' && (
                      <div>
                        <select
                          value={directSelectedCustomerId}
                          onChange={(e) => handleCatalogCustomerChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold"
                        >
                          <option value="">-- Seleccionar cliente del sistema --</option>
                          {customersCatalog.map(cust => (
                            <option key={cust.id} value={cust.id}>
                              {cust.full_name} {cust.cuit ? `(CUIT: ${cust.cuit})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Nombre / Razón Social <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={directCustomerName}
                          onChange={(e) => setDirectCustomerName(e.target.value)}
                          placeholder="Ej: Consumidor Final / Juan Pérez"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          CUIT / CUIL / DNI {directInvoiceType === 'A' && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={directCustomerCuit}
                          onChange={(e) => setDirectCustomerCuit(e.target.value)}
                          placeholder={directInvoiceType === 'A' ? "Requerido para Tipo A" : "Opcional"}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        Condición IVA
                      </label>
                      <select
                        value={directCustomerIvaCondition}
                        onChange={(e) => setDirectCustomerIvaCondition(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold"
                      >
                        <option value="Consumidor Final">Consumidor Final</option>
                        <option value="Responsable Inscripto">Responsable Inscripto</option>
                        <option value="Monotributista">Monotributista</option>
                        <option value="Exento">IVA Exento</option>
                      </select>
                    </div>
                  </div>

                  {/* Configuración Fiscal de la Factura Directa */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Tipo de Factura
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['A', 'B', 'C'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setDirectInvoiceType(type);
                              if (type === 'A') setDirectCustomerIvaCondition('Responsable Inscripto');
                              else if (type === 'B') setDirectCustomerIvaCondition('Consumidor Final');
                              else setDirectCustomerIvaCondition('Monotributista');
                            }}
                            className={`py-2 text-xs font-black rounded-xl border transition-all ${
                              directInvoiceType === type
                                ? 'border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-950/40 dark:text-rose-400 ring-2 ring-rose-500/20'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            Factura {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(directInvoiceType === 'A' || directInvoiceType === 'B') && (
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          Alícuota IVA
                        </label>
                        <select
                          value={directTaxRateVal}
                          onChange={(e) => setDirectTaxRateVal(parseFloat(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold"
                        >
                          <option value={21.00}>21.0% (Tasa General)</option>
                          <option value={10.50}>10.5% (Tasa Reducida)</option>
                          <option value={27.00}>27.0% (Tasa Incrementada)</option>
                          <option value={0.00}>0.0% / Exento</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Ítems / Productos de la Factura */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <FaBoxOpen className="text-rose-500" /> Ítems a Facturar ({directItems.length})
                      </label>
                      <button
                        type="button"
                        onClick={handleAddDirectItem}
                        className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <FaPlus size={10} /> Agregar Ítem
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {directItems.map((item, index) => (
                        <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] font-black text-rose-500 w-4">{index + 1}.</span>
                            
                            {/* Selector opcional de catálogo */}
                            {productsCatalog.length > 0 && (
                              <select
                                value={item.product_id || ''}
                                onChange={(e) => handleUpdateDirectItem(item.id, 'product_id', e.target.value)}
                                className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs font-semibold truncate"
                              >
                                <option value="">-- Buscar en Catálogo (Opcional) --</option>
                                {productsCatalog.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} - ${p.price_minorista}
                                  </option>
                                ))}
                              </select>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveDirectItem(item.id)}
                              className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="sm:col-span-1">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateDirectItem(item.id, 'name', e.target.value)}
                                placeholder="Descripción del ítem *"
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateDirectItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                placeholder="Cant."
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => handleUpdateDirectItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                placeholder="Precio $"
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Resumen Total */}
                    <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl flex justify-between items-center">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                        Total Factura Directa:
                      </span>
                      <span className="text-base font-black text-rose-600 dark:text-rose-400">
                        ${directTotalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Observaciones */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        Observaciones (Opcional)
                      </label>
                      <input
                        type="text"
                        value={directObservations}
                        onChange={(e) => setDirectObservations(e.target.value)}
                        placeholder="Ej: Pago contado / Entrega especial..."
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de Acción Globales */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>

                {activeTab === 'from_sale' ? (
                  <button
                    type="button"
                    onClick={handleGenerateFromSale}
                    disabled={generating || !selectedSaleId}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl disabled:opacity-50 transition-all text-xs uppercase tracking-wider shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
                  >
                    {generating ? <FaSpinner className="animate-spin" /> : <FaReceipt />}
                    {generating ? 'Generando...' : 'Generar Comprobante'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateDirectInvoice}
                    disabled={generating || directTotalAmount <= 0}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl disabled:opacity-50 transition-all text-xs uppercase tracking-wider shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
                  >
                    {generating ? <FaSpinner className="animate-spin" /> : <FaReceipt />}
                    {generating ? 'Generando...' : 'Generar Factura Directa'}
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
