import {
  FaClock,
  FaCheckCircle,
  FaClipboardList,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaEdit,
  FaPrint,
  FaTruck,
  FaBan,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaMoneyBillWave,
  FaUniversity,
  FaExclamationTriangle,
} from "react-icons/fa";

type Order = {
  id: string;
  customer_id: string;
  total_amount: number;
  amount_paid: number;
  amount_pending: number;
  payment_method: string | null;
  status: string;
  created_at: string;
  profile_id: string;
  customers: {
    full_name: string;
    address?: string | null;
    reference?: string | null;
  };
};

interface DailyOrdersViewProps {
  dailyOrders: Order[];
  pendingOrdersCount: number;
  deliveredOrdersCount: number;
  selectedDate: string;
  onDateChange: (date: string) => void;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onViewDetails: (orderId: string) => void;
  onEditOrder: (orderId: string) => void;
  onPrintRemito: (orderId: string) => void;
  onDeliverOrder: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
}

export default function DailyOrdersView({
  dailyOrders,
  pendingOrdersCount,
  deliveredOrdersCount,
  selectedDate,
  onDateChange,
  currentPage,
  totalPages,
  totalCount,
  onPrevPage,
  onNextPage,
  onViewDetails,
  onEditOrder,
  onPrintRemito,
  onDeliverOrder,
  onCancelOrder,
}: DailyOrdersViewProps) {
  // Parsear fecha con T12:00:00 evita desfasajes horarios
  const parseLocalDate = (dateStr: string) => new Date(`${dateStr}T12:00:00`);

  const handlePrevDay = () => {
    const date = parseLocalDate(selectedDate);
    date.setDate(date.getDate() - 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    onDateChange(`${yyyy}-${mm}-${dd}`);
  };

  const handleNextDay = () => {
    const date = parseLocalDate(selectedDate);
    date.setDate(date.getDate() + 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    onDateChange(`${yyyy}-${mm}-${dd}`);
  };

  // Cálculos de resumen
  const deliveredOrders = dailyOrders.filter((o) => o.status === "entregado");
  const totalCobrado = deliveredOrders.reduce((s, o) => s + (o.amount_paid || 0), 0);
  const totalPendiente = deliveredOrders.reduce((s, o) => s + (o.amount_pending || 0), 0);
  const totalEfectivo = deliveredOrders
    .filter((o) => (o.payment_method || "").toLowerCase() === "efectivo")
    .reduce((s, o) => s + (o.amount_paid || 0), 0);
  const totalTransf = deliveredOrders
    .filter((o) => (o.payment_method || "").toLowerCase() === "transferencia")
    .reduce((s, o) => s + (o.amount_paid || 0), 0);
  const totalCheque = deliveredOrders
    .filter((o) => (o.payment_method || "").toLowerCase() === "cheque")
    .reduce((s, o) => s + (o.amount_paid || 0), 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);
  return (
    <main className="max-w-7xl mx-auto p-4 space-y-4 pb-20">
      {/* Date & Counters Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Selector de Fecha */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between h-fit">
          <button
            onClick={handlePrevDay}
            className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800/85 bg-slate-50 dark:bg-slate-850 rounded-xl transition-all"
            title="Día anterior"
          >
            <FaChevronLeft size={12} />
          </button>
          <div className="flex items-center gap-2 font-black text-slate-850 dark:text-slate-150 text-xs uppercase tracking-wider">
            <FaCalendarAlt className="text-indigo-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent outline-none cursor-pointer font-black text-slate-800 dark:text-slate-205 focus:text-indigo-600 focus:dark:text-indigo-400"
            />
          </div>
          <button
            onClick={handleNextDay}
            className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800/85 bg-slate-50 dark:bg-slate-850 rounded-xl transition-all"
            title="Día siguiente"
          >
            <FaChevronRight size={12} />
          </button>
        </div>

        {/* Tarjetas de Contadores de Estado */}
        <div className="grid grid-cols-2 gap-3.5 md:col-span-2">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-5 text-white shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-black tracking-wider opacity-85">Pendientes</p>
              <p className="text-2xl font-black mt-0.5">{pendingOrdersCount}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <FaClock className="text-xl" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-black tracking-wider opacity-85">Entregados</p>
              <p className="text-2xl font-black mt-0.5">{deliveredOrdersCount}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <FaCheckCircle className="text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de Cobros del Día */}
      {deliveredOrdersCount > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm p-5 space-y-3">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-850 pb-2">
            Resumen de Cobros
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {totalEfectivo > 0 && (
              <div className="flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/15 rounded-xl px-3 py-2 border border-emerald-100/30 dark:border-emerald-900/10">
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 uppercase">
                  <FaMoneyBillWave className="text-emerald-500" /> Efectivo
                </span>
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-350">{fmt(totalEfectivo)}</span>
              </div>
            )}
            {totalTransf > 0 && (
              <div className="flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/15 rounded-xl px-3 py-2 border border-blue-100/30 dark:border-blue-900/10">
                <span className="text-[10px] font-black text-blue-800 dark:text-blue-400 flex items-center gap-1.5 uppercase">
                  <FaUniversity className="text-blue-550" /> Transf.
                </span>
                <span className="text-xs font-black text-blue-800 dark:text-blue-350">{fmt(totalTransf)}</span>
              </div>
            )}
            {totalCheque > 0 && (
              <div className="flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/15 rounded-xl px-3 py-2 border border-purple-100/30 dark:border-purple-900/10">
                <span className="text-[10px] font-black text-purple-800 dark:text-purple-400 flex items-center gap-1.5 uppercase">
                  <FaMoneyBillWave className="text-purple-500" /> Cheque
                </span>
                <span className="text-xs font-black text-purple-800 dark:text-purple-350">{fmt(totalCheque)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-850">
            <span className="text-xs font-bold text-slate-650 dark:text-slate-350">Total Cobrado</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{fmt(totalCobrado)}</span>
          </div>

          {totalPendiente > 0 && (
            <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <FaExclamationTriangle className="text-xs" /> Deuda Generada (Fiado)
              </span>
              <span className="text-base font-black">{fmt(totalPendiente)}</span>
            </div>
          )}
        </div>
      )}

      {/* Lista de Pedidos */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/80">
        <h2 className="font-black text-slate-850 dark:text-slate-100 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
          <FaClipboardList className="text-indigo-500" /> Pedidos Registrados
        </h2>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dailyOrders.length > 0 ? (
            dailyOrders.map((order) => (
              <li
                key={order.id}
                className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-305 transition-all bg-slate-50/20 dark:bg-slate-950/10"
              >
                <div className="flex justify-between items-start mb-3.5 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate">
                      {order.customers.full_name}
                    </p>
                    
                    {order.customers.address && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-start gap-1">
                        <FaMapMarkerAlt className="text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="block truncate">{order.customers.address}</span>
                          {order.customers.reference && (
                            <span className="block italic text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              Ref: {order.customers.reference}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-mono">
                      🕒 Horario: {new Date(order.created_at).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} hs
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="font-black text-base text-slate-900 dark:text-white">
                      ${order.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </p>
                    
                    {order.status === "entregado" && (
                      <div className="mt-1 space-y-0.5">
                        {order.amount_paid > 0 && (
                          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Pago: {fmt(order.amount_paid)}
                          </p>
                        )}
                        {order.amount_pending > 0 && (
                          <p className="text-[10px] font-bold text-rose-500 flex items-center gap-0.5 justify-end">
                            <FaExclamationTriangle className="text-[9px]" /> Debe: {fmt(order.amount_pending)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                  {/* Badge de Estado */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider w-fit ${
                      order.status === "pendiente"
                        ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border border-amber-500/10"
                        : order.status === "cancelado"
                        ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-500/10"
                        : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10"
                    }`}
                  >
                    {order.status === "pendiente" ? (
                      <FaClock />
                    ) : order.status === "cancelado" ? (
                      <FaBan />
                    ) : (
                      <FaCheckCircle />
                    )}
                    {order.status === "pendiente"
                      ? "Pendiente"
                      : order.status === "cancelado"
                      ? "Cancelado"
                      : "Entregado"}
                  </span>
                  
                  {/* Panel de Acciones */}
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <button
                      onClick={() => onViewDetails(order.id)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[10px] font-black rounded-lg transition-all"
                      title="Ver Detalles"
                    >
                      <FaInfoCircle /> Info
                    </button>
                    
                    <button
                      onClick={() => onEditOrder(order.id)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[10px] font-black rounded-lg transition-all"
                      title="Editar"
                    >
                      <FaEdit /> Ed.
                    </button>
                    
                    {order.customers.address && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          order.customers.address + ", Argentina"
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg transition-all"
                        title="Ver en Mapa"
                      >
                        <FaMapMarkerAlt /> Mapa
                      </a>
                    )}
                    
                    <button
                      onClick={() => onPrintRemito(order.id)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-705 dark:text-slate-200 text-[10px] font-black rounded-lg transition-all"
                      title="Imprimir Remito"
                    >
                      <FaPrint /> Remito
                    </button>
                    
                    {order.status === "pendiente" && (
                      <>
                        <button
                          onClick={() => onDeliverOrder(order)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition-all shadow-sm"
                          title="Entregar Pedido"
                        >
                          <FaTruck /> Entregar
                        </button>
                        <button
                          onClick={() => onCancelOrder(order)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black rounded-lg transition-all shadow-sm"
                          title="Cancelar Pedido"
                        >
                          <FaBan /> Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))
          ) : (
            <div className="text-center py-12">
              <FaClipboardList className="text-4xl text-slate-200 dark:text-slate-800 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500">No hay pedidos asignados</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Para esta fecha no se registran entregas</p>
            </div>
          )}
        </ul>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-105 dark:border-slate-850 pt-4">
            <span className="text-[10px] font-bold text-slate-500">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevPage}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-205 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                onClick={onNextPage}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-205 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sig
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
