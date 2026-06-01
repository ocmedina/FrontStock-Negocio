"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FaTrash, FaEdit, FaExclamationCircle } from "react-icons/fa";

interface Expense {
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
}

interface ExpensesTableProps {
    expenses: Expense[];
    onDelete: (id: string) => void;
    onEdit: (expense: Expense) => void;
    loading: boolean;
}

export default function ExpensesTable({ expenses, onDelete, onEdit, loading }: ExpensesTableProps) {
    if (loading) {
        return (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 animate-pulse flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-slate-350 border-t-indigo-650 animate-spin"></div>
                <p className="text-xs font-semibold">Cargando listado de gastos...</p>
            </div>
        );
    }

    if (expenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl m-6">
                <FaExclamationCircle className="text-3xl mb-3 opacity-60 text-slate-450" />
                <p className="text-sm font-semibold">No hay gastos registrados en este período.</p>
                <p className="text-xs text-slate-450 mt-1">Utiliza el botón superior para agregar un egreso operativo.</p>
            </div>
        );
    }
    return (
        <div>
            {/* Vista de Escritorio */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50/70 dark:bg-slate-900/60 text-slate-550 dark:text-slate-400 uppercase tracking-widest font-black text-[10px] border-b border-slate-100 dark:border-slate-800/80">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Descripción</th>
                            <th className="px-6 py-4">Categoría</th>
                            <th className="px-6 py-4 text-right">Monto</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-855">
                        {expenses.map((expense) => (
                            <tr
                                key={expense.id}
                                className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {format(new Date(expense.date + "T12:00:00"), "dd/MM/yyyy", { locale: es })}
                                </td>
                                <td className="px-6 py-4 text-slate-900 dark:text-white font-semibold">
                                    {expense.description}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-2xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700">
                                        {expense.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-slate-955 dark:text-white text-sm">
                                    {new Intl.NumberFormat("es-AR", {
                                        style: "currency",
                                        currency: "ARS",
                                        maximumFractionDigits: 0
                                    }).format(expense.amount)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="inline-flex items-center gap-1.5 justify-end">
                                        <button
                                            onClick={() => onEdit(expense)}
                                            className="group relative overflow-hidden rounded-lg border border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-slate-900 p-1 shadow-3xs hover:shadow-2xs hover:scale-[1.02] transition-all flex items-center gap-1.5 text-left w-[100px]"
                                        >
                                            <div className="absolute -right-6 -top-6 h-10 w-10 rounded-full bg-indigo-50/50 dark:bg-indigo-950/20" />
                                            <span className="relative flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-3xs flex-shrink-0 text-[9px]">
                                                <FaEdit />
                                            </span>
                                            <div className="relative">
                                                <p className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 leading-none">
                                                    Editar
                                                </p>
                                                <p className="text-[7.5px] text-slate-450 dark:text-slate-500 mt-0.5 font-medium leading-none">
                                                    Modificar
                                                </p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => onDelete(expense.id)}
                                            className="group relative overflow-hidden rounded-lg border border-rose-100 dark:border-rose-900/40 bg-white dark:bg-slate-900 p-1 shadow-3xs hover:shadow-2xs hover:scale-[1.02] transition-all flex items-center gap-1.5 text-left w-[100px]"
                                        >
                                            <div className="absolute -right-6 -top-6 h-10 w-10 rounded-full bg-rose-50/50 dark:bg-rose-955/20" />
                                            <span className="relative flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-3xs flex-shrink-0 text-[9px]">
                                                <FaTrash />
                                            </span>
                                            <div className="relative">
                                                <p className="text-[9px] font-black text-rose-700 dark:text-rose-455 leading-none">
                                                    Borrar
                                                </p>
                                                <p className="text-[7.5px] text-slate-450 dark:text-slate-500 mt-0.5 font-medium leading-none">
                                                    Eliminar
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Vista de Móvil (Tarjetas) */}
            <div className="md:hidden space-y-4 p-4">
                {expenses.map((expense) => (
                    <div 
                        key={expense.id}
                        className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 shadow-3xs space-y-4"
                    >
                        <div className="flex justify-between items-start gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border">
                                {expense.category}
                            </span>
                            <span className="text-3xs font-extrabold text-slate-450 dark:text-slate-500">
                                {format(new Date(expense.date + "T12:00:00"), "dd MMM yyyy", { locale: es })}
                            </span>
                        </div>
                        
                        <div className="space-y-1">
                            <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                                {expense.description}
                            </p>
                            <p className="text-base font-black text-rose-600 dark:text-rose-400">
                                {new Intl.NumberFormat("es-AR", {
                                    style: "currency",
                                    currency: "ARS",
                                    maximumFractionDigits: 0
                                }).format(expense.amount)}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-850">
                            <button
                                onClick={() => onEdit(expense)}
                                className="flex-1 group relative overflow-hidden rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-slate-50/50 dark:bg-slate-950/20 p-2 shadow-3xs hover:shadow-2xs transition-all flex items-center justify-center gap-2 text-center"
                            >
                                <span className="relative flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-3xs text-[9px]">
                                    <FaEdit />
                                </span>
                                <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400">
                                    Editar
                                </span>
                            </button>
                            <button
                                onClick={() => onDelete(expense.id)}
                                className="flex-1 group relative overflow-hidden rounded-xl border border-rose-100 dark:border-rose-900/40 bg-slate-50/50 dark:bg-slate-950/20 p-2 shadow-3xs hover:shadow-2xs transition-all flex items-center justify-center gap-2 text-center"
                            >
                                <span className="relative flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-3xs text-[9px]">
                                    <FaTrash />
                                </span>
                                <span className="text-[10px] font-black text-rose-700 dark:text-rose-400">
                                    Borrar
                                </span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
