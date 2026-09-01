"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaWrench, FaTimes, FaCheckCircle, FaCalendarAlt, FaShieldAlt } from "react-icons/fa";

export default function PassiveMaintenanceBadge() {
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modalContent = showModal && mounted ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop click to close */}
      <div 
        className="fixed inset-0" 
        onClick={() => setShowModal(false)} 
        aria-hidden="true" 
      />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden z-10 animate-scaleIn">
        {/* Glow decorativo de fondo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        {/* Encabezado del Modal */}
        <div className="flex items-start justify-between gap-3 mb-5 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-md shadow-amber-500/20">
              <FaWrench className="text-xl" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Aviso de Mantenimiento
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 leading-tight">
                Mantenimiento Pasivo Programado
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <FaTimes className="text-base" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed relative z-10">
          {/* Tarjeta de Fecha */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
              <FaCalendarAlt className="text-base" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                Días de ejecución
              </p>
              <p className="font-extrabold text-sm text-slate-900 dark:text-amber-100">
                Miércoles 2 y Jueves 3 de Septiembre
              </p>
            </div>
          </div>

          <p className="text-slate-600 dark:text-slate-300">
            Se llevarán a cabo tareas programadas de mantenimiento preventivo, actualización de infraestructura y optimización de base de datos en segundo plano.
          </p>

          {/* Tarjeta de Servicio Activo */}
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-start gap-3 text-emerald-900 dark:text-emerald-200">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0 mt-0.5">
              <FaShieldAlt className="text-sm" />
            </div>
            <div className="text-xs leading-snug">
              <strong className="block font-bold text-emerald-950 dark:text-emerald-300 mb-0.5">
                ¿Qué significa mantenimiento pasivo?
              </strong>
              <span>
                El sistema seguirá 100% operativo. Podrás seguir registrando ventas, cobros, presupuestos y pedidos con normalidad durante estos días (En casos de inconvenientes, contactar a soporte).
              </span>
            </div>
          </div>
        </div>

        {/* Botón de cierre */}
        <div className="mt-6 flex justify-end relative z-10">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all cursor-pointer flex items-center gap-2"
          >
            <FaCheckCircle /> Entendido
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Botón / Cartel del Header */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        title="Mantenimiento pasivo: Miércoles 2 y Jueves 3 de Septiembre. Clic para ver detalles."
        className="px-3 py-1.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 hover:from-amber-500/20 hover:to-orange-500/20 dark:bg-amber-950/40 border border-amber-500/35 dark:border-amber-500/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 transition-all duration-200 flex items-center gap-2 shadow-xs group cursor-pointer shrink-0 max-w-[280px] sm:max-w-none"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>

        <FaWrench className="text-amber-600 dark:text-amber-400 text-xs shrink-0 group-hover:rotate-12 transition-transform duration-200" />

        <div className="flex items-center gap-1.5 font-medium text-xs whitespace-nowrap overflow-hidden">
          <span className="font-extrabold text-amber-950 dark:text-amber-100 shrink-0">
            Mantenimiento pasivo:
          </span>
          <span className="text-amber-800 dark:text-amber-300 font-semibold truncate hidden 2xl:inline">
            Miércoles 2 y Jueves 3 de Septiembre
          </span>
          <span className="text-amber-800 dark:text-amber-300 font-semibold truncate 2xl:hidden">
            2 y 3 Sept.
          </span>
        </div>

        <span className="hidden xl:inline-flex px-1.5 py-0.2 bg-amber-500/20 text-amber-900 dark:text-amber-200 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0">
          Pasivo
        </span>
      </button>

      {/* Modal renderizado en el Body mediante Portal */}
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
