import {
  FaHistory,
  FaMapMarkerAlt,
  FaClock,
  FaBan,
  FaCheckCircle,
  FaInfoCircle,
  FaEdit,
  FaPrint,
  FaTruck,
  FaCalendarAlt,
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

interface HistoryViewProps {
  filteredHistoryOrders: Order[];
  historyFilter: string;
  setHistoryFilter: (filter: string) => void;
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

export default function HistoryView({
  filteredHistoryOrders,
  historyFilter,
  setHistoryFilter,
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
}: HistoryViewProps) {
  return (
    <main className="max-w-7xl mx-auto p-4 space-y-4 pb-20">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/80">
        
        {/* Encabezado y Selector */}
        <div className="flex flex-col gap-3.5 mb-4 border-b border-slate-100 dark:border-slate-850 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
              <FaHistory className="text-indigo-600 dark:text-indigo-400 text-sm" />
            </div>
            <h2 className="font-black text-slate-850 dark:text-slate-100 text-xs uppercase tracking-wider">
              Historial de Entregas
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Filtrar:</span>
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
              title="Filtrar por estado"
            >
              <option value="all">Ver Todos los Pedidos</option>
              <option value="pendiente">Solo Pendientes</option>
              <option value="entregado">Solo Entregados</option>
              <option value="cancelado">Solo Cancelados</option>
            </select>
          </div>
        </div>

        <div className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          📊 Mostrando {filteredHistoryOrders.length} de {totalCount} registros
        </div>

        {/* Lista de Registros */}
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
          {filteredHistoryOrders.length > 0 ? (
            filteredHistoryOrders.map((order) => (
              <li
                key={order.id}
                className="p-4 border border-slate-200 dark:border-slate-850 rounded-2xl hover:border-indigo-305 transition-all bg-slate-50/10 dark:bg-slate-950/5"
              >
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate">
                      {order.customers.full_name}
                    </p>
                    
                    {order.customers.address && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-start gap-1">
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
                    
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-mono flex items-center gap-1">
                      <FaCalendarAlt size={10} />
                      {new Date(order.created_at).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })} - {new Date(order.created_at).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} hs
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="font-black text-base text-slate-900 dark:text-white">
                      ${order.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider w-fit ${
                      order.status === "pendiente"
                        ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-455 border border-amber-500/10"
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
                  
                  {/* Acciones */}
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <button
                      onClick={() => onViewDetails(order.id)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[10px] font-black rounded-lg transition-all"
                    >
                      <FaInfoCircle /> Info
                    </button>
                    
                    <button
                      onClick={() => onEditOrder(order.id)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[10px] font-black rounded-lg transition-all"
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
                        className="flex items-center gap-1 px-2 py-1.5 bg-indigo-55/10 hover:bg-indigo-50 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg transition-all"
                      >
                        <FaMapMarkerAlt /> Mapa
                      </a>
                    )}
                    
                    <button
                      onClick={() => onPrintRemito(order.id)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[10px] font-black rounded-lg transition-all"
                    >
                      <FaPrint /> Remito
                    </button>
                    
                    {order.status === "pendiente" && (
                      <>
                        <button
                          onClick={() => onDeliverOrder(order)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition-all shadow-sm"
                        >
                          <FaTruck /> Entregar
                        </button>
                        <button
                          onClick={() => onCancelOrder(order)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black rounded-lg transition-all shadow-sm"
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
              <FaHistory className="text-4xl text-slate-200 dark:text-slate-800 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Historial vacío</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">No se registran órdenes previas en la cuenta</p>
            </div>
          )}
        </ul>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-850 pt-4">
            <span className="text-[10px] font-bold text-slate-500">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevPage}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
