"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaSave,
  FaTimes,
  FaTag,
  FaBoxOpen,
  FaDollarSign,
  FaSearch,
  FaBoxes,
  FaTruck,
} from "react-icons/fa";
import toast from "react-hot-toast";
import CategoryBrandProductManagerModal from "./CategoryBrandProductManagerModal";
import CategoryBrandPriceModal from "./CategoryBrandPriceModal";

type SupplierOption = {
  id: string;
  name: string;
};

type BrandWithCount = {
  id: number;
  name: string;
  supplier_id: string | null;
  supplier_name: string | null;
  productCount: number;
};

export default function BrandsManager() {
  const [brands, setBrands] = useState<BrandWithCount[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Add state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSupplierId, setEditSupplierId] = useState<string>("");

  const [newName, setNewName] = useState("");
  const [newSupplierId, setNewSupplierId] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("");

  // Modals state
  const [productManagerTarget, setProductManagerTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const [priceManagerTarget, setPriceManagerTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch suppliers
      const { data: supData } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      setSuppliers(supData || []);
      const supMap = Object.fromEntries((supData || []).map((s) => [s.id, s.name]));

      // 2. Fetch brands
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("id, name, supplier_id")
        .order("name");

      if (brandError) throw brandError;

      // 3. Fetch all products in chunks to count per brand
      let allProdData: { brand_id: number | null }[] = [];
      let from = 0;
      const step = 300;

      while (true) {
        const { data: chunk, error: prodError } = await supabase
          .from("products")
          .select("brand_id")
          .range(from, from + step - 1);

        if (prodError) throw prodError;
        if (!chunk || chunk.length === 0) break;
        allProdData = [...allProdData, ...chunk];
        if (chunk.length < step) break;
        from += step;
      }

      // Map count per brand
      const countMap: { [key: number]: number } = {};
      allProdData.forEach((p) => {
        if (p.brand_id) {
          countMap[p.brand_id] = (countMap[p.brand_id] || 0) + 1;
        }
      });

      const formatted: BrandWithCount[] = (brandData || []).map((b) => ({
        id: b.id,
        name: b.name,
        supplier_id: b.supplier_id,
        supplier_name: b.supplier_id ? supMap[b.supplier_id] || "Proveedor no encontrado" : null,
        productCount: countMap[b.id] || 0,
      }));

      setBrands(formatted);
    } catch (err: any) {
      console.error("Error al cargar marcas:", err);
      toast.error("Error al cargar marcas");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const payload: any = { name: newName.trim() };
    if (newSupplierId) payload.supplier_id = newSupplierId;

    const { error } = await supabase.from("brands").insert([payload]);

    if (error) {
      toast.error("Error al crear marca: " + error.message);
    } else {
      toast.success("Marca creada con éxito");
      setNewName("");
      setNewSupplierId("");
      setIsAdding(false);
      fetchData();
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;

    const payload: any = { name: editName.trim() };
    payload.supplier_id = editSupplierId || null;

    const { error } = await supabase.from("brands").update(payload).eq("id", id);

    if (error) {
      toast.error("Error al actualizar marca: " + error.message);
    } else {
      toast.success("Marca actualizada");
      setEditingId(null);
      fetchData();
    }
  };

  const handleDelete = async (brand: BrandWithCount) => {
    if (brand.productCount > 0) {
      if (
        !confirm(
          `Esta marca tiene ${brand.productCount} producto(s) asignado(s). Al eliminarla, los productos quedarán sin marca. ¿Deseas continuar?`
        )
      ) {
        return;
      }
    } else {
      if (!confirm(`¿Seguro que deseas eliminar la marca "${brand.name}"?`)) return;
    }

    const { error } = await supabase.from("brands").delete().eq("id", brand.id);

    if (error) {
      toast.error("Error al eliminar marca");
    } else {
      toast.success("Marca eliminada");
      fetchData();
    }
  };

  const filteredBrands = brands.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (supplierFilter === "none") return !b.supplier_id;
    if (supplierFilter) return b.supplier_id === supplierFilter;

    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
      
      {/* Top Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-slate-50/70 dark:bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
            <FaTag size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Marcas de Productos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gestiona marcas de tus proveedores y ajusta precios por lote.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Supplier Filter */}
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los proveedores</option>
            <option value="none">Sin proveedor asignado</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar marca..."
              className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <FaPlus /> Nueva Marca
          </button>
        </div>
      </div>

      {/* Add Form inline */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex flex-wrap gap-3 items-center animate-fadeIn"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la marca (Ej: Arcor, Coca-Cola)..."
            className="flex-1 min-w-[200px] px-4 py-2 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            autoFocus
          />

          <select
            value={newSupplierId}
            onChange={(e) => setNewSupplierId(e.target.value)}
            className="px-3 py-2 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar Proveedor (Opcional)...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-1.5"
          >
            <FaSave /> Guardar
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="px-4 py-2 bg-slate-500 text-white rounded-xl text-xs font-bold hover:bg-slate-600 transition-colors flex items-center gap-1.5"
          >
            <FaTimes /> Cancelar
          </button>
        </form>
      )}

      {/* Brands Grid/List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Cargando marcas...</div>
        ) : filteredBrands.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            No hay marcas registradas {searchTerm ? `que coincidan con "${searchTerm}"` : ""}.
          </div>
        ) : (
          filteredBrands.map((brand) => (
            <div
              key={brand.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
            >
              {editingId === brand.id ? (
                <div className="flex gap-2 items-center flex-1 flex-wrap">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 min-w-[150px] px-3 py-1.5 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    autoFocus
                  />
                  <select
                    value={editSupplierId}
                    onChange={(e) => setEditSupplierId(e.target.value)}
                    className="px-3 py-1.5 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Sin proveedor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleUpdate(brand.id)}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40 rounded-lg"
                    title="Guardar"
                  >
                    <FaSave size={16} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    title="Cancelar"
                  >
                    <FaTimes size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {brand.name}
                  </span>
                  
                  {brand.supplier_name ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <FaTruck className="text-emerald-500 text-[10px]" /> {brand.supplier_name}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium">
                      Sin proveedor
                    </span>
                  )}

                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <FaBoxes className="text-blue-500 text-[10px]" /> {brand.productCount} productos
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() =>
                    setProductManagerTarget({ id: brand.id, name: brand.name })
                  }
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all flex items-center gap-1.5"
                >
                  <FaBoxOpen /> Meter / Ver Productos
                </button>

                <button
                  onClick={() => setPriceManagerTarget({ id: brand.id, name: brand.name })}
                  disabled={brand.productCount === 0}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  <FaDollarSign /> Cambiar Precios
                </button>

                <button
                  onClick={() => {
                    setEditingId(brand.id);
                    setEditName(brand.name);
                    setEditSupplierId(brand.supplier_id || "");
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors"
                  title="Editar marca y proveedor"
                >
                  <FaEdit size={15} />
                </button>

                <button
                  onClick={() => handleDelete(brand)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                  title="Eliminar marca"
                >
                  <FaTrash size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Product Selection Manager Modal */}
      {productManagerTarget && (
        <CategoryBrandProductManagerModal
          isOpen={!!productManagerTarget}
          onClose={() => setProductManagerTarget(null)}
          entityType="brand"
          entityId={productManagerTarget.id}
          entityName={productManagerTarget.name}
          onRefresh={fetchData}
        />
      )}

      {/* Bulk Price Manager Modal */}
      {priceManagerTarget && (
        <CategoryBrandPriceModal
          isOpen={!!priceManagerTarget}
          onClose={() => setPriceManagerTarget(null)}
          entityType="brand"
          entityId={priceManagerTarget.id}
          entityName={priceManagerTarget.name}
          onSuccess={fetchData}
        />
      )}

    </div>
  );
}
