"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  FaArrowLeft,
  FaDollarSign,
  FaUser,
  FaPhone,
  FaFileInvoiceDollar,
  FaShoppingCart,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";
import RegisterPayment from "@/components/payments/RegisterPayment";

type DebtDetail = {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  customer_type: string;
  ordersDebt: number;
  salesDebt: number;
  totalDebt: number;
  ordersCount: number;
  salesCount: number;
};

type CustomerListRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  customer_type: string;
};

type PendingDebtRow = {
  customer_id: string | null;
  amount_pending: number | null;
};

export default function DeudoresPage() {
  const [deudores, setDeudores] = useState<DebtDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<DebtDetail | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Helper Currency Formatter
  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  useEffect(() => {
    fetchDeudores();
  }, []);

  const fetchDeudores = async () => {
    setLoading(true);
    try {
      // Carga global para evitar N+1 queries por cliente.
      const [customersRes, ordersDebtRes, salesDebtRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id, full_name, phone, email, customer_type"),
        supabase
          .from("orders")
          .select("customer_id, amount_pending")
          .gt("amount_pending", 0)
          .neq("status", "cancelado"),
        supabase
          .from("sales")
          .select("customer_id, amount_pending")
          .eq("payment_method", "cuenta_corriente")
          .eq("is_cancelled", false)
          .gt("amount_pending", 0),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (ordersDebtRes.error) throw ordersDebtRes.error;
      if (salesDebtRes.error) throw salesDebtRes.error;

      const debtStatsByCustomer = new Map<
        string,
        {
          ordersDebt: number;
          salesDebt: number;
          ordersCount: number;
          salesCount: number;
        }
      >();

      const ensureStats = (customerId: string) => {
        const existing = debtStatsByCustomer.get(customerId);
        if (existing) return existing;

        const created = {
          ordersDebt: 0,
          salesDebt: 0,
          ordersCount: 0,
          salesCount: 0,
        };
        debtStatsByCustomer.set(customerId, created);
        return created;
      };

      for (const row of (ordersDebtRes.data || []) as PendingDebtRow[]) {
        if (!row.customer_id) continue;
        const stats = ensureStats(row.customer_id);
        stats.ordersDebt += Number(row.amount_pending || 0);
        stats.ordersCount += 1;
      }

      for (const row of (salesDebtRes.data || []) as PendingDebtRow[]) {
        if (!row.customer_id) continue;
        const stats = ensureStats(row.customer_id);
        stats.salesDebt += Number(row.amount_pending || 0);
        stats.salesCount += 1;
      }

      const deudoresData = ((customersRes.data || []) as CustomerListRow[]).map(
        (customer) => {
          const stats = debtStatsByCustomer.get(customer.id) || {
            ordersDebt: 0,
            salesDebt: 0,
            ordersCount: 0,
            salesCount: 0,
          };

          return {
            id: customer.id,
            full_name: customer.full_name,
            phone: customer.phone,
            email: customer.email,
            customer_type: customer.customer_type,
            ordersDebt: stats.ordersDebt,
            salesDebt: stats.salesDebt,
            totalDebt: stats.ordersDebt + stats.salesDebt,
            ordersCount: stats.ordersCount,
            salesCount: stats.salesCount,
          };
        }
      );

      // Filtrar solo los que tienen deuda y ordenar por mayor deuda
      const clientesConDeuda = deudoresData
        .filter((d) => d.totalDebt > 0)
        .sort((a, b) => b.totalDebt - a.totalDebt);

      setDeudores(clientesConDeuda);
    } catch (e) {
      console.error("Error fetching deudores data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = (customer: DebtDetail) => {
    setSelectedCustomer(customer);
    setShowPaymentModal(true);
  };

  const handleClosePayment = () => {
    setShowPaymentModal(false);
    setSelectedCustomer(null);
    fetchDeudores(); // Refrescar después de registrar pago
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-500">Cargando deudores...</span>
        </div>
      </div>
    );
  }

  const totalDebtSum = deudores.reduce((sum, d) => sum + d.totalDebt, 0);

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-full text-slate-800 dark:text-slate-100">
      <div className="max-w-[1250px] mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Link
              href="/dashboard/clientes"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-750 dark:text-indigo-400 mb-2 transition-colors"
            >
              <FaArrowLeft /> Volver a Clientes
            </Link>
            <h1 className="text-xl font-black text-gray-900 dark:text-slate-55 flex items-center gap-2">
              <FaExclamationTriangle className="text-rose-500 text-lg animate-pulse" /> Cartera de Clientes Deudores
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Todos los clientes activos que poseen deudas pendientes en facturación o pedidos fiados ({deudores.length} clientes).
            </p>
          </div>

          <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/40 rounded-xl px-5 py-3.5 flex flex-col justify-center min-w-[200px]">
            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Deuda Total Consolidada</span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-450 mt-0.5">
              {formatCurrency(totalDebtSum)}
            </span>
          </div>
        </div>

        {/* LISTA DE DEUDORES */}
        {deudores.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 py-16 text-center">
            <FaDollarSign className="text-5xl text-emerald-500 mx-auto mb-4 opacity-80" />
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
              ¡Sin clientes deudores!
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Perfecto. Todos los clientes se encuentran al día con sus cuentas corrientes y pedidos.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {deudores.map((deudor) => (
              <div
                key={deudor.id}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden p-6"
              >
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  
                  {/* INFO DEL CLIENTE */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/15 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center font-bold text-lg border border-rose-100/50 dark:border-rose-900/30">
                        {deudor.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-slate-50">
                          {deudor.full_name}
                        </h3>
                        <div className="flex flex-wrap gap-2.5 mt-1.5 items-center">
                          {deudor.phone && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <FaPhone className="text-slate-400 w-2.5 h-2.5" /> {deudor.phone}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-lg text-3xs font-extrabold border ${
                              deudor.customer_type === "mayorista"
                                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/10 dark:text-purple-400 dark:border-purple-900/50"
                                : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/10 dark:text-blue-400 dark:border-blue-900/50"
                            }`}
                          >
                            {deudor.customer_type === "mayorista" ? "Mayorista" : "Minorista"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* DETALLE DE DEUDAS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      
                      {/* Pedidos */}
                      <div className="bg-amber-50/40 dark:bg-amber-950/10 rounded-xl p-3 border border-amber-100/50 dark:border-amber-900/30">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FaShoppingCart className="text-amber-600 text-xs" />
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                            En Pedidos Fiados
                          </span>
                        </div>
                        <span className="text-base font-extrabold text-amber-600 block">
                          {formatCurrency(deudor.ordersDebt)}
                        </span>
                        <span className="text-3xs text-amber-500 block mt-0.5">
                          {deudor.ordersCount} pedido(s) cargado(s)
                        </span>
                      </div>

                      {/* Ventas */}
                      <div className="bg-rose-50/40 dark:bg-rose-950/10 rounded-xl p-3 border border-rose-100/50 dark:border-rose-900/30">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FaFileInvoiceDollar className="text-rose-600 text-xs" />
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                            En Cuenta Corriente
                          </span>
                        </div>
                        <span className="text-base font-extrabold text-rose-600 block">
                          {formatCurrency(deudor.salesDebt)}
                        </span>
                        <span className="text-3xs text-rose-500 block mt-0.5">
                          {deudor.salesCount} venta(s) pendiente(s)
                        </span>
                      </div>

                      {/* Total */}
                      <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-3 border border-slate-800 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FaDollarSign className="text-rose-400 text-xs" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Deuda Total Acumulada
                          </span>
                        </div>
                        <span className="text-lg font-black text-white block">
                          {formatCurrency(deudor.totalDebt)}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* ACCIONES DEL CLIENTE */}
                  <div className="flex flex-row lg:flex-col gap-2.5 items-end justify-end lg:w-48 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-6">
                    <button
                      onClick={() => handleOpenPayment(deudor)}
                      className="flex-1 w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <FaDollarSign /> Registrar Pago
                    </button>
                    <Link
                      href={`/dashboard/clientes/${deudor.id}`}
                      className="flex-1 w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 border"
                    >
                      Ver Detalle Ficha
                    </Link>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* MODAL DE REGISTRO DE PAGO */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-md w-full overflow-hidden">
            
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/60 dark:bg-slate-900/40">
              <div>
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
                  Registrar Cobro de Deuda
                </h3>
                <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5">
                  Cliente: {selectedCustomer.full_name}
                </p>
              </div>
              <button
                onClick={handleClosePayment}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-450 hover:text-slate-750 dark:hover:text-white rounded-lg transition-colors"
                title="Cerrar modal"
              >
                <FaTimes className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-rose-50/50 dark:bg-rose-950/15 rounded-xl p-4 border border-rose-100 dark:border-rose-900/30 flex justify-between items-center text-xs">
                <div>
                  <span className="font-extrabold text-rose-800 dark:text-rose-450 block uppercase tracking-wider text-[9px]">
                    Deuda Total Pendiente
                  </span>
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-450 mt-1 block">
                    {formatCurrency(selectedCustomer.totalDebt)}
                  </span>
                </div>
                <div className="text-right space-y-0.5 text-slate-450 dark:text-slate-400 text-[10px] font-medium">
                  <div>En Pedidos: {formatCurrency(selectedCustomer.ordersDebt)}</div>
                  <div>En Cta. Cte.: {formatCurrency(selectedCustomer.salesDebt)}</div>
                </div>
              </div>

              {/* Componente de Registro de Pago de la app */}
              <RegisterPayment
                customerId={selectedCustomer.id}
                currentDebt={selectedCustomer.totalDebt}
                onSuccess={handleClosePayment}
              />
            </div>
            
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleClosePayment}
                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors border"
              >
                Cerrar y Cancelar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
