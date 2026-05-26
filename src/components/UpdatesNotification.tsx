// src/components/UpdatesNotification.tsx
"use client";

import { useState, useEffect } from "react";
import { FaBell, FaTimes, FaCheckDouble, FaGift, FaBolt } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi";

interface Update {
  id: string;
  date: string;
  title: string;
  description: string;
  icon?: string;
  isNew?: boolean;
  type?: "feature" | "fix" | "improvement";
}

const UPDATES: Update[] = [
  {
    id: "2026-05-26-price-list-pdf",
    date: "26 May 2026",
    title: "🧾 Lista de Precios en PDF",
    description:
      "Ahora puedes seleccionar productos y generar una lista de precios en PDF para compartir con tus clientes.",
    icon: "🧾",
    isNew: true,
    type: "feature",
  },
  {
    id: "2025-12-11-finance-module",
    date: "11 Dic 2025",
    title: "💰 Nuevo Módulo de Finanzas",
    description:
      "Control total de tu negocio: Visualiza Ingresos, Costos, Gastos y Ganancia Neta en tiempo real. Gestiona tus gastos operativos y toma decisiones basadas en datos reales.",
    icon: "💰",
    isNew: true,
    type: "feature",
  },
  {
    id: "2025-12-11-barcode-printing",
    date: "11 Dic 2025",
    title: "🏷️ Impresión de Etiquetas",
    description:
      "Genera e imprime etiquetas con códigos de barra para tus productos. Compatible con impresoras de etiquetas y hojas A4. Organiza tu stock profesionalmente.",
    icon: "🏷️",
    isNew: true,
    type: "feature",
  },
  {
    id: "2025-12-11-counter-receipts",
    date: "11 Dic 2025",
    title: "🧾 Tickets de Venta (Mostrador)",
    description:
      "Ahora puedes emitir comprobantes térmicos (80mm) o A4 para tus ventas de mostrador. Agiliza el cobro y entrega un comprobante profesional a tus clientes.",
    icon: "🧾",
    isNew: true,
    type: "feature",
  },
  {
    id: "2025-12-11-product-costs",
    date: "11 Dic 2025",
    title: "📉 Gestión de Costos y Márgenes",
    description:
      "Agregamos el campo 'Costo' a tus productos. Ahora puedes ver el margen de ganancia exacto y calcular la rentabilidad real de cada venta.",
    icon: "📉",
    isNew: true,
    type: "improvement",
  },
  {
    id: "2025-12-11-settings-redesign",
    date: "11 Dic 2025",
    title: "⚙️ Nueva Configuración",
    description:
      "Panel de configuración rediseñado y organizado por pestañas. Personaliza tu negocio, controla la apariencia y gestiona tus preferencias más fácilmente.",
    icon: "⚙️",
    isNew: true,
    type: "improvement",
  },
  {
    id: "2025-12-11-remitos-deuda",
    date: "11 Dic 2025",
    title: "📄 Generación de Remitos de Saldo",
    description:
      "Nueva funcionalidad en el panel de Deudores: Ahora puedes generar y descargar remitos PDF específicamente para pedidos con saldo pendiente, facilitando el control de cuentas corrientes.",
    icon: "📄",
    isNew: true,
    type: "feature",
  },
  {
    id: "2025-12-11-visual-fixes",
    date: "11 Dic 2025",
    title: "🎨 Ajustes Visuales & Modo Oscuro",
    description:
      "Refinamiento visual en tablas, modales y botones. Se solucionaron problemas de contraste en modo oscuro para una experiencia más consistente en toda la aplicación.",
    icon: "🎨",
    isNew: false,
    type: "fix",
  },
  {
    id: "2025-12-11-sidebar-redesign",
    date: "11 Dic 2025",
    title: "🧭 Nueva Navegación Lateral",
    description:
      "Reemplazamos la barra superior por un Sidebar lateral más intuitivo y espacioso, mejorando la organización de los módulos y el acceso rápido a todas las funciones.",
    icon: "🧭",
    isNew: true,
    type: "improvement",
  },
  {
    id: "2025-12-08-dark-mode-complete",
    date: "8 Dic 2025",
    title: "🌙 Modo Oscuro Completo",
    description:
      "Implementación completa de dark mode en toda la aplicación. Todos los elementos, botones, inputs y gradientes ahora se adaptan perfectamente al tema oscuro.",
    icon: "🌙",
    isNew: false,
    type: "improvement",
  },
  {
    id: "2025-12-08-top-products-chart",
    date: "8 Dic 2025",
    title: "📊 Gráfico Top 10 Productos Corregido",
    description:
      "Corregido el gráfico de productos más vendidos con visualización vertical mejorada y colores optimizados para mejor visibilidad en ambos modos.",
    icon: "📊",
    isNew: false,
    type: "fix",
  },
];

const STORAGE_KEY = "frontstock_seen_updates";

export default function UpdatesNotification() {
  const [isOpen, setIsOpen] = useState(false);
  const [seenUpdates, setSeenUpdates] = useState<string[]>([]);
  const [hasNewUpdates, setHasNewUpdates] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "all">("new");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const seen = JSON.parse(stored);
      setSeenUpdates(seen);
      const hasNew = UPDATES.some(
        (update) => update.isNew && !seen.includes(update.id)
      );
      setHasNewUpdates(hasNew);
      if (!hasNew) setActiveTab("all");
    } else {
      const hasNew = UPDATES.some((update) => update.isNew);
      setHasNewUpdates(hasNew);
    }
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewUpdates(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const markAllAsRead = () => {
    const allIds = UPDATES.map((u) => u.id);
    setSeenUpdates(allIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
    setActiveTab("all");
  };

  const newUpdatesList = UPDATES.filter(
    (u) => u.isNew && !seenUpdates.includes(u.id)
  );
  const allUpdatesList = UPDATES;

  const displayedUpdates =
    activeTab === "new" ? newUpdatesList : allUpdatesList;

  const updateStyles: Record<NonNullable<Update["type"]>, { badge: string; icon: string; accent: string }> = {
    feature: {
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
      accent: "border-emerald-400",
    },
    fix: {
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
      icon: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
      accent: "border-rose-400",
    },
    improvement: {
      badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
      icon: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
      accent: "border-sky-400",
    },
  };

  const getUpdateStyle = (type?: Update["type"]) =>
    updateStyles[type || "improvement"];

  return (
    <>
      {/* Botón Flotante */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 group z-50"
        aria-label="Ver actualizaciones"
      >
        <div className="absolute inset-0 rounded-full bg-amber-500/40 blur-lg group-hover:bg-amber-500/60 transition-all duration-500"></div>
        <div className="relative bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white p-4 rounded-full shadow-2xl border border-white/20 hover:scale-110 transition-transform duration-300 flex items-center justify-center">
          <FaBell className={`w-6 h-6 ${hasNewUpdates ? "animate-swing" : ""}`} />

          {hasNewUpdates && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-white text-[10px] font-bold items-center justify-center border-2 border-rose-600 text-rose-700">
                {newUpdatesList.length}
              </span>
            </span>
          )}
        </div>
      </button>

      {/* Backdrop (Fondo oscuro al abrir) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] transition-opacity duration-300"
          onClick={handleClose}
        />
      )}

      {/* Drawer / Panel Lateral */}
      <div
        className={`fixed inset-y-0 right-0 z-[100] w-full sm:w-[460px] bg-slate-50 dark:bg-slate-950 shadow-2xl transform transition-transform duration-500 ease-out flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-amber-900 text-white p-6 shrink-0 overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.35),_transparent_55%)]" />
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-white/10 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase flex items-center gap-1">
                  <HiSparkles className="text-amber-300" /> Actualizaciones
                </span>
              </div>
              <button
                onClick={handleClose}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors text-white/80 hover:text-white"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-outfit">
                Resumen de cambios
              </h2>
              <p className="text-amber-100 text-sm mt-2 max-w-sm">
                Novedades, mejoras y ajustes listos para tu equipo.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 bg-white/10 p-1 rounded-full w-fit">
              <button
                onClick={() => setActiveTab("new")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === "new"
                  ? "bg-white text-slate-900"
                  : "text-white/80 hover:text-white"
                  }`}
              >
                Nuevas
                {newUpdatesList.length > 0 && (
                  <span className="ml-2 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {newUpdatesList.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === "all"
                  ? "bg-white text-slate-900"
                  : "text-white/80 hover:text-white"
                  }`}
              >
                Historial
              </button>
            </div>
          </div>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
          {displayedUpdates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <FaCheckDouble className="w-8 h-8 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-gray-900 dark:text-slate-50 font-medium">¡Estás al día!</p>
                <p className="text-sm">No tienes notificaciones nuevas.</p>
              </div>
              <button
                onClick={() => setActiveTab("all")}
                className="text-blue-600 text-sm font-bold hover:underline"
              >
                Ver historial completo
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {displayedUpdates.map((update, index) => (
                <div key={update.id} style={{ animationDelay: `${index * 50}ms` }}>
                  {(() => {
                    const style = getUpdateStyle(update.type);
                    return (
                      <div
                        className={`group relative bg-white dark:bg-slate-900/70 rounded-2xl p-5 border-l-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in slide-in-from-right-8 fade-in duration-500 ${style.accent} ${update.isNew && !seenUpdates.includes(update.id)
                          ? "border border-slate-200 dark:border-slate-700 shadow-md"
                          : "border border-transparent"
                          }`}
                      >
                  {/* Indicador de Nuevo (Punto pulsante) */}
                  {update.isNew && !seenUpdates.includes(update.id) && (
                    <span className="absolute top-5 right-5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Icono con fondo */}
                    <div
                      className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${style.icon}`}
                    >
                      {update.icon}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${style.badge}`}
                        >
                          {update.type || "Update"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                          {update.date}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 dark:text-slate-50 mb-1 group-hover:text-amber-600 transition-colors">
                        {update.title}
                      </h3>

                      <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                        {update.description}
                      </p>
                    </div>
                  </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con Acción */}
        {newUpdatesList.length > 0 && activeTab === "new" && (
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button
              onClick={markAllAsRead}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              <FaCheckDouble className="text-amber-300" />
              Marcar todo como leído
            </button>
          </div>
        )}
      </div>
    </>
  );
}
