"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "../types";
import toast from "react-hot-toast";
import { FaTimes, FaSearch } from "react-icons/fa";

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export default function ProductSearchModal({
  isOpen,
  onClose,
  onSelectProduct,
}: ProductSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Scroll automático al elemento seleccionado cuando cambia el índice
  useEffect(() => {
    const selectedElement = document.querySelector(
      `[data-product-index="${selectedIndex}"]`
    );
    if (selectedElement) {
      selectedElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedIndex]);

  // Cargar productos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadProducts();
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error) {
      console.error("Error cargando productos:", error);
      toast.error("Error al cargar productos");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar productos según búsqueda
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
      setSelectedIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
    setFilteredProducts(filtered);
    setSelectedIndex(0);
  }, [searchQuery, products]);

  // Navegación con teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" && filteredProducts[selectedIndex]) {
        e.preventDefault();
        handleSelectProduct(filteredProducts[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredProducts, selectedIndex]);

  const handleSelectProduct = (product: Product) => {
    onSelectProduct(product);
    onClose();
    toast.success(`✓ ${product.name} agregado`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col transform transition-all scale-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <FaSearch className="text-purple-200" /> Buscar Productos
              </h2>
              <p className="text-purple-100 text-sm">
                {filteredProducts.length} productos encontrados
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white dark:bg-slate-900/20 rounded-full p-2 transition-all"
            >
              <FaTimes size={24} />
            </button>
          </div>

          {/* Buscador */}
          <div className="mt-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, SKU o descripción..."
              autoFocus
              className="w-full px-5 py-4 rounded-xl text-gray-900 dark:text-slate-50 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-white/30 text-lg shadow-lg"
            />
          </div>

          {/* Atajos de teclado */}
          <div className="mt-4 flex gap-4 text-xs text-purple-100 font-medium">
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white dark:bg-slate-900/20 rounded border border-white/10">
                ↑↓
              </kbd>{" "}
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white dark:bg-slate-900/20 rounded border border-white/10">
                Enter
              </kbd>{" "}
              Seleccionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white dark:bg-slate-900/20 rounded border border-white/10">
                Esc
              </kbd>{" "}
              Cerrar
            </span>
          </div>
        </div>

        {/* Lista de productos */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-950">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
                <div className="text-gray-500 dark:text-slate-400 font-medium">
                  Cargando productos...
                </div>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-gray-500 dark:text-slate-400">
              <FaSearch className="text-4xl text-gray-300 mb-3" />
              <p className="text-lg font-medium mb-1">
                No se encontraron productos
              </p>
              <p className="text-sm">Intenta con otra búsqueda</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredProducts.map((product, index) => (
                <button
                  key={product.id}
                  data-product-index={index}
                  onClick={() => handleSelectProduct(product)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 group ${
                    index === selectedIndex
                      ? "border-purple-500 bg-white dark:bg-slate-800 shadow-md ring-1 ring-purple-500 transform scale-[1.01]"
                      : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3
                        className={`font-bold text-lg mb-1 ${
                          index === selectedIndex
                            ? "text-purple-700 dark:text-purple-300"
                            : "text-gray-800 dark:text-slate-100"
                        }`}
                      >
                        {product.name}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-slate-300">
                        <span className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-medium">
                          SKU: {product.sku}
                        </span>
                        {product.description && (
                          <span className="text-gray-500 dark:text-slate-400 truncate max-w-[300px]">
                            {product.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                        Precio
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        ${(product.price_minorista || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div
                        className={`text-xs font-medium mt-1 ${
                          (product.stock || 0) > 0
                            ? "text-blue-600"
                            : "text-red-600"
                        }`}
                      >
                        Stock: {product.stock || 0}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
