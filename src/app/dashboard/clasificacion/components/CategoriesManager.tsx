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
} from "react-icons/fa";
import toast from "react-hot-toast";

type Category = {
  id: number;
  name: string;
};

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Error al cargar categorías");
    } else {
      setCategories(data || []);
    }
    setLoading(false);
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
      toast.success("Categoría creada");
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

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar esta categoría?")) return;

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar categoría (puede estar en uso)");
    } else {
      toast.success("Categoría eliminada");
      fetchCategories();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
          <FaLayerGroup className="text-purple-600" /> Categorías
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold flex items-center gap-2"
        >
          <FaPlus /> Nueva Categoría
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="p-4 bg-purple-50 border-b border-purple-100 flex gap-2 items-center animate-fadeIn"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la nueva categoría..."
            className="flex-1 px-4 py-2 border border-purple-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100"
            autoFocus
          />
          <button
            type="submit"
            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            title="Guardar"
          >
            <FaSave />
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="p-2 bg-gray-500 dark:bg-slate-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-slate-500 transition-colors"
            title="Cancelar"
          >
            <FaTimes />
          </button>
        </form>
      )}

      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-slate-400">Cargando...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-slate-400">
            No hay categorías registradas.
          </div>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 transition-colors group"
            >
              {editingId === category.id ? (
                <div className="flex gap-2 items-center flex-1 mr-4">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-purple-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(category.id)}
                    className="text-green-600 hover:text-green-800 p-1"
                  >
                    <FaSave size={18} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-gray-400 hover:text-gray-600 dark:text-slate-300 p-1"
                  >
                    <FaTimes size={18} />
                  </button>
                </div>
              ) : (
                <span className="font-medium text-gray-700 dark:text-slate-200">
                  {category.name}
                </span>
              )}

              {editingId !== category.id && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingId(category.id);
                      setEditName(category.name);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <FaTrash />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
