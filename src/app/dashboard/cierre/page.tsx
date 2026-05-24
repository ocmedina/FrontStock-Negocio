"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getDeliveryCashClose,
  getDeskCashClose,
  getChoferes,
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
    efectivo: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    transferencia: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    mercado_pago: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
    mercadopago: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
    cuenta_corriente: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  };
  const key = (method ?? "").toLowerCase();
  return colors[key] ?? "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300";
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
    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 shadow-sm">
      <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500">
        <FaChevronLeft />
      </button>
      <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-slate-100 text-sm">
        <FaCalendarAlt className="text-blue-500" />
        <input
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent outline-none cursor-pointer text-sm"
        />
      </div>
      <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500">
        <FaChevronRight />
      </button>
    </div>
  );
}

// ─── Payment Breakdown Card ───────────────────────────────────────────────────

function PaymentRow({ icon, label, amount, color }: { icon: React.ReactNode; label: string; amount: number; color: string }) {
  if (amount === 0) return null;
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl ${color}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <span className="font-bold text-sm">{fmt(amount)}</span>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className={`rounded-2xl p-5 flex items-center gap-4 shadow-sm border ${color}`}>
      <div className="text-2xl opacity-80">{icon}</div>
      <div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-xs font-medium opacity-70 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Reparto Tab ─────────────────────────────────────────────────────────────

function RepartoTab() {
  const [date, setDate] = useState(todayAR);
  const [profileId, setProfileId] = useState("todos");
  const [choferes, setChoferes] = useState<{id: string, full_name: string}[]>([]);
  const [data, setData] = useState<DeliveryCashCloseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getChoferes().then((res) => {
      setChoferes(res as any);
    });
  }, []);

  const load = useCallback(async (d: string, pId: string) => {
    setLoading(true);
    setError(null);
    const res = await getDeliveryCashClose(d, pId);
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

  const handleProfileChange = (pId: string) => {
    setProfileId(pId);
    setLoaded(false);
    setData(null);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <DateNav date={date} onChange={handleDateChange} />
          
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 shadow-sm">
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">Chofer:</span>
            <select
              value={profileId}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-sm font-medium text-gray-800 dark:text-slate-100"
            >
              <option value="todos">Todos los choferes</option>
              {choferes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => load(date, profileId)}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
        >
          <FaSync className={loading ? "animate-spin" : ""} />
          {loading ? "Cargando..." : "Generar Cierre"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300">
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {!loaded && !loading && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-12 text-center">
          <FaTruck className="text-5xl text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-400 dark:text-slate-500">Seleccioná la fecha y presioná <strong>Generar Cierre</strong></p>
        </div>
      )}

      {loaded && data && (
        <div className="space-y-6 print:space-y-4" id="reparto-print">
          {/* Title */}
          <div className="hidden print:block text-center mb-4">
            <h2 className="text-xl font-bold">Cierre de Reparto</h2>
            <p className="text-gray-600">{fmtDate(date)}</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:gap-2">
            <StatCard label="Total pedidos" value={data.totalOrders} icon={<FaBoxOpen />}
              color="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-100" />
            <StatCard label="Entregados" value={data.delivered} icon={<FaCheckCircle />}
              color="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300" />
            <StatCard label="Pendientes" value={data.pending} icon={<FaClock />}
              color="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300" />
            <StatCard label="Cancelados" value={data.cancelled} icon={<FaBan />}
              color="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300" />
          </div>

          {/* Cobros + Deuda */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cobros por método */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
              <h3 className="font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FaMoneyBillWave className="text-green-500" /> Cobros por Método
              </h3>
              <div className="space-y-2">
                <PaymentRow icon={<FaMoneyBillWave />} label="Efectivo" amount={data.collected.efectivo}
                  color="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300" />
                <PaymentRow icon={<FaUniversity />} label="Transferencia" amount={data.collected.transferencia}
                  color="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300" />
                <PaymentRow icon={<FaMobileAlt />} label="Mercado Pago" amount={data.collected.mercado_pago}
                  color="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-300" />
                <PaymentRow icon={<FaFileInvoice />} label="Cuenta Corriente" amount={data.collected.cuenta_corriente}
                  color="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300" />
                {data.collected.otros > 0 && (
                  <PaymentRow icon={<HiOutlineCash />} label="Otros" amount={data.collected.otros}
                    color="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300" />
                )}
                {data.collected.total === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Sin cobros en pedidos entregados</p>
                )}
              </div>
              {data.collected.total > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                  <span className="font-bold text-gray-700 dark:text-slate-200">Total Cobrado</span>
                  <span className="font-black text-xl text-green-600 dark:text-green-400">{fmt(data.collected.total)}</span>
                </div>
              )}
            </div>

            {/* Deuda generada */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 flex flex-col">
              <h3 className="font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FaExclamationTriangle className="text-orange-500" /> Resumen del Día
              </h3>
              <div className="space-y-3 flex-1">
                <div className="flex justify-between items-center p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">Total entregado (facturado)</span>
                  <span className="font-bold text-green-700 dark:text-green-300">
                    {fmt(data.orders.filter(o => o.status === 'entregado').reduce((s, o) => s + o.total_amount, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Efectivamente cobrado</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">{fmt(data.collected.total)}</span>
                </div>
                {data.debtGenerated > 0 && (
                  <div className="flex justify-between items-center p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
                    <span className="text-sm font-medium text-red-800 dark:text-red-300">Deuda generada hoy</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{fmt(data.debtGenerated)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resumen de Productos y Gastos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Productos Vendidos (Liquidación) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between bg-gray-50 dark:bg-slate-800">
                <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  <FaBoxOpen className="text-blue-500" /> Liquidación de Carga
                </h3>
                <span className="text-xs text-gray-500 font-medium">Bienes entregados</span>
              </div>
              <div className="p-0">
                {data.productsSummary && data.productsSummary.length > 0 ? (
                  <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                    {data.productsSummary.map(ps => (
                      <li key={ps.productId} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{ps.productName}</span>
                        <span className="font-bold text-gray-900 dark:text-slate-100 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-sm">
                          x{ps.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">Seleccioná un chofer o entregá un pedido</p>
                )}
              </div>
            </div>

            {/* Rendición Efectivo y Gastos */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800">
                <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  <FaMoneyBillWave className="text-indigo-500" /> Rendición de Efectivo
                </h3>
              </div>
              <div className="p-5 flex-1 flex flex-col space-y-4">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cobrado (Efectivo)</span>
                  <span className="font-bold text-gray-800 dark:text-slate-200">{fmt(data.collected.efectivo)}</span>
                </div>

                <div className="flex-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Gastos de Ruta</span>
                  {data.expenses && data.expenses.length > 0 ? (
                    <div className="space-y-2">
                      {data.expenses.map(exp => (
                        <div key={exp.id} className="flex justify-between items-center text-sm p-2 rounded bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                          <span className="text-red-800 dark:text-red-300 opacity-80">{exp.description}</span>
                          <span className="font-semibold text-red-600 dark:text-red-400">-{fmt(exp.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No se registraron gastos para este turno.</p>
                  )}
                </div>

                <div className="mt-auto border-t-2 border-indigo-100 dark:border-indigo-900/50 pt-4">
                  <div className="flex justify-between items-end backdrop-blur-sm bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                    <div>
                      <span className="text-xs text-indigo-600 dark:text-indigo-300 font-bold uppercase tracking-wide">A rendir en caja</span>
                      <p className="text-sm text-indigo-800 dark:text-indigo-200 opacity-70 mt-0.5">Efectivo - Gastos</p>
                    </div>
                    <span className="font-black text-2xl text-indigo-700 dark:text-indigo-300">
                      {fmt(data.netCashToHandOver)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detalle de pedidos */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-800 dark:text-slate-100">Detalle de Pedidos — {fmtDate(date)}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    {["Cliente", "Estado", "Método", "Total", "Cobrado", "Pendiente"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {data.orders.map((o) => (
                    <tr key={o.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${o.status === 'cancelado' ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">{o.customer_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          o.status === 'entregado' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          o.status === 'cancelado' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {o.status === 'entregado' ? <FaCheckCircle /> : o.status === 'cancelado' ? <FaBan /> : <FaClock />}
                          {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {o.payment_method ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${methodBadge(o.payment_method)}`}>
                            {methodLabel(o.payment_method)}
                          </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-slate-100">{fmt(o.total_amount)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">{fmt(o.amount_paid)}</td>
                      <td className="px-4 py-3">
                        {o.amount_pending > 0
                          ? <span className="text-sm font-bold text-red-600 dark:text-red-400">{fmt(o.amount_pending)}</span>
                          : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.orders.length === 0 && (
                <div className="text-center py-10 text-gray-400 dark:text-slate-500">No hay pedidos para esta fecha</div>
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
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold text-sm hover:from-green-700 hover:to-green-800 transition-all shadow-lg shadow-green-500/30 disabled:opacity-50"
        >
          <FaSync className={loading ? "animate-spin" : ""} />
          {loading ? "Cargando..." : "Generar Cierre"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300">
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {!loaded && !loading && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-12 text-center">
          <FaStore className="text-5xl text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-400 dark:text-slate-500">Seleccioná la fecha y presioná <strong>Generar Cierre</strong></p>
        </div>
      )}

      {loaded && data && (
        <div className="space-y-6" id="mostrador-print">
          {/* Title */}
          <div className="hidden print:block text-center mb-4">
            <h2 className="text-xl font-bold">Cierre de Mostrador</h2>
            <p className="text-gray-600">{fmtDate(date)}</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total ventas" value={data.totalSales} icon={<FaBoxOpen />}
              color="bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-100" />
            <StatCard label="Ventas activas" value={data.activeSales} icon={<FaCheckCircle />}
              color="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300" />
            <StatCard label="Anuladas" value={data.cancelledSales} icon={<FaBan />}
              color="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300" />
          </div>

          {/* Cobros */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
            <h3 className="font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <FaMoneyBillWave className="text-green-500" /> Cobros por Método de Pago
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PaymentRow icon={<FaMoneyBillWave />} label="Efectivo" amount={data.collected.efectivo}
                color="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300" />
              <PaymentRow icon={<FaUniversity />} label="Transferencia" amount={data.collected.transferencia}
                color="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300" />
              <PaymentRow icon={<FaMobileAlt />} label="Mercado Pago" amount={data.collected.mercado_pago}
                color="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-300" />
              <PaymentRow icon={<FaFileInvoice />} label="Cuenta Corriente (Fiado)" amount={data.collected.cuenta_corriente}
                color="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300" />
              {data.collected.otros > 0 && (
                <PaymentRow icon={<HiOutlineCash />} label="Otros" amount={data.collected.otros}
                  color="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300" />
              )}
            </div>
            {data.collected.total === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin ventas activas para esta fecha</p>
            )}
            {data.collected.total > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                <span className="font-bold text-gray-700 dark:text-slate-200">Total del Día</span>
                <span className="font-black text-2xl text-green-600 dark:text-green-400">{fmt(data.collected.total)}</span>
              </div>
            )}
          </div>

          {/* Detalle de ventas */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-800 dark:text-slate-100">Detalle de Ventas — {fmtDate(date)}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    {["Hora", "Cliente", "Método", "Total", "Estado"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {data.sales.map((s) => (
                    <tr key={s.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${s.is_cancelled ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
                        {new Date(s.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">{s.customer_name}</td>
                      <td className="px-4 py-3">
                        {s.payment_method ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${methodBadge(s.payment_method)}`}>
                            {methodLabel(s.payment_method)}
                          </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${s.is_cancelled ? 'line-through text-gray-400' : 'text-gray-800 dark:text-slate-100'}`}>
                        {fmt(s.total_amount)}
                      </td>
                      <td className="px-4 py-3">
                        {s.is_cancelled
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"><FaBan /> Anulada</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"><FaCheckCircle /> Activa</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.sales.length === 0 && (
                <div className="text-center py-10 text-gray-400 dark:text-slate-500">No hay ventas para esta fecha</div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <HiOutlineCash className="text-indigo-600" /> Cierre de Caja
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
            Resumen diario separado por canal de venta
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm font-medium text-sm print:hidden"
        >
          <FaPrint /> Imprimir
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 print:hidden">
        <button
          onClick={() => setTab("reparto")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            tab === "reparto"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
              : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
          }`}
        >
          <FaTruck /> Reparto
        </button>
        <button
          onClick={() => setTab("mostrador")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            tab === "mostrador"
              ? "bg-green-600 text-white shadow-lg shadow-green-500/30"
              : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
          }`}
        >
          <FaStore /> Mostrador
        </button>
      </div>

      {/* Content */}
      <div>
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
