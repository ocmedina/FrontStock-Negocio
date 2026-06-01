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
} from "react-icons/fa";
import toast from "react-hot-toast";

type Brand = {
  id: number;
  name: string;
};

export default function BrandsManager() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Error al cargar marcas");
    } else {
      setBrands(data || []);
    }
    setLoading(false);
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
      toast.success("Marca creada");
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

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar esta marca?")) return;

    const { error } = await supabase.from("brands").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar marca (puede estar en uso)");
    } else {
      toast.success("Marca eliminada");
      fetchBrands();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
          <FaTag className="text-blue-600" /> Marcas
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-2"
        >
          <FaPlus /> Nueva Marca
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="p-4 bg-blue-50 border-b border-blue-100 flex gap-2 items-center animate-fadeIn"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la nueva marca..."
            className="flex-1 px-4 py-2 border border-blue-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100"
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
        ) : brands.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-slate-400">
            No hay marcas registradas.
          </div>
        ) : (
          brands.map((brand) => (
            <div
              key={brand.id}
              className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 transition-colors group"
            >
              {editingId === brand.id ? (
                <div className="flex gap-2 items-center flex-1 mr-4">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-blue-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(brand.id)}
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
                <span className="font-medium text-gray-700 dark:text-slate-200">{brand.name}</span>
              )}

              {editingId !== brand.id && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingId(brand.id);
                      setEditName(brand.name);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(brand.id)}
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
