"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaPaperPlane,
  FaCheck,
  FaTimes,
  FaDownload,
  FaEdit,
} from "react-icons/fa";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products: {
    name: string;
    sku: string;
  };
};

type PurchaseOrder = {
  id: string;
  order_number: string;
  supplier_id: number | null;
  status: "draft" | "sent" | "received" | "cancelled";
  total_amount: number;
  notes: string | null;
  created_at: string;
  sent_at: string | null;
  received_at: string | null;
  brands: {
    name: string;
  } | null;
  profiles: {
    full_name: string | null;
    username: string;
  } | null;
  purchase_order_items: OrderItem[];
};

export default function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(
          `
          *,
          brands (name),
          profiles:created_by (full_name, username),
          purchase_order_items (
            *,
            products (name, sku)
          )
        `
        )
        .eq("id", params.id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Error al cargar la orden");
      router.push("/dashboard/proveedores/ordenes");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: "sent" | "received" | "cancelled") => {
    if (!order) return;

    setUpdating(true);
    try {
      const updateData: any = { status: newStatus };

      if (newStatus === "sent") {
        updateData.sent_at = new Date().toISOString();
      } else if (newStatus === "received") {
        updateData.received_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("purchase_orders")
        .update(updateData)
        .eq("id", order.id);

      if (error) throw error;

      // If received, update stock
      if (newStatus === "received") {
        await updateStock();
      }

      toast.success("Estado actualizado correctamente");
      fetchOrder();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error al actualizar el estado");
    } finally {
      setUpdating(false);
    }
  };

  const updateStock = async () => {
    if (!order) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Update stock for each product
      for (const item of order.purchase_order_items) {
        // Get current stock
        const { data: product } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.product_id)
          .single();

        if (!product) continue;

        const newStock = product.stock + item.quantity;

        // Update product stock
        await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", item.product_id);

        // Create stock movement
        await supabase.from("stock_movements").insert({
          product_id: item.product_id,
          movement_type: "purchase",
          quantity: item.quantity,
          new_stock: newStock,
          notes: `Orden de compra ${order.order_number}`,
          user_id: user.id,
        });
      }

      toast.success("Stock actualizado correctamente");
    } catch (error) {
      console.error("Error updating stock:", error);
      toast.error("Error al actualizar el stock");
    }
  };

  const downloadPDF = () => {
    if (!order) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("TU EMPRESA", 15, 15);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Sistema de Gestión Empresarial", 15, 22);

      // Document Title
      doc.setFillColor(243, 244, 246);
      doc.rect(0, 35, pageWidth, 15, "F");
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("ORDEN DE COMPRA", 15, 45);

      // Order Info
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Número: ${order.order_number}`, pageWidth - 15, 40, {
        align: "right",
      });
      doc.text(
        `Fecha: ${new Date(order.created_at).toLocaleDateString("es-AR")}`,
        pageWidth - 15,
        45,
        { align: "right" }
      );

      let yPosition = 60;

      // Supplier Info
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Proveedor:", 15, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(order.brands?.name || "Sin proveedor", 45, yPosition);

      yPosition += 10;

      // Table
      const tableData = order.purchase_order_items.map((item) => [
        item.products.sku,
        item.products.name,
        `$${item.unit_price.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        item.quantity.toString(),
        `$${item.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [["SKU", "Producto", "Precio Unit.", "Cantidad", "Subtotal"]],
        body: tableData,
        foot: [["", "", "", "Total:", `$${order.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]],
        theme: "grid",
        headStyles: {
          fillColor: [229, 231, 235],
          textColor: [31, 41, 55],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [55, 65, 81],
        },
        footStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
        },
        margin: { left: 10, right: 10 },
      });

      // Notes
      if (order.notes) {
        yPosition = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Observaciones:", 15, yPosition);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const splitNotes = doc.splitTextToSize(order.notes, pageWidth - 30);
        doc.text(splitNotes, 15, yPosition + 5);
      }

      // Signatures
      yPosition = (doc as any).lastAutoTable.finalY + 40;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition, 80, yPosition);
      doc.line(pageWidth - 80, yPosition, pageWidth - 20, yPosition);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("SOLICITADO POR", 50, yPosition + 5, { align: "center" });
      doc.text("AUTORIZADO POR", pageWidth - 50, yPosition + 5, {
        align: "center",
      });

      doc.save(`${order.order_number}.pdf`);
      toast.success("PDF descargado");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) return null;

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { bg: "bg-gray-100", text: "text-gray-800", label: "Borrador" },
      sent: { bg: "bg-blue-100", text: "text-blue-800", label: "Enviada" },
      received: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Recibida",
      },
      cancelled: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Cancelada",
      },
    };
    const badge = badges[status as keyof typeof badges];
    return (
      <span
        className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${badge.bg} ${badge.text}`}
      >
        {badge.label}
      </span>
    );
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard/proveedores/ordenes")}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 transition-all font-medium mb-4"
          >
            <FaArrowLeft /> Volver a Órdenes
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">
                {order.order_number}
              </h1>
              <p className="text-gray-600 dark:text-slate-300 mt-1">
                Creada el{" "}
                {new Date(order.created_at).toLocaleDateString("es-AR")}
              </p>
            </div>
            <div className="flex gap-3 items-center">
              {getStatusBadge(order.status)}
              <button
                onClick={downloadPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2"
              >
                <FaDownload /> PDF
              </button>
            </div>
          </div>
        </div>

        {/* Order Info */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">
            Información de la Orden
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Proveedor</p>
              <p className="font-bold text-gray-900 dark:text-slate-50">
                {order.brands?.name || "Sin proveedor"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Creado por</p>
              <p className="font-bold text-gray-900 dark:text-slate-50">
                {order.profiles?.full_name || order.profiles?.username}
              </p>
            </div>
            {order.sent_at && (
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Fecha de envío</p>
                <p className="font-bold text-gray-900 dark:text-slate-50">
                  {new Date(order.sent_at).toLocaleDateString("es-AR")}
                </p>
              </div>
            )}
            {order.received_at && (
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Fecha de recepción</p>
                <p className="font-bold text-gray-900 dark:text-slate-50">
                  {new Date(order.received_at).toLocaleDateString("es-AR")}
                </p>
              </div>
            )}
          </div>
          {order.notes && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">Observaciones</p>
              <p className="text-gray-900 dark:text-slate-50">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Products */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">Productos</h2>
          <>
            {/* Desktop view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-slate-200 uppercase">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-200 uppercase">
                      Precio Unit.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-200 uppercase">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                  {order.purchase_order_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 text-sm font-mono text-gray-600 dark:text-slate-300">
                        {item.products.sku}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-slate-50">
                        {item.products.name}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-gray-900 dark:text-slate-50">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-slate-300">
                        ${item.unit_price.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-gray-900 dark:text-slate-50">
                        ${item.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-indigo-50/50 dark:bg-indigo-950/20">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-right font-bold text-slate-700 dark:text-slate-300 uppercase"
                    >
                      Total:
                    </td>
                    <td className="px-4 py-4 text-right text-xl font-bold text-indigo-600 dark:text-indigo-400">
                      ${order.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards view */}
            <div className="md:hidden space-y-3.5">
              {order.purchase_order_items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {item.products.name}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-450 dark:text-slate-500 mt-1">
                        SKU: {item.products.sku}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                    <div>
                      <p className="text-slate-500 dark:text-slate-450">Cant: <span className="font-bold text-slate-800 dark:text-slate-200">{item.quantity}</span></p>
                      <p className="text-slate-500 dark:text-slate-450 mt-0.5">Precio: <span className="font-bold text-slate-800 dark:text-slate-200">${item.unit_price.toLocaleString("es-AR")}</span></p>
                    </div>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                      ${item.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}

              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-900/40 flex justify-between items-center">
                <span className="text-xs font-black text-indigo-850 dark:text-indigo-300 uppercase tracking-wider">Total Orden:</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  ${order.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">Acciones</h2>
          <div className="flex flex-wrap gap-3">
            {order.status === "draft" && (
              <>
                <button
                  onClick={() => updateStatus("sent")}
                  disabled={updating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  <FaPaperPlane /> Enviar Orden
                </button>
                <button
                  onClick={() => updateStatus("cancelled")}
                  disabled={updating}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  <FaTimes /> Cancelar
                </button>
              </>
            )}
            {order.status === "sent" && (
              <>
                <button
                  onClick={() => updateStatus("received")}
                  disabled={updating}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  <FaCheck /> Marcar como Recibida
                </button>
                <button
                  onClick={() => updateStatus("cancelled")}
                  disabled={updating}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  <FaTimes /> Cancelar
                </button>
              </>
            )}
            {order.status === "received" && (
              <p className="text-green-600 font-semibold">
                ✅ Esta orden ya fue recibida y el stock fue actualizado
              </p>
            )}
            {order.status === "cancelled" && (
              <p className="text-red-600 font-semibold">
                ❌ Esta orden fue cancelada
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
