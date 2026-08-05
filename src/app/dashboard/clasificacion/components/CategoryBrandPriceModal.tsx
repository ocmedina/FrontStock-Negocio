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
  FaLayerGroup,
  FaTag,
  FaTruck,
  FaCheckSquare,
  FaSquare,
  FaEdit,
} from "react-icons/fa";
import toast from "react-hot-toast";

interface CategoryBrandPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "category" | "brand" | "supplier";
  entityId: number | string;
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
type RoundingMode = "ceil_integer" | "ceil_10" | "ceil_50" | "ceil_100" | "exact_cents";

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
  const [roundingMode, setRoundingMode] = useState<RoundingMode>("ceil_integer");

  // Selection & Manual Overrides
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [manualOverrides, setManualOverrides] = useState<{
    [id: string]: { cost?: number; minorista?: number; mayorista?: number };
  }>({});

  useEffect(() => {
    if (isOpen && entityId) {
      fetchProducts();
    }
  }, [isOpen, entityId, entityType]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let brandIds: number[] = [];

      if (entityType === "supplier") {
        // Fetch all brand IDs belonging to this supplier
        const { data: bData } = await supabase
          .from("brands")
          .select("id")
          .eq("supplier_id", entityId as string);

        brandIds = (bData || []).map((b) => b.id);
      }

      let allProducts: Product[] = [];
      let from = 0;
      const step = 300;

      while (true) {
        let query = supabase
          .from("products")
          .select("id, name, sku, cost_price, price_minorista, price_mayorista");

        if (entityType === "category") {
          query = query.eq("category_id", entityId as number);
        } else if (entityType === "brand") {
          query = query.eq("brand_id", entityId as number);
        } else if (entityType === "supplier") {
          if (brandIds.length === 0) break; // No brands assigned to this supplier
          query = query.in("brand_id", brandIds);
        }

        const { data, error } = await query
          .order("name")
          .range(from, from + step - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allProducts = [...allProducts, ...data];
        if (data.length < step) break;
        from += step;
      }

      setProducts(allProducts);
      // Select all by default
      setSelectedProductIds(allProducts.map((p) => p.id));
      setManualOverrides({});
    } catch (err: any) {
      console.error("Error al cargar productos para cambio de precio:", err);
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to apply rounding
  const applyRounding = (val: number, mode: RoundingMode): number => {
    if (val <= 0) return 0;
    switch (mode) {
      case "ceil_integer":
        return Math.ceil(val);
      case "ceil_10":
        return Math.ceil(val / 10) * 10;
      case "ceil_50":
        return Math.ceil(val / 50) * 50;
      case "ceil_100":
        return Math.ceil(val / 100) * 100;
      case "exact_cents":
        return Math.round(val * 100) / 100;
      default:
        return Math.ceil(val);
    }
  };

  // Calculation for preview
  const calculateNewPrice = (
    product: Product,
    field: "cost" | "minorista" | "mayorista"
  ): number => {
    const isSelected = selectedProductIds.includes(product.id);
    const currentPrice =
      field === "cost"
        ? product.cost_price || 0
        : field === "minorista"
        ? product.price_minorista || 0
        : product.price_mayorista || 0;

    // Check for manual override first
    if (manualOverrides[product.id]?.[field] !== undefined) {
      return manualOverrides[product.id]![field]!;
    }

    // If product is unselected, keep current price
    if (!isSelected) {
      return currentPrice;
    }

    const numericValue = parseFloat(value) || 0;
    if (!value || isNaN(numericValue)) return currentPrice;

    let rawPrice = currentPrice;

    switch (adjustMode) {
      case "percentage": {
        const factor = 1 + numericValue / 100;
        rawPrice = currentPrice * factor;
        break;
      }
      case "fixed": {
        rawPrice = currentPrice + numericValue;
        break;
      }
      case "cost_margin": {
        const baseCost = product.cost_price || 0;
        if (field === "cost") return baseCost;
        const factor = 1 + numericValue / 100;
        rawPrice = baseCost * factor;
        break;
      }
      case "exact": {
        return Math.max(0, numericValue);
      }
      default:
        rawPrice = currentPrice;
    }

    return applyRounding(Math.max(0, rawPrice), roundingMode);
  };

  const shouldUpdateField = (field: "cost" | "minorista" | "mayorista") => {
    if (targetPrices === "all") return true;
    if (targetPrices === "both" && (field === "minorista" || field === "mayorista")) return true;
    if (targetPrices === field) return true;
    return false;
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleManualPriceChange = (
    productId: string,
    field: "cost" | "minorista" | "mayorista",
    val: string
  ) => {
    const num = parseFloat(val);
    setManualOverrides((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: isNaN(num) ? undefined : num,
      },
    }));
  };

  const handleApplyPriceChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductIds.length === 0 && Object.keys(manualOverrides).length === 0) {
      toast.error("Seleccione al menos un producto para actualizar o modifique un precio manualmente.");
      return;
    }

    setExecuting(true);
    const toastId = toast.loading(`Actualizando precios de productos en ${entityName}...`);

    try {
      const updates = products
        .filter(
          (product) =>
            selectedProductIds.includes(product.id) ||
            manualOverrides[product.id] !== undefined
        )
        .map((product) => {
          const updatePayload: any = {};

          if (shouldUpdateField("cost")) {
            updatePayload.cost_price = calculateNewPrice(product, "cost");
          }

          if (shouldUpdateField("minorista")) {
            updatePayload.price_minorista = calculateNewPrice(product, "minorista");
          }

          if (shouldUpdateField("mayorista")) {
            updatePayload.price_mayorista = calculateNewPrice(product, "mayorista");
          }

          return supabase.from("products").update(updatePayload).eq("id", product.id);
        });

      await Promise.all(updates);

      toast.success(`Se actualizaron los precios en ${entityName}`, {
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

  const entityIcon =
    entityType === "category" ? (
      <FaLayerGroup size={20} />
    ) : entityType === "brand" ? (
      <FaTag size={20} />
    ) : (
      <FaTruck size={20} />
    );

  const entityBg =
    entityType === "category"
      ? "bg-purple-600"
      : entityType === "brand"
      ? "bg-blue-600"
      : "bg-emerald-600";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-white ${entityBg}`}>
              {entityIcon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Ajustar Precios de {entityType === "category" ? "Categoría" : entityType === "brand" ? "Marca" : "Proveedor"}:{" "}
                <span className="text-purple-600 dark:text-purple-400">{entityName}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecciona qué productos aumentan, edita precios individuales o aplica variaciones masivas.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            
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

            {/* Rounding Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Regla de Redondeo
              </label>
              <select
                value={roundingMode}
                onChange={(e) => setRoundingMode(e.target.value as RoundingMode)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ceil_integer">Redondear al entero (Ej: $8901)</option>
                <option value="ceil_10">Redondear a $10 sup. (Ej: $8950)</option>
                <option value="ceil_50">Redondear a $50 sup. (Ej: $8950)</option>
                <option value="ceil_100">Redondear a $100 sup. (Ej: $9000)</option>
                <option value="exact_cents">Mantener decimales exactos</option>
              </select>
            </div>

          </div>

          {/* Live Preview & Individual Override Table */}
          <div className="flex-1 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-purple-600 font-bold text-xs flex items-center gap-1.5 hover:underline"
                >
                  {selectedProductIds.length === products.length ? (
                    <>
                      <FaCheckSquare size={15} /> Desmarcar todos
                    </>
                  ) : (
                    <>
                      <FaSquare size={15} className="text-slate-400" /> Seleccionar todos ({selectedProductIds.length}/{products.length})
                    </>
                  )}
                </button>
              </div>

              <span className="text-[10px] text-slate-400">
                Usa las casillas para aumentar en lote o ingresa valores manuales en la tabla.
              </span>
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Cargando productos...</div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No hay productos para modificar en esta {entityType === 'category' ? 'categoría' : entityType === 'brand' ? 'marca' : 'proveedor'}.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-10 text-center">Incluir</th>
                      <th className="p-3">Producto</th>
                      {shouldUpdateField("cost") && <th className="p-3 text-right">P. Costo ($)</th>}
                      {shouldUpdateField("minorista") && <th className="p-3 text-right">P. Minorista ($)</th>}
                      {shouldUpdateField("mayorista") && <th className="p-3 text-right">P. Mayorista ($)</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {products.map((p) => {
                      const isSelected = selectedProductIds.includes(p.id);
                      const newCost = calculateNewPrice(p, "cost");
                      const newMin = calculateNewPrice(p, "minorista");
                      const newMay = calculateNewPrice(p, "mayorista");

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            !isSelected ? "opacity-60 bg-slate-50/50 dark:bg-slate-950/20" : ""
                          }`}
                        >
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectProduct(p.id)}
                              className="text-purple-600"
                            >
                              {isSelected ? (
                                <FaCheckSquare size={16} />
                              ) : (
                                <FaSquare size={16} className="text-slate-300 dark:text-slate-700" />
                              )}
                            </button>
                          </td>

                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                            {p.name}
                            <span className="block text-[10px] text-slate-400 font-mono">
                              SKU: {p.sku || "N/A"}
                            </span>
                          </td>

                          {shouldUpdateField("cost") && (
                            <td className="p-3 text-right">
                              <span className="text-slate-400 line-through mr-1 font-mono">${(p.cost_price || 0).toLocaleString("es-AR")}</span>
                              <input
                                type="number"
                                step="any"
                                value={newCost}
                                onChange={(e) => handleManualPriceChange(p.id, "cost", e.target.value)}
                                className="w-24 px-2 py-1 text-right border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-950 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </td>
                          )}

                          {shouldUpdateField("minorista") && (
                            <td className="p-3 text-right">
                              <span className="text-slate-400 line-through mr-1 font-mono">${(p.price_minorista || 0).toLocaleString("es-AR")}</span>
                              <input
                                type="number"
                                step="any"
                                value={newMin}
                                onChange={(e) => handleManualPriceChange(p.id, "minorista", e.target.value)}
                                className="w-24 px-2 py-1 text-right border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-950 font-bold text-xs text-purple-600 dark:text-purple-400 outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </td>
                          )}

                          {shouldUpdateField("mayorista") && (
                            <td className="p-3 text-right">
                              <span className="text-slate-400 line-through mr-1 font-mono">${(p.price_mayorista || 0).toLocaleString("es-AR")}</span>
                              <input
                                type="number"
                                step="any"
                                value={newMay}
                                onChange={(e) => handleManualPriceChange(p.id, "mayorista", e.target.value)}
                                className="w-24 px-2 py-1 text-right border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-950 font-bold text-xs text-blue-600 dark:text-blue-400 outline-none focus:ring-1 focus:ring-purple-500"
                              />
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
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium">
              <FaExclamationTriangle />
              <span>
                Se modificarán únicamente los {selectedProductIds.length} producto(s) marcados o editados manualmente.
              </span>
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
                disabled={executing || (selectedProductIds.length === 0 && Object.keys(manualOverrides).length === 0)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-2"
              >
                {executing ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <FaSave /> Confirmar y Aplicar Cambio ({selectedProductIds.length})
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
