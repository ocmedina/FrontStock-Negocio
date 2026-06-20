"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FaTrash } from "react-icons/fa";
import { deleteSupplierPayment } from "@/app/actions/supplierActions";
import { formatCurrency } from "@/lib/numberFormat";

interface DeleteSupplierPaymentButtonProps {
  paymentId: string;
  supplierId: string;
  amount: number;
}

export default function DeleteSupplierPaymentButton({
  paymentId,
  supplierId,
  amount,
}: DeleteSupplierPaymentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `¿Está seguro de eliminar este pago de ${formatCurrency(amount)}? Esta acción restaurará la deuda al proveedor.`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const result = await deleteSupplierPayment(paymentId, supplierId);

      if (!result.success) {
        throw new Error(result.error || "Error al eliminar el pago");
      }

      toast.success("Pago eliminado y deuda restaurada.");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al eliminar el pago: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50 flex items-center justify-center"
      title="Eliminar pago"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <FaTrash className="w-4 h-4" />
      )}
    </button>
  );
}
