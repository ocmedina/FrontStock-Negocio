"use client";

import { useEffect, useState } from "react";
import { FaDollarSign, FaTimes } from "react-icons/fa";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/numberFormat";
import {
  applyCurrentPriceAdjustments,
  canApplyCurrentPriceAdjustments,
  getCurrentPriceAdjustmentCandidates,
  type CurrentPriceAdjustmentCandidate,
} from "@/app/actions/currentPriceAdjustmentActions";

interface CurrentPriceAdjustmentPanelProps {
  onApplied: () => void | Promise<void>;
}

export default function CurrentPriceAdjustmentPanel({ onApplied }: CurrentPriceAdjustmentPanelProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [candidates, setCandidates] = useState<CurrentPriceAdjustmentCandidate[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    canApplyCurrentPriceAdjustments().then(setIsAdmin);
  }, []);

  const keyFor = (candidate: CurrentPriceAdjustmentCandidate) => `${candidate.origin}:${candidate.id}`;
  const selected = candidates.filter((candidate) => selectedKeys.has(keyFor(candidate)));
  const selectedTotal = selected.reduce((sum, candidate) => sum + candidate.adjustment_amount, 0);

  const openPanel = async () => {
    setLoading(true);
    const result = await getCurrentPriceAdjustmentCandidates();
    setLoading(false);

    if (!result.success) {
      toast.error(result.error || "No se pudieron cargar los comprobantes.");
      return;
    }

    setCandidates(result.data || []);
    setSelectedKeys(new Set());
    setIsOpen(true);
  };

  const toggle = (key: string) => {
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const apply = async () => {
    if (selected.length === 0) {
      toast.error("Selecciona al menos un comprobante.");
      return;
    }

    const orderIds = selected.filter((item) => item.origin === "order").map((item) => item.id);
    const saleIds = selected.filter((item) => item.origin === "sale").map((item) => item.id);

    if (!window.confirm(
      `Se sumarán ${formatCurrency(selectedTotal)} a la cuenta corriente de ${selected.length} comprobantes. Los precios originales de los renglones y los pagos ya hechos se conservan. ¿Continuar?`
    )) return;

    setApplying(true);
    const result = await applyCurrentPriceAdjustments(orderIds, saleIds);
    setApplying(false);

    if (!result.success) {
      toast.error(result.error || "No se pudo aplicar el ajuste.");
      return;
    }

    const amount = Number(result.data?.total_adjustment || 0);
    const count = Number(result.data?.adjusted_records || 0);
    if (count > 0 && amount > 0) {
      toast.success(`Ajuste aplicado: ${formatCurrency(amount)} en ${count} comprobantes.`);
    } else {
      toast("No había aumentos nuevos para cobrar en los comprobantes seleccionados.", { icon: "ℹ️" });
    }

    setIsOpen(false);
    setSelectedKeys(new Set());
    await onApplied();
  };

  if (!isAdmin) return null;

  return (
    <>
      <button
        onClick={openPanel}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
      >
        <FaDollarSign />
        {loading ? "Cargando..." : "Actualizar precios de fiados"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Actualizar fiados a precios actuales</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Selecciona ventas o pedidos con saldo. Se agrega solo el aumento según el tipo de cliente; el comprobante original y los pagos se conservan.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {candidates.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  No hay comprobantes con saldo que tengan aumentos nuevos para cobrar.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3 text-sm">
                    <button
                      onClick={() => setSelectedKeys(
                        selectedKeys.size === candidates.length
                          ? new Set()
                          : new Set(candidates.map(keyFor))
                      )}
                      className="font-bold text-indigo-600 hover:underline"
                    >
                      {selectedKeys.size === candidates.length ? "Quitar selección" : "Seleccionar todos"}
                    </button>
                    <span className="text-slate-500">
                      {selected.length} seleccionados · Aumento: {formatCurrency(selectedTotal)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {candidates.map((candidate) => {
                      const key = keyFor(candidate);
                      const checked = selectedKeys.has(key);
                      return (
                        <label
                          key={key}
                          className={`grid grid-cols-[auto_1fr_auto] gap-3 items-center p-3 rounded-xl border cursor-pointer transition-colors ${checked
                            ? "border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/20"
                            : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(key)}
                            className="h-4 w-4 accent-indigo-600"
                          />
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                              {candidate.origin === "order" ? "Pedido de reparto" : "Venta de mostrador"}
                              <span className="font-mono text-xs text-slate-400">#{candidate.id.slice(0, 8)}</span>
                              <span className="text-xs font-medium text-slate-500">{candidate.customer_name}</span>
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {new Date(candidate.created_at).toLocaleDateString("es-AR")} · Sucursal: {candidate.branch_name} · {candidate.customer_type === "mayorista" ? "Mayorista" : "Minorista"} · Saldo {formatCurrency(candidate.current_pending)} · nuevo saldo {formatCurrency(candidate.new_pending)}
                            </span>
                          </span>
                          <span className="text-right">
                            <span className="block text-[10px] uppercase font-bold text-slate-400">Aumento</span>
                            <span className="font-black text-emerald-600">{formatCurrency(candidate.adjustment_amount)}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Los pagos anteriores se mantienen. El ajuste se registra como un nuevo débito en la cuenta corriente.
              </p>
              <button
                onClick={apply}
                disabled={applying || selected.length === 0}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {applying ? "Aplicando..." : `Cobrar aumento · ${formatCurrency(selectedTotal)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

