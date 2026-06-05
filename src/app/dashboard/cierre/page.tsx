"use client";

import { useState, useCallback } from "react";
import {
  getDeliveryCashClose,
  getDeskCashClose,
  type DeliveryCashCloseResult,
  type DeskCashCloseResult,
} from "@/app/actions/cashCloseActions";
import {
  FaTruck,
  FaStore,
  FaMoneyBillWave,
  FaUniversity,
  FaMobileAlt,
  FaFileInvoice,
  FaClock,
  FaCheckCircle,
  FaBan,
  FaBoxOpen,
  FaCalendarAlt,
  FaPrint,
  FaChevronLeft,
  FaChevronRight,
  FaSync,
  FaExclamationTriangle,
} from "react-icons/fa";
import { HiOutlineCash } from "react-icons/hi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const todayAR = () =>
  new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

const parseLocalDate = (d: string) => new Date(`${d}T12:00:00`);

function fmtDate(dateStr: string) {
  return parseLocalDate(dateStr).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function methodLabel(method: string | null) {
  if (!method) return "—";
  const map: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    mercado_pago: "Mercado Pago",
    mercadopago: "Mercado Pago",
    cuenta_corriente: "Cuenta Corriente",
  };
  return map[method.toLowerCase()] ?? method;
}

function methodBadge(method: string | null) {
  const colors: Record<string, string> = {
    efectivo: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    transferencia: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    mercado_pago: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
    mercadopago: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
    cuenta_corriente: "bg-amber-500/10 text-amber-600 dark:text-amber-405 border border-amber-500/20",
  };
  const key = (method ?? "").toLowerCase();
  return colors[key] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350 border border-slate-200/50 dark:border-slate-700/60";
}

// ─── Date nav ────────────────────────────────────────────────────────────────

function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const prev = () => {
    const d = parseLocalDate(date);
    d.setDate(d.getDate() - 1);
    onChange(d.toLocaleDateString("en-CA"));
  };
  const next = () => {
    const d = parseLocalDate(date);
    d.setDate(d.getDate() + 1);
    onChange(d.toLocaleDateString("en-CA"));
  };
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl px-4 py-2.5 shadow-2xs relative z-10">
      <button 
        onClick={prev} 
        className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all active:scale-95 text-slate-500 dark:text-slate-450"
      >
        <FaChevronLeft className="w-3 h-3" />
      </button>
      <div className="flex items-center gap-2.5 font-bold text-slate-800 dark:text-slate-100 text-xs">
        <FaCalendarAlt className="text-indigo-600 dark:text-indigo-400 w-3.5 h-3.5" />
        <input
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent border-none outline-none focus:ring-0 p-0 cursor-pointer text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-255"
        />
      </div>
      <button 
        onClick={next} 
        className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all active:scale-95 text-slate-500 dark:text-slate-450"
      >
        <FaChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Payment Breakdown Card ───────────────────────────────────────────────────

function PaymentRow({ icon, label, amount, color }: { icon: React.ReactNode; label: string; amount: number; color: string }) {
  if (amount === 0) return null;
  return (
    <div className={`flex items-center justify-between p-3.5 rounded-xl border border-transparent transition-all hover:scale-[1.01] ${color}`}>
      <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider">
        <span className="opacity-80">{icon}</span>
        {label}
      </div>
      <span className="font-black text-sm tracking-tight">{fmt(amount)}</span>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className={`rounded-2xl p-5 flex items-center gap-4 border shadow-2xs transition-all duration-300 hover:-translate-y-0.5 ${color}`}>
      <div className="text-2xl p-3 bg-white/10 rounded-xl backdrop-blur-xs flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-2xl font-black tracking-tight leading-none">{value}</p>
        <p className="text-[10px] font-black uppercase tracking-wider opacity-70 mt-1.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Reparto Tab ─────────────────────────────────────────────────────────────

function RepartoTab() {
  const [date, setDate] = useState(todayAR);
  const [data, setData] = useState<DeliveryCashCloseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    const res = await getDeliveryCashClose(d);
    if (res.success && res.data) {
      setData(res.data);
      setLoaded(true);
    } else {
      setError(res.error ?? "Error desconocido");
    }
    setLoading(false);
  }, []);

  const handleDateChange = (d: string) => {
    setDate(d);
    setLoaded(false);
    setData(null);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <DateNav date={date} onChange={handleDateChange} />
        <button
          onClick={() => load(date)}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 dark:bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaSync className={loading ? "animate-spin" : ""} />
          {loading ? "Generando..." : "Generar Cierre"}
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/25 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
          <FaExclamationTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {!loaded && !loading && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 p-16 text-center">
          <FaTruck className="text-4xl text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-pulse" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Selecciona una fecha y presiona el botón para <strong className="text-indigo-600 dark:text-indigo-400">Generar Cierre</strong>
          </p>
        </div>
      )}

      {loaded && data && (
        <div className="space-y-6 print:space-y-4" id="reparto-print">
          {/* Title */}
          <div className="hidden print:block text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Cierre de Reparto</h2>
            <p className="text-sm text-slate-500">{fmtDate(date)}</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:gap-2">
            <StatCard label="Total pedidos" value={data.totalOrders} icon={<FaBoxOpen />}
              color="bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/80 text-slate-800 dark:text-slate-100" />
            <StatCard label="Entregados" value={data.delivered} icon={<FaCheckCircle />}
              color="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" />
            <StatCard label="Pendientes" value={data.pending} icon={<FaClock />}
              color="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" />
            <StatCard label="Cancelados" value={data.cancelled} icon={<FaBan />}
              color="bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-450" />
          </div>

          {/* Cobros + Deuda */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cobros por método */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 p-6 shadow-2xs">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FaMoneyBillWave className="text-emerald-500" /> Cobros por Método
              </h3>
              <div className="space-y-2">
                <PaymentRow icon={<FaMoneyBillWave />} label="Efectivo" amount={data.collected.efectivo}
                  color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
                <PaymentRow icon={<FaUniversity />} label="Transferencia" amount={data.collected.transferencia}
                  color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
                <PaymentRow icon={<FaMobileAlt />} label="Mercado Pago" amount={data.collected.mercado_pago}
                  color="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" />
                <PaymentRow icon={<FaFileInvoice />} label="Cuenta Corriente" amount={data.collected.cuenta_corriente}
                  color="bg-amber-500/10 text-amber-600 dark:text-amber-450" />
                {data.collected.otros > 0 && (
                  <PaymentRow icon={<HiOutlineCash />} label="Otros" amount={data.collected.otros}
                    color="bg-slate-500/10 text-slate-600 dark:text-slate-350" />
                )}
                {data.collected.total === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6 font-semibold">Sin cobros registrados en pedidos entregados</p>
                )}
              </div>
              {data.collected.total > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Cobrado</span>
                  <span className="font-black text-2xl text-emerald-600 dark:text-emerald-450">{fmt(data.collected.total)}</span>
                </div>
              )}
            </div>

            {/* Deuda generada */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <FaExclamationTriangle className="text-amber-500" /> Resumen del Canal
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Entregado (Facturado)</span>
                    <span className="font-black text-sm">
                      {fmt(data.orders.filter(o => o.status === 'entregado').reduce((s, o) => s + o.total_amount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Efectivamente Cobrado</span>
                    <span className="font-black text-sm">{fmt(data.collected.total)}</span>
                  </div>
                  {data.debtGenerated > 0 && (
                    <div className="flex justify-between items-center p-3.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-455">
                      <span className="text-xs font-bold uppercase tracking-wider">Deuda Generada Hoy</span>
                      <span className="font-black text-sm">{fmt(data.debtGenerated)}</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 leading-relaxed font-semibold">
                * Los importes facturados representan la suma del stock entregado. El importe efectivamente cobrado contempla únicamente transacciones procesadas.
              </p>
            </div>
          </div>

          {/* Detalle de pedidos */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-2xs overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Historial de Pedidos del Canal</h3>
            </div>
            
            {/* Vista Escritorio */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-850">
                <thead className="bg-slate-50/60 dark:bg-slate-900/60 text-slate-550 dark:text-slate-400 uppercase tracking-widest font-black text-[10px] border-b border-slate-100 dark:border-slate-855">
                  <tr>
                    {["Cliente", "Estado", "Método de Pago", "Importe Total", "Cobrado", "Pendiente"].map((h) => (
                      <th key={h} className="px-6 py-3.5 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {data.orders.map((o) => (
                    <tr key={o.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${o.status === 'cancelado' ? 'opacity-40' : ''}`}>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{o.customer_name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-2xs font-extrabold uppercase tracking-wide border ${
                          o.status === 'entregado' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          o.status === 'cancelado' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                          {o.status === 'entregado' ? <FaCheckCircle /> : o.status === 'cancelado' ? <FaBan /> : <FaClock />}
                          {o.status === 'entregado' ? 'Entregado' : o.status === 'cancelado' ? 'Cancelado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {o.payment_method ? (
                          <span className={`px-2.5 py-0.5 rounded-lg text-2xs font-extrabold uppercase tracking-wide ${methodBadge(o.payment_method)}`}>
                            {methodLabel(o.payment_method)}
                          </span>
                        ) : <span className="text-slate-400 text-2xs">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200">{fmt(o.total_amount)}</td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-600 dark:text-emerald-450">{fmt(o.amount_paid)}</td>
                      <td className="px-6 py-4">
                        {o.amount_pending > 0
                          ? <span className="text-sm font-black text-rose-600 dark:text-rose-455">{fmt(o.amount_pending)}</span>
                          : <span className="text-slate-400 text-2xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.orders.length === 0 && (
                <div className="text-center py-12 text-xs font-semibold text-slate-450">No hay transacciones registradas para este día.</div>
              )}
            </div>

            {/* Vista Móvil */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-850">
              {data.orders.length === 0 ? (
                <div className="text-center py-12 text-xs font-semibold text-slate-450">No hay transacciones registradas para este día.</div>
              ) : (
                data.orders.map((o) => (
                  <div key={o.id} className={`p-4 space-y-3 ${o.status === 'cancelado' ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{o.customer_name}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide border ${
                        o.status === 'entregado' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        o.status === 'cancelado' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                        'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}>
                        {o.status === 'entregado' ? 'Entregado' : o.status === 'cancelado' ? 'Cancelado' : 'Pendiente'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-2 text-3xs font-bold">
                      <div>
                        <span className="text-slate-450 block uppercase font-bold mb-0.5">Método</span>
                        {o.payment_method ? (
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide ${methodBadge(o.payment_method)}`}>
                            {methodLabel(o.payment_method)}
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                      </div>
                      <div className="text-right">
                        <span className="text-slate-455 block uppercase font-bold">Total</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{fmt(o.total_amount)}</span>
                      </div>
                    </div>

                    {(o.amount_paid > 0 || o.amount_pending > 0) && (
                      <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-850/80 text-3xs font-bold">
                        <div>
                          <span className="text-slate-450 block uppercase font-bold">Cobrado</span>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-450">{fmt(o.amount_paid)}</span>
                        </div>
                        {o.amount_pending > 0 && (
                          <div className="text-right">
                            <span className="text-slate-450 block uppercase font-bold">Pendiente</span>
                            <span className="text-xs font-black text-rose-600 dark:text-rose-455">{fmt(o.amount_pending)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mostrador Tab ────────────────────────────────────────────────────────────

function MostradorTab() {
  const [date, setDate] = useState(todayAR);
  const [data, setData] = useState<DeskCashCloseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    const res = await getDeskCashClose(d);
    if (res.success && res.data) {
      setData(res.data);
      setLoaded(true);
    } else {
      setError(res.error ?? "Error desconocido");
    }
    setLoading(false);
  }, []);

  const handleDateChange = (d: string) => {
    setDate(d);
    setLoaded(false);
    setData(null);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <DateNav date={date} onChange={handleDateChange} />
        <button
          onClick={() => load(date)}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 dark:bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaSync className={loading ? "animate-spin" : ""} />
          {loading ? "Generando..." : "Generar Cierre"}
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/25 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
          <FaExclamationTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {!loaded && !loading && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 p-16 text-center">
          <FaStore className="text-4xl text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-pulse" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Selecciona una fecha y presiona el botón para <strong className="text-indigo-600 dark:text-indigo-400">Generar Cierre</strong>
          </p>
        </div>
      )}

      {loaded && data && (
        <div className="space-y-6" id="mostrador-print">
          {/* Title */}
          <div className="hidden print:block text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Cierre de Mostrador</h2>
            <p className="text-sm text-slate-500">{fmtDate(date)}</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Ventas" value={data.totalSales} icon={<FaBoxOpen />}
              color="bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/80 text-slate-800 dark:text-slate-100" />
            <StatCard label="Ventas Activas" value={data.activeSales} icon={<FaCheckCircle />}
              color="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" />
            <StatCard label="Anuladas" value={data.cancelledSales} icon={<FaBan />}
              color="bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-455" />
          </div>

          {/* Cobros */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 p-6 shadow-2xs">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <FaMoneyBillWave className="text-emerald-500" /> Cobros por Método de Pago
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PaymentRow icon={<FaMoneyBillWave />} label="Efectivo" amount={data.collected.efectivo}
                color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
              <PaymentRow icon={<FaUniversity />} label="Transferencia" amount={data.collected.transferencia}
                color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
              <PaymentRow icon={<FaMobileAlt />} label="Mercado Pago" amount={data.collected.mercado_pago}
                color="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" />
              <PaymentRow icon={<FaFileInvoice />} label="Cuenta Corriente (Fiado)" amount={data.collected.cuenta_corriente}
                color="bg-amber-500/10 text-amber-600 dark:text-amber-450" />
              {data.collected.otros > 0 && (
                <PaymentRow icon={<HiOutlineCash />} label="Otros" amount={data.collected.otros}
                  color="bg-slate-500/10 text-slate-600 dark:text-slate-350" />
              )}
            </div>
            {data.collected.total === 0 && (
              <p className="text-xs text-slate-450 text-center py-6 font-semibold">Sin ventas activas para esta fecha</p>
            )}
            {data.collected.total > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-450">Total Facturado</span>
                <span className="font-black text-2xl text-emerald-600 dark:text-emerald-450">{fmt(data.collected.total)}</span>
              </div>
            )}
          </div>

          {/* Detalle de ventas */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-2xs overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Historial de Ventas del Canal</h3>
            </div>

            {/* Vista Escritorio */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-850">
                <thead className="bg-slate-50/60 dark:bg-slate-900/60 text-slate-550 dark:text-slate-400 uppercase tracking-widest font-black text-[10px] border-b border-slate-100 dark:border-slate-850">
                  <tr>
                    {["Hora", "Cliente", "Método de Pago", "Monto Total", "Estado"].map((h) => (
                      <th key={h} className="px-6 py-3.5 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {data.sales.map((s) => (
                    <tr key={s.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${s.is_cancelled ? 'opacity-40' : ''}`}>
                      <td className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-450">
                        {new Date(s.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{s.customer_name}</td>
                      <td className="px-6 py-4">
                        {s.payment_method ? (
                          <span className={`px-2.5 py-0.5 rounded-lg text-2xs font-extrabold uppercase tracking-wide ${methodBadge(s.payment_method)}`}>
                            {methodLabel(s.payment_method)}
                          </span>
                        ) : <span className="text-slate-400 text-2xs">—</span>}
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold ${s.is_cancelled ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-855 dark:text-slate-100'}`}>
                        {fmt(s.total_amount)}
                      </td>
                      <td className="px-6 py-4">
                        {s.is_cancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-2xs font-extrabold uppercase tracking-wide bg-rose-500/10 text-rose-600 border border-rose-500/20"><FaBan /> Anulada</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-2xs font-extrabold uppercase tracking-wide bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><FaCheckCircle /> Activa</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.sales.length === 0 && (
                <div className="text-center py-12 text-xs font-semibold text-slate-450">No hay ventas registradas para este día.</div>
              )}
            </div>

            {/* Vista Móvil */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-850">
              {data.sales.length === 0 ? (
                <div className="text-center py-12 text-xs font-semibold text-slate-450">No hay ventas registradas para este día.</div>
              ) : (
                data.sales.map((s) => (
                  <div key={s.id} className={`p-4 space-y-3 ${s.is_cancelled ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">{s.customer_name}</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mt-0.5">
                          {new Date(s.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
                        </span>
                      </div>
                      <span>
                        {s.is_cancelled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide bg-rose-500/10 text-rose-600 border border-rose-500/20"><FaBan /> Anulada</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><FaCheckCircle /> Activa</span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-2 text-3xs font-bold">
                      <div>
                        <span className="text-slate-450 block uppercase font-bold mb-0.5">Método</span>
                        {s.payment_method ? (
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide ${methodBadge(s.payment_method)}`}>
                            {methodLabel(s.payment_method)}
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                      </div>
                      <div className="text-right">
                        <span className="text-slate-455 block uppercase font-bold">Total</span>
                        <span className={`text-xs font-bold ${s.is_cancelled ? 'line-through text-slate-450 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>{fmt(s.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "reparto" | "mostrador";

export default function CierreCajaPage() {
  const [tab, setTab] = useState<Tab>("reparto");

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 text-slate-800 dark:text-slate-100 p-1 md:p-4">
      {/* Header */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <HiOutlineCash className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Cierre de Caja
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-550 dark:text-slate-400 mt-0.5">
              Cierre y conciliación diaria de cobros por canal logístico
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all shadow-2xs font-bold text-xs uppercase tracking-wider relative z-10"
        >
          <FaPrint className="w-3.5 h-3.5" /> Imprimir Planilla
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-150/70 dark:bg-slate-950/80 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 self-start md:self-auto relative z-10 shadow-inner w-fit print:hidden">
        <button
          onClick={() => setTab("reparto")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${
            tab === "reparto"
              ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-xs border-b border-indigo-500/15"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <FaTruck className="w-3.5 h-3.5" /> Reparto
        </button>
        <button
          onClick={() => setTab("mostrador")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${
            tab === "mostrador"
              ? "bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 shadow-xs border-b border-emerald-500/15"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white"
          }`}
        >
          <FaStore className="w-3.5 h-3.5" /> Mostrador
        </button>
      </div>

      {/* Content */}
      <div className="transition-all duration-300">
        {tab === "reparto" ? <RepartoTab /> : <MostradorTab />}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #reparto-print, #reparto-print *, #mostrador-print, #mostrador-print * { visibility: visible; }
          #reparto-print, #mostrador-print { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
