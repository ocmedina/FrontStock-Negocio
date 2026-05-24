import {
  FaTruck,
  FaUserCircle,
  FaSignOutAlt,
  FaEdit,
  FaClipboardList,
  FaHistory,
  FaMoneyBillWave,
} from "react-icons/fa";
import { User } from "@supabase/supabase-js";

interface DeliveryHeaderProps {
  currentUser: User | null;
  pendingOrdersCount: number;
  view: string;
  setView: (view: string) => void;
  onLogout: () => void;
  onOpenExpenseModal: () => void;
}

export default function DeliveryHeader({
  currentUser,
  pendingOrdersCount,
  view,
  setView,
  onLogout,
  onOpenExpenseModal,
}: DeliveryHeaderProps) {
  return (
    <header className="bg-white dark:bg-slate-950 shadow-md border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40">
      <div className="px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FaTruck className="text-blue-600 text-2xl" />
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FrontStock
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Modo Reparto</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenExpenseModal}
            className="flex items-center gap-2 px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400 rounded-lg text-sm font-bold transition-colors border border-orange-200 dark:border-orange-800"
          >
            <FaMoneyBillWave />
            <span className="hidden sm:inline">Gasto</span>
          </button>
          
          <div className="hidden sm:flex items-center gap-2 border-l border-gray-200 dark:border-slate-700 pl-3 ml-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FaUserCircle className="text-white text-lg" />
            </div>
            <span className="font-semibold text-sm text-gray-700 dark:text-slate-200 max-w-[120px] truncate">
              {currentUser?.email?.split("@")[0]}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 font-medium rounded-lg transition-colors border-l border-gray-200 dark:border-slate-700 sm:border-0 pl-3 sm:pl-0 ml-1 sm:ml-0"
          >
            <FaSignOutAlt />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
      <div className="flex border-t border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setView("new_order")}

          className={`flex-1 py-3 text-center font-semibold transition-all flex items-center justify-center gap-2 ${view === "new_order"
            ? "bg-blue-50 dark:bg-blue-900/30 border-b-2 border-blue-600 text-blue-600"
            : "text-gray-500 hover:bg-gray-50"
            }`}
        >
          <FaEdit className="text-lg" />
          <span className="hidden sm:inline">Tomar Pedido</span>
          <span className="sm:hidden">Pedido</span>
        </button>
        <button
          onClick={() => setView("daily")}
          className={`flex-1 py-3 text-center font-semibold transition-all flex items-center justify-center gap-2 relative ${view === "daily"
            ? "bg-blue-50 dark:bg-blue-900/30 border-b-2 border-blue-600 text-blue-600"
            : "text-gray-500 hover:bg-gray-50"
            }`}
        >
          <FaClipboardList className="text-lg" />
          <span className="hidden sm:inline">Hoy</span>
          {pendingOrdersCount > 0 && (
            <span className="absolute top-1 right-2 sm:right-1/4 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {pendingOrdersCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setView("history")}
          className={`flex-1 py-3 text-center font-semibold transition-all flex items-center justify-center gap-2 ${view === "history"
            ? "bg-blue-50 dark:bg-blue-900/30 border-b-2 border-blue-600 text-blue-600"
            : "text-gray-500 hover:bg-gray-50"
            }`}
        >
          <FaHistory className="text-lg" />
          <span className="hidden sm:inline">Historial</span>
          <span className="sm:hidden">Hist.</span>
        </button>
        <button
          onClick={() => setView("debtors")}
          className={`flex-1 py-3 text-center font-semibold transition-all flex items-center justify-center gap-2 ${view === "debtors"
            ? "bg-blue-50 dark:bg-blue-900/30 border-b-2 border-blue-600 text-blue-600"
            : "text-gray-500 hover:bg-gray-50"
            }`}
        >
          <FaClipboardList className="text-lg" />
          <span className="hidden sm:inline">Deudores</span>
          <span className="sm:hidden">Deuda</span>
        </button>
      </div>
    </header>
  );
}
