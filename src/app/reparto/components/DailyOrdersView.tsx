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
  FaMobileAlt,
  FaFileInvoice,
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
  onViewDetails,
  onEditOrder,
  onPrintRemito,
  onDeliverOrder,
  onCancelOrder,
}: DailyOrdersViewProps) {
  // Parsear fecha con T12:00:00 evita que UTC medianoche cruce al día anterior en Argentina (-03:00)
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

  // ── Totals bar ───────────────────────────────────────────────────────────
  const deliveredOrders = dailyOrders.filter((o) => o.status === "entregado");
  const totalCobrado = deliveredOrders.reduce((s, o) => s + (o.amount_paid || 0), 0);
  const totalPendiente = deliveredOrders.reduce((s, o) => s + (o.amount_pending || 0), 0);
  const totalEfectivo = deliveredOrders
    .filter((o) => (o.payment_method || "").toLowerCase() === "efectivo")
    .reduce((s, o) => s + (o.amount_paid || 0), 0);
  const totalTransf = deliveredOrders
    .filter((o) => (o.payment_method || "").toLowerCase() === "transferencia")
    .reduce((s, o) => s + (o.amount_paid || 0), 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

  return (
    <main className="p-4 space-y-4 bg-gray-50 dark:bg-slate-900 min-h-screen">
      {/* Date Selector */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <button
          onClick={handlePrevDay}
          className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/80 dark:bg-slate-800 rounded-full transition-colors"
        >
          <FaChevronLeft />
        </button>
        <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-slate-100">
          <FaCalendarAlt className="text-blue-600" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent outline-none cursor-pointer"
          />
        </div>
        <button
          onClick={handleNextDay}
          className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/80 dark:bg-slate-800 rounded-full transition-colors"
        >
          <FaChevronRight />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 font-medium">Pendientes</p>
              <p className="text-3xl font-bold mt-1">{pendingOrdersCount}</p>
            </div>
            <FaClock className="text-4xl opacity-80" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 font-medium">Entregados</p>
              <p className="text-3xl font-bold mt-1">{deliveredOrdersCount}</p>
            </div>
            <FaCheckCircle className="text-4xl opacity-80" />
          </div>
        </div>
      </div>

      {/* Totals bar — solo si hay entregados */}
      {deliveredOrdersCount > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4 space-y-2">
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Resumen de cobros</p>
          <div className="grid grid-cols-2 gap-2">
            {totalEfectivo > 0 && (
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-green-700 dark:text-green-300 flex items-center gap-1"><FaMoneyBillWave className="text-green-500" />Efectivo</span>
                <span className="text-xs font-bold text-green-700 dark:text-green-300">{fmt(totalEfectivo)}</span>
              </div>
            )}
            {totalTransf > 0 && (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1"><FaUniversity className="text-blue-500" />Transf.</span>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{fmt(totalTransf)}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-slate-700">
            <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">Total cobrado</span>
            <span className="text-sm font-black text-green-600 dark:text-green-400">{fmt(totalCobrado)}</span>
          </div>
          {totalPendiente > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1"><FaExclamationTriangle className="text-xs" />Deuda generada</span>
              <span className="text-sm font-black text-red-600 dark:text-red-400">{fmt(totalPendiente)}</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700">
        <h2 className="font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2 text-lg">
          <FaClipboardList className="text-blue-600" /> Pedidos del{" "}
          {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("es-AR", {
            day: "numeric",
            month: "long",
          })}{" "}
          ({dailyOrders.length})
        </h2>
        <ul className="space-y-3">
          {dailyOrders.length > 0 ? (
            dailyOrders.map((order) => (
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
                      <div className="text-xs text-gray-600 dark:text-slate-300 mt-1 flex items-start gap-1">
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
                    )}
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      {new Date(order.created_at).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-xl text-green-600">
                      ${order.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {order.status === "entregado" && (
                      <div className="mt-1 space-y-0.5">
                        {order.amount_paid > 0 && (
                          <p className="text-xs font-semibold text-green-500">
                            Cobrado: {fmt(order.amount_paid)}
                          </p>
                        )}
                        {order.amount_pending > 0 && (
                          <p className="text-xs font-bold text-red-500 flex items-center gap-0.5 justify-end">
                            <FaExclamationTriangle className="text-xs" /> Debe: {fmt(order.amount_pending)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
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
              <FaClipboardList className="text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">
                No hay pedidos para esta fecha
              </p>
            </div>
          )}
        </ul>
      </div>
    </main>
  );
}
