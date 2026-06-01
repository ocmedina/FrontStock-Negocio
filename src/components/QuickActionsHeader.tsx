// src/components/QuickActionsHeader.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import CashMovementModal from "@/components/CashMovementModal";
import {
  HiOutlinePlusCircle,
  HiOutlineUserGroup,
  HiOutlineShoppingCart,
  HiOutlineBanknotes,
  HiOutlineCurrencyDollar,
  HiOutlineArchiveBox,
} from "react-icons/hi2";

export default function QuickActionsHeader() {
  const [modalType, setModalType] = useState<"gasto" | "fondo_inicial" | null>(
    null
  );

  const handleMovementLogged = () => {
    // Refrescar si es necesario
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <Link
              href="/dashboard/ventas/nueva"
              className="group flex items-center gap-4 rounded-xl border border-teal-200/60 bg-teal-50/70 dark:bg-teal-950/20 p-4 hover:shadow-md transition-all"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center">
                <HiOutlineBanknotes className="text-2xl" />
              </div>
              <div>
                <p className="text-sm font-bold text-teal-700 dark:text-teal-300">
                  Nueva venta
                </p>
                <p className="text-xs text-teal-700/70 dark:text-teal-200/70">
                  Inicia un cobro rapido.
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/pedidos/nuevo"
              className="group flex items-center gap-4 rounded-xl border border-purple-200/60 bg-purple-50/70 dark:bg-purple-950/20 p-4 hover:shadow-md transition-all"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center">
                <HiOutlineShoppingCart className="text-2xl" />
              </div>
              <div>
                <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                  Nuevo pedido
                </p>
                <p className="text-xs text-purple-700/70 dark:text-purple-200/70">
                  Crea pedidos de reparto.
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/products/new"
              className="group flex items-center gap-4 rounded-xl border border-blue-200/60 bg-blue-50/70 dark:bg-blue-950/20 p-4 hover:shadow-md transition-all"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center">
                <HiOutlinePlusCircle className="text-2xl" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  Nuevo producto
                </p>
                <p className="text-xs text-blue-700/70 dark:text-blue-200/70">
                  Alta rapida de stock.
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/clientes/new"
              className="group flex items-center gap-4 rounded-xl border border-emerald-200/60 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 hover:shadow-md transition-all"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center">
                <HiOutlineUserGroup className="text-2xl" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  Nuevo cliente
                </p>
                <p className="text-xs text-emerald-700/70 dark:text-emerald-200/70">
                  Crea cuentas y deudas.
                </p>
              </div>
            </Link>

            <button
              onClick={() => setModalType("fondo_inicial")}
              className="group flex items-center gap-4 rounded-xl border border-amber-200/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 hover:shadow-md transition-all"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center">
                <HiOutlineArchiveBox className="text-2xl" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  Fondo inicial
                </p>
                <p className="text-xs text-amber-700/70 dark:text-amber-200/70">
                  Abre la caja del dia.
                </p>
              </div>
            </button>

            <button
              onClick={() => setModalType("gasto")}
              className="group flex items-center gap-4 rounded-xl border border-rose-200/60 bg-rose-50/70 dark:bg-rose-950/20 p-4 hover:shadow-md transition-all"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center">
                <HiOutlineCurrencyDollar className="text-2xl" />
              </div>
              <div>
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                  Registrar gasto
                </p>
                <p className="text-xs text-rose-700/70 dark:text-rose-200/70">
                  Controla egresos diarios.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {modalType && (
        <CashMovementModal
          isOpen={!!modalType}
          onClose={() => setModalType(null)}
          onMovementLogged={handleMovementLogged}
          type={modalType}
        />
      )}
    </>
  );
}
