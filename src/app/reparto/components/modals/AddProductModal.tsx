import { useState, useEffect } from "react";
import { FaTimes, FaSearch, FaSpinner } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { Database } from "@/lib/database.types";
import { useBranch } from "@/contexts/BranchContext";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdd: (product: Product) => void;
}

export default function AddProductModal({
  isOpen,
  onClose,
  onProductAdd,
}: AddProductModalProps) {
  const { activeBranch } = useBranch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      return;
    }
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const fetchProducts = async () => {
      setIsSearching(true);
      try {
        if (!activeBranch) {
          setResults([]);
          return;
        }

        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .ilike("name", `%${query}%`)
          .limit(25);

        if (productError) throw productError;

        const productIds = (productData || []).map((product) => product.id);
        if (productIds.length === 0) {
          setResults([]);
          return;
        }

        const { data: stockData, error: stockError } = await (supabase as any)
          .from("branch_stock")
          .select("product_id, stock")
          .eq("branch_id", activeBranch.id)
          .in("product_id", productIds)
          .gt("stock", 0);

        if (stockError) throw stockError;

        const stockByProduct = new Map(
          (stockData || []).map((row: any) => [row.product_id, Number(row.stock || 0)])
        );
        setResults(
          (productData || [])
            .filter((product) => stockByProduct.has(product.id))
            .map((product) => ({
              ...product,
              stock: stockByProduct.get(product.id) || 0,
            }))
        );
      } catch (error) {
        toast.error("Error al buscar productos");
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(fetchProducts, 300);
    return () => clearTimeout(debounce);
  }, [activeBranch, query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Agregar Producto</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white dark:bg-slate-900 hover:bg-opacity-20 rounded-full p-2 transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 border-b">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto por nombre..."
              className="w-full py-3 pl-12 pr-4 border-2 border-gray-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
              autoFocus
            />
            {isSearching && (
              <FaSpinner className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {query.length < 2 ? (
            <p className="text-center text-gray-400 py-8">
              Escribe al menos 2 caracteres para buscar
            </p>
          ) : isSearching ? (
            <div className="flex flex-col items-center justify-center py-8">
              <FaSpinner className="animate-spin text-4xl text-blue-600 mb-2" />
              <p className="text-gray-400">Buscando productos...</p>
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              No se encontraron productos con stock
            </p>
          ) : (
            <ul className="space-y-2">
              {results.map((product) => (
                <li
                  key={product.id}
                  onClick={() => {
                    onProductAdd(product);
                    onClose();
                  }}
                  className="p-4 border-2 border-gray-200 dark:border-slate-700 rounded-xl flex justify-between items-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all group"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-slate-100 group-hover:text-blue-600">
                      {product.name}
                    </p>
                    <p className="text-sm text-green-600 font-medium mt-1">
                      ${product.price_minorista}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                      Stock: {product.stock}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
