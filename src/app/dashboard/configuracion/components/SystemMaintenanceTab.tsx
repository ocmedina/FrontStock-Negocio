"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import {
  FaBroom,
  FaSearch,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTrashAlt,
  FaLayerGroup,
  FaTag,
  FaBoxes,
  FaBan,
  FaUsers,
  FaTruck,
  FaShieldAlt,
  FaSync,
  FaInfoCircle,
  FaTimes,
  FaLock,
} from "react-icons/fa";

type DiagnosticResult = {
  emptyCategories: { id: number; name: string }[];
  emptyBrands: { id: number; name: string }[];
  cancelledSales: { id: string; total_amount: number; created_at: string }[];
  unusedProducts: { id: string; name: string; sku: string }[];
  unusedCustomers: { id: string; full_name: string }[];
  unusedSuppliers: { id: string; name: string }[];
};

export default function SystemMaintenanceTab() {
  const [scanning, setScanning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult>({
    emptyCategories: [],
    emptyBrands: [],
    cancelledSales: [],
    unusedProducts: [],
    unusedCustomers: [],
    unusedSuppliers: [],
  });

  // Modal confirm state
  const [activeAction, setActiveAction] = useState<{
    type: "empty_categories_brands" | "cancelled_sales" | "unused_products" | "unused_contacts";
    title: string;
    description: string;
    itemCount: number;
  } | null>(null);

  const [confirmInput, setConfirmInput] = useState("");
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    runScanner();
  }, []);

  // 1. System Scanner Function
  const runScanner = async () => {
    setScanning(true);
    try {
      // A. Categories & Brands with 0 products
      const { data: allCategories } = await supabase.from("categories").select("id, name");
      const { data: allBrands } = await supabase.from("brands").select("id, name");

      // Fetch all product brand/category references
      let allProdRefs: { category_id: number | null; brand_id: number | null }[] = [];
      let from = 0;
      const step = 300;
      while (true) {
        const { data: chunk } = await supabase
          .from("products")
          .select("category_id, brand_id")
          .range(from, from + step - 1);
        if (!chunk || chunk.length === 0) break;
        allProdRefs = [...allProdRefs, ...chunk];
        if (chunk.length < step) break;
        from += step;
      }

      const usedCategoryIds = new Set(allProdRefs.map((p) => p.category_id).filter(Boolean));
      const usedBrandIds = new Set(allProdRefs.map((p) => p.brand_id).filter(Boolean));

      const emptyCategories = (allCategories || []).filter((c) => !usedCategoryIds.has(c.id));
      const emptyBrands = (allBrands || []).filter((b) => !usedBrandIds.has(b.id));

      // B. Cancelled sales
      const { data: cancelledSalesData } = await supabase
        .from("sales")
        .select("id, total_amount, created_at")
        .eq("is_cancelled", true)
        .order("created_at", { ascending: false });

      // C. Inactive / Unused Products (is_active = false or unused with 0 transactions)
      const { data: inactiveProducts } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("is_active", false);

      // Verify which inactive products have NO sales or order items
      const unusedProductsList: { id: string; name: string; sku: string }[] = [];
      if (inactiveProducts && inactiveProducts.length > 0) {
        const productIds = inactiveProducts.map((p) => p.id);

        const { data: salesRefs } = await supabase
          .from("sale_items")
          .select("product_id")
          .in("product_id", productIds);

        const usedProdIds = new Set((salesRefs || []).map((s) => s.product_id));

        inactiveProducts.forEach((p) => {
          if (!usedProdIds.has(p.id)) {
            unusedProductsList.push(p);
          }
        });
      }

      // D. Unused Customers (inactive with 0 debt and 0 sales)
      const { data: inactiveCustomers } = await supabase
        .from("customers")
        .select("id, full_name, debt")
        .eq("is_active", false)
        .eq("debt", 0);

      const unusedCustomersList: { id: string; full_name: string }[] = [];
      if (inactiveCustomers && inactiveCustomers.length > 0) {
        const custIds = inactiveCustomers.map((c) => c.id);
        const { data: custSales } = await supabase
          .from("sales")
          .select("customer_id")
          .in("customer_id", custIds);

        const usedCustIds = new Set((custSales || []).map((s) => s.customer_id));
        inactiveCustomers.forEach((c) => {
          if (!usedCustIds.has(c.id)) {
            unusedCustomersList.push({ id: c.id, full_name: c.full_name });
          }
        });
      }

      // E. Unused Suppliers (inactive with 0 debt and 0 purchases)
      const { data: inactiveSuppliers } = await supabase
        .from("suppliers")
        .select("id, name, debt")
        .eq("is_active", false)
        .eq("debt", 0);

      const unusedSuppliersList: { id: string; name: string }[] = [];
      if (inactiveSuppliers && inactiveSuppliers.length > 0) {
        const suppIds = inactiveSuppliers.map((s) => s.id);
        const { data: suppPurchases } = await supabase
          .from("purchases")
          .select("supplier_id")
          .in("supplier_id", suppIds);

        const usedSuppIds = new Set((suppPurchases || []).map((p) => p.supplier_id));
        inactiveSuppliers.forEach((s) => {
          if (!usedSuppIds.has(s.id)) {
            unusedSuppliersList.push({ id: s.id, name: s.name });
          }
        });
      }

      setDiagnostics({
        emptyCategories,
        emptyBrands,
        cancelledSales: cancelledSalesData || [],
        unusedProducts: unusedProductsList,
        unusedCustomers: unusedCustomersList,
        unusedSuppliers: unusedSuppliersList,
      });
    } catch (err: any) {
      console.error("Error al diagnosticar el sistema:", err);
      toast.error("Error al escanear la base de datos");
    } finally {
      setScanning(false);
    }
  };

  // 2. Action Handlers
  const executeCleanup = async () => {
    if (confirmInput.trim().toUpperCase() !== "CONFIRMAR") {
      toast.error("Por favor escriba CONFIRMAR para proceder");
      return;
    }

    if (!activeAction) return;

    setExecuting(true);
    const toastId = toast.loading("Ejecutando limpieza de forma segura...");

    try {
      if (activeAction.type === "empty_categories_brands") {
        const catIds = diagnostics.emptyCategories.map((c) => c.id);
        const brandIds = diagnostics.emptyBrands.map((b) => b.id);

        if (catIds.length > 0) {
          await supabase.from("categories").delete().in("id", catIds);
        }
        if (brandIds.length > 0) {
          await supabase.from("brands").delete().in("id", brandIds);
        }

        toast.success(
          `Se eliminaron ${catIds.length} categorías y ${brandIds.length} marcas vacías.`,
          { id: toastId }
        );
      } else if (activeAction.type === "cancelled_sales") {
        const saleIds = diagnostics.cancelledSales.map((s) => s.id);
        if (saleIds.length > 0) {
          // Delete items first for cascade
          await supabase.from("sale_items").delete().in("sale_id", saleIds);
          await supabase.from("sales").delete().in("id", saleIds);
        }
        toast.success(`Se purgaron ${saleIds.length} ventas anuladas.`, { id: toastId });
      } else if (activeAction.type === "unused_products") {
        const prodIds = diagnostics.unusedProducts.map((p) => p.id);
        if (prodIds.length > 0) {
          await supabase.from("products").delete().in("id", prodIds);
        }
        toast.success(`Se eliminaron ${prodIds.length} productos obsoletos sin movimiento.`, {
          id: toastId,
        });
      } else if (activeAction.type === "unused_contacts") {
        const custIds = diagnostics.unusedCustomers.map((c) => c.id);
        const suppIds = diagnostics.unusedSuppliers.map((s) => s.id);

        if (custIds.length > 0) {
          await supabase.from("customers").delete().in("id", custIds);
        }
        if (suppIds.length > 0) {
          await supabase.from("suppliers").delete().in("id", suppIds);
        }
        toast.success(
          `Se purgaron ${custIds.length} clientes y ${suppIds.length} proveedores inactivos en desuso.`,
          { id: toastId }
        );
      }

      setActiveAction(null);
      setConfirmInput("");
      runScanner();
    } catch (err: any) {
      console.error("Error al ejecutar limpieza:", err);
      toast.error("Error al limpiar datos: " + err.message, { id: toastId });
    } finally {
      setExecuting(false);
    }
  };

  const totalWasteCount =
    diagnostics.emptyCategories.length +
    diagnostics.emptyBrands.length +
    diagnostics.cancelledSales.length +
    diagnostics.unusedProducts.length +
    diagnostics.unusedCustomers.length +
    diagnostics.unusedSuppliers.length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Scanner Status */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-purple-600/30 border border-purple-500/40 rounded-2xl text-purple-400">
            <FaBroom size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              Limpieza y Mantenimiento del Sistema
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                <FaShieldAlt /> Protección Antierrores Activa
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Escanea y elimina datos huérfanos o basura de forma 100% segura. Ningún registro con historial comercial, financiero o balance activo será afectado.
            </p>
          </div>
        </div>

        <button
          onClick={runScanner}
          disabled={scanning}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 flex-shrink-0"
        >
          {scanning ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Escaneando Sistema...
            </>
          ) : (
            <>
              <FaSync /> Volver a Escanear
            </>
          )}
        </button>
      </div>

      {/* Safety Info Alert */}
      <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
        <FaInfoCircle className="text-amber-600 text-lg flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Garantía de Integridad del Sistema:</strong>
          <p className="mt-0.5 text-amber-700 dark:text-amber-400 leading-relaxed">
            Las herramientas a continuación verifican la relación con otras tablas (cascade check). Si un producto tiene ventas históricas, si un cliente posee saldo o si un movimiento está vinculado a caja, el sistema lo <strong>protegerá automáticamente</strong> impidiendo su borrado.
          </p>
        </div>
      </div>

      {/* Diagnostic Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Categorías / Marcas Vacías */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clasificación Vacía</span>
            <div className="p-2 bg-purple-100 dark:bg-purple-950/60 text-purple-600 rounded-lg">
              <FaLayerGroup size={16} />
            </div>
          </div>

          <div>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {diagnostics.emptyCategories.length + diagnostics.emptyBrands.length}
            </p>
            <p className="text-[11px] text-slate-400">
              {diagnostics.emptyCategories.length} cat. y {diagnostics.emptyBrands.length} marcas sin productos.
            </p>
          </div>

          <button
            onClick={() =>
              setActiveAction({
                type: "empty_categories_brands",
                title: "Limpiar Categorías y Marcas Vacías",
                description:
                  "Se eliminarán permanentemente las categorías y marcas creadas que no poseen ningún producto asignado en el inventario.",
                itemCount: diagnostics.emptyCategories.length + diagnostics.emptyBrands.length,
              })
            }
            disabled={diagnostics.emptyCategories.length + diagnostics.emptyBrands.length === 0}
            className="w-full py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 disabled:opacity-40 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <FaTrashAlt /> Depurar Vacíos
          </button>
        </div>

        {/* Ventas Anuladas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ventas Anuladas</span>
            <div className="p-2 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-lg">
              <FaBan size={16} />
            </div>
          </div>

          <div>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {diagnostics.cancelledSales.length}
            </p>
            <p className="text-[11px] text-slate-400">
              Ventas canceladas almacenadas.
            </p>
          </div>

          <button
            onClick={() =>
              setActiveAction({
                type: "cancelled_sales",
                title: "Purgar Ventas Anuladas",
                description:
                  "Se eliminarán los registros de ventas anuladas históricas y sus detalles para liberar almacenamiento.",
                itemCount: diagnostics.cancelledSales.length,
              })
            }
            disabled={diagnostics.cancelledSales.length === 0}
            className="w-full py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 disabled:opacity-40 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <FaTrashAlt /> Purgar Anulados
          </button>
        </div>

        {/* Productos Inactivos sin Uso */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Productos Obsoletos</span>
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-lg">
              <FaBoxes size={16} />
            </div>
          </div>

          <div>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {diagnostics.unusedProducts.length}
            </p>
            <p className="text-[11px] text-slate-400">
              Productos inactivos sin ventas registradas.
            </p>
          </div>

          <button
            onClick={() =>
              setActiveAction({
                type: "unused_products",
                title: "Eliminar Productos Obsoletos",
                description:
                  "Se eliminarán los productos desactivados que no tienen ninguna venta ni movimiento registrado.",
                itemCount: diagnostics.unusedProducts.length,
              })
            }
            disabled={diagnostics.unusedProducts.length === 0}
            className="w-full py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 disabled:opacity-40 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <FaTrashAlt /> Eliminar Obsoletos
          </button>
        </div>

        {/* Contactos Inactivos */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contactos sin Uso</span>
            <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-lg">
              <FaUsers size={16} />
            </div>
          </div>

          <div>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {diagnostics.unusedCustomers.length + diagnostics.unusedSuppliers.length}
            </p>
            <p className="text-[11px] text-slate-400">
              {diagnostics.unusedCustomers.length} clientes y {diagnostics.unusedSuppliers.length} proveedores sin saldo ni compras/ventas.
            </p>
          </div>

          <button
            onClick={() =>
              setActiveAction({
                type: "unused_contacts",
                title: "Limpiar Clientes y Proveedores Inactivos",
                description:
                  "Se eliminarán los contactos inactivos que tengan saldo en 0 y no registren compras ni ventas.",
                itemCount: diagnostics.unusedCustomers.length + diagnostics.unusedSuppliers.length,
              })
            }
            disabled={diagnostics.unusedCustomers.length + diagnostics.unusedSuppliers.length === 0}
            className="w-full py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 disabled:opacity-40 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <FaTrashAlt /> Purgar Contactos
          </button>
        </div>

      </div>

      {/* Itemized Inspection Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Categorías y Marcas para limpiar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FaLayerGroup className="text-purple-600" /> Clasificaciones Huérfanas Detectadas
          </h3>

          <div className="max-h-56 overflow-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {diagnostics.emptyCategories.length === 0 && diagnostics.emptyBrands.length === 0 ? (
              <div className="p-4 text-center text-slate-400 italic">
                No hay categorías ni marcas vacías. Todo está limpio.
              </div>
            ) : (
              <>
                {diagnostics.emptyCategories.map((c) => (
                  <div key={`cat-${c.id}`} className="py-2 flex justify-between items-center">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{c.name}</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">Categoría vacía</span>
                  </div>
                ))}
                {diagnostics.emptyBrands.map((b) => (
                  <div key={`brand-${b.id}`} className="py-2 flex justify-between items-center">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{b.name}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">Marca vacía</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Productos inactivos para limpiar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FaBoxes className="text-amber-600" /> Productos Inactivos Detectados
          </h3>

          <div className="max-h-56 overflow-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {diagnostics.unusedProducts.length === 0 ? (
              <div className="p-4 text-center text-slate-400 italic">
                No se detectaron productos obsoletos sin uso.
              </div>
            ) : (
              diagnostics.unusedProducts.map((p) => (
                <div key={p.id} className="py-2 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{p.name}</span>
                    <span className="block text-[10px] text-slate-400">SKU: {p.sku || "N/A"}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">Sin ventas asociadas</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Double-Confirmation Safety Modal */}
      {activeAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-red-50/60 dark:bg-red-950/30">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <FaExclamationTriangle size={20} />
                <h3 className="font-bold text-base">{activeAction.title}</h3>
              </div>
              <button
                onClick={() => {
                  setActiveAction(null);
                  setConfirmInput("");
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {activeAction.description}
              </p>

              <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="font-bold text-slate-700 dark:text-slate-300">Registros a eliminar:</span>
                <span className="px-2.5 py-1 bg-red-600 text-white font-black rounded-lg text-xs">
                  {activeAction.itemCount} elementos
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Para confirmar esta acción escriba <span className="text-red-600 font-extrabold uppercase">CONFIRMAR</span> a continuación:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Escriba CONFIRMAR..."
                  className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveAction(null);
                  setConfirmInput("");
                }}
                className="px-4 py-2 border rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeCleanup}
                disabled={executing || confirmInput.trim().toUpperCase() !== "CONFIRMAR"}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-black rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {executing ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <FaTrashAlt /> Confirmar y Borrar
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
