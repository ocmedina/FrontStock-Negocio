import { useState, useEffect } from "react";
import {
  FaTimes,
  FaTruck,
  FaMapMarkerAlt,
  FaSpinner,
  FaCheck,
} from "react-icons/fa";
import { Database } from "@/lib/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Order = {
  id: string;
  customer_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  profile_id: string;
  customers: {
    full_name: string;
    address?: string | null;
    reference?: string | null;
  };
};

interface DeliveryConfirmationModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onConfirm: (
    orderId: string,
    amountPaid: number,
    paymentMethod: string
  ) => void;
}

export default function DeliveryConfirmationModal({
  isOpen,
  order,
  onClose,
  onConfirm,
}: DeliveryConfirmationModalProps) {
  const [isDelivering, setIsDelivering] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [amountCash, setAmountCash] = useState("");
  const [amountTransfer, setAmountTransfer] = useState("");

  useEffect(() => {
    if (order) {
      setAmountPaid(order.total_amount.toFixed(2));
      setPaymentMethod("efectivo");
    }
  }, [order]);

  useEffect(() => {
    if (paymentMethod === "cuenta_corriente") {
      setAmountPaid("0.00");
    } else if (paymentMethod === "mixto") {
      const cash = parseFloat(amountCash) || 0;
      const transfer = parseFloat(amountTransfer) || 0;
      setAmountPaid((cash + transfer).toFixed(2));
    } else if (order) {
      setAmountPaid(order.total_amount.toFixed(2));
    }
  }, [paymentMethod, order, amountCash, amountTransfer]);

  if (!isOpen || !order) return null;

  const handleConfirm = async () => {
    setIsDelivering(true);
    const paid = parseFloat(amountPaid) || 0;
    await onConfirm(order.id, paid, paymentMethod);
    setIsDelivering(false);
    onClose();
  };

  const total = order.total_amount;
  const paid = parseFloat(amountPaid) || 0;
  const pending = total - paid;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col border border-slate-205 dark:border-slate-800/80 animate-slide-up sm:animate-none">
        
        {/* Cabecera del Modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-955/20 flex items-center justify-center">
              <FaTruck className="text-emerald-600 dark:text-emerald-400 text-sm" />
            </div>
            <h2 className="text-xs font-black text-slate-850 dark:text-slate-105 uppercase tracking-wider">
              Confirmar Entrega y Pago
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDelivering}
            className="w-7 h-7 flex items-center justify-center text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Cuerpo del Modal con scroll si el contenido es largo */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Cliente</p>
            <p className="text-lg font-black text-slate-850 dark:text-slate-100">
              {order.customers.full_name}
            </p>
            
            {order.customers.address && (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-405">
                <div className="flex items-center justify-center gap-1.5 font-medium">
                  <FaMapMarkerAlt className="text-indigo-500" size={12} />
                  <span>{order.customers.address}</span>
                </div>
                {order.customers.reference && (
                  <p className="text-[10px] italic text-slate-400 dark:text-slate-500 mt-0.5">
                    Ref: {order.customers.reference}
                  </p>
                )}
              </div>
            )}
            
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-3.5 tracking-tight">
              ${order.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                Método de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  if (e.target.value === "mixto") {
                    setAmountCash("");
                    setAmountTransfer("");
                  }
                }}
                className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-800 dark:text-slate-100"
              >
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">🏦 Transferencia</option>
                <option value="mercado_pago">📱 Mercado Pago</option>
                <option value="mixto">💳 Mixto</option>
                <option value="cuenta_corriente">
                  📋 Cuenta Corriente (Fiado)
                </option>
              </select>
            </div>

            {paymentMethod === "mixto" ? (
              <div className="space-y-3 p-3 bg-slate-50/60 dark:bg-slate-950/30 rounded-2xl border border-slate-200/50 dark:border-slate-800/40">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    💵 Efectivo Recibido
                  </label>
                  <input
                    type="number"
                    value={amountCash}
                    onChange={(e) => setAmountCash(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    🏦 Transferencia Recibida
                  </label>
                  <input
                    type="number"
                    value={amountTransfer}
                    onChange={(e) => setAmountTransfer(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="bg-indigo-50/30 dark:bg-indigo-955/10 p-3 rounded-xl border border-indigo-500/10 flex justify-between items-center">
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Total Recibido
                  </span>
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                    ${amountPaid}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                  Monto Recibido
                </label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-800 dark:text-slate-100"
                />
              </div>
            )}

            {pending > 0 && (
              <div className="flex justify-between items-center p-3 bg-rose-50/50 dark:bg-rose-955/10 rounded-2xl border border-rose-500/10 text-rose-600 dark:text-rose-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Saldo Pendiente (Deuda):</span>
                <span className="text-sm font-black">
                  ${pending.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer del Modal */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-955/10 rounded-b-3xl space-y-2">
          <button
            onClick={handleConfirm}
            disabled={isDelivering}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isDelivering ? (
              <>
                <FaSpinner className="animate-spin text-sm" /> Confirmando...
              </>
            ) : (
              <>
                <FaCheck className="text-xs" /> Marcar como Entregado
              </>
            )}
          </button>
          
          <button
            onClick={onClose}
            disabled={isDelivering}
            className="w-full py-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
