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
} from "react-icons/fa";
import toast from "react-hot-toast";
import CategoryBrandProductManagerModal from "./CategoryBrandProductManagerModal";
import CategoryBrandPriceModal from "./CategoryBrandPriceModal";

type BrandWithCount = {
  id: number;
  name: string;
  productCount: number;
};

export default function BrandsManager() {
  const [brands, setBrands] = useState<BrandWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      // Fetch brands
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("id, name")
        .order("name");

      if (brandError) throw brandError;

      // Fetch all products in chunks to count per brand
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

    const { error } = await supabase
      .from("brands")
      .insert([{ name: newName.trim() }]);

    if (error) {
      toast.error("Error al crear marca");
    } else {
      toast.success("Marca creada con éxito");
      setNewName("");
      setIsAdding(false);
      fetchBrands();
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;

    const { error } = await supabase
      .from("brands")
      .update({ name: editName.trim() })
      .eq("id", id);

    if (error) {
      toast.error("Error al actualizar marca");
    } else {
      toast.success("Marca actualizada");
      setEditingId(null);
      fetchBrands();
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
      fetchBrands();
    }
  };

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        <div className="flex items-center gap-3">
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
          className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex gap-3 items-center animate-fadeIn"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la nueva marca (Ej: Arcor, Unilever, Nestlé)..."
            className="flex-1 px-4 py-2 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            autoFocus
          />
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
                <div className="flex gap-2 items-center flex-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    autoFocus
                  />
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
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {brand.name}
                  </span>
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
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors"
                  title="Editar nombre"
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
          onRefresh={fetchBrands}
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
          onSuccess={fetchBrands}
        />
      )}

    </div>
  );
}
