'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRegister } from '@/hooks/useRegister';
import {
  getActiveShift,
  openCashShift,
  createCashMovement,
  type CashShift,
} from '@/app/actions/cashShiftActions';
import toast from 'react-hot-toast';
import {
  FaUnlock,
  FaArrowDown,
  FaTimes,
  FaMoneyBillWave,
  FaArrowUp,
  FaStore,
} from 'react-icons/fa';

const fmt = (n: any) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

export default function QuickShiftAction() {
  const { activeRegister } = useRegister();
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [loading, setLoading] = useState(false);

  // Modales
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Forms
  const [initialCash, setInitialCash] = useState('0');
  const [openNotes, setOpenNotes] = useState('');

  const [moveType, setMoveType] = useState<'egreso' | 'ingreso'>('egreso');
  const [moveAmount, setMoveAmount] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchShift = useCallback(async () => {
    if (!activeRegister?.id) return;
    setLoading(true);
    try {
      const res = await getActiveShift(activeRegister.id);
      if (res.success) {
        setActiveShift(res.data || null);
      }
    } catch (err) {
      console.error('[QuickShiftAction] fetchShift error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeRegister?.id]);

  useEffect(() => {
    fetchShift();
  }, [fetchShift]);

  if (!activeRegister) return null;

  const handleOpenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cash = parseFloat(initialCash) || 0;
    if (cash < 0) {
      toast.error('El fondo no puede ser negativo');
      return;
    }

    setSubmitting(true);
    try {
      const res = await openCashShift({
        registerId: activeRegister.id,
        initialCash: cash,
        notes: openNotes.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.error || 'Error al abrir turno');
        return;
      }

      toast.success(`Turno abierto en ${activeRegister.name} con fondo de ${fmt(cash)}`);
      setShowOpenModal(false);
      setInitialCash('0');
      setOpenNotes('');
      await fetchShift();
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(moveAmount) || 0;
    if (amt <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    if (!moveReason.trim()) {
      toast.error('Debes indicar el motivo');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCashMovement({
        registerId: activeRegister.id,
        shiftId: activeShift?.id || null,
        type: moveType,
        amount: amt,
        reason: moveReason.trim(),
      });

      if (!res.success) {
        toast.error(res.error || 'Error al registrar movimiento');
        return;
      }

      toast.success(
        moveType === 'egreso'
          ? `Retiro de ${fmt(amt)} registrado`
          : `Ingreso de ${fmt(amt)} registrado`
      );
      setShowMoveModal(false);
      setMoveAmount('');
      setMoveReason('');
      await fetchShift();
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Botón rápido en la barra superior */}
      {!activeShift ? (
        <button
          type="button"
          onClick={() => {
            setInitialCash('0');
            setShowOpenModal(true);
          }}
          title="Abrir turno con fondo inicial para controlar el efectivo"
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs"
        >
          <FaUnlock className="w-3 h-3 opacity-80" />
          <span>Abrir Turno</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setMoveType('egreso');
            setShowMoveModal(true);
          }}
          title={`Turno abierto (${activeShift.cashier_name}). Clic para registrar retiro o sangría de efectivo.`}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs"
        >
          <FaArrowDown className="w-3 h-3 text-rose-500" />
          <span>Retiro de Caja</span>
        </button>
      )}

      {/* Modal Rápido: Abrir Turno */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <FaUnlock className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Abrir Turno — {activeRegister.name}
                </h3>
              </div>
              <button
                onClick={() => setShowOpenModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleOpenSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Fondo Inicial de Efectivo ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    autoFocus
                    required
                    value={initialCash}
                    onChange={(e) => setInitialCash(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-lg font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[5000, 10000, 15000, 20000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setInitialCash(String(val))}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    >
                      +${val.toLocaleString('es-AR')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Notas (Opcional)
                </label>
                <input
                  type="text"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="Ej: Cambio para el día..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-2.5 bg-amber-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-amber-700 disabled:opacity-50"
                >
                  {submitting ? 'Abriendo...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rápido: Retiro / Movimiento de Caja */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    moveType === 'egreso'
                      ? 'bg-rose-500/10 text-rose-600'
                      : 'bg-blue-500/10 text-blue-600'
                  }`}
                >
                  {moveType === 'egreso' ? (
                    <FaArrowDown className="w-3.5 h-3.5" />
                  ) : (
                    <FaArrowUp className="w-3.5 h-3.5" />
                  )}
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  {moveType === 'egreso' ? 'Retiro de Caja' : 'Ingreso Extra'} — {activeRegister.name}
                </h3>
              </div>
              <button
                onClick={() => setShowMoveModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleMoveSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMoveType('egreso')}
                  className={`py-1.5 rounded-lg transition-all ${
                    moveType === 'egreso'
                      ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-2xs font-extrabold'
                      : 'text-slate-500'
                  }`}
                >
                  ↓ Retiro / Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setMoveType('ingreso')}
                  className={`py-1.5 rounded-lg transition-all ${
                    moveType === 'ingreso'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-2xs font-extrabold'
                      : 'text-slate-500'
                  }`}
                >
                  ↑ Ingreso Extra
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Monto ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    autoFocus
                    required
                    value={moveAmount}
                    onChange={(e) => setMoveAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-lg font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Motivo
                </label>
                <input
                  type="text"
                  required
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  placeholder={
                    moveType === 'egreso'
                      ? 'Ej: Sangría a caja fuerte, flete, etc.'
                      : 'Ej: Cambio en billetes chicos'
                  }
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-[2] py-2.5 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 ${
                    moveType === 'egreso'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {submitting ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
