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
  details: string;
  highlights: string[];
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
    details:
      "La gestión de cajas ahora permite que distintos puestos trabajen en paralelo sin perder el control de los movimientos. Cada caja conserva sus operaciones y, al mismo tiempo, podés consultar la información general del negocio desde una vista unificada.",
    highlights: [
      "Abrí y operá varias cajas simultáneamente.",
      "Consultá movimientos, retiros y cierres por caja.",
      "Mantené una visión consolidada de la operación diaria.",
    ],
    type: "feature",
    icon: HiOutlineRefresh,
  },
  {
    id: "programa-referidos-v1",
    date: "02 Nov 2026",
    title: "Programa de referidos",
    description:
      "Generá códigos, aplicá descuentos durante una venta, consultá el estado de cada referido y eliminá códigos cuando sea necesario.",
    details:
      "El programa de referidos permite premiar a tus clientes y atraer nuevos compradores. Generá un código desde Referidos, compartilo y aplicalo en Nueva Venta cuando el cliente realice su primera compra.",
    highlights: [
      "Creá y compartí códigos únicos para cada cliente.",
      "Aplicá el código en el modal de pago de una nueva venta.",
      "Controlá descuentos, estados y clientes vinculados.",
      "Eliminá códigos que ya no quieras mantener activos.",
    ],
    type: "feature",
    icon: HiOutlineLightningBolt,
  },
  {
    id: "filtro-historial-v1",
    date: "02 Nov 2026",
    title: "Nuevo filtro en Historial",
    description:
      "Encontrá movimientos más rápido usando los nuevos filtros del área de Historial.",
    details:
      "El área de Historial incorpora filtros para ubicar operaciones sin recorrer toda la lista. Combiná los criterios disponibles para revisar ventas, movimientos y registros de un período específico.",
    highlights: [
      "Filtrá los registros según el criterio que necesites.",
      "Reducí el tiempo de búsqueda en historiales extensos.",
      "Revisá la información con una lectura más ordenada.",
    ],
    type: "improvement",
    icon: HiOutlineAdjustments,
  },
  {
    id: "gestion-usuarios-v1",
    date: "02 Nov 2026",
    title: "Nueva gestión de usuarios",
    description:
      "Administrá usuarios, roles, permisos y estado de acceso desde una vista más clara y centralizada.",
    details:
      "La nueva gestión de usuarios concentra la administración de accesos del sistema en un solo lugar. Desde allí podés revisar los usuarios existentes, asignar roles y controlar quién puede ingresar y qué acciones puede realizar.",
    highlights: [
      "Consultá todos los usuarios desde una vista centralizada.",
      "Asigná y actualizá roles según las responsabilidades.",
      "Controlá el estado de acceso de cada usuario.",
      "Organizá mejor los permisos del equipo.",
    ],
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
  const [selectedUpdate, setSelectedUpdate] = useState<UpdateItem | null>(null);
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

  const openDetails = (item: UpdateItem) => {
    markAsRead(item.id);
    setSelectedUpdate(item);
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
                    onClick={() => openDetails(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetails(item);
                      }
                    }}
                    aria-label={`Ver detalles de ${item.title}`}
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

            {selectedUpdate && (
              <div className="absolute inset-0 z-10 flex flex-col bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
                  <button
                    type="button"
                    onClick={() => setSelectedUpdate(null)}
                    className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label="Volver a novedades"
                  >
                    <FaChevronRight className="rotate-180" />
                  </button>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Detalle de la novedad
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                    <selectedUpdate.icon className="h-6 w-6" />
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${typeStyles[selectedUpdate.type]}`}>
                      {typeLabels[selectedUpdate.type]}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {selectedUpdate.date}
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {selectedUpdate.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {selectedUpdate.details}
                  </p>
                  <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                      ¿Qué podés hacer?
                    </h4>
                    <ul className="mt-3 space-y-3">
                      {selectedUpdate.highlights.map((highlight) => (
                        <li key={highlight} className="flex gap-2.5 text-sm leading-6 text-blue-950/80 dark:text-blue-100/80">
                          <FaCheck className="mt-1 shrink-0 text-xs text-blue-600 dark:text-blue-400" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </aside>
          </div>,
          document.body
        )}
    </>
  );
}
