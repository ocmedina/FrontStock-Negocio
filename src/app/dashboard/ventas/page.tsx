// src/app/dashboard/ventas/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
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
  const loadingTimeoutRef = useRef<number | null>(null);
  const pathname = usePathname();

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  const fetchSales = async () => {
    setLoading(true);

    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("sales")
        .select(
          `
          id,
          created_at,
          total_amount,
          amount_paid,
          amount_pending,
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
        const { startUTC, endUTC } = getUTCInterval(
          date,
          "America/Argentina/Buenos_Aires"
        );
        query = query.gte("created_at", startUTC).lte("created_at", endUTC);
      }

      // --- FILTRO POR MÉTODO DE PAGO ---
      if (paymentFilter !== "all") {
        query = query.eq("payment_method", paymentFilter);
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT_FORZADO")), 2000);
      });

      const result = await Promise.race([query, timeoutPromise]) as any;
      const data = result?.data;
      const error = result?.error;
      const count = result?.count;

      if (error) {
        console.error("Error fetching sales:", error);
        return;
      }

      setSales(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      if (error.message === "TIMEOUT_FORZADO") {
        window.location.reload();
        return;
      }
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [date, currentPage, paymentFilter, pathname]); // Se ejecuta si la fecha, página o filtro de pago cambian

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
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <FaChartLine className="text-blue-600" /> Historial de Ventas
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">
            Gestiona y revisa todas las ventas realizadas
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/ventas/pendientes"
            className="px-6 py-3 text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold flex items-center gap-2"
          >
            <FaClock /> Ventas Pendientes
          </Link>
          <Link
            href="/dashboard/ventas/nueva"
            className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold flex items-center gap-2"
          >
            <FaPlus /> Nueva Venta
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
            <div className="flex items-center gap-3">
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
                <span className="text-sm font-semibold text-orange-600 bg-orange-50 px-4 py-2 rounded-lg border border-orange-200 whitespace-nowrap flex items-center gap-2">
                  <FaFileInvoice /> Solo fiadas
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE VENTAS */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700">
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
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedSaleId(sale.id);
                            setIsTicketModalOpen(true);
                          }}
                          className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-all shadow-sm hover:shadow-md font-medium flex items-center gap-2"
                          title="Imprimir Ticket"
                        >
                          <FaPrint />
                        </button>
                        <Link
                          href={`/dashboard/ventas/${sale.id}`}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md font-medium flex items-center gap-2"
                        >
                          <FaEye /> Ver
                        </Link>
                        {!sale.is_cancelled && (
                          <button
                            onClick={() => handleCancelSale(sale.id)}
                            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-sm hover:shadow-md font-medium flex items-center gap-2"
                          >
                            <FaTrash /> Anular
                          </button>
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
