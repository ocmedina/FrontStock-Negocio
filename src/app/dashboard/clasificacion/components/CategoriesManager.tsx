"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaSave,
  FaTimes,
  FaLayerGroup,
  FaBoxOpen,
  FaDollarSign,
  FaSearch,
  FaBoxes,
} from "react-icons/fa";
import toast from "react-hot-toast";
import CategoryBrandProductManagerModal from "./CategoryBrandProductManagerModal";
import CategoryBrandPriceModal from "./CategoryBrandPriceModal";

type CategoryWithCount = {
  id: number;
  name: string;
  productCount: number;
};

export default function CategoriesManager() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
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
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (catError) throw catError;

      // Fetch products to count per category
      const { data: prodData, error: prodError } = await supabase
        .from("products")
        .select("category_id")
        .eq("is_active", true);

      if (prodError) throw prodError;

      // Map count per category
      const countMap: { [key: number]: number } = {};
      (prodData || []).forEach((p) => {
        if (p.category_id) {
          countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
        }
      });

      const formatted: CategoryWithCount[] = (catData || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        productCount: countMap[cat.id] || 0,
      }));

      setCategories(formatted);
    } catch (err: any) {
      console.error("Error al cargar categorías:", err);
      toast.error("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const { error } = await supabase
      .from("categories")
      .insert([{ name: newName.trim() }]);

    if (error) {
      toast.error("Error al crear categoría");
    } else {
      toast.success("Categoría creada con éxito");
      setNewName("");
      setIsAdding(false);
      fetchCategories();
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;

    const { error } = await supabase
      .from("categories")
      .update({ name: editName.trim() })
      .eq("id", id);

    if (error) {
      toast.error("Error al actualizar categoría");
    } else {
      toast.success("Categoría actualizada");
      setEditingId(null);
      fetchCategories();
    }
  };

  const handleDelete = async (category: CategoryWithCount) => {
    if (category.productCount > 0) {
      if (
        !confirm(
          `Esta categoría tiene ${category.productCount} producto(s) asignado(s). Al eliminarla, los productos quedarán sin categoría. ¿Deseas continuar?`
        )
      ) {
        return;
      }
    } else {
      if (!confirm(`¿Seguro que deseas eliminar la categoría "${category.name}"?`)) return;
    }

    const { error } = await supabase.from("categories").delete().eq("id", category.id);

    if (error) {
      toast.error("Error al eliminar categoría");
    } else {
      toast.success("Categoría eliminada");
      fetchCategories();
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
      
      {/* Top Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-slate-50/70 dark:bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
            <FaLayerGroup size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Categorías de Productos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Organiza productos y actualiza sus precios por categoría.
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
              placeholder="Buscar categoría..."
              className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <FaPlus /> Nueva Categoría
          </button>
        </div>
      </div>

      {/* Add Form inline */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-900/40 flex gap-3 items-center animate-fadeIn"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la nueva categoría (Ej: Lácteos, Bebidas, Limpieza)..."
            className="flex-1 px-4 py-2 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
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

      {/* Categories Grid/List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Cargando categorías...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            No hay categorías registradas {searchTerm ? `que coincidan con "${searchTerm}"` : ""}.
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div
              key={category.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
            >
              {editingId === category.id ? (
                <div className="flex gap-2 items-center flex-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-purple-300 dark:border-purple-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(category.id)}
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
                    {category.name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <FaBoxes className="text-purple-500 text-[10px]" /> {category.productCount} productos
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() =>
                    setProductManagerTarget({ id: category.id, name: category.name })
                  }
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-all flex items-center gap-1.5"
                >
                  <FaBoxOpen /> Meter / Ver Productos
                </button>

                <button
                  onClick={() => setPriceManagerTarget({ id: category.id, name: category.name })}
                  disabled={category.productCount === 0}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  <FaDollarSign /> Cambiar Precios
                </button>

                <button
                  onClick={() => {
                    setEditingId(category.id);
                    setEditName(category.name);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors"
                  title="Editar nombre"
                >
                  <FaEdit size={15} />
                </button>

                <button
                  onClick={() => handleDelete(category)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                  title="Eliminar categoría"
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
          entityType="category"
          entityId={productManagerTarget.id}
          entityName={productManagerTarget.name}
          onRefresh={fetchCategories}
        />
      )}

      {/* Bulk Price Manager Modal */}
      {priceManagerTarget && (
        <CategoryBrandPriceModal
          isOpen={!!priceManagerTarget}
          onClose={() => setPriceManagerTarget(null)}
          entityType="category"
          entityId={priceManagerTarget.id}
          entityName={priceManagerTarget.name}
          onSuccess={fetchCategories}
        />
      )}

    </div>
  );
}
