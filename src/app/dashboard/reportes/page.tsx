// src/app/dashboard/reportes/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import {
  FaPrint,
  FaCalculator,
  FaCashRegister,
  FaExclamationTriangle,
} from "react-icons/fa";
import { getUTCInterval } from "@/lib/date-utils";
import dynamic from "next/dynamic";

const ReportsCharts = dynamic(() => import("@/components/ReportsCharts"), {
  loading: () => (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-950 p-6 rounded-2xl shadow-lg">
      <div className="flex items-center justify-center h-72">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-300">Cargando gráficos...</p>
        </div>
      </div>
    </div>
  ),
  ssr: false,
});

interface DailyClosingData {
  startingFloat: number;
  cashSales: number;
  totalExpenses: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  salesBreakdown: { [key: string]: number };
  transactionCount: number;
  totalSales: number;
  // Nuevos campos para separar mostrador y reparto
  counterSales: {
    total: number;
    cash: number;
    count: number;
    breakdown: { [key: string]: number };
  };
  deliverySales: {
    total: number;
    cashReceived: number;
    count: number;
    pending: number;
  };
}

interface Sale {
  total_amount: number;
  payment_method: string;
}

interface CashMovement {
  type: string;
  amount: number;
}

export default function ReportsPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [closingData, setClosingData] = useState<DailyClosingData | null>(null);
  const [savedReport, setSavedReport] = useState<any | null>(null);
  const [countedCash, setCountedCash] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Calcular la diferencia en tiempo real
  const realTimeDifference = useMemo(() => {
    if (!closingData || countedCash === "") return null;
    return parseFloat(countedCash) - closingData.expectedCash;
  }, [countedCash, closingData]);

  useEffect(() => {
    fetchDataForDate();
  }, [date]);

  const fetchDataForDate = async () => {
    setLoading(true);
    setClosingData(null);
    setSavedReport(null);
    setCountedCash("");

    try {
      // 1. Verificar si existe un reporte guardado
      const { data: existingReport, error: reportError } = await supabase
        .from("daily_reports")
        .select("report_data")
        .eq("report_date", date)
        .maybeSingle();

      if (reportError) throw reportError;

      if (existingReport) {
        setSavedReport(existingReport.report_data);
        setLoading(false);
        return;
      }

      // 2. Calcular datos para el arqueo
      // Usar la zona horaria de Argentina (UTC-3)
      const { startUTC: startDate, endUTC: endDate } = getUTCInterval(date, 'America/Argentina/Buenos_Aires');

      // Obtener ventas de mostrador, pedidos y movimientos en paralelo
      const [salesResult, ordersResult, movementsResult, paymentsResult] =
        await Promise.all([
          supabase
            .from("sales")
            .select("total_amount, payment_method")
            .gte("created_at", startDate)
            .lte("created_at", endDate),
          (supabase as any)
            .from("orders")
            .select("total_amount, status, created_at")
            .eq("status", "entregado")
            .gte("created_at", startDate)
            .lte("created_at", endDate),
          supabase
            .from("cash_movements")
            .select("type, amount")
            .gte("created_at", startDate)
            .lte("created_at", endDate),
          supabase
            .from("payments")
            .select("amount, type, comment")
            .eq("type", "pago")
            .gte("created_at", startDate)
            .lte("created_at", endDate),
        ]);

      if (salesResult.error) throw salesResult.error;
      if (ordersResult.error) throw ordersResult.error;
      if (movementsResult.error) throw movementsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      const sales: Sale[] = salesResult.data || [];
      const deliveredOrders = ordersResult.data || [];
      const movements: CashMovement[] = movementsResult.data || [];
      const payments = paymentsResult.data || [];

      // === VENTAS DE MOSTRADOR ===
      const counterSalesTotal = sales.reduce(
        (sum, s) => sum + (s.total_amount || 0),
        0
      );

      const counterSalesCash = sales
        .filter((s) => s.payment_method === "efectivo")
        .reduce((sum, s) => sum + (s.total_amount || 0), 0);

      const counterSalesBreakdown = sales.reduce((acc, sale) => {
        const method = sale.payment_method || "no_especificado";
        const displayMethod = method
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        acc[displayMethod] =
          (acc[displayMethod] || 0) + (sale.total_amount || 0);
        return acc;
      }, {} as { [key: string]: number });

      // === ENTREGAS DE REPARTO ===
      const deliverySalesTotal = deliveredOrders.reduce(
        (sum: number, o: any) => sum + (o.total_amount || 0),
        0
      );

      // Filtrar pagos que vienen de entregas (tienen comment con "Pago en entrega")
      const deliveryCashReceived = payments
        .filter((p) => p.comment?.includes("Pago en entrega"))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // === EFECTIVO TOTAL RECIBIDO ===
      const totalCashReceived = counterSalesCash + deliveryCashReceived;

      const startingFloat = movements
        .filter((m) => m.type === "fondo_inicial")
        .reduce((sum, m) => sum + (m.amount || 0), 0);

      const totalExpenses = Math.abs(
        movements
          .filter((m) => m.type === "gasto")
          .reduce((sum, m) => sum + (m.amount || 0), 0)
      );

      const expectedCash = startingFloat + totalCashReceived - totalExpenses;

      // Total de todas las ventas (mostrador + reparto)
      const totalSales = counterSalesTotal + deliverySalesTotal;
      const totalTransactions = sales.length + deliveredOrders.length;

      // Calcular deuda pendiente en entregas (total entregado - efectivo recibido)
      const deliveryPending = deliverySalesTotal - deliveryCashReceived;

      setClosingData({
        startingFloat,
        cashSales: totalCashReceived, // Total efectivo recibido (mostrador + reparto)
        totalExpenses,
        expectedCash,
        countedCash: 0,
        difference: 0,
        salesBreakdown: counterSalesBreakdown, // Mantener solo métodos de mostrador
        transactionCount: totalTransactions,
        totalSales,
        counterSales: {
          total: counterSalesTotal,
          cash: counterSalesCash,
          count: sales.length,
          breakdown: counterSalesBreakdown,
        },
        deliverySales: {
          total: deliverySalesTotal,
          cashReceived: deliveryCashReceived,
          count: deliveredOrders.length,
          pending: deliveryPending,
        },
      });
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error(`Error al cargar datos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeAndSave = async () => {
    if (!closingData) {
      toast.error("No hay datos para guardar.");
      return;
    }

    if (countedCash === "" || isNaN(parseFloat(countedCash))) {
      toast.error("Debes ingresar un monto válido de efectivo contado.");
      return;
    }

    const counted = parseFloat(countedCash);
    const difference = counted - closingData.expectedCash;

    // Confirmar si hay diferencias significativas
    if (Math.abs(difference) > 100) {
      const confirm = window.confirm(
        `Hay una diferencia de $${difference.toFixed(
          2
        )}. ¿Estás seguro de continuar?`
      );
      if (!confirm) return;
    }

    setIsSaving(true);

    try {
      const finalData: DailyClosingData = {
        ...closingData,
        countedCash: counted,
        difference,
      };

      const { error } = await supabase.from("daily_reports").insert({
        report_date: date,
        report_data: finalData,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("✅ Cierre de caja finalizado y guardado correctamente.");
      setSavedReport(finalData);
      setClosingData(null);
      setCountedCash("");
    } catch (error: any) {
      console.error("Error saving report:", error);
      toast.error(`Error al guardar el cierre: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const reportToDisplay = savedReport || closingData;

  return (
    <div className="space-y-4 sm:space-y-6 print:space-y-4">
      <ReportsCharts />

      <div className="print:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2 sm:gap-3">
          <FaCashRegister className="text-blue-600 text-xl sm:text-2xl" />
          Arqueo y Cierre de Caja
        </h1>
      </div>

      {/* Selector de fecha */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-lg shadow-md flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 print:shadow-none">
        <label
          htmlFor="reportDate"
          className="text-sm font-medium text-gray-700 dark:text-slate-300"
        >
          Fecha del Cierre:
        </label>
        <input
          type="date"
          id="reportDate"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          className="w-full sm:w-auto p-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50"
          disabled={loading || isSaving}
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center p-10 bg-white dark:bg-slate-900 rounded-lg shadow-md">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">Calculando datos del día...</p>
        </div>
      )}

      {/* No data state */}
      {!loading && !reportToDisplay && (
        <div className="text-center p-10 bg-white dark:bg-slate-900 rounded-lg shadow-md">
          <FaExclamationTriangle className="mx-auto text-4xl text-yellow-500 mb-4" />
          <p className="text-gray-600 dark:text-slate-300">
            No hay datos de ventas o movimientos para esta fecha.
          </p>
        </div>
      )}

      {/* VISTA DEL ARQUEO DE CAJA (Pendiente de finalizar) */}
      {!loading && closingData && !savedReport && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-lg shadow-lg space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-slate-100">
              <FaCalculator className="text-blue-600" />
              Arqueo de Caja
            </h2>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
              {new Date(date + "T00:00:00").toLocaleDateString("es-AR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>

          {/* Resumen general */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs sm:text-sm text-blue-600 font-medium">
                Total Ventas
              </p>
              <p className="text-xl sm:text-2xl font-bold text-blue-700">
                ${closingData.totalSales.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-blue-500">
                {closingData.transactionCount} transacciones
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs sm:text-sm text-green-600 font-medium">
                Efectivo Recibido
              </p>
              <p className="text-xl sm:text-2xl font-bold text-green-700">
                ${closingData.cashSales.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-green-600 mt-1">Total en efectivo</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 sm:p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-xs sm:text-sm text-purple-600 font-medium">
                Fondo Inicial
              </p>
              <p className="text-xl sm:text-2xl font-bold text-purple-700">
                ${closingData.startingFloat.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 sm:p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-xs sm:text-sm text-orange-600 font-medium">
                Cuenta Corriente
              </p>
              <p className="text-xl sm:text-2xl font-bold text-orange-700">
                ${closingData.deliverySales.pending.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-orange-500">Pendiente de cobro</p>
            </div>
          </div>

          {/* Sección: VENTAS DE MOSTRADOR */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-4 sm:p-5 rounded-lg border-2 border-blue-300 dark:border-blue-700">
            <h3 className="text-base sm:text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
              🏪 Ventas de Mostrador
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 dark:text-slate-300">Total Ventas</p>
                <p className="text-lg font-bold text-blue-700">
                  ${closingData.counterSales.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 dark:text-slate-300">Efectivo</p>
                <p className="text-lg font-bold text-green-700">
                  ${closingData.counterSales.cash.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 dark:text-slate-300">Transacciones</p>
                <p className="text-lg font-bold text-gray-700 dark:text-slate-200">
                  {closingData.counterSales.count}
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm">
              <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Métodos de Pago:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(closingData.counterSales.breakdown).map(
                  ([method, amount]) => (
                    <div key={method} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-slate-300">{method}:</span>
                      <span className="font-semibold dark:text-slate-200">
                        ${amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Sección: ENTREGAS DE REPARTO */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-4 sm:p-5 rounded-lg border-2 border-green-300 dark:border-green-700">
            <h3 className="text-base sm:text-lg font-bold text-green-800 mb-3 flex items-center gap-2">
              🚚 Entregas de Reparto
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 dark:text-slate-300">Total Entregado</p>
                <p className="text-lg font-bold text-green-700">
                  ${closingData.deliverySales.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 dark:text-slate-300">Efectivo Recibido</p>
                <p className="text-lg font-bold text-green-700">
                  ${closingData.deliverySales.cashReceived.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 dark:text-slate-300">En Cuenta Corriente</p>
                <p className="text-lg font-bold text-orange-600">
                  ${closingData.deliverySales.pending.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 dark:text-slate-300">Entregas</p>
                <p className="text-lg font-bold text-gray-700 dark:text-slate-200">
                  {closingData.deliverySales.count}
                </p>
              </div>
            </div>
          </div>

          {/* Cálculo de efectivo esperado */}
          <div className="p-4 sm:p-5 border-2 border-gray-300 dark:border-slate-600 rounded-lg space-y-3 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
            <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-slate-100 mb-4">
              Cálculo de Efectivo Esperado
            </h3>

            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600 dark:text-slate-300">
                Fondo de Caja Inicial
              </span>
              <span className="font-medium text-green-600 text-base sm:text-lg">
                + ${closingData.startingFloat.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600 dark:text-slate-300">
                Efectivo Mostrador
              </span>
              <span className="font-medium text-green-600 text-base sm:text-lg">
                + ${closingData.counterSales.cash.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600 dark:text-slate-300">
                Efectivo Entregas
              </span>
              <span className="font-medium text-green-600 text-base sm:text-lg">
                + ${closingData.deliverySales.cashReceived.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600 dark:text-slate-300">
                Gastos y Retiros
              </span>
              <span className="font-medium text-red-600 text-base sm:text-lg">
                - ${closingData.totalExpenses.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <hr className="my-3 border-gray-300 dark:border-slate-600" />

            <div className="flex justify-between items-center text-base sm:text-xl font-bold bg-blue-100 dark:bg-blue-900/40 p-2 sm:p-3 rounded-lg">
              <span className="text-gray-800 dark:text-slate-100">Efectivo Esperado en Caja</span>
              <span className="text-blue-700 dark:text-blue-300">
                ${closingData.expectedCash.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Input para efectivo contado */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 sm:p-5 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-200 mb-2">
              💰 Efectivo Real Contado en Caja
            </label>
            <input
              type="number"
              step="0.01"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              placeholder="Ingresa el monto contado físicamente"
              className="w-full p-2 sm:p-3 text-base sm:text-lg border-2 border-yellow-400 dark:border-yellow-600 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50"
              disabled={isSaving}
            />

            {/* Diferencia en tiempo real */}
            {realTimeDifference !== null && (
              <div
                className={`mt-4 p-3 sm:p-4 rounded-lg text-center bg-white dark:bg-slate-900 border-2 ${realTimeDifference >= 0
                  ? "border-green-500"
                  : "border-red-500"
                  }`}
              >
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 mb-1">
                  Diferencia
                </p>
                <p
                  className={`text-2xl sm:text-3xl font-bold ${realTimeDifference >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                >
                  ${realTimeDifference >= 0 ? "+" : ""}
                  {Math.abs(realTimeDifference).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {realTimeDifference > 0
                    ? "💚 Sobrante"
                    : realTimeDifference < 0
                      ? "❌ Faltante"
                      : "✅ Exacto"}
                </p>
              </div>
            )}
          </div>

          {/* Botón de finalizar */}
          <button
            onClick={handleFinalizeAndSave}
            disabled={isSaving || countedCash === ""}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg text-base sm:text-lg transition-colors shadow-md"
          >
            {isSaving ? "Guardando..." : "✓ Finalizar y Guardar Cierre de Caja"}
          </button>
        </div>
      )}

      {/* VISTA DEL REPORTE GUARDADO */}
      {!loading && savedReport && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-start mb-6 print:mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                Cierre de Caja -{" "}
                {new Date(date + "T00:00:00").toLocaleDateString("es-AR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <p className="text-sm text-green-600 font-medium mt-1">
                ✓ Cierre finalizado y guardado
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm border-2 border-gray-300 dark:border-slate-600 hover:border-blue-500 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-md transition-colors print:hidden"
            >
              <FaPrint /> Imprimir
            </button>
          </div>

          <div className="border-t-2 my-4"></div>

          {/* Resumen del reporte guardado */}
          <div className="space-y-4">
            {/* Resumen general */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 font-medium">
                  Total Ventas
                </p>
                <p className="text-xl font-bold text-blue-700">
                  ${savedReport.totalSales.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-blue-500">
                  {savedReport.transactionCount} transacciones
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-600 font-medium">
                  Efectivo Total
                </p>
                <p className="text-xl font-bold text-green-700">
                  ${savedReport.cashSales.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-purple-600 font-medium">
                  Fondo Inicial
                </p>
                <p className="text-xl font-bold text-purple-700">
                  ${savedReport.startingFloat.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-xs text-orange-600 font-medium">
                  Cuenta Corriente
                </p>
                <p className="text-xl font-bold text-orange-700">
                  ${savedReport.deliverySales.pending.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Ventas de Mostrador */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-700">
              <h3 className="font-semibold text-blue-800 mb-3">
                🏪 Ventas de Mostrador
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="bg-white dark:bg-slate-900 p-3 rounded shadow-sm">
                  <span className="text-xs text-gray-600 dark:text-slate-300">Total:</span>
                  <p className="text-lg font-bold text-blue-700">
                    ${savedReport.counterSales.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded shadow-sm">
                  <span className="text-xs text-gray-600 dark:text-slate-300">Efectivo:</span>
                  <p className="text-lg font-bold text-green-700">
                    ${savedReport.counterSales.cash.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded shadow-sm">
                  <span className="text-xs text-gray-600 dark:text-slate-300">Ventas:</span>
                  <p className="text-lg font-bold">
                    {savedReport.counterSales.count}
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded shadow-sm">
                <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-2">
                  Métodos de Pago:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(savedReport.counterSales.breakdown).map(
                    ([method, amount]: [string, any]) => (
                      <div
                        key={method}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-gray-600 dark:text-slate-300">{method}:</span>
                        <span className="font-medium">
                          ${amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Entregas de Reparto */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-2 border-green-300 dark:border-green-700">
              <h3 className="font-semibold text-green-800 mb-3">
                🚚 Entregas de Reparto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 p-3 rounded shadow-sm">
                  <span className="text-xs text-gray-600 dark:text-slate-300">
                    Total Entregado:
                  </span>
                  <p className="text-lg font-bold text-green-700">
                    ${savedReport.deliverySales.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded shadow-sm">
                  <span className="text-xs text-gray-600 dark:text-slate-300">Efectivo:</span>
                  <p className="text-lg font-bold text-green-700">
                    ${savedReport.deliverySales.cashReceived.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded shadow-sm">
                  <span className="text-xs text-gray-600 dark:text-slate-300">
                    Cuenta Corriente:
                  </span>
                  <p className="text-lg font-bold text-orange-600">
                    ${savedReport.deliverySales.pending.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded shadow-sm">
                  <span className="text-xs text-gray-600 dark:text-slate-300">Entregas:</span>
                  <p className="text-lg font-bold">
                    {savedReport.deliverySales.count}
                  </p>
                </div>
              </div>
            </div>

            {/* Arqueo de Efectivo */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-gray-700 dark:text-slate-200 mb-4">
                💰 Arqueo de Efectivo
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-300">Fondo Inicial:</span>
                  <span className="font-medium text-green-600">
                    + ${savedReport.startingFloat.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-300">Efectivo Mostrador:</span>
                  <span className="font-medium text-green-600">
                    + ${savedReport.counterSales.cash.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-300">Efectivo Entregas:</span>
                  <span className="font-medium text-green-600">
                    + ${savedReport.deliverySales.cashReceived.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-300">Gastos y Retiros:</span>
                  <span className="font-medium text-red-600">
                    - ${savedReport.totalExpenses.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Efectivo Esperado:</span>
                  <span>${savedReport.expectedCash.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Efectivo Contado:</span>
                  <span>${savedReport.countedCash.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <hr className="my-2 border-t-2" />
                <div className="flex justify-between text-xl font-bold">
                  <span>Diferencia:</span>
                  <span
                    className={
                      savedReport.difference >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {savedReport.difference >= 0 ? "+" : ""}
                    {savedReport.difference.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
