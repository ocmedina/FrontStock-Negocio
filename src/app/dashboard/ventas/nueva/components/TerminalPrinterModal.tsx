'use client';

import React, { useState, useEffect } from 'react';
import {
  getTerminalPrinterSettings,
  saveTerminalPrinterSettings,
  type TerminalPrinterSettings,
  type PrinterPaperFormat,
} from '@/lib/printerSettings';
import { useRegister } from '@/hooks/useRegister';
import toast from 'react-hot-toast';
import { FaPrint, FaTimes, FaCog, FaCheck } from 'react-icons/fa';

interface TerminalPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TerminalPrinterModal({
  isOpen,
  onClose,
}: TerminalPrinterModalProps) {
  const { activeRegister } = useRegister();
  const [settings, setSettings] = useState<TerminalPrinterSettings>(() =>
    getTerminalPrinterSettings(activeRegister?.id)
  );

  useEffect(() => {
    if (isOpen && activeRegister?.id) {
      setSettings(getTerminalPrinterSettings(activeRegister.id));
    }
  }, [isOpen, activeRegister?.id]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveTerminalPrinterSettings(activeRegister?.id, settings);
    toast.success('Configuración de impresión guardada para este equipo');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg">
              <FaPrint />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                Impresora del Puesto
              </h3>
              <p className="text-xs text-slate-400">
                {activeRegister?.name || 'Terminal de Venta'} (PV{' '}
                {String(activeRegister?.point_of_sale || 1).padStart(4, '0')})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Formato de papel */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Formato de Ticket / Papel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'thermal_80mm', label: 'Térmica 80mm', sub: 'Comandera estándar' },
                { id: 'thermal_58mm', label: 'Térmica 58mm', sub: 'Comandera chica' },
                { id: 'a4', label: 'Hoja A4', sub: 'Impresora común' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, format: f.id as PrinterPaperFormat })
                  }
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    settings.format === f.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <FaPrint className="w-4 h-4 mb-0.5 opacity-80" />
                  <span className="text-xs">{f.label}</span>
                  <span className="text-[9px] opacity-60 leading-tight">{f.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Auto-impresión */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Auto-abrir Ticket tras cobrar
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Muestra el diálogo de impresión inmediatamente al finalizar cada venta.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoPrintAfterSale}
                onChange={(e) =>
                  setSettings({ ...settings, autoPrintAfterSale: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Mensaje de pie de ticket */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Mensaje al pie del ticket
            </label>
            <input
              type="text"
              value={settings.footerNote || ''}
              onChange={(e) => setSettings({ ...settings, footerNote: e.target.value })}
              placeholder="Ej: ¡Muchas gracias por su compra!"
              className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
            >
              Guardar Preferencias
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
