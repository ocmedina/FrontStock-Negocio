"use client";

import { useState, useEffect } from "react";
import {
  FaChartLine,
  FaCashRegister,
  FaTruck,
  FaShoppingCart,
  FaCheckCircle,
  FaChevronRight,
  FaChevronLeft,
  FaTimes,
  FaBullhorn,
} from "react-icons/fa";

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    // Verificar cuántas veces se ha visto el modal (límite de 3)
    const viewsCountStr = localStorage.getItem("frontstock_welcome_v2_views") || "0";
    const viewsCount = parseInt(viewsCountStr, 10);
    if (viewsCount < 3) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    const viewsCountStr = localStorage.getItem("frontstock_welcome_v2_views") || "0";
    const viewsCount = parseInt(viewsCountStr, 10);
    localStorage.setItem("frontstock_welcome_v2_views", String(viewsCount + 1));
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-md transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 transform scale-100 flex flex-col max-h-[90vh]">
        {/* Top colorful gradient bar */}
        <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-805 rounded-full transition-all z-10"
          aria-label="Cerrar modal de bienvenida"
        >
          <FaTimes className="w-4 h-4" />
        </button>

        {/* Modal content body */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
          {/* Step indicator */}
          <div className="flex justify-center gap-1.5 mb-6">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s ? "w-8 bg-blue-600" : "w-2 bg-slate-200 dark:bg-slate-800"
                }`}
              />
            ))}
          </div>

          {/* STEP 1: WELCOME & LOGO */}
          {step === 1 && (
            <div className="text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-3 shadow-md relative">
                <img
                  src="/favicon.png"
                  alt="FrontStock Logo"
                  className="w-10 h-10 object-contain rounded-lg"
                />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                ¡Bienvenido a FrontStock v2.0!
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                Hemos renovado completamente la interfaz del sistema para ofrecerte una experiencia mucho más moderna, fluida y profesional.
              </p>
              <div className="p-4 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/15 text-left flex gap-3.5 max-w-md mx-auto">
                <FaBullhorn className="text-blue-500 w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                    ¿Qué significa esto para ti?
                  </span>
                  <p className="text-xs font-medium text-slate-550 dark:text-slate-400 mt-1 leading-relaxed">
                    Un control financiero simplificado, navegación optimizada en smartphones y reportes visuales con mayor claridad.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: NEW FEATURES GRID */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Las Novedades Destacadas
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  Haz un recorrido por los nuevos paneles
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-2xl border border-slate-150 dark:border-slate-805 bg-slate-50/40 dark:bg-slate-900/40 flex items-start gap-3 hover:-translate-y-0.5 transition-all">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                    <FaChartLine className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Gráficos Avanzados
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Dashboard analítico visual con tendencias de ventas e ingresos netos diarios.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-150 dark:border-slate-805 bg-slate-50/40 dark:bg-slate-900/40 flex items-start gap-3 hover:-translate-y-0.5 transition-all">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <FaCashRegister className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Arqueo y Cierre de Caja
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Conciliaciones simplificadas, diferencias de balance y cierre rápido en un click.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-150 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-900/40 flex items-start gap-3 hover:-translate-y-0.5 transition-all">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-650 dark:text-indigo-400 shrink-0">
                    <FaTruck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Cuentas Corrientes
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Saldos deudores destacados, alertas dinámicas y compras integradas.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-150 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-900/40 flex items-start gap-3 hover:-translate-y-0.5 transition-all">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-450 shrink-0">
                    <FaShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Pedidos con Precios Editables
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Crea y gestiona listas de pedidos modificando los precios de forma dinámica en tiempo real.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ONGOING IMPROVEMENTS */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Construyendo Juntos
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  Seguimos trabajando en optimizaciones
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-3.5 bg-slate-50 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-150 dark:border-slate-850 mt-5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed mb-1">
                  Hemos completado con éxito esta serie de actualizaciones y seguimos optimizando el sistema:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-350">
                    <FaCheckCircle className="text-emerald-500 shrink-0 w-4 h-4" />
                    <span className="font-bold">Rediseño de Gráficos e Indicadores Financieros</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-350">
                    <FaCheckCircle className="text-emerald-500 shrink-0 w-4 h-4" />
                    <span className="font-bold">Cierre de Caja con Arqueo Automatizado</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-350">
                    <FaCheckCircle className="text-emerald-500 shrink-0 w-4 h-4" />
                    <span className="font-bold">Gestión de Cuentas y Deudas de Proveedores</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-350">
                    <FaCheckCircle className="text-emerald-500 shrink-0 w-4 h-4" />
                    <span className="font-bold">Pedidos Dinámicos con Edición de Precios</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-350">
                    <FaCheckCircle className="text-emerald-500 shrink-0 w-4 h-4" />
                    <span className="font-bold">Portal de Acceso y Login Estilizados</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-350">
                    <FaCheckCircle className="text-emerald-500 shrink-0 w-4 h-4" />
                    <span className="font-bold">Diseño Móvil 100% Responsivo en todo el sistema</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-350">
                    <FaCheckCircle className="text-emerald-500 shrink-0 w-4 h-4" />
                    <span className="font-bold">Planificación de Fecha de Entrega en Pedidos</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-350">
                    <FaCheckCircle className="text-emerald-500 shrink-0 w-4 h-4" />
                    <span className="font-bold">Opciones para Anular o Eliminar Pedidos Directamente</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-350">
                    <FaCheckCircle className="text-emerald-500 shrink-0 w-4 h-4" />
                    <span className="font-bold">Paginación de Deudores e Historial de Reparto</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-550 dark:text-slate-450 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[8px] font-black not-italic text-slate-400 shrink-0">
                      💡
                    </span>
                    <span>Facturación Electrónica (Próximamente)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-450 italic">
                    <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[8px] font-black not-italic text-slate-400 shrink-0">
                      💡
                    </span>
                    <span>Alertas predictivas de stock mínimo</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-5 md:p-6 bg-slate-50 dark:bg-slate-950/30 border-t border-slate-105 dark:border-slate-800 flex justify-between items-center gap-4">
          <button
            onClick={() => setStep((prev) => Math.max(prev - 1, 1))}
            disabled={step === 1}
            className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition-all text-xs font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <FaChevronLeft className="w-3 h-3" /> Atrás
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((prev) => Math.min(prev + 1, 3))}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 rounded-xl transition-all text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm"
            >
              Siguiente <FaChevronRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-blue-500/10"
            >
              Comenzar <FaCheckCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
