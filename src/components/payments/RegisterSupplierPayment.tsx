"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { registerSupplierPayment } from "@/app/actions/supplierActions";

export default function RegisterSupplierPayment({
  supplierId,
  currentDebt: _currentDebt,
}: {
  supplierId: string;
  currentDebt: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error("Ingresa un monto válido.");
      return;
    }
    setLoading(true);

    try {
      const result = await registerSupplierPayment(
        supplierId,
        paymentAmount,
        comment || "Pago a cuenta"
      );

      if (!result.success) {
        throw new Error(result.error || "Error desconocido");
      }

      toast.success("¡Pago registrado exitosamente!");
      setAmount("");
      setComment("");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al registrar el pago: ${errorMessage}`);
    }

    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
      <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-4">Registrar Pago a Proveedor</h2>
      <form
        onSubmit={handleRegisterPayment}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
      >
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Monto Pagado
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1.5 block w-full px-4 py-2.5 border-2 border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50 transition-all text-sm font-medium"
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Comentario
          </label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-1.5 block w-full px-4 py-2.5 border-2 border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50 transition-all text-sm font-medium"
            placeholder="Ej: Pago factura #123"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full px-5 py-3.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/10 transition-all hover:scale-[1.01] active:scale-95 text-center"
        >
          {loading ? "Registrando..." : "Registrar Pago"}
        </button>
      </form>
    </div>
  );
}

