"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaTimes, FaSave, FaExchangeAlt, FaBuilding } from "react-icons/fa";
import toast from "react-hot-toast";
import ProductSearch from "../../ventas/nueva/components/ProductSearch";
import { Product } from "../../ventas/nueva/types";
import { useBranch } from "@/contexts/BranchContext";

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
}: AdjustmentModalProps) {
  const { activeBranch } = useBranch();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [type, setType] = useState<"ajuste_manual" | "devolucion">(
    "ajuste_manual"
  );
  const [direction, setDirection] = useState<"increment" | "decrement">(
    "increment"
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity) {
      toast.error("Complete todos los campos");
      return;
    }

    if (!activeBranch) {
      toast.error("Debe seleccionar una sucursal activa antes de ajustar stock");
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    setLoading(true);
    try {
      // 1. Obtener usuario autenticado
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 2. Obtener el stock actual de este producto en la sucursal activa
      const { data: branchStockRecord } = await (supabase as any)
        .from("branch_stock")
        .select("stock")
        .eq("branch_id", activeBranch.id)
        .eq("product_id", selectedProduct.id)
        .maybeSingle();

      const currentBranchStock = Number(branchStockRecord?.stock ?? selectedProduct.stock ?? 0);
      const adjustment = direction === "increment" ? qty : -qty;
      const newBranchStock = Math.max(0, currentBranchStock + adjustment);

      // 3. Actualizar o crear branch_stock para la sucursal activa
      const { error: branchStockError } = await (supabase as any)
        .from("branch_stock")
        .upsert(
          {
            branch_id: activeBranch.id,
            product_id: selectedProduct.id,
            stock: newBranchStock,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "branch_id,product_id" }
        );

      if (branchStockError) throw branchStockError;

      // 4. Recalcular y actualizar stock total de products
      const { data: allBranchStocks } = await (supabase as any)
        .from("branch_stock")
        .select("stock")
        .eq("product_id", selectedProduct.id);

      const totalStock = (allBranchStocks || []).reduce(
        (acc: number, item: any) => acc + (Number(item.stock) || 0),
        0
      );

      await supabase
        .from("products")
        .update({ stock: totalStock })
        .eq("id", selectedProduct.id);

      // 5. Registrar movimiento de stock con sucursal
      const { error: movementError } = await (supabase as any)
        .from("stock_movements")
        .insert({
          product_id: selectedProduct.id,
          user_id: user?.id || null,
          branch_id: activeBranch.id,
          movement_type: type,
          quantity: adjustment,
          previous_stock: currentBranchStock,
          new_stock: newBranchStock,
          notes:
            notes ||
            `Ajuste manual (${activeBranch.name}): ${
              direction === "increment" ? "Entrada" : "Salida"
            }`,
        });

      if (movementError) throw movementError;

      toast.success(`Stock ajustado en ${activeBranch.name}`);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error adjusting stock:", error);
      toast.error("Error al ajustar stock: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedProduct(null);
    setQuantity("");
    setNotes("");
    setDirection("increment");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gray-50 dark:bg-slate-950 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <FaExchangeAlt className="text-blue-600" /> Ajuste de Stock
            </h2>
            {activeBranch && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                <FaBuilding className="text-[10px]" /> Sucursal: {activeBranch.name}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-300 transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Selección de Producto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Producto
            </label>
            {selectedProduct ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <div>
                  <p className="font-bold text-gray-900 dark:text-slate-50">
                    {selectedProduct.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    SKU: {selectedProduct.sku || "N/A"} | Stock Actual:{" "}
                    <span className="font-bold">{selectedProduct.stock}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <ProductSearch
                onProductSelect={setSelectedProduct}
                isEditingTab={false}
              />
            )}
          </div>

          {selectedProduct && (
            <>
              {/* Tipo de Ajuste */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Acción
                  </label>
                  <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDirection("increment")}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        direction === "increment"
                          ? "bg-white text-green-700 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      + Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection("decrement")}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        direction === "decrement"
                          ? "bg-white text-red-700 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      - Salida
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                    min="1"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Motivo / Notas
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                  placeholder="Ej: Rotura, Conteo de inventario, Regalo..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-slate-950 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-slate-200 font-medium hover:bg-gray-200 dark:bg-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedProduct || !quantity}
            className={`px-6 py-2 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 ${
              loading || !selectedProduct || !quantity
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl transform hover:-translate-y-0.5"
            }`}
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <FaSave /> Guardar Ajuste
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
