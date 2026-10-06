'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getActiveShift,
  openCashShift,
  createCashMovement,
  closeCashShift,
  getShiftMovements,
  getShiftHistory,
  type CashShift,
  type CashMovement,
} from '@/app/actions/cashShiftActions';
import { CashRegister } from '@/app/actions/registerActions';
import toast from 'react-hot-toast';
import {
  FaCashRegister,
  FaMoneyBillWave,
  FaArrowDown,
  FaArrowUp,
  FaLock,
  FaUnlock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaHistory,
  FaPlus,
  FaCalculator,
  FaTimes,
  FaPrint,
  FaInfoCircle,
} from 'react-icons/fa';

const fmt = (n: any) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

interface CashShiftControlProps {
  selectedRegisterId: number | 'all';
  registers: CashRegister[];
  onShiftChange?: () => void;
}

export default function CashShiftControl({
  selectedRegisterId,
  registers,
  onShiftChange,
}: CashShiftControlProps) {
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [history, setHistory] = useState<CashShift[]>([]);
  const [loading, setLoading] = useState(false);

  // Modales
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closedShiftReceipt, setClosedShiftReceipt] = useState<CashShift | null>(null);

  // Formularios
  const [initialCashInput, setInitialCashInput] = useState('');
  const [openNotesInput, setOpenNotesInput] = useState('');

  const [movementType, setMovementType] = useState<'egreso' | 'ingreso'>('egreso');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  const [countedCashInput, setCountedCashInput] = useState('');
  const [closeNotesInput, setCloseNotesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const regId = selectedRegisterId === 'all' ? null : selectedRegisterId;
  const currentRegisterObj = registers.find((r) => r.id === regId);
  const registerName = currentRegisterObj?.name || (regId ? `Caja ${regId}` : 'Caja');

  const loadShiftData = useCallback(async () => {
    if (!regId) {
      setActiveShift(null);
      setMovements([]);
      // Cargar historial general si es consolidado
      const histRes = await getShiftHistory(null, 15);
      if (histRes.success && histRes.data) setHistory(histRes.data);
      return;
    }

    setLoading(true);
    try {
      const [shiftRes, histRes] = await Promise.all([
        getActiveShift(regId),
        getShiftHistory(regId, 15),
      ]);

      if (shiftRes.success) {
        setActiveShift(shiftRes.data || null);
        if (shiftRes.data) {
          const movsRes = await getShiftMovements(shiftRes.data.id, regId, shiftRes.data.opened_at);
          if (movsRes.success) setMovements(movsRes.data || []);
        } else {
          setMovements([]);
        }
      }

      if (histRes.success && histRes.data) {
        setHistory(histRes.data);
      }
    } catch (err) {
      console.error('[CashShiftControl] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [regId]);

  useEffect(() => {
    loadShiftData();
  }, [loadShiftData]);

  // Manejar Apertura de Turno
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regId) return;

    const initialCash = parseFloat(initialCashInput) || 0;
    if (initialCash < 0) {
      toast.error('El fondo inicial no puede ser negativo.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await openCashShift({
        registerId: regId,
        initialCash,
        notes: openNotesInput.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.error || 'Error al abrir el turno');
        return;
      }

      toast.success(`Turno abierto exitosamente con ${fmt(initialCash)} de fondo inicial`);
      setShowOpenModal(false);
      setInitialCashInput('');
      setOpenNotesInput('');
      await loadShiftData();
      if (onShiftChange) onShiftChange();
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  // Manejar Movimiento de Efectivo
  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regId) return;

    const amount = parseFloat(movementAmount) || 0;
    if (amount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    if (!movementReason.trim()) {
      toast.error('Debes indicar el motivo del movimiento');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCashMovement({
        registerId: regId,
        shiftId: activeShift?.id || null,
        type: movementType,
        amount,
        reason: movementReason.trim(),
      });

      if (!res.success) {
        toast.error(res.error || 'Error al registrar movimiento');
        return;
      }

      toast.success(
        movementType === 'egreso'
          ? `Retiro de ${fmt(amount)} registrado`
          : `Ingreso de ${fmt(amount)} registrado`
      );
      setShowMovementModal(false);
      setMovementAmount('');
      setMovementReason('');
      await loadShiftData();
      if (onShiftChange) onShiftChange();
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  // Manejar Cierre y Arqueo
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    const countedCash = parseFloat(countedCashInput);
    if (isNaN(countedCash) || countedCash < 0) {
      toast.error('Ingresa un monto contado válido');
      return;
    }

    setSubmitting(true);
    try {
      const res = await closeCashShift({
        shiftId: activeShift.id,
        countedCash,
        notes: closeNotesInput.trim() || undefined,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Error al cerrar el turno');
        return;
      }

      const closed = res.data;
      setClosedShiftReceipt(closed);
      setShowCloseModal(false);
      setCountedCashInput('');
      setCloseNotesInput('');

      if ((closed.difference || 0) === 0) {
        toast.success('¡Caja cerrada! Arqueo exacto sin diferencias.');
      } else if ((closed.difference || 0) > 0) {
        toast.success(`Caja cerrada. Sobrante de ${fmt(closed.difference)}`);
      } else {
        toast.error(`Caja cerrada con faltante de ${fmt(Math.abs(closed.difference || 0))}`, {
          duration: 4000,
        });
      }

      await loadShiftData();
      if (onShiftChange) onShiftChange();
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  const currentDifference = countedCashInput !== '' && activeShift
    ? (parseFloat(countedCashInput) || 0) - activeShift.expected_cash
    : null;

  return (
    <div className="space-y-6">
      {/* Si se seleccionó 'Todas las Cajas' */}
      {!regId ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 p-6 shadow-2xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FaCashRegister className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                Control de Efectivo y Turnos de Caja
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Para abrir turno, registrar retiros o hacer arqueo individual, seleccioná una caja específica en el menú superior.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {registers.map((r) => (
              <div
                key={r.id}
                className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{r.name}</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Puesto activo</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  Seleccionar en filtro ↑
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Caja individual seleccionada */
        <div className="space-y-6">
          {activeShift ? (
            /* TURNO ABIERTO */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-500/30 dark:border-emerald-500/20 shadow-sm p-6 sm:p-7 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full -mr-16 -mt-16 pointer-events-none" />

              {/* Encabezado del turno */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
                    <FaUnlock />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Turno Abierto
                      </span>
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                        {registerName}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                      Cajero: {activeShift.cashier_name}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Abierto hoy a las{' '}
                      {new Date(activeShift.opened_at).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Botones de acción del turno */}
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setMovementType('egreso');
                      setShowMovementModal(true);
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-rose-100 transition-all active:scale-95 shadow-2xs"
                  >
                    <FaArrowDown className="w-3 h-3" /> Retiro / Egreso
                  </button>

                  <button
                    onClick={() => {
                      setMovementType('ingreso');
                      setShowMovementModal(true);
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-100 transition-all active:scale-95 shadow-2xs"
                  >
                    <FaArrowUp className="w-3 h-3" /> Ingreso Extra
                  </button>

                  <button
                    onClick={() => {
                      setCountedCashInput('');
                      setShowCloseModal(true);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95 shadow-md shadow-emerald-500/15"
                  >
                    <FaLock className="w-3 h-3" /> Hacer Arqueo y Cerrar
                  </button>
                </div>
              </div>

              {/* Fórmulas y Desglose de Caja */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 my-6">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                    Fondo Inicial
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
                    {fmt(activeShift.initial_cash)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                    + Ventas Efectivo
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300">
                    {fmt(activeShift.cash_sales)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                    + Ingresos Extra
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-700 dark:text-blue-300">
                    {fmt(activeShift.cash_inflow)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                    - Retiros / Gastos
                  </span>
                  <span className="text-base sm:text-lg font-black text-rose-700 dark:text-rose-300">
                    {fmt(activeShift.cash_outflow)}
                  </span>
                </div>
              </div>

              {/* Total Esperado en Cajón */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                    💵 Efectivo que debe haber en el cajón físico
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Fondo inicial + ventas en efectivo + ingresos - egresos
                  </p>
                </div>
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {fmt(activeShift.expected_cash)}
                </span>
              </div>

              {/* Movimientos del turno */}
              {movements.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                    <FaHistory /> Movimientos registrados en este turno ({movements.length})
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                    {movements.map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                              m.type === 'egreso'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-blue-500/10 text-blue-600'
                            }`}
                          >
                            {m.type === 'egreso' ? <FaArrowDown /> : <FaArrowUp />}
                          </span>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {m.reason}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                              {new Date(m.created_at).toLocaleTimeString('es-AR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`font-black text-sm ${
                            m.type === 'egreso' ? 'text-rose-600' : 'text-blue-600'
                          }`}
                        >
                          {m.type === 'egreso' ? '-' : '+'}
                          {fmt(m.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TURNO CERRADO / SIN TURNO ACTIVO */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 p-8 text-center shadow-2xs">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center text-2xl mx-auto mb-4">
                <FaLock />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                {registerName} — Caja Cerrada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-6">
                No hay un turno activo en esta caja. Podés abrir turno registrando el fondo inicial de cambio para comenzar a controlar el dinero del cajón.
              </p>
              <button
                onClick={() => {
                  setInitialCashInput('0');
                  setShowOpenModal(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-500/20"
              >
                <FaUnlock /> Abrir Turno con Fondo Inicial
              </button>
            </div>
          )}

          {/* HISTORIAL DE ARQUEOS ANTERIORES */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 p-6 shadow-2xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FaHistory className="text-indigo-600 dark:text-indigo-400" />
                Historial de Arqueos y Cierres ({registerName})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Fecha y Hora</th>
                      <th className="py-2.5 px-3">Cajero</th>
                      <th className="py-2.5 px-3 text-right">Fondo Inicial</th>
                      <th className="py-2.5 px-3 text-right">Ventas Efectivo</th>
                      <th className="py-2.5 px-3 text-right">Esperado</th>
                      <th className="py-2.5 px-3 text-right">Contado</th>
                      <th className="py-2.5 px-3 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.map((h) => {
                      const diff = Number(h.difference || 0);
                      const isExact = diff === 0;
                      const isSurplus = diff > 0;
                      return (
                        <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                            {new Date(h.closed_at || h.opened_at).toLocaleDateString('es-AR')}{' '}
                            <span className="text-slate-400 text-[10px]">
                              {new Date(h.closed_at || h.opened_at).toLocaleTimeString('es-AR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-semibold">
                            {h.cashier_name}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-400">
                            {fmt(h.initial_cash)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {fmt(h.cash_sales)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                            {fmt(h.expected_cash)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-slate-100">
                            {fmt(h.counted_cash)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                isExact
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  : isSurplus
                                  ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                  : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              }`}
                            >
                              {isExact ? 'Exacta' : isSurplus ? `+${fmt(diff)}` : fmt(diff)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: ABRIR TURNO ── */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg">
                  <FaUnlock />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    Abrir Turno — {registerName}
                  </h3>
                  <p className="text-xs text-slate-400">Ingreso de fondo inicial de cambio</p>
                </div>
              </div>
              <button
                onClick={() => setShowOpenModal(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Fondo Inicial de Efectivo ($)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    autoFocus
                    required
                    value={initialCashInput}
                    onChange={(e) => setInitialCashInput(e.target.value)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xl font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {/* Botones rápidos */}
                <div className="flex gap-2 mt-2">
                  {[5000, 10000, 15000, 20000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setInitialCashInput(String(val))}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors"
                    >
                      +${val.toLocaleString('es-AR')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Notas u Observaciones (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={openNotesInput}
                  onChange={(e) => setOpenNotesInput(e.target.value)}
                  placeholder="Ej: Billetes chicos para cambio..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Abriendo...' : 'Confirmar Apertura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: MOVIMIENTO DE EFECTIVO (RETIRO / INGRESO) ── */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
                    movementType === 'egreso'
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50'
                      : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50'
                  }`}
                >
                  {movementType === 'egreso' ? <FaArrowDown /> : <FaArrowUp />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    {movementType === 'egreso' ? 'Retiro de Efectivo (Sangría)' : 'Ingreso Extra de Efectivo'}
                  </h3>
                  <p className="text-xs text-slate-400">{registerName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMovementModal(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCreateMovement} className="space-y-4">
              {/* Selector de Tipo */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMovementType('egreso')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    movementType === 'egreso'
                      ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ↓ Egreso / Retiro
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType('ingreso')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    movementType === 'ingreso'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ↑ Ingreso Extra
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Monto ($)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    autoFocus
                    required
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xl font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Motivo o Destino
                </label>
                <input
                  type="text"
                  required
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder={
                    movementType === 'egreso'
                      ? 'Ej: Retiro para caja fuerte, pago flete, etc.'
                      : 'Ej: Ingreso de cambio adicional'
                  }
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-[2] py-3 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 ${
                    movementType === 'egreso'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {submitting ? 'Guardando...' : 'Registrar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ARQUEO Y CIERRE DE TURNO ── */}
      {showCloseModal && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center text-lg">
                  <FaCalculator />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    Arqueo de Efectivo y Cierre — {registerName}
                  </h3>
                  <p className="text-xs text-slate-400">Conteo del dinero físico en cajón</p>
                </div>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4">
              {/* Resumen del sistema */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Fondo Inicial:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {fmt(activeShift.initial_cash)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Ventas en Efectivo:</span>
                  <span className="font-bold text-emerald-600">+{fmt(activeShift.cash_sales)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Ingresos Extra:</span>
                  <span className="font-bold text-blue-600">+{fmt(activeShift.cash_inflow)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Retiros / Egresos:</span>
                  <span className="font-bold text-rose-600">-{fmt(activeShift.cash_outflow)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-black text-sm text-slate-900 dark:text-slate-100">
                  <span>Efectivo Esperado:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {fmt(activeShift.expected_cash)}
                  </span>
                </div>
              </div>

              {/* Input de Efectivo Contado */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Dinero Contado Físicamente en Cajón ($)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    autoFocus
                    required
                    value={countedCashInput}
                    onChange={(e) => setCountedCashInput(e.target.value)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-2xl font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Comparador de Diferencia en Vivo */}
              {currentDifference !== null && (
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                    currentDifference === 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : currentDifference > 0
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {currentDifference === 0 ? (
                      <FaCheckCircle className="w-4 h-4" />
                    ) : (
                      <FaExclamationTriangle className="w-4 h-4" />
                    )}
                    <span>
                      {currentDifference === 0
                        ? 'Caja Exacta (Sin Diferencias)'
                        : currentDifference > 0
                        ? 'Sobrante de Caja'
                        : 'Faltante de Caja'}
                    </span>
                  </div>
                  <span className="text-base font-black">
                    {currentDifference > 0 ? `+${fmt(currentDifference)}` : fmt(currentDifference)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Observaciones de Cierre (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={closeNotesInput}
                  onChange={(e) => setCloseNotesInput(e.target.value)}
                  placeholder="Ej: Justificación de diferencias o comentarios..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Cerrando...' : 'Confirmar Cierre y Arqueo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: COMPROBANTE DE CIERRE EXITOSO ── */}
      {closedShiftReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl mx-auto mb-3">
              <FaCheckCircle />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
              Cierre Completado
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Turno #{closedShiftReceipt.id} cerrado correctamente en {closedShiftReceipt.register_name}.
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs space-y-2 mb-6 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Efectivo Esperado:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {fmt(closedShiftReceipt.expected_cash)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Efectivo Contado:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {fmt(closedShiftReceipt.counted_cash)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold">
                <span>Diferencia Final:</span>
                <span
                  className={
                    (closedShiftReceipt.difference || 0) === 0
                      ? 'text-emerald-600'
                      : (closedShiftReceipt.difference || 0) > 0
                      ? 'text-blue-600'
                      : 'text-rose-600'
                  }
                >
                  {(closedShiftReceipt.difference || 0) > 0
                    ? `+${fmt(closedShiftReceipt.difference)}`
                    : fmt(closedShiftReceipt.difference)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2"
              >
                <FaPrint /> Imprimir
              </button>
              <button
                onClick={() => setClosedShiftReceipt(null)}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-indigo-700"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
