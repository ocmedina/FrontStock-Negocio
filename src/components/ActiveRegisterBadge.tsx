'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRegister } from '@/hooks/useRegister';
import { useAuth } from '@/hooks/useAuth';
import { FaCashRegister, FaLock, FaChevronDown, FaCheck } from 'react-icons/fa';

interface ActiveRegisterBadgeProps {
  className?: string;
  compact?: boolean;
}

export default function ActiveRegisterBadge({
  className = '',
  compact = false,
}: ActiveRegisterBadgeProps) {
  const { registers, activeRegister, isAssignedFixed, isLoading, setActiveRegisterById } = useRegister();
  const { can, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Puede cambiar de caja si no tiene asignación fija Y tiene permiso (o es admin)
  const canSwitch = !isAssignedFixed && (isAdmin || can('CAMBIAR_CAJA'));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading || !activeRegister) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs animate-pulse ${className}`}>
        <FaCashRegister className="w-3.5 h-3.5" />
        <span>Cargando puesto...</span>
      </div>
    );
  }

  // Estilo de color según la caja
  const isCaja1 = activeRegister.name.toLowerCase().includes('1');
  const badgeColors = isCaja1
    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25 hover:bg-blue-500/15'
    : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25 hover:bg-purple-500/15';

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => canSwitch && setIsOpen(!isOpen)}
        disabled={!canSwitch}
        title={
          isAssignedFixed
            ? 'Caja asignada fija por el administrador'
            : canSwitch
            ? 'Haz clic para cambiar de puesto de caja'
            : 'Puesto de caja activo'
        }
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${badgeColors} ${
          canSwitch ? 'cursor-pointer active:scale-95' : 'cursor-default'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <FaCashRegister className="w-3.5 h-3.5 text-current opacity-85" />
          {!compact && (
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Caja activa:
            </span>
          )}
          <span className="font-extrabold uppercase tracking-tight text-current">
            {activeRegister.name}
          </span>
          <span className="text-[10px] font-bold opacity-75">
            (PV {String(activeRegister.point_of_sale || 1).padStart(4, '0')})
          </span>
        </div>

        {isAssignedFixed && (
          <span title="Caja fija asignada">
            <FaLock className="w-2.5 h-2.5 opacity-60 ml-0.5" />
          </span>
        )}

        {canSwitch && (
          <FaChevronDown
            className={`w-2.5 h-2.5 opacity-60 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Menú desplegable para alternar puestos de venta */}
      {isOpen && canSwitch && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Cambiar puesto de venta
          </div>
          <div className="space-y-1 mt-1">
            {registers.map((reg) => {
              const isSelected = reg.id === activeRegister.id;
              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => {
                    setActiveRegisterById(reg.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{reg.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      PV {String(reg.point_of_sale || 1).padStart(4, '0')}
                    </span>
                  </div>
                  {isSelected && <FaCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
