"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  FaTimes,
  FaSave,
  FaPercentage,
  FaExclamationTriangle,
} from "react-icons/fa";
import toast from "react-hot-toast";

interface MassUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Supplier = {
  id: string;
  name: string;
};

type Category = {
  id: number;
  name: string;
};

export default function MassUpdateModal({
  isOpen,
  onClose,
  onSuccess,
}: MassUpdateModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [percentage, setPercentage] = useState("");
  const [priceType, setPriceType] = useState<
    "minorista" | "mayorista" | "both"
  >("both");
  const [loading, setLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const fetchFilters = async () => {
    try {
      const { data: suppliersData } = await supabase
        .from("brands")
        .select("id, name")
        .order("name");

      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (suppliersData) setSuppliers(suppliersData);
      if (categoriesData) setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching filters:", error);
    }
  };

  const calculateAffectedProducts = async () => {
    try {
      let query = supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      if (selectedSupplier) {
        query = query.eq("brand_id", selectedSupplier);
      }

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      }

      const { count } = await query;
      setPreviewCount(count || 0);
    } catch (error) {
      console.error("Error calculating affected products:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFilters();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      calculateAffectedProducts();
    }
  }, [selectedSupplier, selectedCategory, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!percentage) {
      toast.error("Ingrese un porcentaje");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Actualizando precios...");

    try {
      let query = supabase
        .from("products")
        .select("id, price_minorista, price_mayorista")
        .eq("is_active", true);

      if (selectedSupplier) query = query.eq("brand_id", selectedSupplier);
      if (selectedCategory) query = query.eq("category_id", selectedCategory);

      const { data: productsToUpdate, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      if (!productsToUpdate || productsToUpdate.length === 0) {
        toast.error("No hay productos para actualizar", { id: toastId });
        setLoading(false);
        return;
      }

      const factor = 1 + parseFloat(percentage) / 100;

      const updates = productsToUpdate.map((product) => {
        const updates: any = {};

        if (priceType === "minorista" || priceType === "both") {
          updates.price_minorista =
            Math.round((product.price_minorista || 0) * factor * 100) / 100;
        }

        if (priceType === "mayorista" || priceType === "both") {
          updates.price_mayorista =
            Math.round((product.price_mayorista || 0) * factor * 100) / 100;
        }

        return supabase.from("products").update(updates).eq("id", product.id);
      });

      await Promise.all(updates);

      toast.success(`Se actualizaron ${productsToUpdate.length} productos`, {
        id: toastId,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating prices:", error);
      toast.error("Error al actualizar: " + error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <FaPercentage className="text-indigo-600" /> Ajustar Precios por Lote
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-650 dark:hover:text-white transition-colors"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Warning */}
          <div className="bg-amber-50/60 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/40 p-4 rounded-xl">
            <div className="flex items-start gap-2.5">
              <FaExclamationTriangle className="text-amber-550 mt-0.5 w-4 h-4 flex-shrink-0" />
              <div>
                <p className="text-xs text-amber-800 dark:text-amber-400 font-bold">¡Atención!</p>
                <p className="text-[10px] text-amber-700 dark:text-amber-500 mt-1 leading-relaxed">
                  Esta acción modificará los precios permanentemente en la base de datos para todos los productos que cumplan las condiciones. Asegúrese de aplicar los filtros correctos antes de continuar.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Filtro Marca/Proveedor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                Marca / Proveedor
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 text-slate-750 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Todas las marcas</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Categoría */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                Categoría
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 text-slate-750 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Porcentaje */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-355 mb-1.5">
                Porcentaje de Variación
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  className="w-full pl-3.5 pr-7 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-slate-50/50 dark:bg-slate-950 placeholder:text-slate-400"
                  placeholder="Ej: 15 o -5"
                  step="0.01"
                />
                <span className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-450 dark:text-slate-500 font-bold text-xs">
                  %
                </span>
              </div>
            </div>

            {/* Tipo de Precio */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                Precios a Modificar
              </label>
              <select
                value={priceType}
                onChange={(e) => setPriceType(e.target.value as any)}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 text-slate-750 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="both">Ambos Precios</option>
                <option value="minorista">Solo Minorista</option>
                <option value="mayorista">Solo Mayorista</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border text-center">
            <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500 block uppercase tracking-wider">Productos a modificar</span>
            <p className="text-2xl font-black text-indigo-600 mt-1">
              {previewCount !== null ? previewCount : "..."}
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !percentage || previewCount === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-755 disabled:bg-slate-150 disabled:text-slate-400 disabled:dark:bg-slate-805 text-white text-xs font-extrabold rounded-xl shadow-sm transition-colors"
            >
              {loading ? (
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <FaSave className="w-3.5 h-3.5" /> Aplicar Variación
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
