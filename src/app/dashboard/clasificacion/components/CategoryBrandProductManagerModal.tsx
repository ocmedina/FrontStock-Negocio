"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  FaTimes,
  FaSearch,
  FaPlus,
  FaTrash,
  FaSave,
  FaBoxOpen,
  FaCheckSquare,
  FaSquare,
  FaTag,
  FaLayerGroup,
  FaEdit,
  FaExchangeAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";

interface CategoryBrandProductManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "category" | "brand";
  entityId: number;
  entityName: string;
  onRefresh: () => void;
}

type Product = {
  id: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  cost_price: number | null;
  price_minorista: number;
  price_mayorista: number;
  stock: number;
  category_id: number | null;
  brand_id: number | null;
};

export default function CategoryBrandProductManagerModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  onRefresh,
}: CategoryBrandProductManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"assigned" | "unassigned">("assigned");
  const [assignedProducts, setAssignedProducts] = useState<Product[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Search terms
  const [searchAssigned, setSearchAssigned] = useState("");
  const [searchAvailable, setSearchAvailable] = useState("");
  const [onlyUnclassifiedFilter, setOnlyUnclassifiedFilter] = useState(false);

  // Selections
  const [selectedAssignedIds, setSelectedAssignedIds] = useState<string[]>([]);
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<string[]>([]);

  // Inline editing state for assigned products
  const [editingPrices, setEditingPrices] = useState<{
    [id: string]: { cost: string; minorista: string; mayorista: string };
  }>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchData();
    }
  }, [isOpen, entityId, entityType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const column = entityType === "category" ? "category_id" : "brand_id";

      // 1. Fetch assigned products
      const { data: assignedData, error: assignedErr } = await supabase
        .from("products")
        .select("id, sku, barcode, name, cost_price, price_minorista, price_mayorista, stock, category_id, brand_id")
        .eq(column, entityId)
        .eq("is_active", true)
        .order("name");

      if (assignedErr) throw assignedErr;
      setAssignedProducts(assignedData || []);

      // Initialize editing prices map
      const initialPrices: { [id: string]: { cost: string; minorista: string; mayorista: string } } = {};
      (assignedData || []).forEach((p) => {
        initialPrices[p.id] = {
          cost: (p.cost_price ?? 0).toString(),
          minorista: (p.price_minorista ?? 0).toString(),
          mayorista: (p.price_mayorista ?? 0).toString(),
        };
      });
      setEditingPrices(initialPrices);

      // 2. Fetch available products (products not in this category/brand)
      const { data: availData, error: availErr } = await supabase
        .from("products")
        .select("id, sku, barcode, name, cost_price, price_minorista, price_mayorista, stock, category_id, brand_id")
        .or(`${column}.is.null,${column}.neq.${entityId}`)
        .eq("is_active", true)
        .order("name")
        .limit(300);

      if (availErr) throw availErr;
      setAvailableProducts(availData || []);

      // Reset selections
      setSelectedAssignedIds([]);
      setSelectedAvailableIds([]);
    } catch (err: any) {
      console.error("Error cargando productos de clasificación:", err);
      toast.error("Error al obtener productos");
    } finally {
      setLoading(false);
    }
  };

  // Inline Price Saver
  const handleSaveProductPrices = async (product: Product) => {
    const editValues = editingPrices[product.id];
    if (!editValues) return;

    const newCost = parseFloat(editValues.cost) || 0;
    const newMinorista = parseFloat(editValues.minorista) || 0;
    const newMayorista = parseFloat(editValues.mayorista) || 0;

    setSavingProductId(product.id);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          cost_price: newCost,
          price_minorista: newMinorista,
          price_mayorista: newMayorista,
        })
        .eq("id", product.id);

      if (error) throw error;
      toast.success(`Precios actualizados para ${product.name}`);
      
      // Update local state
      setAssignedProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, cost_price: newCost, price_minorista: newMinorista, price_mayorista: newMayorista }
            : p
        )
      );
    } catch (err: any) {
      toast.error("Error al actualizar precio: " + err.message);
    } finally {
      setSavingProductId(null);
    }
  };

  // Unassign products from this category/brand
  const handleUnassignProducts = async (productIds: string[]) => {
    if (productIds.length === 0) return;
    const column = entityType === "category" ? "category_id" : "brand_id";

    const loadingToast = toast.loading(`Desvinculando ${productIds.length} producto(s)...`);
    try {
      const { error } = await supabase
        .from("products")
        .update({ [column]: null })
        .in("id", productIds);

      if (error) throw error;

      toast.success(`Producto(s) desvinculados correctamente`, { id: loadingToast });
      fetchData();
      onRefresh();
    } catch (err: any) {
      toast.error("Error al desvincular: " + err.message, { id: loadingToast });
    }
  };

  // Assign selected available products to this category/brand
  const handleAssignProducts = async () => {
    if (selectedAvailableIds.length === 0) {
      toast.error("Seleccione al menos un producto para asignar");
      return;
    }

    const column = entityType === "category" ? "category_id" : "brand_id";
    const loadingToast = toast.loading(`Asignando ${selectedAvailableIds.length} producto(s) a ${entityName}...`);

    try {
      const { error } = await supabase
        .from("products")
        .update({ [column]: entityId })
        .in("id", selectedAvailableIds);

      if (error) throw error;

      toast.success(`Se asignaron ${selectedAvailableIds.length} productos a ${entityName}`, { id: loadingToast });
      fetchData();
      onRefresh();
      setActiveTab("assigned");
    } catch (err: any) {
      toast.error("Error al asignar productos: " + err.message, { id: loadingToast });
    }
  };

  // Filtered lists
  const filteredAssigned = assignedProducts.filter((p) => {
    const query = searchAssigned.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );
  });

  const filteredAvailable = availableProducts.filter((p) => {
    const query = searchAvailable.toLowerCase();
    const matchesQuery =
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.barcode && p.barcode.toLowerCase().includes(query));

    if (!matchesQuery) return false;

    if (onlyUnclassifiedFilter) {
      const column = entityType === "category" ? p.category_id : p.brand_id;
      return column === null;
    }

    return true;
  });

  // Toggle selection helpers
  const toggleSelectAssigned = (id: string) => {
    setSelectedAssignedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllAssigned = () => {
    if (selectedAssignedIds.length === filteredAssigned.length) {
      setSelectedAssignedIds([]);
    } else {
      setSelectedAssignedIds(filteredAssigned.map((p) => p.id));
    }
  };

  const toggleSelectAvailable = (id: string) => {
    setSelectedAvailableIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllAvailable = () => {
    if (selectedAvailableIds.length === filteredAvailable.length) {
      setSelectedAvailableIds([]);
    } else {
      setSelectedAvailableIds(filteredAvailable.map((p) => p.id));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-white ${entityType === 'category' ? 'bg-purple-600' : 'bg-blue-600'}`}>
              {entityType === 'category' ? <FaLayerGroup size={20} /> : <FaTag size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Productos de {entityType === "category" ? "Categoría" : "Marca"}:{" "}
                <span className="text-purple-600 dark:text-purple-400">{entityName}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Administra, selecciona productos e ingresa precios directamente.
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

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-wrap gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("assigned")}
              className={`pb-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "assigned"
                  ? "border-purple-600 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <FaBoxOpen /> Productos Asignados ({assignedProducts.length})
            </button>
            <button
              onClick={() => setActiveTab("unassigned")}
              className={`pb-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "unassigned"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <FaPlus /> Meter / Seleccionar Productos
            </button>
          </div>

          {activeTab === "assigned" && selectedAssignedIds.length > 0 && (
            <button
              onClick={() => handleUnassignProducts(selectedAssignedIds)}
              className="mb-2 px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-1.5"
            >
              <FaTrash /> Desvincular ({selectedAssignedIds.length})
            </button>
          )}

          {activeTab === "unassigned" && selectedAvailableIds.length > 0 && (
            <button
              onClick={handleAssignProducts}
              className="mb-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition-all flex items-center gap-1.5"
            >
              <FaPlus /> Asignar Seleccionados ({selectedAvailableIds.length})
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col">
          
          {/* TAB 1: ASSIGNED PRODUCTS */}
          {activeTab === "assigned" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Search & Actions Bar */}
              <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                  <FaSearch className="absolute left-3 top.1/2 transform -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    value={searchAssigned}
                    onChange={(e) => setSearchAssigned(e.target.value)}
                    placeholder="Buscar producto por nombre, SKU o código..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Mostrando {filteredAssigned.length} de {assignedProducts.length} productos
                </span>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                {loading ? (
                  <div className="p-12 text-center text-slate-500">Cargando productos...</div>
                ) : filteredAssigned.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                    <FaBoxOpen className="mx-auto text-4xl mb-3 opacity-30" />
                    <p className="font-semibold text-sm">No hay productos asignados a esta {entityType === 'category' ? 'categoría' : 'marca'}.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Usa la pestaña <strong>"Meter / Seleccionar Productos"</strong> para agregar ítems.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <button onClick={toggleSelectAllAssigned} className="text-purple-600">
                            {selectedAssignedIds.length > 0 && selectedAssignedIds.length === filteredAssigned.length ? (
                              <FaCheckSquare size={16} />
                            ) : (
                              <FaSquare size={16} className="text-slate-300 dark:text-slate-700" />
                            )}
                          </button>
                        </th>
                        <th className="p-3">Producto / Código</th>
                        <th className="p-3 text-center">Stock</th>
                        <th className="p-3 text-right">P. Costo ($)</th>
                        <th className="p-3 text-right">P. Minorista ($)</th>
                        <th className="p-3 text-right">P. Mayorista ($)</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredAssigned.map((product) => {
                        const isSelected = selectedAssignedIds.includes(product.id);
                        const prices = editingPrices[product.id] || { cost: "0", minorista: "0", mayorista: "0" };

                        return (
                          <tr
                            key={product.id}
                            className={`hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors ${
                              isSelected ? "bg-purple-50/60 dark:bg-purple-950/40" : ""
                            }`}
                          >
                            <td className="p-3 text-center">
                              <button onClick={() => toggleSelectAssigned(product.id)} className="text-purple-600">
                                {isSelected ? (
                                  <FaCheckSquare size={16} />
                                ) : (
                                  <FaSquare size={16} className="text-slate-300 dark:text-slate-700" />
                                )}
                              </button>
                            </td>

                            <td className="p-3">
                              <div className="font-bold text-slate-800 dark:text-slate-100">{product.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                SKU: {product.sku || "N/A"} | Barra: {product.barcode || "N/A"}
                              </div>
                            </td>

                            <td className="p-3 text-center font-bold">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] ${
                                  product.stock > 0
                                    ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                                }`}
                              >
                                {product.stock} u.
                              </span>
                            </td>

                            <td className="p-3 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={prices.cost}
                                onChange={(e) =>
                                  setEditingPrices((prev) => ({
                                    ...prev,
                                    [product.id]: { ...prev[product.id], cost: e.target.value },
                                  }))
                                }
                                className="w-20 px-2 py-1 text-right border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-medium text-xs outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </td>

                            <td className="p-3 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={prices.minorista}
                                onChange={(e) =>
                                  setEditingPrices((prev) => ({
                                    ...prev,
                                    [product.id]: { ...prev[product.id], minorista: e.target.value },
                                  }))
                                }
                                className="w-24 px-2 py-1 text-right border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-bold text-xs outline-none focus:ring-1 focus:ring-purple-500 text-purple-600 dark:text-purple-400"
                              />
                            </td>

                            <td className="p-3 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={prices.mayorista}
                                onChange={(e) =>
                                  setEditingPrices((prev) => ({
                                    ...prev,
                                    [product.id]: { ...prev[product.id], mayorista: e.target.value },
                                  }))
                                }
                                className="w-24 px-2 py-1 text-right border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-bold text-xs outline-none focus:ring-1 focus:ring-purple-500 text-blue-600 dark:text-blue-400"
                              />
                            </td>

                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleSaveProductPrices(product)}
                                  disabled={savingProductId === product.id}
                                  className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40 rounded transition-colors"
                                  title="Guardar Precios"
                                >
                                  {savingProductId === product.id ? (
                                    <div className="animate-spin h-3.5 w-3.5 border-2 border-green-600 border-t-transparent rounded-full" />
                                  ) : (
                                    <FaSave size={15} />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleUnassignProducts([product.id])}
                                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                                  title="Desvincular"
                                >
                                  <FaTrash size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: UNASSIGNED / ADD PRODUCTS */}
          {activeTab === "unassigned" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Filter bar */}
              <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    value={searchAvailable}
                    onChange={(e) => setSearchAvailable(e.target.value)}
                    placeholder="Buscar productos para meter a esta clasificación..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyUnclassifiedFilter}
                    onChange={(e) => setOnlyUnclassifiedFilter(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Mostrar solo productos sin {entityType === "category" ? "categoría" : "marca"}
                </label>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                {loading ? (
                  <div className="p-12 text-center text-slate-500">Cargando productos disponibles...</div>
                ) : filteredAvailable.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                    No se encontraron productos disponibles para asignar.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <button onClick={toggleSelectAllAvailable} className="text-blue-600">
                            {selectedAvailableIds.length > 0 && selectedAvailableIds.length === filteredAvailable.length ? (
                              <FaCheckSquare size={16} />
                            ) : (
                              <FaSquare size={16} className="text-slate-300 dark:text-slate-700" />
                            )}
                          </button>
                        </th>
                        <th className="p-3">Producto</th>
                        <th className="p-3 text-right">P. Minorista</th>
                        <th className="p-3 text-right">P. Mayorista</th>
                        <th className="p-3 text-center">Stock</th>
                        <th className="p-3 text-center">Estado Actual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredAvailable.map((product) => {
                        const isSelected = selectedAvailableIds.includes(product.id);
                        const currentEntityId = entityType === "category" ? product.category_id : product.brand_id;

                        return (
                          <tr
                            key={product.id}
                            onClick={() => toggleSelectAvailable(product.id)}
                            className={`hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition-colors ${
                              isSelected ? "bg-blue-50/60 dark:bg-blue-950/40" : ""
                            }`}
                          >
                            <td className="p-3 text-center">
                              <span className="text-blue-600">
                                {isSelected ? (
                                  <FaCheckSquare size={16} />
                                ) : (
                                  <FaSquare size={16} className="text-slate-300 dark:text-slate-700" />
                                )}
                              </span>
                            </td>

                            <td className="p-3">
                              <div className="font-bold text-slate-800 dark:text-slate-100">{product.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                SKU: {product.sku || "N/A"}
                              </div>
                            </td>

                            <td className="p-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                              ${product.price_minorista?.toLocaleString("es-AR")}
                            </td>

                            <td className="p-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                              ${product.price_mayorista?.toLocaleString("es-AR")}
                            </td>

                            <td className="p-3 text-center font-bold text-slate-600 dark:text-slate-300">
                              {product.stock}
                            </td>

                            <td className="p-3 text-center">
                              {currentEntityId ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 font-medium">
                                  En otra {entityType === "category" ? "categoría" : "marca"}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 font-medium">
                                  Sin {entityType === "category" ? "categoría" : "marca"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
          <div className="text-xs text-slate-500 font-medium">
            Total en catálogo: {assignedProducts.length + availableProducts.length} productos
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>

            {activeTab === "unassigned" && (
              <button
                onClick={handleAssignProducts}
                disabled={selectedAvailableIds.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <FaPlus /> Asignar ({selectedAvailableIds.length}) a {entityName}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
