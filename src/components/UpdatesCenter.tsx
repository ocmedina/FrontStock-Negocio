"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaBell,
  FaCheck,
  FaChevronRight,
  FaClock,
  FaTimes,
} from "react-icons/fa";
import {
  HiOutlineAdjustments,
  HiOutlineLightningBolt,
  HiOutlineRefresh,
  HiOutlineScale,
} from "react-icons/hi";

type UpdateType = "feature" | "improvement" | "fix";
type Filter = "all" | UpdateType;

interface UpdateItem {
  id: string;
  date: string;
  title: string;
  description: string;
  type: UpdateType;
  icon: typeof HiOutlineScale;
}

const UPDATES: UpdateItem[] = [
  {
    id: "cajas-simultaneas-unificadas-v1",
    date: "02 Nov 2026",
    title: "Cajas simultáneas y unificadas",
    description:
      "Trabajá con varias cajas al mismo tiempo y consultá sus movimientos y cierres desde una gestión unificada.",
    type: "feature",
    icon: HiOutlineRefresh,
  },
  {
    id: "programa-referidos-v1",
    date: "02 Nov 2026",
    title: "Programa de referidos",
    description:
      "Generá códigos, aplicá descuentos durante una venta, consultá el estado de cada referido y eliminá códigos cuando sea necesario.",
    type: "feature",
    icon: HiOutlineLightningBolt,
  },
  {
    id: "filtro-historial-v1",
    date: "02 Nov 2026",
    title: "Nuevo filtro en Historial",
    description:
      "Encontrá movimientos más rápido usando los nuevos filtros del área de Historial.",
    type: "improvement",
    icon: HiOutlineAdjustments,
  },
  {
    id: "gestion-usuarios-v1",
    date: "02 Nov 2026",
    title: "Nueva gestión de usuarios",
    description:
      "Administrá usuarios, roles, permisos y estado de acceso desde una vista más clara y centralizada.",
    type: "feature",
    icon: HiOutlineScale,
  },
];

const STORAGE_KEY = "frontstock_updates_center_seen_v2";

const typeLabels: Record<UpdateType, string> = {
  feature: "Nuevo",
  improvement: "Mejora",
  fix: "Corrección",
};

const typeStyles: Record<UpdateType, string> = {
  feature:
    "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50",
  improvement:
    "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50",
  fix:
    "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
};

export default function UpdatesCenter({
  forceOpen = false,
  onClose,
}: {
  forceOpen?: boolean;
  onClose?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(forceOpen);
  const [isMounted, setIsMounted] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [seen, setSeen] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const unreadCount = UPDATES.filter((item) => !seen.includes(item.id)).length;
  const visibleUpdates = useMemo(
    () => UPDATES.filter((item) => filter === "all" || item.type === filter),
    [filter]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const close = () => {
    setIsOpen(false);
    onClose?.();
  };

  const open = () => setIsOpen(true);

  const markAllAsRead = () => {
    const ids = UPDATES.map((item) => item.id);
    setSeen(ids);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  const markAsRead = (id: string) => {
    if (seen.includes(id)) return;
    const nextSeen = [...seen, id];
    setSeen(nextSeen);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSeen));
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Abrir novedades del sistema"
        className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:text-blue-300"
      >
        <FaBell className="text-blue-600 dark:text-blue-400" />
        <span>Novedades</span>
        {unreadCount > 0 && (
          <span className="min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-[10px] font-black text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen &&
        isMounted &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-stretch justify-end bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Cerrar novedades"
            onClick={close}
            className="absolute inset-0"
          />
          <aside className="relative flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-slate-50 shadow-2xl dark:bg-slate-950 sm:h-[calc(100vh-2rem)] sm:rounded-2xl sm:border sm:border-white/70 dark:sm:border-slate-700">
            <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/Logo-nuevo.png"
                    alt="FrontStock"
                    className="h-11 w-11 rounded-xl object-contain"
                  />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                      FrontStock
                    </p>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                      Novedades del sistema
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Cerrar"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-800/60">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Actualizaciones de noviembre
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {unreadCount ? `${unreadCount} sin leer` : "Todo al día"}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="shrink-0 whitespace-nowrap text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FaCheck className="text-[10px]" />
                      Marcar todo leído
                    </span>
                  </button>
                )}
              </div>
            </header>

            <nav className="shrink-0 flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
              {(["all", "feature", "improvement", "fix"] as Filter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    filter === item
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {item === "all" ? "Todas" : typeLabels[item]}
                </button>
              ))}
            </nav>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
              {visibleUpdates.map((item) => {
                const Icon = item.icon;
                const isUnread = !seen.includes(item.id);
                return (
                  <article
                    key={item.id}
                    onClick={() => markAsRead(item.id)}
                    className={`group rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${
                      isUnread
                        ? "border-blue-200 shadow-sm dark:border-blue-900/60"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${typeStyles[item.type]}`}>
                            {typeLabels[item.type]}
                          </span>
                          {isUnread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" title="Sin leer" />
                          )}
                        </div>
                        <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {item.description}
                        </p>
                        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                          <FaClock />
                          {item.date}
                          <FaChevronRight className="ml-auto opacity-0 transition group-hover:opacity-100" />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </aside>
          </div>,
          document.body
        )}
    </>
  );
}
