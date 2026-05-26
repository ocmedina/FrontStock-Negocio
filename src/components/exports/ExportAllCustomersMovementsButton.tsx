"use client";

import toast from "react-hot-toast";
import { FaFileExcel } from "react-icons/fa";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ExportAllCustomersMovementsButton() {
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
        const { data: payments, error: paymentsError } = await supabase
          .from("payments")
          .select("id, amount, created_at, type, payment_method, comment, customer_id")
          .order("created_at", { ascending: true })
          .range(from, to);

        if (paymentsError) throw paymentsError;
        if (!payments || payments.length === 0) break;

        const rows = payments.map((movement) => {
          const isPurchase = movement.type === "compra";
          const isCancelled = movement.payment_method === "anulado";
          const movementType = isPurchase ? "Compra a credito" : "Pago recibido";
          const stateText = isCancelled ? " (Anulado)" : "";
          const methodText = movement.payment_method || "No especificado";
          const commentText = movement.comment ? ` - ${movement.comment}` : "";
          let nombreCliente = customerMap[movement.customer_id];
          if (!nombreCliente || typeof nombreCliente !== "string" || !nombreCliente.trim()) {
            nombreCliente = "Sin nombre";
          }
          return {
            "DNI o CUIT (Opcional si hay nombre)": "",
            "Nombre del Cliente": nombreCliente,
            Fecha: new Date(movement.created_at).toLocaleString("es-AR"),
            "Tipo de Movimiento": `${movementType}${stateText}`,
            Monto: Number(Math.abs(movement.amount).toFixed(2)),
            "Descripción": `Metodo: ${methodText}${commentText}`,
          };
        });

        const worksheet = XLSX.utils.json_to_sheet(rows, {
          header: [
            "DNI o CUIT (Opcional si hay nombre)",
            "Nombre del Cliente",
            "Fecha",
            "Tipo de Movimiento",
            "Monto",
            "Descripción",
          ],
        });
        worksheet["!cols"] = [
          { wch: 34 },
          { wch: 30 },
          { wch: 22 },
          { wch: 22 },
          { wch: 12 },
          { wch: 40 },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "HistorialClientes");
        const buffer = XLSX.write(workbook, {
          type: "array",
          bookType: "xlsx",
        });
        zip.file(
          `historial_todos_los_clientes_${exportDate}_parte_${part}.xlsx`,
          buffer
        );
        filesAdded += 1;

        if (payments.length < chunkSize) break;
        from += chunkSize;
        part += 1;
      }

      if (filesAdded === 0) {
        toast.error("No hay movimientos para exportar");
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `historial_todos_los_clientes_${exportDate}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Historial exportado en ZIP");
    } catch (error: any) {
      console.error(error);
      toast.error("No se pudo exportar el historial");
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
      <FaFileExcel /> {loading ? "Exportando..." : "Exportar historial de todos (ZIP)"}
    </button>
  );
}
