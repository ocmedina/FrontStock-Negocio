"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  FaSearch,
  FaPlus,
  FaTimes,
  FaInfoCircle,
  FaUser,
  FaBox,
  FaCalendarAlt,
  FaHashtag,
  FaSpinner,
  FaClock,
  FaCheckCircle,
  FaBan,
  FaPrint,
  FaDollarSign,
  FaTruck,
  FaEye,
  FaInbox,
  FaMoneyBillWave,
  FaFileInvoice,
  FaBoxOpen,
  FaExchangeAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";
import OrderStatusChanger from "@/components/OrderStatusChanger";
import PDFDownloadButton from "@/components/pdf/PDFDownloadButton";

const ITEMS_PER_PAGE = 15;

type CustomerRow = {
  id: string;
  full_name: string;
  delivery_day: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  stock: number | null;
};

type OrderItemRow = {
  quantity: number;
  products: ProductRow | null;
};

type OrderRow = {
  id: string;
  created_at: string;
  total_amount: number | null;
  status: "pendiente" | "confirmado" | "enviado" | "entregado" | "cancelado";
  customers: CustomerRow | null;
  order_items: OrderItemRow[];
};

type FullOrderDetails = {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  customers: {
    id: string;
    full_name: string;
    phone?: string | null;
    address?: string | null;
    email?: string | null;
    customer_type?: string;
    delivery_day?: string | null;
  };
  order_items: {
    id: string;
    quantity: number;
    price: number;
    products: {
      name: string;
      sku?: string | null;
    } | null;
  }[];
};

const STATUS_CONFIG = {
  todos: {
    label: "Todos",
    color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/50 dark:border-slate-750",
    activeColor: "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-semibold shadow-sm",
  },
  pendiente: {
    label: "Pendientes",
    color: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/20",
    activeColor: "bg-amber-600 text-white font-semibold shadow-sm",
  },
  confirmado: {
    label: "Confirmados",
    color: "bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border-sky-200/20",
    activeColor: "bg-sky-600 text-white font-semibold shadow-sm",
  },
  enviado: {
    label: "Enviados",
    color: "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200/20",
    activeColor: "bg-purple-600 text-white font-semibold shadow-sm",
  },
  entregado: {
    label: "Entregados",
    color: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/20",
    activeColor: "bg-emerald-600 text-white font-semibold shadow-sm",
  },
  cancelado: {
    label: "Cancelados",
    color: "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200/20",
    activeColor: "bg-rose-600 text-white font-semibold shadow-sm",
  },
} as const;

const DAYS_OF_WEEK = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

// --- Modal de Detalles del Pedido ---
function OrderDetailsModal({
  isOpen,
  onClose,
  orderId,
}: {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}) {
  const [orderData, setOrderData] = useState<FullOrderDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      setLoading(true);
      const fetchFullOrder = async () => {
        try {
          const { data: order, error } = await supabase
            .from("orders")
            .select("*, customers(*), order_items(*, products(*))")
            .eq("id", orderId)
            .single();

          if (error) throw error;
          if (order) {
            setOrderData(order as FullOrderDetails);
          }
        } catch (error: any) {
          toast.error("No se pudieron cargar los datos del pedido.");
          console.error(error);
          onClose();
        } finally {
          setLoading(false);
        }
      };
      fetchFullOrder();
    }
  }, [isOpen, orderId, onClose]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; color: string; icon: React.ReactNode }
    > = {
      pendiente: {
        label: "Pendiente",
        color: "bg-amber-50 text-amber-705 border-amber-200/30 dark:bg-amber-950/20 dark:text-amber-400",
        icon: <FaClock className="w-2.5 h-2.5" />,
      },
      confirmado: {
        label: "Confirmado",
        color: "bg-sky-50 text-sky-705 border-sky-200/30 dark:bg-sky-950/20 dark:text-sky-400",
        icon: <FaCheckCircle className="w-2.5 h-2.5" />,
      },
      enviado: {
        label: "Enviado",
        color: "bg-purple-50 text-purple-705 border-purple-200/30 dark:bg-purple-950/20 dark:text-purple-400",
        icon: <FaTruck className="w-2.5 h-2.5" />,
      },
      entregado: {
        label: "Entregado",
        color: "bg-emerald-50 text-emerald-705 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400",
        icon: <FaCheckCircle className="w-2.5 h-2.5" />,
      },
      cancelado: {
        label: "Cancelado",
        color: "bg-rose-50 text-rose-705 border-rose-200/30 dark:bg-rose-950/20 dark:text-rose-400",
        icon: <FaBan className="w-2.5 h-2.5" />,
      },
    };

    const config = statusConfig[status] || statusConfig.pendiente;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${config.color}`}
      >
        {config.icon} {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg max-w-xl w-full max-h-[85vh] flex flex-col border border-slate-200/20 animate-fadeIn">
        <div className="bg-slate-900 dark:bg-slate-950 px-5 py-4 rounded-t-xl flex justify-between items-center text-white">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <FaInfoCircle /> Detalle de Pedido
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-all"
            id="btn-close-details-modal"
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {loading || !orderData ? (
            <div className="flex flex-col items-center justify-center h-48">
              <FaSpinner className="animate-spin text-2xl text-slate-500 mb-2" />
              <p className="text-xs text-slate-500">Cargando...</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Info General */}
              <div className="bg-slate-50/50 dark:bg-slate-950/30 rounded-xl p-3 border border-slate-100 dark:border-slate-850">
                <div className="flex items-center justify-between mb-2 border-b border-slate-250/20 dark:border-slate-800/80 pb-1.5">
                  <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
                    Pedido
                  </h3>
                  {getStatusBadge(orderData.status)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-400 mb-0.5">ID Interno</p>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-250">
                      #{orderData.id.slice(0, 8)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-0.5">Fecha Registro</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-255">
                      {new Date(orderData.created_at).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400 mb-1">Medio de Pago</p>
                    {(orderData as any).payment_method === "fiado" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200/50 dark:bg-orange-950/20 dark:text-orange-400">
                        <FaFileInvoice className="w-2.5 h-2.5" /> Fiado / Cta. Cte.
                      </span>
                    ) : (orderData as any).payment_method === "transferencia" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400">
                        <FaDollarSign className="w-2.5 h-2.5" /> Transferencia
                      </span>
                    ) : (orderData as any).payment_method === "mixto" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/50 dark:bg-purple-950/20 dark:text-purple-400">
                        <FaExchangeAlt className="w-2.5 h-2.5" /> Pago Mixto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400">
                        <FaMoneyBillWave className="w-2.5 h-2.5" /> Efectivo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Cliente */}
              <div className="bg-slate-50/50 dark:bg-slate-950/30 rounded-xl p-3 border border-slate-100 dark:border-slate-850">
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-250/20 dark:border-slate-800/80 pb-1.5">
                  Cliente
                </h3>
                <div className="space-y-1">
                  <p className="font-bold text-slate-850 dark:text-slate-100">
                    {orderData.customers.full_name}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 pt-0.5">
                    {orderData.customers.phone && <span>Tel: {orderData.customers.phone}</span>}
                    {orderData.customers.address && <span>Dirección: {orderData.customers.address}</span>}
                    {orderData.customers.delivery_day && (
                      <span className="font-semibold text-indigo-650 dark:text-indigo-400">
                        Reparto: {orderData.customers.delivery_day}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Artículos */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <FaBox className="w-2.5 h-2.5" /> Artículos ({orderData.order_items.length})
                </h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {orderData.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-lg text-2xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {item.products?.name || "Artículo sin nombre"}
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          Cant: <span className="font-bold text-slate-805 dark:text-slate-205">{item.quantity}</span>
                        </p>
                      </div>
                      <div className="text-right font-semibold">
                        <p className="text-slate-400">Unit: ${item.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
                        <p className="font-bold text-slate-850 dark:text-slate-100 mt-0.5">
                          ${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Caja de Totales */}
              <div className="bg-slate-950 dark:bg-black text-white rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between items-center text-2xs opacity-80 border-b border-white/10 pb-1">
                  <span>Importe Facturado:</span>
                  <span className="font-bold">${orderData.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                </div>
                
                {(orderData as any).amount_paid !== undefined && (
                  <div className="space-y-1 text-2xs">
                    <div className="flex justify-between items-center opacity-70">
                      <span>Monto Entregado:</span>
                      <span>${((orderData as any).amount_paid || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {((orderData as any).amount_pending || 0) > 0 ? (
                      <div className="flex justify-between items-center text-amber-400 font-bold border-t border-white/5 pt-1">
                        <span>Saldo Pendiente:</span>
                        <span>${((orderData as any).amount_pending || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-emerald-400 font-semibold border-t border-white/5 pt-1">
                        <span>Estado de cuenta:</span>
                        <span>Totalmente Pagado</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-b-xl">
          <button
            id="btn-close-details-modal-footer"
            onClick={onClose}
            className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 text-xs font-bold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Modal de REMITO PDF ---
function RemitoModal({
  isOpen,
  onClose,
  orderId,
}: {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}) {
  const [orderData, setOrderData] = useState<FullOrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [printFormat, setPrintFormat] = useState<"A4" | "thermal">("thermal");

  useEffect(() => {
    if (isOpen && orderId) {
      setLoading(true);
      const fetchFullOrder = async () => {
        try {
          const { data: order, error } = await supabase
            .from("orders")
            .select("*, customers(*), order_items(*, products(*))")
            .eq("id", orderId)
            .single();

          if (error) throw error;
          if (order) {
            const customerId = order.customer_id;
            let realDebt = 0;

            try {
              const [ordersRes, salesRes] = await Promise.all([
                supabase
                  .from("orders")
                  .select("amount_pending, status")
                  .eq("customer_id", customerId)
                  .neq("status", "cancelado"),
                supabase
                  .from("sales")
                  .select("amount_pending, payment_method, is_cancelled")
                  .eq("customer_id", customerId)
              ]);

              const ordersDebt = (ordersRes.data || [])
                .filter((o: any) => o.status !== "cancelado" && Number(o.amount_pending || 0) > 0)
                .reduce((s: number, o: any) => s + Number(o.amount_pending), 0);

              const salesDebt = (salesRes.data || [])
                .filter(
                  (sv: any) =>
                    !sv.is_cancelled &&
                    (sv.payment_method || "").toLowerCase() === "cuenta_corriente" &&
                    Number(sv.amount_pending || 0) > 0
                )
                .reduce((s: number, sv: any) => s + Number(sv.amount_pending), 0);

              realDebt = ordersDebt + salesDebt;
            } catch (debtErr) {
              console.error("[RemitoModal] error calculando deuda:", debtErr);
            }

            setOrderData({
              ...order,
              customers: { ...order.customers, realDebt },
            } as FullOrderDetails);
          }
        } catch (error: any) {
          toast.error("No se pudieron cargar los datos del remito.");
          console.error(error);
          onClose();
        } finally {
          setLoading(false);
        }
      };
      fetchFullOrder();
    }
  }, [isOpen, orderId, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg max-w-sm w-full border border-slate-200/20 animate-fadeIn">
        <div className="bg-slate-900 dark:bg-slate-950 px-5 py-4 rounded-t-xl flex justify-between items-center text-white">
          <h2 className="text-xs font-bold flex items-center gap-1.5">
            <FaPrint /> Generar Remito PDF
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white rounded-lg p-1 hover:bg-white/10"
            id="btn-close-remito-modal"
          >
            <FaTimes size={14} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {loading || !orderData ? (
            <div className="flex flex-col items-center justify-center h-28">
              <FaSpinner className="animate-spin text-xl text-slate-500 mb-1" />
              <p className="text-2xs text-slate-500">Cargando...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-2xs text-slate-500 text-center leading-normal">
                Exporta el remito comercial de <span className="font-bold text-slate-850 dark:text-white">{orderData.customers.full_name}</span>.
              </p>

              {/* Formato */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Formato de Salida
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPrintFormat("thermal")}
                    className={`p-2 rounded-lg border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                      printFormat === "thermal"
                        ? "border-blue-500 bg-blue-50/10 text-blue-600 dark:text-blue-400"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500"
                    }`}
                  >
                    <span className="text-xs font-bold">Ticket Térmico (80mm)</span>
                  </button>
                  <button
                    onClick={() => setPrintFormat("A4")}
                    className={`p-2 rounded-lg border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                      printFormat === "A4"
                        ? "border-blue-500 bg-blue-50/10 text-blue-600 dark:text-blue-400"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500"
                    }`}
                  >
                    <span className="text-xs font-bold">Hoja A4 Estándar</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-850 space-y-1.5">
                <PDFDownloadButton orderData={orderData} printFormat={printFormat} />
                
                <button
                  id="btn-close-remito-footer"
                  onClick={onClose}
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [selectedOrderIdForDetails, setSelectedOrderIdForDetails] = useState<string | null>(null);
  const [isRemitoModalOpen, setIsRemitoModalOpen] = useState(false);
  const [selectedOrderIdForRemito, setSelectedOrderIdForRemito] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"todos" | OrderRow["status"]>("todos");
  const [dateFilter, setDateFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryDayFilter, setDeliveryDayFilter] = useState("todos");

  const hasActiveFilters =
    statusFilter !== "todos" ||
    dateFilter ||
    searchQuery ||
    deliveryDayFilter !== "todos";

  const clearFilters = () => {
    setStatusFilter("todos");
    setDateFilter("");
    setSearchQuery("");
    setDeliveryDayFilter("todos");
    setCurrentPage(1);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);

    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from("orders")
      .select(
        `
        id, created_at, total_amount, status, payment_method, amount_paid, amount_pending,
        customers ( id, full_name, delivery_day ),
        order_items ( quantity, products ( id, name, stock ) )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (statusFilter !== "todos") query = query.eq("status", statusFilter);
    
    if (dateFilter) {
      const startDate = `${dateFilter}T00:00:00-03:00`;
      const endDate = `${dateFilter}T23:59:59.999-03:00`;
      query = query.gte("created_at", startDate).lte("created_at", endDate);
    }
    
    if (searchQuery.length > 2) {
      query = query.ilike("customers.full_name", `%${searchQuery}%`);
    }
    
    if (deliveryDayFilter !== "todos") {
      query = query.eq("customers.delivery_day", deliveryDayFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      toast.error("Error al cargar los pedidos.");
      console.error(error);
    } else {
      setOrders((data || []) as unknown as OrderRow[]);
      setTotalCount(count || 0);
    }

    setLoading(false);
  }, [currentPage, statusFilter, dateFilter, searchQuery, deliveryDayFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchOrders, 300);
    return () => clearTimeout(debounce);
  }, [fetchOrders]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-950 min-h-full text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Modales */}
      <OrderDetailsModal
        isOpen={isOrderDetailsModalOpen}
        onClose={() => setIsOrderDetailsModalOpen(false)}
        orderId={selectedOrderIdForDetails}
      />

      <RemitoModal
        isOpen={isRemitoModalOpen}
        onClose={() => setIsRemitoModalOpen(false)}
        orderId={selectedOrderIdForRemito}
      />

      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm mb-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-0.5">
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-md uppercase">
              Operaciones
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mt-1 flex items-center gap-2">
              <FaBox className="text-slate-600 dark:text-slate-400 w-5 h-5" /> Pedidos Recibidos
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Historial comercial, despacho de mercadería y emisión de remitos.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Link
              id="btn-pedidos-pendientes"
              href="/dashboard/pedidos/pendientes"
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 text-amber-705 dark:text-amber-400 rounded-lg transition-colors font-semibold text-xs flex items-center gap-1.5 border border-amber-250/20 shadow-2xs"
            >
              <FaClock className="w-3 h-3" /> Saldos Pendientes
            </Link>
            <Link
              id="btn-nuevo-pedido-header"
              href="/dashboard/pedidos/nuevo"
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 rounded-lg transition-colors font-bold text-xs flex items-center gap-1.5"
            >
              <FaPlus className="w-3 h-3" /> Registrar Pedido
            </Link>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDAS */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-850 shadow-sm p-5 space-y-4 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-850/80 pb-3.5">
          <div className="flex flex-wrap gap-1">
            {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((status) => {
              const config = STATUS_CONFIG[status];
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  id={`btn-filter-status-${status}`}
                  onClick={() => {
                    setStatusFilter(status as any);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border duration-150 ${
                    isActive
                      ? config.activeColor + " border-transparent"
                      : `${config.color} hover:bg-slate-50 dark:hover:bg-slate-850`
                  }`}
                >
                  {config.label}
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              id="btn-limpiar-filtros"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/20 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-250/20"
            >
              <FaTimes className="w-2.5 h-2.5" /> Limpiar Filtros
            </button>
          )}
        </div>

        {/* Inputs de Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              id="input-buscar-cliente-pedidos"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por cliente..."
              className="w-full pl-8.5 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs bg-slate-50 dark:bg-slate-950 transition-colors text-slate-805 dark:text-slate-205"
            />
          </div>

          <div className="relative">
            <input
              id="dateFilter"
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs bg-slate-50 dark:bg-slate-950 transition-colors text-slate-805 dark:text-slate-205"
            />
          </div>

          <div className="relative">
            <select
              id="deliveryDay"
              value={deliveryDayFilter}
              onChange={(e) => {
                setDeliveryDayFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs bg-slate-50 dark:bg-slate-950 transition-colors text-slate-805 dark:text-slate-205"
            >
              <option value="todos">Todos los días de reparto</option>
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* RESULTADOS INFO */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-850 px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 mb-3.5 shadow-2xs">
        <span>
          Registros: <span className="font-bold text-slate-800 dark:text-slate-200">{orders.length}</span> de {totalCount} pedidos.
        </span>
      </div>

      {/* TABLA DE PEDIDOS - DESKTOP VIEW */}
      <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-850 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Día Reparto</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Total Facturado</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Forma de Pago</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Estado Entrega</th>
                <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FaSpinner className="animate-spin text-xl text-indigo-600" />
                      <span className="text-slate-500 font-semibold">Cargando...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <FaInbox className="text-3xl text-slate-350" />
                      <span className="text-slate-700 font-bold text-sm">No se encontraron pedidos</span>
                      {hasActiveFilters ? (
                        <button
                          onClick={clearFilters}
                          className="mt-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                        >
                          Limpiar filtros
                        </button>
                      ) : (
                        <Link
                          href="/dashboard/pedidos/nuevo"
                          className="mt-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 text-xs font-bold rounded-lg"
                        >
                          Nuevo Pedido
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-650 dark:text-slate-300 font-medium">
                      {new Date(order.created_at).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-semibold text-slate-850 dark:text-slate-100">
                      {order.customers?.full_name ?? "Sin cliente"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {order.customers?.delivery_day ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200/20">
                          {order.customers.delivery_day}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Sin reparto</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                      $
                      {order.total_amount?.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      }) ?? "0.00"}
                      {((order as any).amount_pending || 0) > 0 && (
                        <span className="text-[10px] text-amber-600 block font-semibold mt-0.5">
                          Pendiente: ${((order as any).amount_pending || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {(order as any).payment_method === "fiado" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200/30 dark:bg-orange-950/10 dark:text-orange-400">
                          Fiado
                        </span>
                      ) : (order as any).payment_method === "transferencia" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/30 dark:bg-blue-950/10 dark:text-blue-400">
                          Transf
                        </span>
                      ) : (order as any).payment_method === "mixto" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/30 dark:bg-purple-950/10 dark:text-purple-400">
                          Mixto
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/30 dark:bg-emerald-950/10 dark:text-emerald-400">
                          Efectivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <OrderStatusChanger order={order} onStatusUpdate={fetchOrders} />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`btn-ver-pedido-${order.id}`}
                          onClick={() => {
                            setSelectedOrderIdForDetails(order.id);
                            setIsOrderDetailsModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded border border-slate-200/20"
                          title="Ver resumen"
                        >
                          <FaEye className="w-3 h-3" />
                        </button>
                        <button
                          id={`btn-remito-pedido-${order.id}`}
                          onClick={() => {
                            setSelectedOrderIdForRemito(order.id);
                            setIsRemitoModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 rounded border border-slate-200/20"
                          title="Exportar remito"
                        >
                          <FaPrint className="w-3 h-3" />
                        </button>
                        <Link
                          id={`link-detalle-completo-${order.id}`}
                          href={`/dashboard/pedidos/${order.id}`}
                          className="px-2 py-1 text-[10px] font-bold text-blue-600 hover:text-white hover:bg-blue-600 rounded border border-blue-500/25 transition-colors"
                        >
                          Detalle
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VISTA MÓVIL: TARJETAS (CARDS) */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-xl border">
            <FaSpinner className="animate-spin text-lg text-slate-500 mx-auto" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 text-center border">
            <FaBoxOpen className="w-8 h-8 mx-auto text-slate-300 mb-1" />
            <p className="text-2xs text-slate-400">Sin pedidos registrados.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-850 p-4 space-y-3 shadow-2xs"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    {new Date(order.created_at).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <h3 className="font-bold text-xs text-slate-850 dark:text-slate-100">
                    {order.customers?.full_name ?? "Sin cliente"}
                  </h3>
                  {order.customers?.delivery_day && (
                    <span className="inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
                      📅 {order.customers.delivery_day}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <OrderStatusChanger order={order} onStatusUpdate={fetchOrders} />
                  {(order as any).payment_method === "fiado" ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/20">Fiado</span>
                  ) : (order as any).payment_method === "transferencia" ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/20">Transf</span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20">Efectivo</span>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 pt-2 flex justify-between items-baseline text-2xs">
                <div>
                  <p className="text-[9px] text-slate-400">Total Facturado</p>
                  <p className="font-bold text-slate-850 dark:text-white">
                    ${order.total_amount?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {((order as any).amount_pending || 0) > 0 && (
                  <div className="text-right">
                    <p className="text-[9px] text-rose-500 font-bold">Pendiente</p>
                    <p className="font-bold text-rose-500">
                      ${((order as any).amount_pending || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              {/* Botones móviles */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-850 grid grid-cols-3 gap-1.5">
                <button
                  id={`btn-mobile-ver-${order.id}`}
                  onClick={() => {
                    setSelectedOrderIdForDetails(order.id);
                    setIsOrderDetailsModalOpen(true);
                  }}
                  className="py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded border border-slate-200/20 flex items-center justify-center gap-0.5"
                >
                  <FaEye /> Ver
                </button>
                <button
                  id={`btn-mobile-print-${order.id}`}
                  onClick={() => {
                    setSelectedOrderIdForRemito(order.id);
                    setIsRemitoModalOpen(true);
                  }}
                  className="py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-350 rounded border border-slate-200/20 flex items-center justify-center gap-0.5"
                >
                  <FaPrint /> Remito
                </button>
                <Link
                  id={`btn-mobile-detail-${order.id}`}
                  href={`/dashboard/pedidos/${order.id}`}
                  className="py-1 bg-blue-50 text-blue-650 rounded text-[10px] font-bold border border-blue-200/20 text-center block"
                >
                  Completo
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-850 p-3 mt-4 mb-20 lg:mb-0 shadow-2xs text-xs">
          <span className="text-slate-500">
            Página <span className="font-bold text-slate-800 dark:text-white">{currentPage}</span> de {totalPages}.
          </span>
          <div className="flex items-center gap-2">
            <button
              id="btn-prev-page"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1 font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-40 transition-colors text-xs"
            >
              Anterior
            </button>
            <button
              id="btn-next-page"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="px-3 py-1 font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-40 transition-colors text-xs"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
