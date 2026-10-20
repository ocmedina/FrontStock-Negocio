import { useState } from "react";
import { FaExclamationTriangle, FaTimes, FaSpinner } from "react-icons/fa";

type Order = {
  id: string;
  total_amount: number;
  customers: { full_name: string };
};

interface NotDeliveredModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onConfirm: (
    orderId: string,
    reason: string,
    notes: string
  ) => Promise<boolean>;
}

const reasons = [
  { value: "cliente_ausente", label: "Cliente ausente" },
  { value: "direccion_incorrecta", label: "Dirección incorrecta" },
  { value: "falta_de_dinero", label: "Falta de dinero" },
  { value: "rechazo_del_pedido", label: "Rechazo del pedido" },
  { value: "otro", label: "Otro motivo" },
];

export default function NotDeliveredModal({
  isOpen,
  order,
  onClose,
  onConfirm,
}: NotDeliveredModalProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !order) return null;

  const handleConfirm = async () => {
    if (!reason) return;

    setIsSaving(true);
    const confirmed = await onConfirm(order.id, reason, notes.trim());
    setIsSaving(false);
    if (confirmed) {
      setReason("");
      setNotes("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FaExclamationTriangle className="text-amber-500" />
            Registrar entrega fallida
          </h2>
          <button onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-700 text-xl">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-500">Cliente</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100">
              {order.customers.full_name}
            </p>
            <p className="text-sm font-bold text-slate-500 mt-1">
              ${order.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Motivo *
            </label>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={isSaving}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none focus:border-indigo-500"
            >
              <option value="">Seleccionar motivo</option>
              {reasons.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Observaciones
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isSaving}
              maxLength={500}
              rows={3}
              placeholder="Ej.: Se coordina nueva visita para mañana"
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <button
            onClick={handleConfirm}
            disabled={!reason || isSaving}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <FaSpinner className="animate-spin" /> : <FaExclamationTriangle />}
            Registrar no entregado
          </button>
          <button onClick={onClose} disabled={isSaving} className="w-full py-2 text-xs font-bold text-slate-500">
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
