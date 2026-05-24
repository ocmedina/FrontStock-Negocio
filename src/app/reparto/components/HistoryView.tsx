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
  onViewDetails,
  onEditOrder,
  onPrintRemito,
  onDeliverOrder,
  onCancelOrder,
}: HistoryViewProps) {
  return (
    <main className="p-4 space-y-4 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2 text-lg">
            <FaHistory className="text-blue-600" /> Historial Completo
          </h2>
          <select
            value={historyFilter}
            onChange={(e) => setHistoryFilter(e.target.value)}
            className="px-4 py-2 border-2 border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
          >
            <option value="all">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="entregado">Entregados</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>

        <div className="text-sm text-gray-600 dark:text-slate-300 mb-4">
          Mostrando {filteredHistoryOrders.length} pedido(s)
        </div>

        <ul className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
          {filteredHistoryOrders.length > 0 ? (
            filteredHistoryOrders.map((order) => (
              <li
                key={order.id}
                className="p-4 border-2 border-gray-200 dark:border-slate-700 rounded-xl hover:border-blue-300 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-slate-100">
                      {order.customers.full_name}
                    </p>
                    {order.customers.address && (
                      <div className="text-xs text-gray-600 dark:text-slate-300 mt-1 flex flex-col gap-1">
                        <div className="flex items-start gap-1">
                          <FaMapMarkerAlt className="text-gray-400 mt-0.5" />
                          <div>
                            <span>{order.customers.address}</span>
                            {order.customers.reference && (
                              <span className="block italic text-gray-500 dark:text-slate-400">
                                Ref: {order.customers.reference}
                              </span>
                            )}
                          </div>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            order.customers.address + ", Argentina"
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 w-fit"
                        >
                          <FaMapMarkerAlt size={10} /> Ver en Mapa
                        </a>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      {new Date(order.created_at).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p className="font-bold text-xl text-green-600">
                    ${order.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${order.status === "pendiente"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                        : order.status === "cancelado"
                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                          : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
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
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => onViewDetails(order.id)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-all"
                    >
                      <FaInfoCircle /> Ver
                    </button>
                    <button
                      onClick={() => onEditOrder(order.id)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-all"
                    >
                      <FaEdit /> Editar
                    </button>
                    {order.customers.address && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          order.customers.address + ", Argentina"
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 transition-all"
                      >
                        <FaMapMarkerAlt /> Mapa
                      </a>
                    )}
                    <button
                      onClick={() => onPrintRemito(order.id)}
                      className="flex items-center gap-1 px-2 py-1.5 bg-gray-600 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-all"
                    >
                      <FaPrint /> Remito
                    </button>
                    {order.status === "pendiente" && (
                      <>
                        <button
                          onClick={() => onDeliverOrder(order)}
                          className="flex items-center gap-1 px-2 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-all"
                        >
                          <FaTruck /> Entregar
                        </button>
                        <button
                          onClick={() => onCancelOrder(order)}
                          className="flex items-center gap-1 px-2 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-all"
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
              <FaHistory className="text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">
                No hay pedidos en el historial
              </p>
            </div>
          )}
        </ul>
      </div>
    </main>
  );
}
