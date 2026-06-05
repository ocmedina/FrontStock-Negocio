import {
  FaTruck,
  FaUserCircle,
  FaSignOutAlt,
  FaEdit,
  FaClipboardList,
  FaHistory,
  FaDollarSign,
} from "react-icons/fa";
import { User } from "@supabase/supabase-js";

interface DeliveryHeaderProps {
  currentUser: User | null;
  pendingOrdersCount: number;
  view: string;
  setView: (view: string) => void;
  onLogout: () => void;
}

export default function DeliveryHeader({
  currentUser,
  pendingOrdersCount,
  view,
  setView,
  onLogout,
}: DeliveryHeaderProps) {
  return (
    <header className="backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/50 dark:border-slate-800/40 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo e Info */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <FaTruck className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-850 dark:text-white leading-none tracking-tight">
              FrontStock
            </h1>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5 block">
              Reparto
            </span>
          </div>
        </div>

        {/* Info de Usuario y Cierre de Sesión */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-100/80 dark:bg-slate-900/60 py-1.5 pl-2.5 pr-3.5 rounded-full border border-slate-200/40 dark:border-slate-800/30">
            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">
              {currentUser?.email?.[0].toUpperCase() || "U"}
            </div>
            <span className="font-bold text-[11px] text-slate-700 dark:text-slate-200 max-w-[90px] truncate">
              {currentUser?.email?.split("@")[0]}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-extrabold rounded-xl transition-all duration-200"
            title="Cerrar Sesión"
          >
            <FaSignOutAlt className="text-sm" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      {/* Tabs / Pastillas de Navegación */}
      <div className="border-t border-slate-200/40 dark:border-slate-800/30 px-3 py-2 bg-slate-50/50 dark:bg-slate-950/30">
        <div className="max-w-7xl mx-auto flex gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/20 dark:border-slate-850/40">
          <button
            onClick={() => setView("new_order")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 ${
              view === "new_order"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FaEdit className="text-sm" />
            <span className="hidden sm:inline">Tomar Pedido</span>
            <span className="sm:hidden">Pedido</span>
          </button>

          <button
            onClick={() => setView("daily")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 relative ${
              view === "daily"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FaClipboardList className="text-sm" />
            <span className="hidden sm:inline">Planilla de Hoy</span>
            <span className="sm:hidden">Hoy</span>
            {pendingOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 sm:right-3 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] font-black rounded-full min-w-5 h-5 px-1 flex items-center justify-center animate-pulse border border-white dark:border-slate-950">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setView("history")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 ${
              view === "history"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FaHistory className="text-sm" />
            <span>Historial</span>
          </button>

          <button
            onClick={() => setView("debtors")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 ${
              view === "debtors"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FaDollarSign className="text-sm" />
            <span>Deudores</span>
          </button>
        </div>
      </div>
    </header>
  );
}
