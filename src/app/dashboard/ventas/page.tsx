// src/app/dashboard/ventas/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import {
  FaChartLine,
  FaPlus,
  FaSearch,
  FaCalendarAlt,
  FaCreditCard,
  FaUser,
  FaUserTie,
  FaDollarSign,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaTrash,
  FaMoneyBillWave,
  FaUniversity,
  FaMobileAlt,
  FaFileInvoice,
  FaClock,
  FaInbox,
  FaChevronLeft,
  FaChevronRight,
  FaChartBar,
  FaPrint,
} from "react-icons/fa";
import { getUTCInterval } from "@/lib/date-utils";
import SaleTicketModal from "./components/SaleTicketModal";

const ITEMS_PER_PAGE = 10; // Puedes ajustar cuántas ventas mostrar por página

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); // Fecha de hoy por defecto
  const [paymentFilter, setPaymentFilter] = useState("all"); // Filtro por método de pago
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const fetchSales = async () => {
    setLoading(true);

    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from("sales")
      .select(
        `
        id,
        created_at,
        total_amount,
        payment_method,
        is_cancelled,
        customers ( full_name ),
        profiles ( full_name )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    // --- FILTRO POR DÍA ESPECÍFICO (Zona Horaria Argentina UTC-3) ---
    if (date) {
      const { startUTC, endUTC } = getUTCInterval(date, 'America/Argentina/Buenos_Aires');
      query = query.gte("created_at", startUTC).lte("created_at", endUTC);
    }

    // --- FILTRO POR MÉTODO DE PAGO ---
    if (paymentFilter !== "all") {
      query = query.eq("payment_method", paymentFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching sales:", error);
    } else {
      setSales(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
  }, [date, currentPage, paymentFilter]); // Se ejecuta si la fecha, página o filtro de pago cambian

  const handleCancelSale = async (saleId: string) => {
    if (
      !confirm(
        "⚠️ ¿Estás seguro de anular esta venta?\n\nEsta acción:\n- Marcará la venta como anulada\n- Devolverá el stock de los productos\n- Revertirá la deuda del cliente\n- Anulará los pagos registrados"
      )
    ) {
      return;
    }

    const loadingToast = toast.loading("Anulando venta...");

    try {
      // 1. Obtener los detalles de la venta
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .select(
          `
          *,
          sale_items ( product_id, quantity, price ),
          customers ( id, debt )
        `
        )
        .eq("id", saleId)
        .single();

      if (saleError) {
        console.error("Error obteniendo venta:", saleError);
        throw new Error(`Error obteniendo venta: ${saleError.message}`);
      }

      if (!saleData) {
        throw new Error("No se encontró la venta");
      }

      // 2. Devolver stock de los productos
      const stockUpdates = saleData.sale_items.map(async (item: any) => {
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.product_id)
          .single();

        if (productError) {
          console.error(
            `Error obteniendo producto ${item.product_id}:`,
            productError
          );
          throw new Error(`Error obteniendo producto: ${productError.message}`);
        }

        if (product) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ stock: product.stock + item.quantity })
            .eq("id", item.product_id);

          if (updateError) {
            console.error(
              `Error actualizando stock de producto ${item.product_id}:`,
              updateError
            );
            throw new Error(`Error actualizando stock: ${updateError.message}`);
          }
        }
      });

      await Promise.all(stockUpdates);

      // 3. Revertir la deuda del cliente
      const customer = saleData.customers;
      if (customer) {
        const { error: debtError } = await supabase
          .from("customers")
          .update({ debt: (customer.debt || 0) - saleData.total_amount })
          .eq("id", customer.id);

        if (debtError) {
          console.error("Error actualizando deuda del cliente:", debtError);
          throw new Error(`Error actualizando deuda: ${debtError.message}`);
        }
      }

      // 4. Anular los pagos relacionados
      const { error: paymentsError } = await supabase
        .from("payments")
        .delete()
        .eq("sale_id", saleId);

      if (paymentsError) {
        console.error("Error eliminando pagos:", paymentsError);
        throw new Error(`Error eliminando pagos: ${paymentsError.message}`);
      }

      // 5. Marcar la venta como anulada
      console.log("Intentando marcar venta como anulada:", saleId);

      // Primero verificar que la venta existe
      const { data: checkSale, error: checkError } = await supabase
        .from("sales")
        .select("id, is_cancelled")
        .eq("id", saleId)
        .single();

      console.log("Venta antes de actualizar:", checkSale, checkError);

      const { data: updateData, error: updateError } = await supabase
        .from("sales")
        .update({ is_cancelled: true })
        .eq("id", saleId)
        .select();

      console.log("Resultado de actualización:", { updateData, updateError });

      if (updateError) {
        console.error("Error marcando venta como anulada:", updateError);
        throw new Error(
          `Error marcando venta como anulada: ${updateError.message}. Asegúrate de ejecutar la migración SQL primero.`
        );
      }

      if (!updateData || updateData.length === 0) {
        console.warn(
          "⚠️ UPDATE no afectó ninguna fila. Verificando RLS policies..."
        );
        // Intentar verificar si la venta realmente se actualizó
        const { data: verifyData } = await supabase
          .from("sales")
          .select("id, is_cancelled")
          .eq("id", saleId)
          .single();
        console.log("Verificación post-update:", verifyData);

        if (verifyData?.is_cancelled) {
          console.log(
            "✅ La venta SÍ se actualizó (problema de RLS en SELECT)"
          );
        } else {
          throw new Error(
            "La venta no se pudo actualizar. Verifica las políticas RLS en Supabase."
          );
        }
      }

      console.log("Venta marcada como anulada exitosamente:", updateData);
      toast.success("✅ Venta anulada exitosamente", { id: loadingToast });

      // Recargar la lista de ventas sin recargar toda la página
      await fetchSales();
    } catch (error: any) {
      console.error("Error anulando venta:", error);
      const errorMessage =
        error?.message ||
        error?.error_description ||
        JSON.stringify(error) ||
        "Error desconocido";
      toast.error(`Error al anular venta: ${errorMessage}`, {
        id: loadingToast,
        duration: 5000,
      });
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      {/* HEADER CARD */}
      <div className="group relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-indigo-50/50 dark:bg-indigo-950/20" />
        <div className="flex items-center gap-4 text-left">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-3xs flex-shrink-0 text-base">
            <FaChartLine />
          </span>
          <div className="relative">
            <h1 className="text-lg font-black text-slate-900 dark:text-slate-50 leading-none">
              Historial de Ventas
            </h1>
            <p className="text-xs text-slate-500 mt-1.5">
              Gestiona y revisa todas las ventas realizadas
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 relative z-10">
          <Link
            href="/dashboard/ventas/pendientes"
            className="group relative overflow-hidden rounded-xl border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-slate-900 p-2.5 shadow-2xs hover:shadow-sm hover:scale-[1.02] transition-all flex items-center gap-2.5 text-left w-[160px]"
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-3xs flex-shrink-0 text-xs">
              <FaClock />
            </span>
            <div>
              <p className="text-2xs font-extrabold text-purple-700 dark:text-purple-305 leading-none">
                Pendientes
              </p>
              <p className="text-[9px] text-slate-500 mt-1 font-medium leading-none">
                Ver facturas fiadas
              </p>
            </div>
          </Link>
          <Link
            href="/dashboard/ventas/nueva"
            className="group relative overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-2.5 shadow-2xs hover:shadow-sm hover:scale-[1.02] transition-all flex items-center gap-2.5 text-left w-[160px]"
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-3xs flex-shrink-0 text-xs">
              <FaPlus />
            </span>
            <div>
              <p className="text-2xs font-extrabold text-emerald-700 dark:text-emerald-305 leading-none">
                Nueva Venta
              </p>
              <p className="text-[9px] text-slate-500 mt-1 font-medium leading-none">
                Registrar operación
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg mb-6 p-6 border border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <FaSearch className="text-blue-600" /> Filtros de Búsqueda
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Filtro por fecha */}
          <div className="space-y-2">
            <label
              htmlFor="saleDate"
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center gap-2"
            >
              <FaCalendarAlt className="text-blue-500" /> Filtrar por fecha
            </label>
            <input
              type="date"
              id="saleDate"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setCurrentPage(1);
              }}
              onClick={(e) => {
                // Mantener la posición actual al abrir el datepicker
                const currentScrollPos = window.scrollY;
                setTimeout(() => {
                  window.scrollTo(0, currentScrollPos);
                }, 100);
              }}
              className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50"
            />
          </div>

          {/* Filtro por método de pago */}
          <div className="space-y-2">
            <label
              htmlFor="paymentFilter"
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center gap-2"
            >
              <FaCreditCard className="text-blue-500" /> Método de pago
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <select
                id="paymentFilter"
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50"
              >
                <option value="all">Todos los métodos</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="mercado_pago">Mercado Pago</option>
                <option value="cuenta_corriente">
                  Cuenta Corriente (Fiado)
                </option>
              </select>
              {paymentFilter === "cuenta_corriente" && (
                <span className="w-full sm:w-auto text-sm font-semibold text-orange-600 bg-orange-50 px-4 py-2 rounded-lg border border-orange-200 whitespace-nowrap flex items-center gap-2">
                  <FaFileInvoice /> Solo fiadas
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE VENTAS */}
      <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt /> Fecha
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaUser /> Cliente
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaUserTie /> Vendedor
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaCreditCard /> Método de Pago
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaDollarSign /> Total
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaChartBar /> Estado
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider w-[320px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <span className="text-gray-500 dark:text-slate-400 font-medium">
                        Cargando ventas...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <FaInbox className="text-6xl text-gray-300" />
                      <span className="text-gray-500 dark:text-slate-400 font-medium">
                        No hay ventas para la fecha seleccionada
                      </span>
                      <span className="text-gray-400 text-sm">
                        Intenta cambiar los filtros de búsqueda
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                sales.map((sale, index) => (
                  <tr
                    key={sale.id}
                    className={`
                      transition-all duration-150 hover:bg-gray-50 dark:hover:bg-slate-800/80
                      ${sale.is_cancelled ? "bg-red-50/50 dark:bg-red-900/20 opacity-70" : ""}
                      ${sale.payment_method === "cuenta_corriente" &&
                        !sale.is_cancelled
                        ? "bg-orange-50/30 border-l-4 border-orange-400"
                        : ""
                      }
                    `}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-slate-100">
                          <FaCalendarAlt className="text-blue-500 text-xs" />
                          {new Date(sale.created_at).toLocaleDateString(
                            "es-AR"
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                          <FaClock className="text-gray-400" />
                          {new Date(sale.created_at).toLocaleTimeString(
                            "es-AR",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {sale.customers?.full_name?.charAt(0).toUpperCase() ??
                            "?"}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            {sale.customers?.full_name ?? "Sin cliente"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
                      {sale.profiles?.full_name ?? "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {sale.payment_method === "cuenta_corriente" ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300">
                          <FaFileInvoice /> Fiado
                        </span>
                      ) : sale.payment_method === "efectivo" ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300">
                          <FaMoneyBillWave /> Efectivo
                        </span>
                      ) : sale.payment_method === "transferencia" ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300">
                          <FaUniversity /> Transferencia
                        </span>
                      ) : sale.payment_method === "mercado_pago" ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-100 to-cyan-200 text-cyan-800 border border-cyan-300">
                          <FaMobileAlt /> Mercado Pago
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-slate-400 capitalize">
                          {sale.payment_method?.replace("_", " ") ?? "N/A"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        ${sale.total_amount?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {sale.is_cancelled ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-2 border-red-400">
                          <FaTimesCircle /> ANULADA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-2 border-green-400">
                          <FaCheckCircle /> Activa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => {
                            setSelectedSaleId(sale.id);
                            setIsTicketModalOpen(true);
                          }}
                          className="group relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-3xs hover:shadow-2xs hover:scale-[1.02] transition-all flex items-center gap-1.5 text-left w-[95px]"
                          title="Imprimir Ticket"
                        >
                          <div className="absolute -right-6 -top-6 h-10 w-10 rounded-full bg-slate-50/50 dark:bg-slate-950/20" />
                          <span className="relative flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-3xs flex-shrink-0 text-[9px]">
                            <FaPrint />
                          </span>
                          <div className="relative">
                            <p className="text-[9px] font-black text-slate-700 dark:text-slate-400 leading-none">
                              Ticket
                            </p>
                            <p className="text-[7.5px] text-slate-450 dark:text-slate-500 mt-0.5 font-medium leading-none">
                              Imprimir
                            </p>
                          </div>
                        </button>

                        <Link
                          href={`/dashboard/ventas/${sale.id}`}
                          className="group relative overflow-hidden rounded-lg border border-blue-100 dark:border-blue-900/40 bg-white dark:bg-slate-900 p-1 shadow-3xs hover:shadow-2xs hover:scale-[1.02] transition-all flex items-center gap-1.5 text-left w-[95px]"
                        >
                          <div className="absolute -right-6 -top-6 h-10 w-10 rounded-full bg-blue-50/50 dark:bg-blue-950/20" />
                          <span className="relative flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-3xs flex-shrink-0 text-[9px]">
                            <FaEye />
                          </span>
                          <div className="relative">
                            <p className="text-[9px] font-black text-blue-700 dark:text-blue-450 leading-none">
                              Detalles
                            </p>
                            <p className="text-[7.5px] text-slate-450 dark:text-slate-500 mt-0.5 font-medium leading-none">
                              Ver venta
                            </p>
                          </div>
                        </Link>

                        {!sale.is_cancelled ? (
                          <button
                            onClick={() => handleCancelSale(sale.id)}
                            className="group relative overflow-hidden rounded-lg border border-rose-100 dark:border-rose-900/40 bg-white dark:bg-slate-900 p-1 shadow-3xs hover:shadow-2xs hover:scale-[1.02] transition-all flex items-center gap-1.5 text-left w-[95px]"
                          >
                            <div className="absolute -right-6 -top-6 h-10 w-10 rounded-full bg-rose-50/50 dark:bg-rose-950/20" />
                            <span className="relative flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-3xs flex-shrink-0 text-[9px]">
                              <FaTrash />
                            </span>
                            <div className="relative">
                              <p className="text-[9px] font-black text-rose-700 dark:text-rose-455 leading-none">
                                Anular
                              </p>
                              <p className="text-[7.5px] text-slate-450 dark:text-slate-500 mt-0.5 font-medium leading-none">
                                Revertir
                              </p>
                            </div>
                          </button>
                        ) : (
                          <div className="w-[95px] flex items-center justify-center">
                            <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">
                              Anulada
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TARJETAS DE VENTAS (Mobile/Tablet) */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
              Cargando ventas...
            </p>
          </div>
        ) : sales.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 text-center">
            <FaInbox className="w-12 h-12 mx-auto text-gray-300" />
            <p className="text-gray-600 dark:text-slate-300 mt-3">
              No hay ventas para la fecha seleccionada
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Ajusta la fecha o el metodo de pago
            </p>
          </div>
        ) : (
          sales.map((sale) => (
            <div
              key={sale.id}
              className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm p-4 border ${sale.is_cancelled
                ? "border-red-200 dark:border-red-900"
                : sale.payment_method === "cuenta_corriente"
                  ? "border-orange-200 dark:border-orange-900"
                  : "border-gray-200 dark:border-slate-700"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Fecha</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {new Date(sale.created_at).toLocaleDateString("es-AR")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {new Date(sale.created_at).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {sale.is_cancelled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                    <FaTimesCircle /> Anulada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                    <FaCheckCircle /> Activa
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
                  <FaUser className="text-blue-500" />
                  {sale.customers?.full_name ?? "Sin cliente"}
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
                  <FaCreditCard className="text-amber-500" />
                  {sale.payment_method === "cuenta_corriente"
                    ? "Cuenta corriente"
                    : sale.payment_method === "mercado_pago"
                      ? "Mercado Pago"
                      : sale.payment_method?.replace("_", " ") ?? "N/A"}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-slate-400">Total</span>
                <span className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  ${sale.total_amount?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="mt-4 border-t border-gray-200 dark:border-slate-700 pt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelectedSaleId(sale.id);
                    setIsTicketModalOpen(true);
                  }}
                  className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-all text-xs font-semibold"
                >
                  <FaPrint /> Ticket
                </button>
                <Link
                  href={`/dashboard/ventas/${sale.id}`}
                  className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-xs font-semibold"
                >
                  <FaEye /> Ver
                </Link>
                {!sale.is_cancelled && (
                  <button
                    onClick={() => handleCancelSale(sale.id)}
                    className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-xs font-semibold"
                  >
                    <FaTrash /> Anular
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* PAGINACIÓN */}
      <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-4 py-2 rounded-lg flex items-center gap-2">
              <FaChartBar className="text-blue-600" />
              Mostrando{" "}
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {sales.length}
              </span> de <span className="font-bold">{totalCount}</span> ventas
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-5 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-slate-200 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <FaChevronLeft /> Anterior
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                Página{" "}
                <span className="text-blue-600 dark:text-blue-400 text-lg">{currentPage}</span> de{" "}
                <span className="text-gray-900 dark:text-slate-100">{totalPages}</span>
              </span>
            </div>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-5 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-slate-200 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              Siguiente <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      <SaleTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setSelectedSaleId(null);
        }}
        saleId={selectedSaleId}
      />
    </div>
  );
}
