"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  FaTimes,
  FaPercentage,
  FaDollarSign,
  FaCalculator,
  FaSave,
  FaExclamationTriangle,
  FaArrowUp,
  FaArrowDown,
  FaLayerGroup,
  FaTag,
} from "react-icons/fa";
import toast from "react-hot-toast";

interface CategoryBrandPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "category" | "brand";
  entityId: number;
  entityName: string;
  onSuccess: () => void;
}

type Product = {
  id: string;
  name: string;
  sku: string | null;
  cost_price: number | null;
  price_minorista: number;
  price_mayorista: number;
};

type AdjustMode = "percentage" | "fixed" | "cost_margin" | "exact";
type TargetPrices = "both" | "minorista" | "mayorista" | "cost" | "all";

export default function CategoryBrandPriceModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  onSuccess,
}: CategoryBrandPriceModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  // Adjustment config
  const [adjustMode, setAdjustMode] = useState<AdjustMode>("percentage");
  const [value, setValue] = useState<string>("");
  const [targetPrices, setTargetPrices] = useState<TargetPrices>("both");

  useEffect(() => {
    if (isOpen && entityId) {
      fetchProducts();
    }
  }, [isOpen, entityId, entityType]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const column = entityType === "category" ? "category_id" : "brand_id";
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, cost_price, price_minorista, price_mayorista")
        .eq(column, entityId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error("Error al cargar productos para cambio de precio:", err);
      toast.error("Error al cargar productos de la categoría/marca");
    } finally {
      setLoading(false);
    }
  };

  // Helper calculation for preview
  const calculateNewPrice = (
    currentPrice: number,
    costPrice: number,
    field: "cost" | "minorista" | "mayorista"
  ): number => {
    const numericValue = parseFloat(value) || 0;
    if (!value || isNaN(numericValue)) return currentPrice;

    switch (adjustMode) {
      case "percentage": {
        const factor = 1 + numericValue / 100;
        return Math.max(0, Math.round(currentPrice * factor * 100) / 100);
      }
      case "fixed": {
        return Math.max(0, Math.round((currentPrice + numericValue) * 100) / 100);
      }
      case "cost_margin": {
        // Apply margin on cost_price
        const baseCost = costPrice || 0;
        if (field === "cost") return baseCost;
        const factor = 1 + numericValue / 100;
        return Math.max(0, Math.round(baseCost * factor * 100) / 100);
      }
      case "exact": {
        return Math.max(0, numericValue);
      }
      default:
        return currentPrice;
    }
  };

  const shouldUpdateField = (field: "cost" | "minorista" | "mayorista") => {
    if (targetPrices === "all") return true;
    if (targetPrices === "both" && (field === "minorista" || field === "mayorista")) return true;
    if (targetPrices === field) return true;
    return false;
  };

  const handleApplyPriceChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || isNaN(parseFloat(value))) {
      toast.error("Ingrese un valor numérico válido");
      return;
    }

    if (products.length === 0) {
      toast.error("No hay productos en esta clasificación para modificar");
      return;
    }

    setExecuting(true);
    const toastId = toast.loading(`Actualizando precios de ${products.length} productos...`);

    try {
      const updates = products.map((product) => {
        const updatePayload: any = {};

        if (shouldUpdateField("cost")) {
          updatePayload.cost_price = calculateNewPrice(
            product.cost_price || 0,
            product.cost_price || 0,
            "cost"
          );
        }

        if (shouldUpdateField("minorista")) {
          updatePayload.price_minorista = calculateNewPrice(
            product.price_minorista || 0,
            product.cost_price || 0,
            "minorista"
          );
        }

        if (shouldUpdateField("mayorista")) {
          updatePayload.price_mayorista = calculateNewPrice(
            product.price_mayorista || 0,
            product.cost_price || 0,
            "mayorista"
          );
        }

        return supabase.from("products").update(updatePayload).eq("id", product.id);
      });

      await Promise.all(updates);

      toast.success(`Se actualizaron ${products.length} productos en ${entityName}`, {
        id: toastId,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error aplicando precios masivos:", err);
      toast.error("Error al actualizar precios: " + err.message, { id: toastId });
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-white ${entityType === 'category' ? 'bg-purple-600' : 'bg-blue-600'}`}>
              {entityType === 'category' ? <FaLayerGroup size={20} /> : <FaTag size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Ajustar Precios de {entityType === "category" ? "Categoría" : "Marca"}:{" "}
                <span className="text-purple-600 dark:text-purple-400">{entityName}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aplica variaciones masivas por porcentaje, monto fijo o margen de ganancia.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleApplyPriceChanges} className="flex-1 overflow-hidden flex flex-col p-6 space-y-5">
          
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            
            {/* Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Método de Ajuste
              </label>
              <select
                value={adjustMode}
                onChange={(e) => setAdjustMode(e.target.value as AdjustMode)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="percentage">Porcentaje (%) (+10 o -5)</option>
                <option value="fixed">Monto Fijo ($) (+500 o -200)</option>
                <option value="cost_margin">Margen sobre Costo (% sobre Costo)</option>
                <option value="exact">Fijar Precio Exacto ($)</option>
              </select>
            </div>

            {/* Target Prices */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Precios a Modificar
              </label>
              <select
                value={targetPrices}
                onChange={(e) => setTargetPrices(e.target.value as TargetPrices)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="both">Minorista y Mayorista</option>
                <option value="minorista">Solo Minorista</option>
                <option value="mayorista">Solo Mayorista</option>
                <option value="cost">Solo Costo</option>
                <option value="all">Todos (Costo, Minorista y Mayorista)</option>
              </select>
            </div>

            {/* Value Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Valor del Cambio
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={
                    adjustMode === "percentage" || adjustMode === "cost_margin"
                      ? "Ej: 15 (para +15%)"
                      : "Ej: 500 (para +$500)"
                  }
                  className="w-full pl-3.5 pr-8 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {adjustMode === "percentage" || adjustMode === "cost_margin" ? "%" : "$"}
                </span>
              </div>
            </div>

          </div>

          {/* Live Preview Table */}
          <div className="flex-1 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FaCalculator className="text-purple-600" /> Previsualización en Tiempo Real ({products.length} productos)
              </span>
              <span className="text-[10px] text-slate-400">
                Los cambios se guardan al confirmar.
              </span>
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Cargando productos...</div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No hay productos asignados a esta {entityType === 'category' ? 'categoría' : 'marca'}.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-3">Producto</th>
                      {shouldUpdateField("cost") && <th className="p-3 text-right">P. Costo</th>}
                      {shouldUpdateField("minorista") && <th className="p-3 text-right">P. Minorista</th>}
                      {shouldUpdateField("mayorista") && <th className="p-3 text-right">P. Mayorista</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {products.map((p) => {
                      const newCost = calculateNewPrice(p.cost_price || 0, p.cost_price || 0, "cost");
                      const newMin = calculateNewPrice(p.price_minorista || 0, p.cost_price || 0, "minorista");
                      const newMay = calculateNewPrice(p.price_mayorista || 0, p.cost_price || 0, "mayorista");

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                            {p.name}
                          </td>

                          {shouldUpdateField("cost") && (
                            <td className="p-3 text-right">
                              <span className="text-slate-400 line-through mr-1 font-mono">${p.cost_price || 0}</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">${newCost}</span>
                            </td>
                          )}

                          {shouldUpdateField("minorista") && (
                            <td className="p-3 text-right">
                              <span className="text-slate-400 line-through mr-1 font-mono">${p.price_minorista}</span>
                              <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">${newMin}</span>
                            </td>
                          )}

                          {shouldUpdateField("mayorista") && (
                            <td className="p-3 text-right">
                              <span className="text-slate-400 line-through mr-1 font-mono">${p.price_mayorista}</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">${newMay}</span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs">
              <FaExclamationTriangle />
              <span>Esta acción actualizará de forma permanente los precios en la base de datos.</span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={executing || !value || products.length === 0}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-2"
              >
                {executing ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <FaSave /> Confirmar y Aplicar Cambio
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
