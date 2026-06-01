"use client";

import { useState, useEffect } from "react";
import {
  FaTimes,
  FaSearch,
  FaUndo,
  FaPercentage,
  FaFilePdf,
} from "react-icons/fa";
import ProductListDownloadButton from "@/components/pdf/ProductListDownloadButton";

interface Product {
  id: string;
  sku: string;
  name: string;
  price_minorista: number;
  price_mayorista: number;
  stock: number;
}

interface CustomPricesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
}

export default function CustomPricesModal({
  isOpen,
  onClose,
  selectedProducts,
}: CustomPricesModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [customPrices, setCustomPrices] = useState<{
    [key: string]: { price_minorista: number; price_mayorista: number };
  }>({});
  const [adjustmentPercent, setAdjustmentPercent] = useState("");

  // Initialize/Reset custom prices when modal opens or products change
  useEffect(() => {
    if (isOpen) {
      const initialPrices: typeof customPrices = {};
      selectedProducts.forEach((p) => {
        initialPrices[p.id] = {
          price_minorista: p.price_minorista || 0,
          price_mayorista: p.price_mayorista || 0,
        };
      });
      setCustomPrices(initialPrices);
      setSearchTerm("");
      setAdjustmentPercent("");
    }
  }, [isOpen, selectedProducts]);

  if (!isOpen) return null;

  const handlePriceChange = (
    id: string,
    field: "price_minorista" | "price_mayorista",
    value: string
  ) => {
    const numVal = parseFloat(value) || 0;
    setCustomPrices((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: numVal,
      },
    }));
  };

  const applyPercentageAdjustment = (type: "minorista" | "mayorista" | "both") => {
    const percent = parseFloat(adjustmentPercent);
    if (isNaN(percent)) return;

    setCustomPrices((prev) => {
      const updated = { ...prev };
      selectedProducts.forEach((p) => {
        if (!updated[p.id]) return;
        const current = updated[p.id];
        
        if (type === "minorista" || type === "both") {
          const original = p.price_minorista || 0;
          current.price_minorista = Math.round(original * (1 + percent / 100) * 100) / 100;
        }
        if (type === "mayorista" || type === "both") {
          const original = p.price_mayorista || 0;
          current.price_mayorista = Math.round(original * (1 + percent / 100) * 100) / 100;
        }
      });
      return updated;
    });
  };

  const resetPrices = () => {
    const initialPrices: typeof customPrices = {};
    selectedProducts.forEach((p) => {
      initialPrices[p.id] = {
        price_minorista: p.price_minorista || 0,
        price_mayorista: p.price_mayorista || 0,
      };
    });
    setCustomPrices(initialPrices);
    setAdjustmentPercent("");
  };

  const filteredProducts = selectedProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customProductsList = selectedProducts.map((p) => ({
    ...p,
    price_minorista: customPrices[p.id]?.price_minorista ?? p.price_minorista,
    price_mayorista: customPrices[p.id]?.price_mayorista ?? p.price_mayorista,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800/80 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-3xs flex-shrink-0 text-base">
              <FaFilePdf />
            </span>
            <div className="text-left">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-50 leading-none">
                Personalizar Catálogo PDF
              </h2>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium leading-none">
                Modifica los precios para este documento sin alterar el inventario principal ({selectedProducts.length} seleccionados)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar / Quick Adjustments */}
        <div className="p-4 bg-slate-50/30 dark:bg-slate-950/10 border-b border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* Quick Adjust Box */}
          <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
            <span className="font-extrabold text-slate-650 dark:text-slate-350 flex items-center gap-1.5">
              <FaPercentage className="text-indigo-500" /> Ajuste Rápido:
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="Ej: 10"
                value={adjustmentPercent}
                onChange={(e) => setAdjustmentPercent(e.target.value)}
                className="w-16 px-2 py-1 text-center border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50"
              />
              <span className="font-bold text-slate-500 dark:text-slate-400">%</span>
            </div>
            <button
              onClick={() => applyPercentageAdjustment("both")}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/35 dark:text-indigo-400 rounded-lg border border-indigo-200/50 dark:border-indigo-900/40 text-[10px] font-black uppercase tracking-wider transition-colors"
            >
              Aplicar Ambos
            </button>
            <button
              onClick={() => applyPercentageAdjustment("minorista")}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/35 dark:text-blue-400 rounded-lg border border-blue-200/50 dark:border-blue-900/40 text-[10px] font-black uppercase tracking-wider transition-colors"
            >
              Solo Minorista
            </button>
            <button
              onClick={() => applyPercentageAdjustment("mayorista")}
              className="px-2.5 py-1 bg-amber-55 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/35 dark:text-amber-450 rounded-lg border border-amber-200/50 dark:border-amber-900/40 text-[10px] font-black uppercase tracking-wider transition-colors"
            >
              Solo Mayorista
            </button>
          </div>

          {/* Reset / Search */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <FaSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-455 w-3 h-3" />
              <input
                type="text"
                placeholder="Filtrar elegidos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 pl-7.5 pr-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-2xs font-semibold bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50"
              />
            </div>
            <button
              onClick={resetPrices}
              className="p-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-55 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-lg text-2xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
              title="Restablecer precios originales"
            >
              <FaUndo /> Restablecer
            </button>
          </div>

        </div>

        {/* Table Body Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="border border-slate-100 dark:border-slate-800/85 rounded-2xl overflow-hidden shadow-3xs bg-slate-50/10 dark:bg-slate-950/10">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800/80">
              <thead className="bg-slate-50/50 dark:bg-slate-950/30 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 text-left w-[120px]">SKU</th>
                  <th className="px-5 py-3 text-left">Nombre</th>
                  <th className="px-5 py-3 text-left w-[180px]">P. Minorista Personalizado</th>
                  <th className="px-5 py-3 text-left w-[180px]">P. Mayorista Personalizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900 text-xs">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400 font-medium">
                      No hay productos seleccionados que coincidan con la búsqueda
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const currentVals = customPrices[p.id] || {
                      price_minorista: p.price_minorista || 0,
                      price_mayorista: p.price_mayorista || 0,
                    };

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-[10px] font-bold text-indigo-500/80">
                          {p.sku}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {p.name}
                        </td>
                        
                        {/* Minorista Input */}
                        <td className="px-5 py-3">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={currentVals.price_minorista}
                              onChange={(e) =>
                                handlePriceChange(p.id, "price_minorista", e.target.value)
                              }
                              className="w-full pl-7 pr-3 py-1.5 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-semibold bg-slate-50/20 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                            />
                            {currentVals.price_minorista !== p.price_minorista && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Mayorista Input */}
                        <td className="px-5 py-3">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={currentVals.price_mayorista}
                              onChange={(e) =>
                                handlePriceChange(p.id, "price_mayorista", e.target.value)
                              }
                              className="w-full pl-7 pr-3 py-1.5 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-semibold bg-slate-50/20 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                            />
                            {currentVals.price_mayorista !== p.price_mayorista && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 flex justify-between items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors animate-all"
          >
            Cancelar
          </button>
          
          <ProductListDownloadButton
            products={customProductsList}
            disabled={selectedProducts.length === 0}
            readyLabel="Generar PDF con precios editados"
            className="px-5 py-2.5 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
          />
        </div>

      </div>
    </div>
  );
}
