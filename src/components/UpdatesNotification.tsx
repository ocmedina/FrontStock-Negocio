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
    id: "2026-05-05-role-permissions-panel",
    date: "5 May 2026",
    title: "🛡️ Permisos por Rol con switches",
    description:
      "Nueva gestion de permisos por rol con switches, conteos y secciones internas para configurar accesos de forma mas clara.",
    icon: "🛡️",
    isNew: true,
    type: "feature",
  },
  {
    id: "2026-05-05-dashboard-access-control",
    date: "5 May 2026",
    title: "🚫 Bloqueo de Dashboard y redireccion",
    description:
      "Ahora podes bloquear el acceso al dashboard por permisos. Si se desactiva, la pantalla principal redirige a Nueva Venta.",
    icon: "🚫",
    isNew: true,
    type: "improvement",
  },
  {
    id: "2026-05-05-reports-section",
    date: "5 May 2026",
    title: "📊 Reportes con graficos",
    description:
      "Seccion de reportes actualizada con graficos por semana, mes y año, metodos de pago y tendencias.",
    icon: "📊",
    isNew: true,
    type: "feature",
  },
  {
    id: "2026-05-05-menu-permissions",
    date: "5 May 2026",
    title: "🧭 Menu por permisos",
    description:
      "El menu ahora respeta permisos por rol, ocultando secciones segun configuracion del administrador.",
    icon: "🧭",
    isNew: true,
    type: "improvement",
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

  return (
    <>
      {/* Botón Flotante Premium (Mantiene el estilo llamativo) */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 group z-50"
        aria-label="Ver actualizaciones"
      >
        <div className="absolute inset-0 bg-blue-600 rounded-full blur opacity-40 group-hover:opacity-75 transition-opacity duration-500 animate-pulse"></div>
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-full shadow-2xl border border-white/10 hover:scale-110 transition-transform duration-300 flex items-center justify-center">
          <FaBell
            className={`w-6 h-6 ${hasNewUpdates ? "animate-swing" : ""}`}
          />

          {hasNewUpdates && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 text-[10px] font-bold items-center justify-center border-2 border-slate-900">
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

      {/* Drawer / Panel Lateral (Desliza desde la derecha) */}
      <div
        className={`fixed inset-y-0 right-0 z-[100] w-full sm:w-[450px] bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-500 ease-out flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Header Llamativo con Gradiente */}
        <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6 shrink-0 overflow-hidden">
          {/* Elementos decorativos de fondo */}
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <FaBolt className="w-40 h-40 transform rotate-12 translate-x-10 -translate-y-10" />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent" />

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <span className="bg-white dark:bg-slate-900/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10 flex items-center gap-1 text-blue-200">
                  <HiSparkles className="text-yellow-400" /> NOVEDADES
                </span>
              </div>
              <button
                onClick={handleClose}
                className="bg-white dark:bg-slate-900/10 hover:bg-white/20 p-2 rounded-full transition-colors backdrop-blur-md text-white/80 hover:text-white"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-3xl font-black tracking-tight mb-2">
              ¿Qué hay de nuevo?
            </h2>
            <p className="text-blue-200 text-sm leading-relaxed max-w-xs">
              Mantente al día con las últimas mejoras de tu sistema.
            </p>

            {/* Tabs Integrados en el Header */}
            <div className="flex gap-6 mt-8 border-b border-white/10">
              <button
                onClick={() => setActiveTab("new")}
                className={`pb-3 text-sm font-bold transition-all relative ${activeTab === "new"
                  ? "text-white"
                  : "text-blue-300/70 hover:text-white"
                  }`}
              >
                Nuevas
                {newUpdatesList.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">
                    {newUpdatesList.length}
                  </span>
                )}
                {activeTab === "new" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.7)]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`pb-3 text-sm font-bold transition-all relative ${activeTab === "all"
                  ? "text-white"
                  : "text-blue-300/70 hover:text-white"
                  }`}
              >
                Historial
                {activeTab === "all" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.7)]" />
                )}
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
                <div
                  key={update.id}
                  className={`group relative bg-white dark:bg-slate-800 rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in slide-in-from-right-8 fade-in duration-500 ${update.isNew && !seenUpdates.includes(update.id)
                    ? "border-blue-200 dark:border-blue-700 shadow-md ring-1 ring-blue-50 dark:ring-blue-900/50"
                    : "border-gray-100 dark:border-slate-700 shadow-sm"
                    }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Indicador de Nuevo (Punto pulsante) */}
                  {update.isNew && !seenUpdates.includes(update.id) && (
                    <span className="absolute top-5 right-5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Icono con fondo */}
                    <div
                      className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${update.type === "feature"
                        ? "bg-purple-50 text-purple-600"
                        : update.type === "fix"
                          ? "bg-red-50 text-red-600"
                          : "bg-blue-50 text-blue-600"
                        }`}
                    >
                      {update.icon}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${update.type === "feature"
                            ? "bg-purple-100 text-purple-700"
                            : update.type === "fix"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                            }`}
                        >
                          {update.type || "Update"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                          {update.date}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 dark:text-slate-50 mb-1 group-hover:text-blue-600 transition-colors">
                        {update.title}
                      </h3>

                      <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
                        {update.description}
                      </p>
                    </div>
                  </div>
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
              <FaCheckDouble className="text-blue-400" />
              Marcar todo como leído
            </button>
          </div>
        )}
      </div>
    </>
  );
}
