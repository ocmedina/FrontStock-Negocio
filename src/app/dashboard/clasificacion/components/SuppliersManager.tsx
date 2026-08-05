"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaSave,
  FaTimes,
  FaTruck,
  FaTag,
  FaDollarSign,
  FaSearch,
  FaBoxes,
  FaLayerGroup,
  FaCheckSquare,
  FaSquare,
} from "react-icons/fa";
import toast from "react-hot-toast";
import CategoryBrandPriceModal from "./CategoryBrandPriceModal";

type SupplierWithBrands = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  brandCount: number;
  productCount: number;
  brands: { id: number; name: string }[];
};

type Brand = {
  id: number;
  name: string;
  supplier_id: string | null;
};

export default function SuppliersManager() {
  const [suppliers, setSuppliers] = useState<SupplierWithBrands[]>([]);
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [assignBrandsTarget, setAssignBrandsTarget] = useState<SupplierWithBrands | null>(null);
  const [priceManagerTarget, setPriceManagerTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Selected brand IDs for supplier assignment modal
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([]);

  // Add new supplier state
  const [isAdding, setIsAdding] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Suppliers
      const { data: supData, error: supErr } = await supabase
        .from("suppliers")
        .select("id, name, contact_person, phone, email")
        .eq("is_active", true)
        .order("name");

      if (supErr) throw supErr;

      // 2. Fetch Brands
      const { data: brandData, error: brandErr } = await supabase
        .from("brands")
        .select("id, name, supplier_id")
        .order("name");

      if (brandErr) throw brandErr;
      setAvailableBrands(brandData || []);

      // 3. Fetch Products for counting per brand
      let allProducts: { brand_id: number | null }[] = [];
      let from = 0;
      const step = 300;

      while (true) {
        const { data: chunk, error: prodErr } = await supabase
          .from("products")
          .select("brand_id")
          .range(from, from + step - 1);

        if (prodErr) throw prodErr;
        if (!chunk || chunk.length === 0) break;
        allProducts = [...allProducts, ...chunk];
        if (chunk.length < step) break;
        from += step;
      }

      // Map product counts per brand
      const brandProdCountMap: { [brandId: number]: number } = {};
      allProducts.forEach((p) => {
        if (p.brand_id) {
          brandProdCountMap[p.brand_id] = (brandProdCountMap[p.brand_id] || 0) + 1;
        }
      });

      // Map suppliers with their brands and product totals
      const formattedSuppliers: SupplierWithBrands[] = (supData || []).map((s) => {
        const supplierBrands = (brandData || []).filter((b) => b.supplier_id === s.id);
        const totalProds = supplierBrands.reduce(
          (sum, b) => sum + (brandProdCountMap[b.id] || 0),
          0
        );

        return {
          id: s.id,
          name: s.name,
          contact_person: s.contact_person,
          phone: s.phone,
          email: s.email,
          brandCount: supplierBrands.length,
          productCount: totalProds,
          brands: supplierBrands.map((b) => ({ id: b.id, name: b.name })),
        };
      });

      setSuppliers(formattedSuppliers);
    } catch (err: any) {
      console.error("Error al cargar proveedores y marcas:", err);
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;

    const { error } = await supabase
      .from("suppliers")
      .insert([{ name: newSupplierName.trim() }]);

    if (error) {
      toast.error("Error al crear proveedor: " + error.message);
    } else {
      toast.success("Proveedor creado con éxito");
      setNewSupplierName("");
      setIsAdding(false);
      fetchData();
    }
  };

  // Open brand assignment modal for a supplier
  const openAssignBrandsModal = (supplier: SupplierWithBrands) => {
    setAssignBrandsTarget(supplier);
    const assignedIds = availableBrands
      .filter((b) => b.supplier_id === supplier.id)
      .map((b) => b.id);
    setSelectedBrandIds(assignedIds);
  };

  // Save assigned brands for a supplier
  const handleSaveAssignedBrands = async () => {
    if (!assignBrandsTarget) return;

    const loadingToast = toast.loading("Guardando marcas asignadas...");
    try {
      // 1. Unassign brands currently assigned to this supplier that were unchecked
      const currentlyAssigned = availableBrands
        .filter((b) => b.supplier_id === assignBrandsTarget.id)
        .map((b) => b.id);

      const toUnassign = currentlyAssigned.filter((id) => !selectedBrandIds.includes(id));
      const toAssign = selectedBrandIds.filter((id) => !currentlyAssigned.includes(id));

      if (toUnassign.length > 0) {
        const { error: unErr } = await supabase
          .from("brands")
          .update({ supplier_id: null })
          .in("id", toUnassign);
        if (unErr) throw unErr;
      }

      if (toAssign.length > 0) {
        const { error: assErr } = await supabase
          .from("brands")
          .update({ supplier_id: assignBrandsTarget.id })
          .in("id", toAssign);
        if (assErr) throw assErr;
      }

      toast.success("Marcas asignadas correctamente", { id: loadingToast });
      setAssignBrandsTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error("Error al guardar marcas del proveedor: " + err.message, { id: loadingToast });
    }
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
      
      {/* Top Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-slate-50/70 dark:bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <FaTruck size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Proveedores y sus Marcas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Asigna marcas a cada Proveedor y aumenta precios de su catálogo completo.
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
              placeholder="Buscar proveedor..."
              className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <FaPlus /> Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Add Form inline */}
      {isAdding && (
        <form
          onSubmit={handleCreateSupplier}
          className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex gap-3 items-center animate-fadeIn"
        >
          <input
            type="text"
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
            placeholder="Nombre del nuevo proveedor (Ej: Distribuidora Central, Arcor SA)..."
            className="flex-1 px-4 py-2 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
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

      {/* Suppliers Grid/List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Cargando proveedores...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            No hay proveedores registrados {searchTerm ? `que coincidan con "${searchTerm}"` : ""}.
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 text-base">
                    {supplier.name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <FaTag className="text-emerald-500 text-[10px]" /> {supplier.brandCount} marcas
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <FaBoxes className="text-blue-500 text-[10px]" /> {supplier.productCount} productos
                  </span>
                </div>

                {/* Brands Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {supplier.brands.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      Sin marcas vinculadas aún. haz clic en "Ver / Asignar Marcas" para agregar.
                    </span>
                  ) : (
                    supplier.brands.map((b) => (
                      <span
                        key={b.id}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-700"
                      >
                        {b.name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => openAssignBrandsModal(supplier)}
                  className="px-3.5 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all flex items-center gap-1.5"
                >
                  <FaTag /> Ver / Asignar Marcas
                </button>

                <button
                  onClick={() => setPriceManagerTarget({ id: supplier.id, name: supplier.name })}
                  disabled={supplier.productCount === 0}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <FaDollarSign /> Cambiar Precios del Proveedor
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Supplier Brand Assignment Modal */}
      {assignBrandsTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
                  <FaTag className="text-emerald-600" /> Marcas de {assignBrandsTarget.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Selecciona qué marcas vende o distribuye este proveedor.
                </p>
              </div>
              <button
                onClick={() => setAssignBrandsTarget(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-auto space-y-3">
              {availableBrands.length === 0 ? (
                <div className="text-center p-8 text-slate-500 text-xs">
                  No hay marcas creadas aún en el sistema. Crea marcas primero en la pestaña "Marcas".
                </div>
              ) : (
                availableBrands.map((brand) => {
                  const isChecked = selectedBrandIds.includes(brand.id);
                  const isAssignedToOther =
                    brand.supplier_id && brand.supplier_id !== assignBrandsTarget.id;

                  return (
                    <div
                      key={brand.id}
                      onClick={() => {
                        setSelectedBrandIds((prev) =>
                          prev.includes(brand.id)
                            ? prev.filter((id) => id !== brand.id)
                            : [...prev, brand.id]
                        );
                      }}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-600">
                          {isChecked ? <FaCheckSquare size={18} /> : <FaSquare size={18} className="text-slate-300 dark:text-slate-700" />}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                          {brand.name}
                        </span>
                      </div>

                      {isAssignedToOther && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded font-semibold">
                          En otro proveedor
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
              <button
                onClick={() => setAssignBrandsTarget(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAssignedBrands}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
              >
                <FaSave /> Guardar Asignación ({selectedBrandIds.length})
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Supplier Bulk Price Manager Modal */}
      {priceManagerTarget && (
        <CategoryBrandPriceModal
          isOpen={!!priceManagerTarget}
          onClose={() => setPriceManagerTarget(null)}
          entityType="supplier"
          entityId={priceManagerTarget.id}
          entityName={priceManagerTarget.name}
          onSuccess={fetchData}
        />
      )}

    </div>
  );
}
