"use client";

import { useState, useEffect, useMemo } from "react";
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
  FaSearch,
  FaChevronDown,
  FaChevronUp,
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

  // Search & Mobile Responsive UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfigMobile, setShowConfigMobile] = useState(true);

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
      setSearchQuery("");
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

  // Filtered products based on search term
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  const isAllFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedProductIds.includes(p.id));

  const toggleSelectAll = () => {
    if (filteredProducts.length === 0) return;
    const filteredIds = filteredProducts.map((p) => p.id);

    if (isAllFilteredSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
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

  const productsToUpdate = useMemo(() => {
    return products.filter(
      (product) =>
        selectedProductIds.includes(product.id) ||
        manualOverrides[product.id] !== undefined
    );
  }, [products, selectedProductIds, manualOverrides]);

  const handleApplyPriceChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productsToUpdate.length === 0) {
      toast.error("Seleccione al menos un producto para actualizar o modifique un precio manualmente.");
      return;
    }

    setExecuting(true);
    const toastId = toast.loading(`Actualizando precios de productos en ${entityName}...`);

    try {
      const updates = productsToUpdate.map((product) => {
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
      <FaLayerGroup size={18} />
    ) : entityType === "brand" ? (
      <FaTag size={18} />
    ) : (
      <FaTruck size={18} />
    );

  const entityBg =
    entityType === "category"
      ? "bg-purple-600"
      : entityType === "brand"
      ? "bg-blue-600"
      : "bg-emerald-600";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[88dvh] sm:h-[90vh] max-h-[88dvh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
            <div className={`p-2 sm:p-2.5 rounded-xl text-white shrink-0 ${entityBg}`}>
              {entityIcon}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
                Ajustar Precios de {entityType === "category" ? "Categoría" : entityType === "brand" ? "Marca" : "Proveedor"}:{" "}
                <span className="text-purple-600 dark:text-purple-400 font-extrabold">{entityName}</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Selecciona productos, edita individuales o aplica variaciones masivas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all shrink-0"
            aria-label="Cerrar modal"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleApplyPriceChanges} className="flex-1 min-h-0 overflow-hidden flex flex-col p-3 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
          
          {/* Controls Panel */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 transition-all">
            {/* Mobile collapsible header */}
            <div className="flex items-center justify-between sm:hidden">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FaCalculator className="text-purple-600" /> Parámetros de Ajuste
              </span>
              <button
                type="button"
                onClick={() => setShowConfigMobile((prev) => !prev)}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 py-0.5 px-1.5 rounded"
              >
                {showConfigMobile ? (
                  <>
                    <span>Ocultar</span>
                    <FaChevronUp size={10} />
                  </>
                ) : (
                  <>
                    <span>Modificar</span>
                    <FaChevronDown size={10} />
                  </>
                )}
              </button>
            </div>

            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mt-2 sm:mt-0 ${!showConfigMobile ? "hidden sm:grid" : "grid"}`}>
              {/* Mode */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Método de Ajuste
                </label>
                <select
                  value={adjustMode}
                  onChange={(e) => setAdjustMode(e.target.value as AdjustMode)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500 transition-all truncate"
                >
                  <option value="percentage">Porcentaje (%) (+10 o -5)</option>
                  <option value="fixed">Monto Fijo ($) (+500 o -200)</option>
                  <option value="cost_margin">Margen sobre Costo (% s/Costo)</option>
                  <option value="exact">Fijar Precio Exacto ($)</option>
                </select>
              </div>

              {/* Target Prices */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Precios a Modificar
                </label>
                <select
                  value={targetPrices}
                  onChange={(e) => setTargetPrices(e.target.value as TargetPrices)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500 transition-all truncate"
                >
                  <option value="both">Minorista y Mayorista</option>
                  <option value="minorista">Solo Minorista</option>
                  <option value="mayorista">Solo Mayorista</option>
                  <option value="cost">Solo Costo</option>
                  <option value="all">Todos (Costo, Min. y May.)</option>
                </select>
              </div>

              {/* Value Input */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                    className="w-full pl-3 pr-7 py-1.5 sm:pl-3.5 sm:pr-8 sm:py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    {adjustMode === "percentage" || adjustMode === "cost_margin" ? "%" : "$"}
                  </span>
                </div>
              </div>

              {/* Rounding Mode */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Regla de Redondeo
                </label>
                <select
                  value={roundingMode}
                  onChange={(e) => setRoundingMode(e.target.value as RoundingMode)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 outline-none focus:ring-2 focus:ring-purple-500 transition-all truncate"
                >
                  <option value="ceil_integer">Redondear al entero (Ej: $8901)</option>
                  <option value="ceil_10">Redondear a $10 sup. (Ej: $8950)</option>
                  <option value="ceil_50">Redondear a $50 sup. (Ej: $8950)</option>
                  <option value="ceil_100">Redondear a $100 sup. (Ej: $9000)</option>
                  <option value="exact_cents">Mantener decimales exactos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Live Preview & Individual Override Box */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
            {/* Top Bar: Select all + Search box */}
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 shrink-0">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-purple-600 font-bold text-xs flex items-center gap-1.5 hover:underline whitespace-nowrap"
                >
                  {isAllFilteredSelected ? (
                    <>
                      <FaCheckSquare size={15} /> Desmarcar visibles
                    </>
                  ) : (
                    <>
                      <FaSquare size={15} className="text-slate-400" /> Marcar visibles ({selectedProductIds.length}/{products.length})
                    </>
                  )}
                </button>

                {searchQuery && (
                  <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
                    ({filteredProducts.length} de {products.length})
                  </span>
                )}
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-7 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Borrar búsqueda"
                  >
                    <FaTimes size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* List / Table Area */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-500 text-xs">Cargando productos...</div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No hay productos para modificar en esta {entityType === 'category' ? 'categoría' : entityType === 'brand' ? 'marca' : 'proveedor'}.
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No se encontraron productos que coincidan con "{searchQuery}".
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="block mx-auto mt-2 text-purple-600 font-bold hover:underline"
                  >
                    Mostrar todos
                  </button>
                </div>
              ) : (
                <>
                  {/* MOBILE CARDS VIEW (< md) */}
                  <div className="md:hidden p-2.5 space-y-2.5">
                    {filteredProducts.map((p) => {
                      const isSelected = selectedProductIds.includes(p.id);
                      const newCost = calculateNewPrice(p, "cost");
                      const newMin = calculateNewPrice(p, "minorista");
                      const newMay = calculateNewPrice(p, "mayorista");

                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isSelected
                              ? "bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-900/50 shadow-sm"
                              : "bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800/80 opacity-60"
                          }`}
                        >
                          {/* Header of card: Checkbox + Name + SKU */}
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => toggleSelectProduct(p.id)}
                              className="mt-0.5 text-purple-600 shrink-0"
                              aria-label={`Seleccionar ${p.name}`}
                            >
                              {isSelected ? (
                                <FaCheckSquare size={17} />
                              ) : (
                                <FaSquare size={17} className="text-slate-300 dark:text-slate-700" />
                              )}
                            </button>
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => toggleSelectProduct(p.id)}
                            >
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                                {p.name}
                              </h4>
                              <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                                SKU: {p.sku || "N/A"}
                              </span>
                            </div>
                          </div>

                          {/* Price rows */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                            {shouldUpdateField("cost") && (
                              <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950/80 p-1.5 px-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                <span className="text-[11px] font-semibold text-slate-500">P. Costo</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-slate-400 line-through font-mono">
                                    ${(p.cost_price || 0).toLocaleString("es-AR")}
                                  </span>
                                  <span className="text-slate-400 text-xs">→</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={newCost}
                                    onChange={(e) => handleManualPriceChange(p.id, "cost", e.target.value)}
                                    className="w-24 px-2 py-1 text-right border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-purple-500"
                                  />
                                </div>
                              </div>
                            )}

                            {shouldUpdateField("minorista") && (
                              <div className="flex items-center justify-between gap-2 bg-purple-50/60 dark:bg-purple-950/20 p-1.5 px-2.5 rounded-lg border border-purple-100 dark:border-purple-900/30">
                                <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">P. Minorista</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-slate-400 line-through font-mono">
                                    ${(p.price_minorista || 0).toLocaleString("es-AR")}
                                  </span>
                                  <span className="text-purple-400 text-xs">→</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={newMin}
                                    onChange={(e) => handleManualPriceChange(p.id, "minorista", e.target.value)}
                                    className="w-24 px-2 py-1 text-right border border-purple-200 dark:border-purple-800 rounded bg-white dark:bg-slate-900 font-bold text-xs text-purple-600 dark:text-purple-400 outline-none focus:ring-1 focus:ring-purple-500"
                                  />
                                </div>
                              </div>
                            )}

                            {shouldUpdateField("mayorista") && (
                              <div className="flex items-center justify-between gap-2 bg-blue-50/60 dark:bg-blue-950/20 p-1.5 px-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">P. Mayorista</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-slate-400 line-through font-mono">
                                    ${(p.price_mayorista || 0).toLocaleString("es-AR")}
                                  </span>
                                  <span className="text-blue-400 text-xs">→</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={newMay}
                                    onChange={(e) => handleManualPriceChange(p.id, "mayorista", e.target.value)}
                                    className="w-24 px-2 py-1 text-right border border-blue-200 dark:border-blue-800 rounded bg-white dark:bg-slate-900 font-bold text-xs text-blue-600 dark:text-blue-400 outline-none focus:ring-1 focus:ring-purple-500"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP TABLE VIEW (>= md) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[550px]">
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
                        {filteredProducts.map((p) => {
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
                                  aria-label={`Seleccionar ${p.name}`}
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
                                <td className="p-3 text-right whitespace-nowrap">
                                  <span className="text-slate-400 line-through mr-1 font-mono text-[11px]">
                                    ${(p.cost_price || 0).toLocaleString("es-AR")}
                                  </span>
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
                                <td className="p-3 text-right whitespace-nowrap">
                                  <span className="text-slate-400 line-through mr-1 font-mono text-[11px]">
                                    ${(p.price_minorista || 0).toLocaleString("es-AR")}
                                  </span>
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
                                <td className="p-3 text-right whitespace-nowrap">
                                  <span className="text-slate-400 line-through mr-1 font-mono text-[11px]">
                                    ${(p.price_mayorista || 0).toLocaleString("es-AR")}
                                  </span>
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
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pt-2 shrink-0 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[11px] sm:text-xs font-medium">
              <FaExclamationTriangle className="shrink-0" />
              <span className="line-clamp-2 sm:line-clamp-none">
                Se modificarán únicamente los {productsToUpdate.length} producto(s) marcados o editados manualmente.
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 justify-end shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={executing || productsToUpdate.length === 0}
                className="flex-1 sm:flex-initial px-4 sm:px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {executing ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <FaSave /> Confirmar y Aplicar ({productsToUpdate.length})
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
