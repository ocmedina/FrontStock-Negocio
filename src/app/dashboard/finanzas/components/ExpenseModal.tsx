"use client";

import { useState, useEffect } from "react";
import { FaTimes, FaSave } from "react-icons/fa";

interface Expense {
    id?: string;
    description: string;
    amount: number;
    category: string;
    date: string;
}

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (expense: Expense) => void;
    initialData?: Expense | null;
    saving: boolean;
}

const CATEGORIES = [
    "Fijo (Alquiler, Luz, Internet)",
    "Variable (Insumos, Mantenimiento)",
    "Sueldos",
    "Impuestos",
    "Marketing",
    "Transporte / Logística",
    "Otro",
];

export default function ExpenseModal({ isOpen, onClose, onSave, initialData, saving }: ExpenseModalProps) {
    const [formData, setFormData] = useState<Expense>({
        description: "",
        amount: 0,
        category: CATEGORIES[0],
        date: new Date().toISOString().split("T")[0],
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                description: "",
                amount: 0,
                category: CATEGORIES[0],
                date: new Date().toISOString().split("T")[0],
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-250">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200/50 dark:border-slate-800/80">
                
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {initialData ? "Editar Gasto Operativo" : "Registrar Nuevo Gasto"}
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors"
                    >
                        <FaTimes className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    
                    {/* Descripcion */}
                    <div>
                        <label className="block text-2xs font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Descripción
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-semibold transition-all"
                            placeholder="Ej: Pago de Luz y Gas sucursal"
                        />
                    </div>

                    {/* Monto */}
                    <div>
                        <label className="block text-2xs font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Monto del Egreso
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-3 text-slate-450 dark:text-slate-500 text-sm font-bold">$</span>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={formData.amount || ""}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                className="w-full pl-8 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-black transition-all"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Categoria */}
                    <div>
                        <label className="block text-2xs font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Categoría
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-semibold transition-all"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Fecha */}
                    <div>
                        <label className="block text-2xs font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Fecha de Registro
                        </label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-semibold transition-all"
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/10 transition-all hover:scale-[1.02]"
                        >
                            {saving ? (
                                <>
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <>
                                    <FaSave />
                                    <span>Guardar Gasto</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
