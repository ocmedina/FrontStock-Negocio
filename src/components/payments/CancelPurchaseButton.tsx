"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FaBan, FaTimes } from "react-icons/fa";
import { cancelPurchase } from "@/app/actions/purchaseActions";
import { formatCurrency } from "@/lib/numberFormat";

type Props = {
  purchaseId: string;
  invoiceNumber: string | null;
  amountPaid: number;
};

export default function CancelPurchaseButton({
  purchaseId,
  invoiceNumber,
  amountPaid,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async () => {
    setIsLoading(true);
    const result = await cancelPurchase(purchaseId);
    setIsLoading(false);

    if (!result.success) {
      toast.error(result.error || "No se pudo anular la factura.");
      return;
    }

    toast.success(
      result.alreadyCancelled ? "La factura ya estaba anulada." : "Factura anulada correctamente."
    );
    setIsOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/30"
        aria-label="Anular factura de proveedor"
      >
        <FaBan />
        Anular
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-purchase-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="cancel-purchase-title" className="text-lg font-black text-slate-900 dark:text-white">
                  ¿Anular factura{invoiceNumber ? " #" + invoiceNumber : ""}?
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Se revertirá el stock de esta sucursal y se quitará el saldo pendiente de la cuenta del proveedor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                aria-label="Cerrar"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                <FaTimes />
              </button>
            </div>

            {amountPaid > 0 && (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                El pago inicial de <strong>{formatCurrency(amountPaid)}</strong> quedará como saldo a favor del proveedor.
              </p>
            )}

            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Si ya no hay unidades suficientes en el stock de esta sucursal, la operación se rechazará sin cambiar la factura ni la deuda.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isLoading ? "Anulando..." : "Confirmar anulación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
