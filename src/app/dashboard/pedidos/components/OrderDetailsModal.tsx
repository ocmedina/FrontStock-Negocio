"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  FaTimes,
  FaSpinner,
  FaPhone,
  FaMapMarkerAlt,
  FaPrint,
  FaExternalLinkAlt,
  FaCopy,
  FaCheck,
  FaWhatsapp,
  FaEdit,
  FaFileInvoice,
  FaDollarSign,
  FaMoneyBillWave,
  FaExchangeAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";

export type OrderCustomer = {
  id: string;
  full_name: string;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  customer_type?: string;
  delivery_day?: string | null;
  reference?: string | null;
};

export type OrderItemDetail = {
  id: string;
  quantity: number;
  price: number;
  promotion?: {
    applied?: boolean;
    totalGiftQuantity?: number;
  } | null;
  products: {
    id?: string;
    name: string;
    sku?: string | null;
    stock?: number | null;
  } | null;
};

export type FullOrderDetails = {
  id: string;
  created_at: string;
  total_amount: number;
  status: "pendiente" | "confirmado" | "enviado" | "entregado" | "cancelado" | string;
  payment_method?: string | null;
  amount_paid?: number | null;
  amount_pending?: number | null;
  customers: OrderCustomer;
  order_items: OrderItemDetail[];
};

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  onOrderUpdated?: () => void;
  onOpenRemito?: (orderId: string) => void;
}

export default function OrderDetailsModal({
  isOpen,
  onClose,
  orderId,
  onOrderUpdated,
  onOpenRemito,
}: OrderDetailsModalProps) {
  const [orderData, setOrderData] = useState<FullOrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const fetchFullOrder = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .select("*, customers(*), order_items(*, products(*))")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (order) {
        setOrderData(order as unknown as FullOrderDetails);
      }
    } catch (error: any) {
      toast.error("No se pudieron cargar los datos del pedido.");
      console.error(error);
      onClose();
    } finally {
      setLoading(false);
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchFullOrder(orderId);
    } else {
      setOrderData(null);
    }
  }, [isOpen, orderId, fetchFullOrder]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    if (!orderData) return;
    navigator.clipboard.writeText(orderData.id);
    setCopiedId(true);
    toast.success("ID copiado");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; bg: string; text: string; dot: string }> = {
      pendiente: { label: "Pendiente", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
      confirmado: { label: "Confirmado", bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-700 dark:text-sky-400", dot: "bg-sky-500" },
      enviado: { label: "En Reparto", bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-400", dot: "bg-purple-500" },
      entregado: { label: "Entregado", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
      cancelado: { label: "Cancelado", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500" },
    };
    const current = config[status] || config.pendiente;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${current.bg} ${current.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        {current.label}
      </span>
    );
  };

  const getPaymentMethodLabel = (method?: string | null) => {
    switch (method) {
      case "fiado":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 dark:text-orange-400">
            <FaFileInvoice className="w-3 h-3 text-orange-500" /> Cta. Cte. (Fiado)
          </span>
        );
      case "transferencia":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <FaDollarSign className="w-3 h-3 text-blue-500" /> Transferencia
          </span>
        );
      case "mixto":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-400">
            <FaExchangeAlt className="w-3 h-3 text-purple-500" /> Mixto
          </span>
        );
      case "cheque":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <FaMoneyBillWave className="w-3 h-3 text-amber-500" /> Cheque
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <FaMoneyBillWave className="w-3 h-3 text-emerald-500" /> Efectivo
          </span>
        );
    }
  };

  const getWhatsAppLink = (phone?: string | null, clientName?: string, orderId?: string) => {
    if (!phone) return null;
    let clean = phone.replace(/\D/g, "");
    if (clean.length === 10) clean = `549${clean}`;
    else if (clean.length > 0 && !clean.startsWith("54")) clean = `54${clean}`;
    const text = encodeURIComponent(
      `Hola ${clientName || ""}, te escribimos sobre tu pedido #${(orderId || "").slice(0, 8).toUpperCase()}.`
    );
    return `https://wa.me/${clean}?text=${text}`;
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header Compacto y Limpio */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Detalle de Pedido
                </h2>
                {orderData && (
                  <button
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Copiar ID"
                  >
                    #{orderData.id.slice(0, 8).toUpperCase()}
                    {copiedId ? (
                      <FaCheck className="text-emerald-500 w-2.5 h-2.5" />
                    ) : (
                      <FaCopy className="w-2.5 h-2.5 opacity-50" />
                    )}
                  </button>
                )}
              </div>
              {orderData && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {new Date(orderData.created_at).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })} hs
                  {orderData.customers?.delivery_day && (
                    <span className="ml-2 font-medium text-indigo-600 dark:text-indigo-400">
                      · Reparto: {orderData.customers.delivery_day}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {orderData && getStatusBadge(orderData.status)}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <FaTimes className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {loading || !orderData ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <FaSpinner className="animate-spin text-xl text-indigo-600" />
              <p className="text-xs text-slate-400">Cargando pedido...</p>
            </div>
          ) : (
            <>
              {/* Cliente y Medio de Pago */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    {orderData.customers?.full_name || "Sin cliente"}
                  </span>
                  <div>{getPaymentMethodLabel(orderData.payment_method)}</div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {orderData.customers?.phone && (
                    <div className="flex items-center gap-1.5">
                      <FaPhone className="w-2.5 h-2.5 text-slate-400" />
                      <a href={`tel:${orderData.customers.phone}`} className="hover:underline">
                        {orderData.customers.phone}
                      </a>
                      {getWhatsAppLink(orderData.customers.phone, orderData.customers.full_name, orderData.id) && (
                        <a
                          href={getWhatsAppLink(orderData.customers.phone, orderData.customers.full_name, orderData.id)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline ml-1"
                        >
                          <FaWhatsapp className="w-3 h-3" /> WhatsApp
                        </a>
                      )}
                    </div>
                  )}

                  {orderData.customers?.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(orderData.customers.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-indigo-600 hover:underline"
                    >
                      <FaMapMarkerAlt className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                      <span className="truncate max-w-[200px]">{orderData.customers.address}</span>
                    </a>
                  )}
                </div>

                {orderData.customers?.reference && (
                  <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    Ref: {orderData.customers.reference}
                  </p>
                )}
              </div>

              {/* Lista de Artículos (Receipt Style) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Artículos ({orderData.order_items.length})</span>
                  <span>
                    {orderData.order_items.reduce((acc, i) => acc + (i.quantity || 0), 0)} unidades
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orderData.order_items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="pr-3 flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.products?.name || "Producto sin nombre"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.quantity} × ${item.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          {item.products?.sku && ` · SKU: ${item.products.sku}`}
                          {item.promotion?.applied && (
                            <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                              (+{item.promotion.totalGiftQuantity} gratis)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right font-bold text-slate-800 dark:text-slate-100 shrink-0">
                        ${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales y Cuenta Corriente (Limpio y claro) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Total Facturado:</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    ${orderData.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {orderData.amount_paid !== undefined && orderData.amount_paid !== null && (
                  <>
                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                      <span>Monto Entregado:</span>
                      <span>${(orderData.amount_paid || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                    </div>

                    {(orderData.amount_pending || 0) > 0 ? (
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-amber-700 dark:text-amber-400">
                        <span>Saldo Pendiente:</span>
                        <span className="text-sm font-black">
                          ${(orderData.amount_pending || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-semibold text-emerald-600 dark:text-emerald-400 text-right">
                        ✓ Totalmente Pagado
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cerrar
          </button>

          {orderData && (
            <div className="flex items-center gap-2">
              {orderData.status === "pendiente" && (
                <Link
                  href={`/dashboard/pedidos/edit/${orderData.id}`}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <FaEdit className="w-3 h-3" /> Editar
                </Link>
              )}

              {onOpenRemito && (
                <button
                  onClick={() => onOpenRemito(orderData.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg transition-all inline-flex items-center gap-1.5"
                >
                  <FaPrint className="w-3 h-3 text-slate-500" /> Remito
                </button>
              )}

              <Link
                href={`/dashboard/pedidos/${orderData.id}`}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 rounded-lg transition-all inline-flex items-center gap-1.5"
              >
                <span>Detalle</span>
                <FaExternalLinkAlt className="w-2.5 h-2.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
