"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  FaSearch,
  FaPlus,
  FaFilter,
  FaTimes,
  FaInfoCircle,
  FaUser,
  FaBox,
  FaCalendarAlt,
  FaHashtag,
  FaPhone,
  FaMapMarkerAlt,
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
    color: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300",
    activeColor: "bg-gray-600 dark:bg-slate-600 text-white",
  },
  pendiente: {
    label: "Pendiente",
    color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    activeColor: "bg-yellow-600 text-white",
  },
  confirmado: {
    label: "Confirmado",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    activeColor: "bg-blue-600 text-white",
  },
  enviado: {
    label: "Enviado",
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    activeColor: "bg-purple-600 text-white",
  },
  entregado: {
    label: "Entregado",
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    activeColor: "bg-green-600 text-white",
  },
  cancelado: {
    label: "Cancelado",
    color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    activeColor: "bg-red-600 text-white",
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
        color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
        icon: <FaClock />,
      },
      entregado: {
        label: "Entregado",
        color: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
        icon: <FaCheckCircle />,
      },
      cancelado: {
        label: "Cancelado",
        color: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
        icon: <FaBan />,
      },
    };

    const config = statusConfig[status] || statusConfig.pendiente;

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${config.color}`}
      >
        {config.icon} {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-3xl flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FaInfoCircle /> Detalles del Pedido
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white dark:bg-slate-900 hover:bg-opacity-20 rounded-full p-2 transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {loading || !orderData ? (
            <div className="flex flex-col items-center justify-center h-64">
              <FaSpinner className="animate-spin text-4xl text-blue-600 mb-4" />
              <p className="text-gray-600 dark:text-slate-300">Cargando detalles del pedido...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Información del Pedido */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <FaHashtag className="text-blue-600" /> Información del
                    Pedido
                  </h3>
                  {getStatusBadge(orderData.status)}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-slate-300 mb-1">ID del Pedido:</p>
                    <p className="font-mono font-semibold text-gray-800 dark:text-slate-100">
                      {orderData.id.substring(0, 8)}...
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <FaCalendarAlt className="text-blue-600" /> Fecha:
                    </p>
                    <p className="font-semibold text-gray-800 dark:text-slate-100">
                      {new Date(orderData.created_at).toLocaleDateString(
                        "es-AR",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600 dark:text-slate-300 mb-1">Método de Pago:</p>
                    {(orderData as any).payment_method === "fiado" ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                        📋 Fiado
                      </span>
                    ) : (orderData as any).payment_method ===
                      "transferencia" ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                        🏦 Transferencia
                      </span>
                    ) : (orderData as any).payment_method === "mixto" ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                        💳 Mixto
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        💵 Efectivo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Información del Cliente */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                <h3 className="font-bold text-gray-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <FaUser className="text-purple-600" /> Información del Cliente
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-slate-300 mb-1">Nombre Completo:</p>
                    <p className="font-semibold text-gray-800 dark:text-slate-100 text-lg">
                      {orderData.customers.full_name}
                    </p>
                  </div>
                  {orderData.customers.phone && (
                    <div className="flex items-center gap-2">
                      <FaPhone className="text-purple-600" />
                      <span className="font-medium text-gray-700 dark:text-slate-200">
                        {orderData.customers.phone}
                      </span>
                    </div>
                  )}
                  {orderData.customers.address && (
                    <div className="flex items-start gap-2">
                      <FaMapMarkerAlt className="text-purple-600 mt-1" />
                      <span className="font-medium text-gray-700 dark:text-slate-200">
                        {orderData.customers.address}
                      </span>
                    </div>
                  )}
                  {orderData.customers.delivery_day && (
                    <div>
                      <p className="text-gray-600 dark:text-slate-300 mb-1">Día de Reparto:</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        📅 {orderData.customers.delivery_day}
                      </span>
                    </div>
                  )}
                  {orderData.customers.customer_type && (
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${orderData.customers.customer_type === "mayorista"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                          : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          }`}
                      >
                        {orderData.customers.customer_type === "mayorista"
                          ? "🏢 Cliente Mayorista"
                          : "👤 Cliente Minorista"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Productos del Pedido */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <h3 className="font-bold text-gray-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <FaBox className="text-green-600" /> Productos (
                  {orderData.order_items.length})
                </h3>
                <div className="space-y-2">
                  {orderData.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-green-200"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 dark:text-slate-100">
                          {item.products?.name || "Producto desconocido"}
                        </p>
                        {item.products?.sku && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                            SKU: {item.products.sku}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                          Cantidad:{" "}
                          <span className="font-bold">{item.quantity}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-slate-300">Precio Unit.</p>
                        <p className="font-bold text-gray-800 dark:text-slate-100">
                          ${item.price.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-green-600 font-semibold mt-1">
                          Subtotal: ${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total del Pedido */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold">Total del Pedido:</span>
                  <span className="text-3xl font-bold">
                    ${orderData.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Estado de Pago */}
              {(orderData as any).amount_paid !== undefined &&
                (orderData as any).amount_paid !== null && (
                  <div className="space-y-2">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <span className="text-green-700 font-semibold">
                          Entrega Recibida:
                        </span>
                        <span className="text-xl font-bold text-green-700">
                          ${((orderData as any).amount_paid || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {((orderData as any).amount_pending || 0) > 0 && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border-2 border-orange-300 dark:border-orange-700">
                        <div className="flex items-center justify-between">
                          <span className="text-orange-700 font-bold">
                            Saldo Pendiente:
                          </span>
                          <span className="text-2xl font-bold text-orange-700">
                            $
                            {((orderData as any).amount_pending || 0).toFixed(
                              2
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {((orderData as any).amount_pending || 0) === 0 &&
                      (orderData as any).amount_paid > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border-2 border-green-300 dark:border-green-700 flex items-center justify-center gap-2">
                          <FaCheckCircle className="text-green-700" />
                          <span className="text-green-700 font-bold">
                            Pago Completo
                          </span>
                        </div>
                      )}
                  </div>
                )}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 dark:bg-slate-950 rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
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
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-5 rounded-t-3xl flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FaPrint /> Generar Remito
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white dark:bg-slate-900 hover:bg-opacity-20 rounded-full p-2"
          >
            <FaTimes size={20} />
          </button>
        </div>
        <div className="p-8">
          {loading || !orderData ? (
            <div className="flex flex-col items-center justify-center h-48">
              <FaSpinner className="animate-spin text-4xl text-blue-600" />
              <p className="mt-4 text-gray-600 dark:text-slate-300">Cargando datos del pedido...</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-gray-700 dark:text-slate-200 text-center">
                El remito para{" "}
                <span className="font-bold">
                  {orderData.customers.full_name}
                </span>{" "}
                está listo.
              </p>

              {/* Selector de formato */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Formato de Impresión:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPrintFormat("thermal")}
                    className={`p-3 rounded-lg border-2 transition-all ${printFormat === "thermal"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:border-gray-400 dark:hover:border-slate-600"
                      }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">🧾</div>
                      <div className="font-semibold text-sm">80mm</div>
                      <div className="text-xs">Térmica</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setPrintFormat("A4")}
                    className={`p-3 rounded-lg border-2 transition-all ${printFormat === "A4"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:border-gray-400 dark:hover:border-slate-600"
                      }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">📄</div>
                      <div className="font-semibold text-sm">A4</div>
                      <div className="text-xs">Estándar</div>
                    </div>
                  </button>
                </div>
              </div>

              <PDFDownloadButton
                orderData={orderData}
                printFormat={printFormat}
              />

              <button
                onClick={onClose}
                className="w-full mt-3 py-3 text-gray-600 dark:text-slate-300 font-semibold hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-800/80 dark:bg-slate-800 rounded-xl"
              >
                Cerrar
              </button>
            </>
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
  const [showFilters, setShowFilters] = useState(false);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [selectedOrderIdForDetails, setSelectedOrderIdForDetails] = useState<
    string | null
  >(null);
  const [isRemitoModalOpen, setIsRemitoModalOpen] = useState(false);
  const [selectedOrderIdForRemito, setSelectedOrderIdForRemito] = useState<
    string | null
  >(null);
  const pathname = usePathname();
  const loadingTimeoutRef = useRef<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<
    "todos" | OrderRow["status"]
  >("todos");
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

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);

    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("orders")
        .select(
          `
          id, created_at, total_amount, status, payment_method, amount_paid, amount_pending,
          customers ( id, full_name, delivery_day )
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
      if (searchQuery.length > 2)
        query = query.ilike("customers.full_name", `%${searchQuery}%`);
      if (deliveryDayFilter !== "todos")
        query = query.eq("customers.delivery_day", deliveryDayFilter);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT_FORZADO")), 2000);
      });

      const result = await Promise.race([query, timeoutPromise]) as any;
      const data = result?.data;
      const error = result?.error;
      const count = result?.count;

      if (error) {
        console.error(error);
        return;
      }

      setOrders((data || []) as unknown as OrderRow[]);
      setTotalCount(count || 0);
    } catch (error: any) {
      if (error.message === "TIMEOUT_FORZADO") {
        window.location.reload();
        return; // Detenemos la ejecución aquí
      }
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, dateFilter, searchQuery, deliveryDayFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchOrders, 300);
    return () => clearTimeout(debounce);
  }, [fetchOrders, pathname]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getStatusBadge = (status: OrderRow["status"]) => {
    const config = STATUS_CONFIG[status];
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-screen">
      {/* Modal de Detalles */}
      <OrderDetailsModal
        isOpen={isOrderDetailsModalOpen}
        onClose={() => setIsOrderDetailsModalOpen(false)}
        orderId={selectedOrderIdForDetails}
      />

      {/* Modal de Remito */}
      <RemitoModal
        isOpen={isRemitoModalOpen}
        onClose={() => setIsRemitoModalOpen(false)}
        orderId={selectedOrderIdForRemito}
      />

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            <FaBox className="text-purple-600" /> Gestión de Pedidos
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mt-1">
            {totalCount} pedido{totalCount !== 1 ? "s" : ""} registrados
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/pedidos/pendientes"
            className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2"
          >
            <FaClock /> Saldos Pendientes
          </Link>
          <Link
            href="/dashboard/pedidos/nuevo"
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2"
          >
            <FaPlus /> Nuevo Pedido
          </Link>
        </div>
      </div>

      {/* FILTROS POR ESTADO */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <FaFilter className="text-purple-600" /> Filtrar por Estado
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:bg-slate-700 transition-colors"
          >
            <FaFilter />
            {showFilters ? "Ocultar" : "Más"} Filtros
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>
          ).map((status) => {
            const config = STATUS_CONFIG[status];
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status as any);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all shadow-sm ${isActive
                  ? config.activeColor + " shadow-md"
                  : `${config.color} hover:opacity-80`
                  }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTROS AVANZADOS */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700 space-y-4 animate-slideDown">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <FaSearch className="text-blue-600" /> Filtros Avanzados
            </h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200"
              >
                <FaTimes />
                Limpiar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
                <FaUser className="text-blue-600" /> Buscar Cliente
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Nombre del cliente..."
                  className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="dateFilter"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2"
              >
                <FaCalendarAlt className="text-green-600" /> Fecha del Pedido
              </label>
              <input
                id="dateFilter"
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="deliveryDay"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2"
              >
                <FaClock className="text-orange-600" /> Día de Reparto
              </label>
              <select
                id="deliveryDay"
                value={deliveryDayFilter}
                onChange={(e) => {
                  setDeliveryDayFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50"
              >
                <option value="todos">Todos los Días</option>
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TABLA DE PEDIDOS - Desktop */}
      <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt /> Fecha
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaUser /> Cliente
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaTruck /> Día Reparto
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaDollarSign /> Total
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaMoneyBillWave /> Pago
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaBox /> Estado
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                      <span className="text-gray-500 dark:text-slate-400 font-medium">
                        Cargando pedidos...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FaInbox className="text-6xl text-gray-300" />
                      <span className="text-gray-500 dark:text-slate-400 font-medium">
                        No se encontraron pedidos
                      </span>
                      {hasActiveFilters ? (
                        <>
                          <span className="text-gray-400 text-sm">
                            Intenta con otros filtros
                          </span>
                          <button
                            onClick={clearFilters}
                            className="mt-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          >
                            Limpiar filtros
                          </button>
                        </>
                      ) : (
                        <Link
                          href="/dashboard/pedidos/nuevo"
                          className="mt-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center gap-2"
                        >
                          <FaPlus /> Crear primer pedido
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 transition-colors"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-800 dark:text-slate-100 flex items-center gap-2">
                        <FaCalendarAlt className="text-gray-400 text-xs" />
                        {new Date(order.created_at).toLocaleDateString(
                          "es-AR",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900 dark:text-slate-50">
                        {order.customers?.full_name ?? "Sin cliente"}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        <FaClock />
                        {order.customers?.delivery_day ?? "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-600">
                        $
                        {order.total_amount?.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) ?? "0.00"}
                      </div>
                      {((order as any).amount_pending || 0) > 0 && (
                        <div className="text-xs text-orange-600 font-semibold mt-1 flex items-center gap-1">
                          <FaInfoCircle className="text-xs" />
                          Pendiente: $
                          {((order as any).amount_pending || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {(order as any).payment_method === "fiado" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-900">
                            <FaFileInvoice /> Fiado
                          </span>
                        ) : (order as any).payment_method ===
                          "transferencia" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-900">
                            <FaDollarSign /> Transferencia
                          </span>
                        ) : (order as any).payment_method === "mixto" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-300">
                            <FaDollarSign /> Mixto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-900">
                            <FaMoneyBillWave /> Efectivo
                          </span>
                        )}
                        {((order as any).amount_pending || 0) === 0 &&
                          ((order as any).amount_paid || 0) > 0 && (
                            <div className="text-xs text-green-600 font-semibold flex items-center gap-1">
                              <FaCheckCircle /> Pagado
                            </div>
                          )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <OrderStatusChanger
                        order={order}
                        onStatusUpdate={fetchOrders}
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrderIdForDetails(order.id);
                              setIsOrderDetailsModalOpen(true);
                            }}
                            title="Ver detalles del pedido"
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <FaEye /> Ver
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrderIdForRemito(order.id);
                              setIsRemitoModalOpen(true);
                            }}
                            title="Generar remito"
                            className="px-3 py-1.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs font-semibold rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <FaPrint />
                          </button>
                        </div>
                        <Link
                          href={`/dashboard/pedidos/${order.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          Ver Detalle Completo →
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

      {/* Vista de Tarjetas - Mobile y Tablet */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">Cargando pedidos...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 text-center">
            <div className="text-gray-400 mb-2">
              <FaBoxOpen className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-600 dark:text-slate-300 mb-4">
              No se encontraron pedidos con los filtros aplicados.
            </p>
            {(searchQuery ||
              statusFilter !== "todos" ||
              deliveryDayFilter !== "todos" ||
              dateFilter) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Limpiar filtros
                </button>
              )}
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 space-y-3"
            >
              {/* Header con fecha y estado */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                    {new Date(order.created_at).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-slate-50">
                    {order.customers?.full_name ?? "Sin cliente"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Reparto: {order.customers?.delivery_day ?? "N/A"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <OrderStatusChanger
                    order={order}
                    onStatusUpdate={fetchOrders}
                  />
                  {(order as any).payment_method === "fiado" ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                      📋 Fiado
                    </span>
                  ) : (order as any).payment_method === "transferencia" ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      🏦 Transferencia
                    </span>
                  ) : (order as any).payment_method === "mixto" ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                      💳 Mixto
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      💵 Efectivo
                    </span>
                  )}
                </div>
              </div>

              {/* Total y pago */}
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-slate-300">Total:</span>
                  <span className="text-base font-bold text-gray-900 dark:text-slate-50">
                    $
                    {order.total_amount?.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) ?? "0.00"}
                  </span>
                </div>
                {((order as any).amount_pending || 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-orange-600">Pendiente:</span>
                    <span className="text-sm font-semibold text-orange-600">
                      ${((order as any).amount_pending || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {((order as any).amount_pending || 0) === 0 &&
                  ((order as any).amount_paid || 0) > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span className="text-xs">Estado:</span>
                      <span className="text-xs font-semibold flex items-center gap-1">
                        <FaCheckCircle className="w-3 h-3" /> Pagado
                      </span>
                    </div>
                  )}
              </div>

              {/* Acciones */}
              <div className="border-t pt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelectedOrderIdForDetails(order.id);
                    setIsOrderDetailsModalOpen(true);
                  }}
                  className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-all"
                >
                  <FaInfoCircle /> Ver Detalles
                </button>
                <button
                  onClick={() => {
                    setSelectedOrderIdForRemito(order.id);
                    setIsRemitoModalOpen(true);
                  }}
                  className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1 px-3 py-2 bg-gray-600 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-all"
                >
                  <FaPrint /> Remito
                </button>
                <Link
                  href={`/dashboard/pedidos/${order.id}`}
                  className="flex-1 min-w-[120px] inline-flex items-center justify-center px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-xs font-semibold rounded-lg transition-all"
                >
                  Detalle Completo
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm p-3 sm:p-4">
          <span className="text-xs sm:text-sm text-gray-700 dark:text-slate-200 text-center sm:text-left">
            Mostrando <span className="font-medium">{orders.length}</span> de{" "}
            <span className="font-medium">{totalCount}</span> pedidos
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-xs sm:text-sm text-gray-700 dark:text-slate-200 whitespace-nowrap">
              Pág. <span className="font-medium">{currentPage}</span> /{" "}
              {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
