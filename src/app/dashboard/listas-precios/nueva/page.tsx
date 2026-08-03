"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaFileInvoiceDollar,
  FaUserCheck,
  FaSearch,
  FaPlus,
  FaTrashAlt,
  FaPercentage,
  FaUndo,
  FaCheck,
  FaCalendarAlt,
  FaBoxOpen,
} from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

interface Customer {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  customer_type?: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  price_minorista: number;
  price_mayorista: number;
  stock: number;
}

interface SelectedItem {
  product: Product;
  custom_price_minorista: number;
  custom_price_mayorista: number;
}

export default function NewPriceListPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [status, setStatus] = useState<"activa" | "borrador">("activa");
  const [validUntil, setValidUntil] = useState<string>("");
  const [description, setDescription] = useState("");

  // Customers & Products Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Modals & Searches
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [adjustmentPercent, setAdjustmentPercent] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          supabase.from("customers").select("id, full_name, phone, email, customer_type").eq("is_active", true).order("full_name"),
          supabase.from("products").select("id, sku, name, price_minorista, price_mayorista, stock").eq("is_active", true).order("name"),
        ]);

        if (custRes.data) setCustomers(custRes.data);
        if (prodRes.data) setAllProducts(prodRes.data);
      } catch (err) {
        console.error("Error cargando datos iniciales:", err);
        toast.error("Error al cargar clientes o productos");
      }
    };

    fetchData();
  }, []);

  const handleAddProduct = (prod: Product) => {
    if (selectedItems.some((item) => item.product.id === prod.id)) {
      toast.error("El producto ya se encuentra en la lista");
      return;
    }

    setSelectedItems((prev) => [
      ...prev,
      {
        product: prod,
        custom_price_minorista: prod.price_minorista || 0,
        custom_price_mayorista: prod.price_mayorista || 0,
      },
    ]);
    toast.success(`"${prod.name}" agregado a la lista`);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handlePriceChange = (
    productId: string,
    field: "custom_price_minorista" | "custom_price_mayorista",
    val: string
  ) => {
    const num = parseFloat(val) || 0;
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, [field]: num }
          : item
      )
    );
  };

  const applyPercentageAdjustment = (target: "minorista" | "mayorista" | "both") => {
    const percent = parseFloat(adjustmentPercent);
    if (isNaN(percent)) {
      toast.error("Ingresa un porcentaje válido");
      return;
    }

    setSelectedItems((prev) =>
      prev.map((item) => {
        let updatedMin = item.custom_price_minorista;
        let updatedMay = item.custom_price_mayorista;

        if (target === "minorista" || target === "both") {
          const base = item.product.price_minorista || 0;
          updatedMin = Math.round(base * (1 + percent / 100) * 100) / 100;
        }
        if (target === "mayorista" || target === "both") {
          const base = item.product.price_mayorista || 0;
          updatedMay = Math.round(base * (1 + percent / 100) * 100) / 100;
        }

        return {
          ...item,
          custom_price_minorista: updatedMin,
          custom_price_mayorista: updatedMay,
        };
      })
    );

    toast.success(`Ajuste del ${percent}% aplicado`);
  };

  const resetAllPrices = () => {
    setSelectedItems((prev) =>
      prev.map((item) => ({
        ...item,
        custom_price_minorista: item.product.price_minorista || 0,
        custom_price_mayorista: item.product.price_mayorista || 0,
      }))
    );
    setAdjustmentPercent("");
    toast.success("Precios restablecidos al valor base");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre de la lista de precios es obligatorio");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Debes agregar al menos un producto a la lista de precios");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Guardando lista de precios...");

    try {
      // 1. Insert Price List
      const { data: priceListData, error: priceListError } = await supabase
        .from("price_lists")
        .insert([
          {
            name: name.trim(),
            customer_id: customerId || null,
            status,
            valid_until: validUntil ? new Date(validUntil).toISOString() : null,
            description: description.trim() || null,
          },
        ])
        .select()
        .single();

      if (priceListError) throw priceListError;

      // 2. Insert Price List Items
      const itemsToInsert = selectedItems.map((item) => ({
        price_list_id: priceListData.id,
        product_id: item.product.id,
        custom_price_minorista: item.custom_price_minorista,
        custom_price_mayorista: item.custom_price_mayorista,
      }));

      const { error: itemsError } = await supabase
        .from("price_list_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success("¡Lista de precios creada con éxito!", { id: toastId });
      router.push("/dashboard/listas-precios");
    } catch (error: any) {
      console.error("Error al crear lista de precios:", error);
      toast.error(error.message || "Error al guardar la lista de precios", {
        id: toastId,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredModalProducts = allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Back button & Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/listas-precios"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors mb-3 group"
        >
          <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          Volver a Listas de Precios
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 shadow-3xs">
            <FaFileInvoiceDollar className="w-6 h-6" />
          </span>
          Nueva Lista de Precios
        </h1>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: Configuración General */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-3xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            1. Información General de la Lista
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nombre de la Lista */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nombre de la Lista / Propuesta *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Lista Especial Verano 2026 - Distribuidores"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Cliente Asociado */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Cliente Asociado (Opcional)
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">General (Disponible para cualquier cliente)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.customer_type || "minorista"})
                  </option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
              >
                <option value="activa">Activa</option>
                <option value="borrador">Borrador</option>
              </select>
            </div>

            {/* Válida hasta */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Fecha de Validez (Opcional)
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Notas / Observaciones
              </label>
              <input
                type="text"
                placeholder="Ej: Condiciones especiales de pago a 30 días"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Matriz de Productos y Precios */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-3xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                2. Productos y Precios Personalizados ({selectedItems.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Modifica los precios para esta propuesta sin afectar los costos del inventario base.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowProductModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-3xs transition-all"
            >
              <FaPlus /> Agregar Productos
            </button>
          </div>

          {/* Quick Adjustment Toolbar */}
          {selectedItems.length > 0 && (
            <div className="p-4 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/60 rounded-xl mb-6 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
                <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FaPercentage className="text-indigo-500" /> Ajuste Masivo:
                </span>
                <input
                  type="number"
                  placeholder="Ej: 15"
                  value={adjustmentPercent}
                  onChange={(e) => setAdjustmentPercent(e.target.value)}
                  className="w-16 px-2 py-1 text-center border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50"
                />
                <span className="font-bold text-slate-400">%</span>

                <button
                  type="button"
                  onClick={() => applyPercentageAdjustment("both")}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-lg border border-indigo-200/50 dark:border-indigo-900/40 text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                  Aplicar Ambos
                </button>
                <button
                  type="button"
                  onClick={() => applyPercentageAdjustment("minorista")}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg border border-blue-200/50 dark:border-blue-900/40 text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                  Solo Minorista
                </button>
                <button
                  type="button"
                  onClick={() => applyPercentageAdjustment("mayorista")}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded-lg border border-amber-200/50 dark:border-amber-900/40 text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                  Solo Mayorista
                </button>
              </div>

              <button
                type="button"
                onClick={resetAllPrices}
                className="p-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-2xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
              >
                <FaUndo /> Restablecer Base
              </button>
            </div>
          )}

          {/* Selected Products Table */}
          {selectedItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <FaBoxOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Aún no has seleccionado productos
              </p>
              <p className="text-[11px] text-slate-400 mt-1 mb-4">
                Haz clic en "Agregar Productos" para elegir del inventario.
              </p>
              <button
                type="button"
                onClick={() => setShowProductModal(true)}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl text-xs font-bold transition-colors"
              >
                Buscar en Inventario
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-950/40 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 text-right">P. Base Minorista</th>
                    <th className="px-4 py-3 w-[180px]">P. Custom Minorista</th>
                    <th className="px-4 py-3 text-right">P. Base Mayorista</th>
                    <th className="px-4 py-3 w-[180px]">P. Custom Mayorista</th>
                    <th className="px-4 py-3 text-center">Quitar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {selectedItems.map((item) => {
                    const isMinDiff =
                      item.custom_price_minorista !== item.product.price_minorista;
                    const isMayDiff =
                      item.custom_price_mayorista !== item.product.price_mayorista;

                    return (
                      <tr
                        key={item.product.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-400 font-bold">
                          {item.product.sku}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                          {item.product.name}
                        </td>

                        {/* Base Minorista */}
                        <td className="px-4 py-3 text-right text-slate-400">
                          ${item.product.price_minorista.toLocaleString("es-AR")}
                        </td>

                        {/* Custom Minorista Input */}
                        <td className="px-4 py-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs font-bold">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.custom_price_minorista}
                              onChange={(e) =>
                                handlePriceChange(
                                  item.product.id,
                                  "custom_price_minorista",
                                  e.target.value
                                )
                              }
                              className={`w-full pl-6 pr-2 py-1.5 border rounded-lg text-xs font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none ${
                                isMinDiff
                                  ? "border-blue-500 ring-1 ring-blue-500/30"
                                  : "border-slate-200 dark:border-slate-750"
                              }`}
                            />
                          </div>
                        </td>

                        {/* Base Mayorista */}
                        <td className="px-4 py-3 text-right text-slate-400">
                          ${item.product.price_mayorista.toLocaleString("es-AR")}
                        </td>

                        {/* Custom Mayorista Input */}
                        <td className="px-4 py-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs font-bold">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.custom_price_mayorista}
                              onChange={(e) =>
                                handlePriceChange(
                                  item.product.id,
                                  "custom_price_mayorista",
                                  e.target.value
                                )
                              }
                              className={`w-full pl-6 pr-2 py-1.5 border rounded-lg text-xs font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none ${
                                isMayDiff
                                  ? "border-amber-500 ring-1 ring-amber-500/30"
                                  : "border-slate-200 dark:border-slate-750"
                              }`}
                            />
                          </div>
                        </td>

                        {/* Delete Button */}
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(item.product.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <FaTrashAlt />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/dashboard/listas-precios"
            className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <FaCheck />
            {isSaving ? "Guardando..." : "Guardar Lista de Precios"}
          </button>
        </div>
      </form>

      {/* MODAL DE SELECCIÓN DE PRODUCTOS */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowProductModal(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Seleccionar Productos del Inventario
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-750 rounded-xl text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Products List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredModalProducts.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">
                  No se encontraron productos
                </p>
              ) : (
                filteredModalProducts.map((p) => {
                  const isAlreadySelected = selectedItems.some(
                    (item) => item.product.id === p.id
                  );
                  return (
                    <div
                      key={p.id}
                      className="p-3 border border-slate-100 dark:border-slate-800/80 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div>
                        <span className="font-mono text-[10px] font-bold text-indigo-500 mr-2">
                          {p.sku}
                        </span>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                          {p.name}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          P. Minorista: ${p.price_minorista} | P. Mayorista: $
                          {p.price_mayorista}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isAlreadySelected}
                        onClick={() => handleAddProduct(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isAlreadySelected
                            ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                      >
                        {isAlreadySelected ? "Agregado" : "+ Agregar"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
