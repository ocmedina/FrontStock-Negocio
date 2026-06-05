import { useState, useEffect } from "react";
import {
  FaInfoCircle,
  FaTimes,
  FaSpinner,
  FaHashtag,
  FaCalendarAlt,
  FaUser,
  FaPhone,
  FaMapMarkerAlt,
  FaBox,
  FaClock,
  FaBan,
  FaCheckCircle,
} from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { Database } from "@/lib/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"] & {
  reference?: string | null;
};
type FullOrder = {
  id: string;
  customer_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  profile_id: string;
  customers: Customer;
  order_items: {
    id: string;
    quantity: number;
    price: number;
    product_id: string;
    products: { name: string; sku: string; stock: number } | null;
  }[];
};

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}

export default function OrderDetailsModal({
  isOpen,
  onClose,
  orderId,
}: OrderDetailsModalProps) {
  const [orderData, setOrderData] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      setLoading(true);
      const fetchFullOrder = async () => {
        try {
          const { data: order, error } = await (supabase as any)
            .from("orders")
            .select("*, customers(*), order_items(*, products(*))")
            .eq("id", orderId)
            .single();

          if (error) throw error;

          if (order) {
            setOrderData(order as FullOrder);
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
    if (status === "pendiente") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-450 border border-amber-500/10">
          <FaClock /> Pendiente
        </span>
      );
    } else if (status === "cancelado") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 border border-rose-500/10">
          <FaBan /> Cancelado
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
          <FaCheckCircle /> Entregado
        </span>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800/80 animate-slide-up sm:animate-none">
        
        {/* Cabecera del Modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
              <FaInfoCircle className="text-indigo-600 dark:text-indigo-400 text-sm" />
            </div>
            <h2 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">
              Detalle del Pedido
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {loading || !orderData ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FaSpinner className="animate-spin text-3xl text-indigo-600 mb-3" />
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Cargando información del pedido...</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Bloque: Información del Pedido */}
              <div className="bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/35">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="font-extrabold text-[11px] text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
                    <FaHashtag /> Información General
                  </h3>
                  {getStatusBadge(orderData.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 font-bold mb-1">ID Pedido:</p>
                    <p className="font-mono font-black text-slate-800 dark:text-slate-200">
                      #{orderData.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 font-bold mb-1 flex items-center gap-1">
                      <FaCalendarAlt size={10} /> Fecha Alta:
                    </p>
                    <p className="font-extrabold text-slate-805 dark:text-slate-200">
                      {new Date(orderData.created_at).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })} hs
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloque: Información del Cliente */}
              <div className="bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/35">
                <h3 className="font-extrabold text-[11px] text-slate-450 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                  <FaUser /> Datos del Cliente
                </h3>
                
                <div className="space-y-2.5 text-xs">
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 font-bold mb-1">Razón Social / Nombre:</p>
                    <p className="font-black text-slate-850 dark:text-slate-100 text-sm">
                      {orderData.customers.full_name}
                    </p>
                  </div>
                  
                  {orderData.customers.phone && (
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                      <FaPhone size={10} />
                      <span>{orderData.customers.phone}</span>
                    </div>
                  )}
                  
                  {orderData.customers.address && (
                    <div className="space-y-1">
                      <div className="flex items-start gap-1.5 text-slate-650 dark:text-slate-300 font-medium">
                        <FaMapMarkerAlt className="mt-0.5 shrink-0 text-slate-400" size={12} />
                        <span>{orderData.customers.address}</span>
                      </div>
                      {orderData.customers.reference && (
                        <div className="ml-5 text-[10px] text-slate-450 dark:text-slate-500 italic">
                          Ref: {orderData.customers.reference}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="pt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        orderData.customers.customer_type === "mayorista"
                          ? "bg-purple-50 dark:bg-purple-955/20 text-purple-600 dark:text-purple-400 border border-purple-500/10"
                          : "bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10"
                      }`}
                    >
                      {orderData.customers.customer_type === "mayorista"
                        ? "🏢 Cliente Mayorista"
                        : "👤 Cliente Minorista"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloque: Productos del Pedido */}
              <div className="bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/35">
                <h3 className="font-extrabold text-[11px] text-slate-455 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FaBox /> Detalle de Ítems ({orderData.order_items.length})
                </h3>
                
                <div className="space-y-2">
                  {orderData.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/40 dark:border-slate-800/40"
                    >
                      <div className="flex-1 pr-2">
                        <p className="font-extrabold text-xs text-slate-800 dark:text-slate-100">
                          {item.products?.name || "Producto sin nombre"}
                        </p>
                        {item.products?.sku && (
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                            SKU: {item.products.sku}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 dark:text-slate-455 mt-1">
                          Unidades: <span className="font-black text-slate-700 dark:text-slate-200">{item.quantity}</span>
                        </p>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className="text-[9px] text-slate-400 dark:text-slate-550">Precio unit.</p>
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100 mt-0.5">
                          ${item.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black mt-1">
                          Subt: ${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel de Total del Pedido */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-sm flex items-center justify-between">
                <span className="text-xs uppercase font-black tracking-wider">Total a Facturar / Cobrar:</span>
                <span className="text-2xl font-black">
                  ${orderData.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-750 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
}
