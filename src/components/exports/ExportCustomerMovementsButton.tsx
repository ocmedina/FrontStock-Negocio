"use client";

import toast from "react-hot-toast";
import { FaFileExcel } from "react-icons/fa";

type PaymentMovement = {
  id: number | string;
  amount: number;
  created_at: string;
  type: string;
  payment_method: string | null;
  comment: string | null;
};

interface ExportCustomerMovementsButtonProps {
  customerName: string;
  branchName: string;
  payments: PaymentMovement[];
}

export default function ExportCustomerMovementsButton({
  customerName,
  branchName,
  payments,
}: ExportCustomerMovementsButtonProps) {
  const handleExport = async () => {
    if (!payments || payments.length === 0) {
      toast.error("No hay movimientos para exportar");
      return;
    }

    const XLSX = await import("xlsx");

    const rows = payments.map((movement) => {
      const isPurchase = movement.type === "compra";
      const isCancelled = movement.payment_method === "anulado";
      const movementType = isPurchase ? "Compra a credito" : "Pago recibido";
      const stateText = isCancelled ? " (Anulado)" : "";
      const methodText = movement.payment_method || "No especificado";
      const commentText = movement.comment ? ` - ${movement.comment}` : "";

      return {
        "DNI o CUIT (Opcional si hay nombre)": "",
        "Nombre del Cliente": customerName || "",
        Sucursal: branchName || "Sin asignar",
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
        "Sucursal",
        "Fecha",
        "Tipo de Movimiento",
        "Monto",
        "Descripción",
      ],
    });

    worksheet["!cols"] = [
      { wch: 34 },
      { wch: 30 },
      { wch: 20 },
      { wch: 22 },
      { wch: 22 },
      { wch: 12 },
      { wch: 40 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Movimientos");

    const exportDate = new Date().toISOString().split("T")[0];
    const safeName = (customerName || "cliente")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    const safeBranch = (branchName || "sucursal")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    XLSX.writeFile(workbook, `historial_movimientos_${safeName}_${safeBranch}_${exportDate}.xlsx`);
    toast.success("Historial exportado correctamente");
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-medium flex items-center gap-2"
    >
      <FaFileExcel /> Exportar historial
    </button>
  );
}

