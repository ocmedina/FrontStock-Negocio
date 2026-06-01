"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "../types";
import toast from "react-hot-toast";
import { FaSearch, FaBarcode } from "react-icons/fa";

interface ProductSearchProps {
  onProductSelect: (product: Product) => void;
  isEditingTab: boolean;
}

export default function ProductSearch({
  onProductSelect,
  isEditingTab,
}: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const [lastKeyTime, setLastKeyTime] = useState(0);

  // Detectar entrada de lector de código de barras
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // No procesar si se está editando una pestaña
      if (isEditingTab) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;

      // Si es Enter y hay un buffer, procesar como código de barras
      if (e.key === "Enter" && barcodeBuffer.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        searchByBarcode(barcodeBuffer);
        setBarcodeBuffer("");
        setLastKeyTime(0);
        setQuery(""); // Limpiar el campo de búsqueda
        return;
      }

      // Acumular caracteres si vienen rápido (< 50ms entre teclas = lector)
      if (
        timeDiff < 50 &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        e.preventDefault(); // Prevenir que escriba en el input
        e.stopPropagation();
        setBarcodeBuffer((prev) => prev + e.key);
        setLastKeyTime(currentTime);
      } else if (timeDiff >= 50 && e.key.length === 1) {
        // Reset si hay pausa (escritura manual) - dejar escribir normalmente
        setBarcodeBuffer(e.key);
        setLastKeyTime(currentTime);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true); // true = capture phase
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [barcodeBuffer, lastKeyTime, isEditingTab]);

  const searchByBarcode = async (barcode: string) => {
    setIsLoading(true);
    try {
      // Intentar búsqueda exacta por SKU
      const { data: exactMatch } = await supabase
        .from("products")
        .select("*")
        .eq("sku", barcode.trim())
        .eq("is_active", true)
        .maybeSingle();

      if (exactMatch) {
        // Agregar directamente al carrito
        onProductSelect(exactMatch);
        toast.success(`✓ ${exactMatch.name} agregado`);
        return;
      }

      // Si no hay coincidencia exacta, buscar por similitud (nombre o SKU parcial)
      const { data: similarProducts } = await supabase
        .from("products")
        .select("*")
        .or(`name.ilike.%${barcode}%,sku.ilike.%${barcode}%`)
        .eq("is_active", true)
        .limit(5);

      if (similarProducts && similarProducts.length > 0) {
        // Si hay solo un resultado, agregarlo automáticamente
        if (similarProducts.length === 1) {
          onProductSelect(similarProducts[0]);
          toast.success(`✓ ${similarProducts[0].name} agregado`);
        } else {
          // Si hay múltiples resultados, mostrarlos para que el usuario seleccione
          setResults(similarProducts);
          setQuery(barcode);
          toast(`Se encontraron ${similarProducts.length} productos`, {
            icon: "🔍",
          });
        }
      } else {
        toast.error(`No se encontró ningún producto con "${barcode}"`);
      }
    } catch (error) {
      console.error("Error buscando producto:", error);
      toast.error("Error al buscar el producto");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
          .eq("is_active", true)
          .limit(5);

        if (error) throw error;
        setResults(data || []);
      } catch (error) {
        console.error("Error buscando productos:", error);
        toast.error("Error al buscar productos");
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchProducts, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (product: Product) => {
    onProductSelect(product);
    setQuery("");
    setResults([]);
  };

  // Detectar Enter en el input para búsqueda rápida por SKU
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim().length > 0) {
      e.preventDefault();
      // Intentar buscar por SKU primero
      searchByBarcode(query.trim());
      setQuery("");
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Buscar producto o escanear..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all text-base bg-white dark:bg-slate-900"
        />
        {isLoading && (
          <div className="absolute right-3 top-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-slate-400 px-1">
        <FaBarcode />
        <span>Escanea un código o escribe y presiona Enter</span>
      </div>

      {results.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-h-80 overflow-y-auto divide-y divide-gray-100 animate-fadeIn">
          {results.map((product) => (
            <li
              key={product.id}
              onClick={() => handleSelect(product)}
              className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors group"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold text-gray-800 dark:text-slate-100 block group-hover:text-blue-700 transition-colors">
                    {product.name}
                  </span>
                  {product.sku && (
                    <span className="text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      SKU: {product.sku}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-medium ${
                      (product.stock || 0) > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    Stock: {product.stock || 0}
                  </div>
                  <div className="text-xs text-gray-400">
                    ${(product.price_minorista || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
