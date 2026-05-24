import { useState } from "react";
import { FaTimes, FaMoneyBillWave, FaSpinner, FaGasPump, FaHamburger, FaWrench } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

interface AddExpenseModalProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddExpenseModal({ isOpen, userId, onClose, onSuccess }: AddExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("combustible");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }
    if (!description.trim()) {
      toast.error("Ingresá una descripción corta");
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
      });

      const { error } = await supabase.from("expenses").insert({
        amount: Number(amount),
        category: category,
        description: description,
        date: today,
        user_id: userId,
      });

      if (error) throw error;

      toast.success("Gasto registrado y cruzado con caja");
      
      // Limpiar formulario para el próximo uso
      setAmount("");
      setDescription("");
      setCategory("combustible");
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("No se pudo guardar el gasto: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-5 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FaMoneyBillWave /> Registrar Gasto
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
              Esta plata se descontará de tu rendición de efectivo final de hoy.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Categoría
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCategory("combustible")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                  category === "combustible"
                    ? "bg-orange-100 border-orange-500 text-orange-700 dark:bg-orange-900/40 dark:border-orange-500 dark:text-orange-300"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-slate-800 dark:border-slate-700"
                }`}
              >
                <FaGasPump className="text-xl" />
                <span className="text-xs font-bold">Combustible</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory("comida")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                  category === "comida"
                    ? "bg-orange-100 border-orange-500 text-orange-700 dark:bg-orange-900/40 dark:border-orange-500 dark:text-orange-300"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-slate-800 dark:border-slate-700"
                }`}
              >
                <FaHamburger className="text-xl" />
                <span className="text-xs font-bold">Comida</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory("varios")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                  category === "varios"
                    ? "bg-orange-100 border-orange-500 text-orange-700 dark:bg-orange-900/40 dark:border-orange-500 dark:text-orange-300"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-slate-800 dark:border-slate-700"
                }`}
              >
                <FaWrench className="text-xl" />
                <span className="text-xs font-bold">Varios</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Monto del Ticket ($)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-lg dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Descripción Breve
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Carga YPF Av. Mitre"
              className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50"
            >
              {loading ? <FaSpinner className="animate-spin text-xl" /> : <FaMoneyBillWave className="text-xl" />}
              {loading ? "Guardando..." : "Guardar Gasto"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full mt-3 py-3 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
