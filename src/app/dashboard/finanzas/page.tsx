"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import {
    FaMoneyBillWave,
    FaShoppingCart,
    FaWallet,
    FaChartLine,
    FaPlus,
    FaCalendarAlt
} from "react-icons/fa";
import ExpensesTable from "./components/ExpensesTable";
import ExpenseModal from "./components/ExpenseModal";

export default function FinancesPage() {
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [summary, setSummary] = useState({
        income: 0,
        cost: 0,
        expenses: 0,
        profit: 0,
        incomeReparto: 0,
        incomeDesk: 0
    });
    const [debugError, setDebugError] = useState<string | null>(null);

    // States for Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);

    // Fecha filtro (default: mes actual)
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        fetchData();
    }, [selectedMonth]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [year, month] = selectedMonth.split('-');
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();

            const startOfMonth = `${selectedMonth}-01`;
            const endOfMonth = `${selectedMonth}-${lastDay}`;

            // Supabase/Postgres needs ISO strings for timestamp comparison if column is timestamptz
            const startDate = new Date(`${startOfMonth}T00:00:00`).toISOString();
            const endDate = new Date(`${endOfMonth}T23:59:59.999`).toISOString();

            // 1. Fetch Expenses
            const { data: expensesData, error: expensesError } = await supabase
                .from("expenses")
                .select("*")
                .gte("date", startOfMonth)
                .lte("date", endOfMonth)
                .order("date", { ascending: false });

            if (expensesError) throw expensesError;
            setExpenses(expensesData || []);

            // 2. Fetch Orders (Reparto)
            const { data: ordersData, error: ordersError } = await supabase
                .from("orders")
                .select(`
          total_amount,
          status,
          order_items (
            quantity,
            product:products (
              cost_price
            )
          )
        `)
                .gte("created_at", startDate)
                .lte("created_at", endDate)
                .neq("status", "cancelado");

            if (ordersError) throw ordersError;

            // 3. Fetch Sales (Mostrador)
            const { data: deskSalesData, error: deskSalesError } = await supabase
                .from("sales")
                .select(`
          total_amount,
          is_cancelled,
          sale_items (
            quantity,
            product:products (
              cost_price
            )
          )
        `)
                .gte("created_at", startDate)
                .lte("created_at", endDate)
                .eq("is_cancelled", false); // Solo no canceladas

            // NOTA: Si sale error de "column is_cancelled does not exist", verificar nombre exacto.
            // Si sale error de permiso, ejecutar policy para sales.
            if (deskSalesError) {
                console.error("Error fetching desk sales:", deskSalesError);
                // No lanzamos error fatal para que siga mostrando lo de reparto al menos
                toast.error("Error al cargar ventas de mostrador");
            }

            let incomeReparto = 0;
            let incomeDesk = 0;
            let cost = 0;

            // Sum Orders (Reparto)
            ordersData?.forEach((order: any) => {
                incomeReparto += order.total_amount || 0;
                order.order_items?.forEach((item: any) => {
                    const itemCost = item.product?.cost_price || 0;
                    cost += itemCost * item.quantity;
                });
            });

            // Sum Desk Sales (Mostrador)
            if (deskSalesData) {
                deskSalesData.forEach((sale: any) => {
                    incomeDesk += sale.total_amount || 0;
                    sale.sale_items?.forEach((item: any) => {
                        const itemCost = item.product?.cost_price || 0;
                        cost += itemCost * item.quantity;
                    });
                });
            }

            const totalExpenses = expensesData?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
            const totalIncome = incomeReparto + incomeDesk;

            setSummary({
                income: totalIncome,
                incomeReparto,
                incomeDesk,
                cost,
                expenses: totalExpenses,
                profit: totalIncome - cost - totalExpenses
            });

        } catch (error: any) {
            const errorMsg = error.message || JSON.stringify(error);
            setDebugError(errorMsg);
            console.error("Error fetching finance data:", JSON.stringify(error, null, 2));
            console.error("Error Message:", error.message);
            console.error("Error Details:", error.details);
            console.error("Error Hint:", error.hint);
            // Solo mostramos toast si no es error de "tabla no existe" (que pasará al inicio)
            if (!error.message?.includes("relation")) {
                toast.error("Error al cargar datos financieros");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSaveExpense = async (expense: any) => {
        setSaving(true);
        try {
            if (expense.id) {
                // Update
                const { error } = await supabase
                    .from("expenses")
                    .update({
                        description: expense.description,
                        amount: expense.amount,
                        category: expense.category,
                        date: expense.date,
                    })
                    .eq("id", expense.id);
                if (error) throw error;
                toast.success("Gasto actualizado");
            } else {
                // Create
                const { error } = await supabase
                    .from("expenses")
                    .insert([{
                        description: expense.description,
                        amount: expense.amount,
                        category: expense.category,
                        date: expense.date,
                        // user_id se asigna auto en supabase si RLS usa auth.uid(), 
                        // pero si necesitamos explicito:
                        // user_id: (await supabase.auth.getUser()).data.user?.id
                    }]);
                if (error) throw error;
                toast.success("Gasto registrado");
            }

            setIsModalOpen(false);
            setEditingExpense(null);
            fetchData(); // Reload
        } catch (error: any) {
            console.error(error);
            toast.error("Error al guardar gasto: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este gasto?")) return;
        try {
            const { error } = await supabase.from("expenses").delete().eq("id", id);
            if (error) throw error;
            toast.success("Gasto eliminado");
            fetchData();
        } catch (error: any) {
            toast.error("Error al eliminar");
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0
        }).format(amount);
    };    return (
        <div className="space-y-8 text-slate-800 dark:text-slate-100 p-1 md:p-4">
            {/* ALERT: Error Debugging */}
            {debugError && (
                <div className="bg-rose-500/10 dark:bg-rose-950/20 border-2 border-rose-500/35 p-5 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                    <h3 className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        ⚠️ Alerta del Sistema Financiero
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Se detectó una discrepancia al realizar las consultas paralelas:</p>
                    <pre className="mt-2.5 text-xs bg-slate-900 text-slate-200 p-3.5 rounded-xl overflow-auto whitespace-pre-wrap font-mono">
                        {debugError}
                    </pre>
                </div>
            )}

            {summary.income === 0 && summary.cost === 0 && expenses.length === 0 && !debugError && (
                <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-2xl text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    <p className="font-semibold">Buscando registros operativos en la base de datos... Si los saldos se mantienen en cero, verifique las credenciales de Supabase.</p>
                </div>
            )}

            {/* Cabecera con Segmented Input de Fecha */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <FaMoneyBillWave className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            Finanzas
                        </h1>
                        <p className="text-xs md:text-sm font-medium text-slate-550 dark:text-slate-400 mt-0.5">
                            Control operativo mensual, utilidades netas y egresos de caja
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-250/40 dark:border-slate-800/60 relative z-10 shadow-inner">
                    <FaCalendarAlt className="text-slate-450 dark:text-slate-500 w-3.5 h-3.5 ml-1" />
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase"
                    />
                </div>
            </div>

            {/* Malla de Tarjetas de Saldos (Summary Cards Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. INGRESOS */}
                <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                            <FaMoneyBillWave className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md uppercase tracking-wider">
                            + Ventas
                        </span>
                    </div>
                    <div>
                        <p className="text-2xs font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Ingresos Consolidados</p>
                        <h3 className="text-2xl font-black text-slate-950 dark:text-white mt-1">
                            {formatCurrency(summary.income)}
                        </h3>
                        {/* Desglose */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-850 text-2xs text-slate-500 dark:text-slate-450 flex flex-col gap-1.5 font-bold">
                            <div className="flex justify-between">
                                <span>Reparto:</span>
                                <span className="text-slate-800 dark:text-slate-200">{formatCurrency(summary.incomeReparto)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Mostrador:</span>
                                <span className="text-slate-800 dark:text-slate-200">{formatCurrency(summary.incomeDesk)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. COSTO MERCADERIA */}
                <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                            <FaShoppingCart className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md uppercase tracking-wider">
                            - Mercadería
                        </span>
                    </div>
                    <div>
                        <p className="text-2xs font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Costo de Ventas (FOB)</p>
                        <h3 className="text-2xl font-black text-slate-950 dark:text-white mt-1">
                            {formatCurrency(summary.cost)}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Inversión en stock entregado</p>
                    </div>
                </div>

                {/* 3. GASTOS REGISTRADOS */}
                <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-rose-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-rose-500/10 dark:bg-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-450 group-hover:scale-110 transition-transform duration-300">
                            <FaWallet className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-450 rounded-md uppercase tracking-wider">
                            - Operativos
                        </span>
                    </div>
                    <div>
                        <p className="text-2xs font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Gastos de Caja</p>
                        <h3 className="text-2xl font-black text-slate-950 dark:text-white mt-1">
                            {formatCurrency(summary.expenses)}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Caja chica, alquileres y servicios</p>
                    </div>
                </div>

                {/* 4. UTILIDAD NETA */}
                <div className={`p-6 rounded-3xl shadow-xs border relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300
                    ${summary.profit >= 0
                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 border-indigo-500 text-white'
                        : 'bg-gradient-to-br from-rose-600 to-rose-850 border-rose-500 text-white'
                    }`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                            <FaChartLine className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-white/20 rounded-md uppercase tracking-wider">
                            = Neto
                        </span>
                    </div>
                    <div>
                        <p className="text-2xs font-extrabold text-white/80 uppercase tracking-wider">Balance Operativo Neto</p>
                        <h3 className="text-2xl font-black text-white mt-1">
                            {formatCurrency(summary.profit)}
                        </h3>
                        <p className="text-[10px] text-white/70 mt-2 font-medium">Margen neto deducidos costos y gastos</p>
                    </div>

                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
                </div>
            </div>

            {/* Listado de Gastos Registrados */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <FaWallet className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Registro de Egresos</h3>
                            <p className="text-xs text-slate-450 dark:text-slate-400">Listado y edición de egresos del período</p>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => {
                            setEditingExpense(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-indigo-500/10"
                    >
                        <FaPlus className="w-3 h-3" /> Nuevo Gasto
                    </button>
                </div>

                <ExpensesTable
                    expenses={expenses}
                    loading={loading}
                    onEdit={(expense) => {
                        setEditingExpense(expense);
                        setIsModalOpen(true);
                    }}
                    onDelete={handleDeleteExpense}
                />
            </div>

            <ExpenseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveExpense}
                initialData={editingExpense}
                saving={saving}
            />
        </div>
    );
}
