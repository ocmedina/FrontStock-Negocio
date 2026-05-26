"use client";

import toast from "react-hot-toast";
import { FaFileExcel } from "react-icons/fa";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ExportAllOrdersWithCustomerButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const XLSX = await import("xlsx");
      const { default: JSZip } = await import("jszip");

      // 1. Obtener todos los clientes (activos e inactivos)
      const { data: customers, error: customersError } = await supabase
        .from("customers")
        .select("id, full_name");
      if (customersError) throw customersError;
      const customerMap = Object.fromEntries(
        (customers || []).map((c) => [c.id, c.full_name])
      );

      const exportDate = new Date().toISOString().split("T")[0];
      const zip = new JSZip();
      const chunkSize = 500;
      let from = 0;
      let part = 1;
      let filesAdded = 0;

      while (true) {
        const to = from + chunkSize - 1;
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("id, created_at, customer_id, amount_pending, payment_method, status")
          .order("created_at", { ascending: true })
          .range(from, to);

        if (ordersError) throw ordersError;
        if (!orders || orders.length === 0) break;

        const rows = orders.map((order) => {
          let nombreCliente = customerMap[order.customer_id];
          if (!nombreCliente || typeof nombreCliente !== "string" || !nombreCliente.trim()) {
            nombreCliente = "Sin nombre";
          }
          return {
            "ID Pedido": order.id,
            "Nombre del Cliente": nombreCliente,
            Fecha: new Date(order.created_at).toLocaleString("es-AR"),
            "Monto Pendiente": Number(order.amount_pending ?? 0),
            "Método de Pago": order.payment_method || "No especificado",
            Estado: order.status,
          };
        });

        const worksheet = XLSX.utils.json_to_sheet(rows, {
          header: [
            "ID Pedido",
            "Nombre del Cliente",
            "Fecha",
            "Monto Pendiente",
            "Método de Pago",
            "Estado",
          ],
        });
        worksheet["!cols"] = [
          { wch: 18 },
          { wch: 30 },
          { wch: 22 },
          { wch: 16 },
          { wch: 20 },
          { wch: 14 },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos");
        const buffer = XLSX.write(workbook, {
          type: "array",
          bookType: "xlsx",
        });
        zip.file(
          `pedidos_con_clientes_${exportDate}_parte_${part}.xlsx`,
          buffer
        );
        filesAdded += 1;

        if (orders.length < chunkSize) break;
        from += chunkSize;
        part += 1;
      }

      if (filesAdded === 0) {
        toast.error("No hay pedidos para exportar");
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pedidos_con_clientes_${exportDate}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Pedidos exportados en ZIP");
    } catch (error: any) {
      console.error(error);
      toast.error("No se pudo exportar los pedidos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-lg hover:from-emerald-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2"
    >
      <FaFileExcel /> {loading ? "Exportando..." : "Exportar pedidos con clientes (ZIP)"}
    </button>
  );
}
