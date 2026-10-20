import { useEffect, useState } from "react";
import { FaCalendarAlt, FaTimes, FaSpinner } from "react-icons/fa";

type Order = {
  id: string;
  customers: { full_name: string };
};

interface RescheduleDeliveryModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onConfirm: (orderId: string, date: string) => Promise<boolean>;
}

export default function RescheduleDeliveryModal({
  isOpen,
  order,
  onClose,
  onConfirm,
}: RescheduleDeliveryModalProps) {
  const [date, setDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toLocaleDateString("en-CA"));
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handleConfirm = async () => {
    if (!date) return;
    setIsSaving(true);
    const confirmed = await onConfirm(order.id, date);
    setIsSaving(false);
    if (confirmed) onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FaCalendarAlt className="text-indigo-500" /> Reprogramar entrega
          </h2>
          <button onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-700 text-xl">
            <FaTimes />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Elegí una nueva fecha para <strong>{order.customers.full_name}</strong>.
          </p>
          <input
            type="date"
            value={date}
            min={new Date().toLocaleDateString("en-CA")}
            onChange={(event) => setDate(event.target.value)}
            disabled={isSaving}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-bold outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleConfirm}
            disabled={!date || isSaving}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <FaSpinner className="animate-spin" /> : <FaCalendarAlt />}
            Confirmar nueva fecha
          </button>
          <button onClick={onClose} disabled={isSaving} className="w-full py-2 text-xs font-bold text-slate-500">
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
