"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import PDFDownloadButton from "@/components/pdf/PDFDownloadButton";
import {
  FaEdit,
  FaArrowLeft,
  FaBox,
  FaHashtag,
  FaCalendarAlt,
  FaUser,
  FaCheckCircle,
  FaClock,
  FaMoneyBillWave,
  FaFileInvoice,
  FaBoxes,
  FaDollarSign,
  FaCubes,
  FaBan,
  FaInfoCircle,
} from "react-icons/fa";

export default function OrderDetailsClient({
  initialOrder,
}: {
  initialOrder: any;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    const loadingToast = toast.loading("Actualizando estado...");

    if (newStatus === "confirmado" && order.status === "pendiente") {
      for (const item of order.order_items) {
        if (!item.products || item.products.stock < item.quantity) {
          toast.error(`Stock insuficiente para "${item.products?.name}".`);
          setLoading(false);
          toast.dismiss(loadingToast);
          return;
        }
      }
      for (const item of order.order_items) {
        const newStock = item.products.stock - item.quantity;
        await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", item.products.id);
      }
      toast.success("Stock descontado correctamente.");
    }

    if (newStatus === "cancelado" && order.status === "confirmado") {
      for (const item of order.order_items) {
        const newStock = (item.products.stock || 0) + item.quantity;
        await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", item.products.id);
      }
      toast.success("Stock devuelto al inventario.");
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id)
      .select()
      .single();

    toast.dismiss(loadingToast);

    if (error) {
      toast.error(`Error al cambiar el estado: ${error.message}`);
    } else if (data) {
      setOrder((prevOrder: typeof order) => ({ ...prevOrder, ...data }));
      toast.success(`Pedido actualizado a "${newStatus}".`);
    }

    setLoading(false);
    router.refresh();
  };

  const statusOptions: { [key: string]: string } = {
    pendiente: "confirmado",
    confirmado: "enviado",
    enviado: "entregado",
  };
  const nextStatus = statusOptions[order.status];

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-full">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
              <FaBox className="text-purple-600" /> Detalle del Pedido
            </h1>
            <p className="text-gray-600 dark:text-slate-300 mt-1 flex items-center gap-2">
              <FaHashtag className="text-gray-400 text-sm" />
              ID:{" "}
              <span className="font-mono font-semibold">
                {order.id.substring(0, 8)}...
              </span>
            </p>
          </div>
          <Link
            href="/dashboard/pedidos"
            className="px-6 py-2.5 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-100 rounded-lg hover:bg-gray-300 transition-all font-semibold flex items-center gap-2"
          >
            <FaArrowLeft /> Volver al listado
          </Link>
        </div>

        {/* INFORMACIÓN DEL PEDIDO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Fecha */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaCalendarAlt className="text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">Fecha</p>
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-slate-100">
              {new Date(order.created_at).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Cliente */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FaUser className="text-green-600" />
              </div>
              <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">Cliente</p>
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-slate-100">
              {order.customers?.full_name ?? "N/A"}
            </p>
          </div>

          {/* Estado */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FaCheckCircle className="text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">Estado</p>
            </div>
            <p className="text-lg font-bold text-purple-600 capitalize">
              {order.status}
            </p>
          </div>

          {/* Método de Pago */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <FaMoneyBillWave className="text-orange-600" />
              </div>
              <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">Pago</p>
            </div>
            {order.payment_method === "fiado" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-800 border border-orange-300">
                <FaFileInvoice /> Fiado
              </span>
            ) : order.payment_method === "transferencia" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800 border border-blue-300">
                <FaDollarSign /> Transferencia
              </span>
            ) : order.payment_method === "mixto" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-800 border border-purple-300">
                <FaDollarSign /> Mixto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-300">
                <FaMoneyBillWave /> Efectivo
              </span>
            )}
          </div>
        </div>

        {/* TABLA DE PRODUCTOS */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700 mb-6">
          <div className="p-5 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <FaBoxes className="text-purple-600" /> Productos del Pedido
            </h2>
          </div>

          {/* Tabla Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaBox /> Producto
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaCubes /> Cantidad
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaDollarSign /> Precio Unit.
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaDollarSign /> Subtotal
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                {order.order_items?.map((item: any, index: number) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-slate-50">
                        {item.products?.name ?? "Producto no disponible"}
                      </div>
                      {item.products?.sku && (
                        <div className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-0.5">
                          SKU: {item.products.sku}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold text-sm">
                        <FaCubes className="text-xs" />
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-slate-200">
                      ${item.price?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600">
                      ${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-4 text-right text-base font-bold text-gray-800 dark:text-slate-100"
                  >
                    <div className="flex items-center justify-end gap-2">
                      <FaDollarSign className="text-green-600" />
                      TOTAL DEL PEDIDO
                    </div>
                  </td>
                  <td className="px-6 py-4 text-left text-2xl font-bold text-green-600">
                    ${order.total_amount?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                {(order as any).amount_paid !== undefined &&
                  (order as any).amount_paid !== null && (
                    <>
                      <tr className="bg-green-100 dark:bg-green-900/30 border-t-2 border-green-300 dark:border-green-900">
                        <td
                          colSpan={3}
                          className="px-6 py-3 text-right text-sm font-bold text-green-800 dark:text-green-300"
                        >
                          <div className="flex items-center justify-end gap-2">
                            <FaCheckCircle />
                            Entrega Recibida
                          </div>
                        </td>
                        <td className="px-6 py-3 text-left text-lg font-bold text-green-800 dark:text-green-300">
                          ${((order as any).amount_paid || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                      {((order as any).amount_pending || 0) > 0 && (
                        <tr className="bg-orange-100 dark:bg-orange-900/30 border-t-2 border-orange-300 dark:border-orange-900">
                          <td
                            colSpan={3}
                            className="px-6 py-3 text-right text-sm font-bold text-orange-800 dark:text-orange-300"
                          >
                            <div className="flex items-center justify-end gap-2">
                              <FaInfoCircle />
                              Saldo Pendiente
                            </div>
                          </td>
                          <td className="px-6 py-3 text-left text-lg font-bold text-orange-800 dark:text-orange-300">
                            ${((order as any).amount_pending || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
              </tfoot>
            </table>
          </div>

          {/* Vista de Tarjetas - Mobile */}
          <div className="sm:hidden space-y-3 mb-6">
            {order.order_items?.map((item: any, index: number) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 space-y-3 shadow-md border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FaBox className="text-purple-600 text-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 dark:text-slate-50 line-clamp-2">
                      {item.products?.name ?? "Producto no disponible"}
                    </div>
                    {item.products?.sku && (
                      <div className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-1">
                        SKU: {item.products.sku}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2">
                    <FaCubes className="text-blue-600" />
                    <div>
                      <div className="text-gray-500 dark:text-slate-400 text-[10px]">Cantidad</div>
                      <div className="font-bold text-blue-800">
                        {item.quantity}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-950 rounded-lg p-2">
                    <FaDollarSign className="text-gray-600 dark:text-slate-300" />
                    <div>
                      <div className="text-gray-500 dark:text-slate-400 text-[10px]">
                        Precio Unit.
                      </div>
                      <div className="font-bold text-gray-800 dark:text-slate-100">
                        ${item.price?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-slate-300 font-semibold">
                    Subtotal:
                  </span>
                  <span className="text-base font-bold text-green-600">
                    ${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}

            {/* Totales Mobile */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 space-y-3 border-2 border-green-300 shadow-lg">
              <div className="flex justify-between items-center pb-3 border-b-2 border-green-300">
                <span className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  <FaDollarSign className="text-green-600" />
                  TOTAL
                </span>
                <span className="font-bold text-2xl text-green-600">
                  ${order.total_amount?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {(order as any).amount_paid !== undefined &&
                (order as any).amount_paid !== null && (
                  <>
                    <div className="flex justify-between items-center pt-2 bg-green-100 rounded-lg -mx-4 px-4 py-3 border-t-2 border-green-300">
                      <span className="text-sm font-bold text-green-800 flex items-center gap-2">
                        <FaCheckCircle />
                        Entrega Recibida
                      </span>
                      <span className="text-base font-bold text-green-800">
                        ${((order as any).amount_paid || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {((order as any).amount_pending || 0) > 0 && (
                      <div className="flex justify-between items-center pt-2 bg-orange-100 rounded-lg -mx-4 px-4 py-3 border-t-2 border-orange-300">
                        <span className="text-sm font-bold text-orange-800 flex items-center gap-2">
                          <FaInfoCircle />
                          Saldo Pendiente
                        </span>
                        <span className="text-base font-bold text-orange-800">
                          ${((order as any).amount_pending || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </>
                )}
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {order.status === "pendiente" && (
              <Link
                href={`/dashboard/pedidos/edit/${order.id}`}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-sm font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 shadow-md hover:shadow-lg transition-all"
              >
                <FaEdit /> Editar Pedido
              </Link>
            )}
            {nextStatus && (
              <button
                onClick={() => handleStatusChange(nextStatus)}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaCheckCircle />
                {loading ? "Procesando..." : `Marcar como '${nextStatus}'`}
              </button>
            )}
            {order.status !== "cancelado" && order.status !== "entregado" && (
              <button
                onClick={() => handleStatusChange("cancelado")}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold rounded-lg hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaBan />
                Cancelar Pedido
              </button>
            )}
          </div>

          <PDFDownloadButton
            orderData={order}
            printFormat="A4"
            fileNamePrefix="pedido"
          />
        </div>
      </div>
    </div>
  );
}
