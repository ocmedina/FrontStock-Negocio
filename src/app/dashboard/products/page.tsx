"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import ProductActions from "@/components/ProductActions";
import ProductListDownloadButton from "@/components/pdf/ProductListDownloadButton";
import { Database } from "@/lib/database.types";
import toast from "react-hot-toast";
import {
  FaUpload,
  FaSearch,
  FaPlus,
  FaBoxes,
  FaBarcode,
  FaTag,
  FaTags,
  FaDollarSign,
  FaCubes,
  FaChevronLeft,
  FaChevronRight,
  FaChartBar,
  FaInbox,
  FaFilter,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBan,
  FaPercentage,
  FaFileExcel,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import MassUpdateModal from "./components/MassUpdateModal";
import BarcodeModal from "./components/BarcodeModal";

type Product = Database["public"]["Tables"]["products"]["Row"];
const ITEMS_PER_PAGE = 10;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState("all"); // all, sin_stock, stock_bajo, con_stock
  const [stats, setStats] = useState({
    sinStock: 0,
    stockBajo: 0,
    conStock: 0,
    total: 0,
  });
  const [isMassUpdateModalOpen, setIsMassUpdateModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [areActionsOpen, setAreActionsOpen] = useState(false);

  const isProductSelected = (productId: string) =>
    selectedProducts.some((item) => item.id === productId);

  const toggleProductSelection = (product: Product) => {
    setSelectedProducts((prev) => {
      if (prev.some((item) => item.id === product.id)) {
        return prev.filter((item) => item.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const allSelectedOnPage =
    products.length > 0 &&
    products.every((product) =>
      selectedProducts.some((item) => item.id === product.id)
    );

  const toggleSelectAllCurrentPage = () => {
    setSelectedProducts((prev) => {
      const selectedIds = new Set(prev.map((item) => item.id));
      const allSelected =
        products.length > 0 &&
        products.every((product) => selectedIds.has(product.id));

      if (allSelected) {
        return prev.filter(
          (item) => !products.some((product) => product.id === item.id)
        );
      }

      const additions = products.filter(
        (product) => !selectedIds.has(product.id)
      );
      return [...prev, ...additions];
    });
  };

  const clearSelection = () => setSelectedProducts([]);

  // Obtener rol del usuario una sola vez
  useEffect(() => {
    const fetchUserRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const roleFromMetadata = session.user.user_metadata?.role as
          | string
          | undefined;

        if (roleFromMetadata) {
          setUserRole(roleFromMetadata);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (profile?.role) {
          setUserRole(profile.role);
        }
      }
    };
    fetchUserRole();
  }, []);

  // Obtener estadísticas de stock
  useEffect(() => {
    const fetchStats = async () => {
      const [totalRes, sinStockRes, stockBajoRes, conStockRes] =
        await Promise.all([
          supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true),
          supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .eq("stock", 0),
          supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .gt("stock", 0)
            .lte("stock", 10),
          supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .gt("stock", 10),
        ]);

      setStats({
        total: totalRes.count || 0,
        sinStock: sinStockRes.count || 0,
        stockBajo: stockBajoRes.count || 0,
        conStock: conStockRes.count || 0,
      });
    };
    fetchStats();
  }, [refreshKey]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("is_active", true)
        .order("name", { ascending: true });

      // Si hay un término de búsqueda, filtrar
      if (searchTerm.trim()) {
        query = query.or(
          `name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`
        );
      }

      // Filtrar por stock
      if (stockFilter === "sin_stock") {
        query = query.eq("stock", 0);
      } else if (stockFilter === "stock_bajo") {
        query = query.gt("stock", 0).lte("stock", 10);
      } else if (stockFilter === "con_stock") {
        query = query.gt("stock", 10);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) {
        console.error("Error fetching products:", error);
      } else {
        setProducts(data || []);
        setTotalCount(count || 0);
      }
      setLoading(false);
    };

    // Debounce para la búsqueda
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [currentPage, searchTerm, stockFilter, refreshKey]);

  // Resetear a página 1 cuando se busca o cambia el filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stockFilter]);

  const handleExportCurrentStock = async () => {
    try {
      const XLSX = await import("xlsx");

      let query = supabase
        .from("products")
        .select("sku, name, price_minorista, price_mayorista, stock")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
      }

      if (stockFilter === "sin_stock") {
        query = query.eq("stock", 0);
      } else if (stockFilter === "stock_bajo") {
        query = query.gt("stock", 0).lte("stock", 10);
      } else if (stockFilter === "con_stock") {
        query = query.gt("stock", 10);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No hay productos para exportar con los filtros actuales");
        return;
      }

      const rows = data.map((product) => ({
        SKU: product.sku || "",
        Nombre: product.name || "",
        PrecioMinorista: Number(product.price_minorista ?? 0),
        PrecioMayorista: Number(product.price_mayorista ?? 0),
        Stock: Number(product.stock ?? 0),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: ["SKU", "Nombre", "PrecioMinorista", "PrecioMayorista", "Stock"],
      });
      worksheet["!cols"] = [
        { wch: 20 },
        { wch: 40 },
        { wch: 16 },
        { wch: 16 },
        { wch: 10 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "StockActual");

      const exportDate = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `stock_actual_${exportDate}.xlsx`);
      toast.success("Stock actual exportado correctamente");
    } catch (error: any) {
      console.error("Error exporting stock:", error);
      toast.error("No se pudo exportar el stock actual");
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <FaBoxes className="text-blue-600" /> Gestión de Productos
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mt-1">
            Administra tu inventario y precios
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full lg:w-auto">
          <button
            onClick={() => setAreActionsOpen((prev) => !prev)}
            className="lg:hidden w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm flex items-center justify-between text-gray-700 dark:text-slate-200 font-semibold"
          >
            Acciones
            {areActionsOpen ? <FaChevronUp /> : <FaChevronDown />}
          </button>
          <div
            className={`${areActionsOpen ? "grid" : "hidden"} grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:gap-3`}
          >
            <button
              onClick={handleExportCurrentStock}
              className="col-span-2 sm:col-span-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-lg hover:from-emerald-700 hover:to-green-800 shadow-md transition-all font-semibold flex items-center justify-center gap-2 text-sm"
            >
              <FaFileExcel /> Exportar Stock
            </button>
            <button
              onClick={() => setIsMassUpdateModalOpen(true)}
              className="col-span-2 sm:col-span-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-md transition-all font-semibold flex items-center justify-center gap-2 text-sm"
            >
              <FaPercentage /> Actualización
            </button>
            <button
              onClick={() => setIsBarcodeModalOpen(true)}
              className="col-span-2 sm:col-span-1 px-4 py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-800 hover:to-gray-900 shadow-md transition-all font-semibold flex items-center justify-center gap-2 text-sm"
            >
              <FaBarcode /> Etiquetas
            </button>
            <Link
              href="/dashboard/clasificacion"
              className="col-span-2 sm:col-span-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 shadow-md transition-all font-semibold flex items-center justify-center gap-2 text-sm"
            >
              <FaTags /> Clasificación
            </Link>
            <Link
              href="/dashboard/products/importar"
              className="col-span-2 sm:col-span-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 shadow-md transition-all font-semibold flex items-center justify-center gap-2 text-sm"
            >
              <FaUpload /> Importar Excel
            </Link>
            <Link
              href="/dashboard/products/new"
              className="col-span-2 sm:col-span-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md transition-all font-semibold flex items-center justify-center gap-2 text-sm"
            >
              <FaPlus /> Agregar Producto
            </Link>
          </div>
        </div>
      </div>

      {/* ESTADÍSTICAS DE STOCK */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {/* Total de productos */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 md:p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium opacity-90">Total Productos</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <div className="w-9 h-9 md:w-12 md:h-12 bg-white dark:bg-slate-900/20 rounded-full flex items-center justify-center">
              <FaBoxes className="text-lg md:text-2xl text-blue-600" />
            </div>
          </div>
        </div>

        {/* Sin stock */}
        <button
          onClick={() => setStockFilter("sin_stock")}
          className={`bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-4 md:p-5 text-white hover:shadow-xl transition-all ${stockFilter === "sin_stock" ? "ring-4 ring-red-300" : ""
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium opacity-90">Sin Stock</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{stats.sinStock}</p>
            </div>
            <div className="w-9 h-9 md:w-12 md:h-12 bg-white dark:bg-slate-900/20 rounded-full flex items-center justify-center">
              <FaBan className="text-lg md:text-2xl text-red-600" />
            </div>
          </div>
        </button>

        {/* Stock bajo */}
        <button
          onClick={() => setStockFilter("stock_bajo")}
          className={`bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-4 md:p-5 text-white hover:shadow-xl transition-all ${stockFilter === "stock_bajo" ? "ring-4 ring-yellow-300" : ""
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium opacity-90">
                Stock Bajo (1-10)
              </p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{stats.stockBajo}</p>
            </div>
            <div className="w-9 h-9 md:w-12 md:h-12 bg-white dark:bg-slate-900/20 rounded-full flex items-center justify-center">
              <FaExclamationTriangle className="text-lg md:text-2xl text-yellow-600" />
            </div>
          </div>
        </button>

        {/* Con stock */}
        <button
          onClick={() => setStockFilter("con_stock")}
          className={`bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 md:p-5 text-white hover:shadow-xl transition-all ${stockFilter === "con_stock" ? "ring-4 ring-green-300" : ""
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium opacity-90">
                Con Stock (&gt;10)
              </p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{stats.conStock}</p>
            </div>
            <div className="w-9 h-9 md:w-12 md:h-12 bg-white dark:bg-slate-900/20 rounded-full flex items-center justify-center">
              <FaCheckCircle className="text-lg md:text-2xl text-green-600" />
            </div>
          </div>
        </button>
      </div>

      {/* BUSCADOR Y FILTROS */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg mb-6 p-6 border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Barra de búsqueda */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Buscar productos por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-700 dark:text-slate-200 font-medium bg-white dark:bg-slate-800 placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Filtro de stock */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <FaFilter className="text-gray-400 text-lg" />
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              aria-label="Filtrar por stock"
              className="w-full sm:min-w-[200px] px-4 py-3 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-700 dark:text-slate-200 font-medium bg-white dark:bg-slate-800"
            >
              <option value="all">📦 Todos los productos</option>
              <option value="sin_stock">❌ Sin stock (0)</option>
              <option value="stock_bajo">⚠️ Stock bajo (1-10)</option>
              <option value="con_stock">✅ Con stock (&gt;10)</option>
            </select>
          </div>
        </div>

        {/* Indicadores de búsqueda/filtro activos */}
        {(searchTerm || stockFilter !== "all") && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {searchTerm && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-900 text-sm font-medium">
                <FaSearch />
                <span>Búsqueda: "{searchTerm}"</span>
                <button
                  onClick={() => setSearchTerm("")}
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  ×
                </button>
              </div>
            )}
            {stockFilter !== "all" && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg border border-purple-200 dark:border-purple-900 text-sm font-medium">
                <FaFilter />
                <span>
                  Filtro:{" "}
                  {stockFilter === "sin_stock"
                    ? "Sin stock"
                    : stockFilter === "stock_bajo"
                      ? "Stock bajo"
                      : "Con stock"}
                </span>
                <button
                  onClick={() => setStockFilter("all")}
                  className="ml-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                >
                  ×
                </button>
              </div>
            )}
            {totalCount > 0 && (
              <div className="px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-900 text-sm font-semibold">
                {totalCount} resultado{totalCount !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={allSelectedOnPage}
              onChange={toggleSelectAllCurrentPage}
              disabled={loading || products.length === 0}
              aria-label="Seleccionar todos los productos de la pagina"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Seleccionar pagina actual
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold">
              Seleccionados: {selectedProducts.length}
            </span>
            <button
              onClick={clearSelection}
              disabled={selectedProducts.length === 0}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Limpiar seleccion
            </button>
            <ProductListDownloadButton
              products={selectedProducts}
              disabled={selectedProducts.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2"
            />
          </div>
        </div>
      </div>

      {/* TABLA DE PRODUCTOS (Desktop) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={toggleSelectAllCurrentPage}
                      disabled={loading || products.length === 0}
                      aria-label="Seleccionar todos los productos de la pagina"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Sel.
                  </label>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaBarcode /> SKU
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaTag /> Nombre
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaDollarSign /> Precio Minorista
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaDollarSign /> Precio Mayorista
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaCubes /> Stock
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <span className="text-gray-500 dark:text-slate-400 font-medium">
                        Cargando productos...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <FaInbox className="text-6xl text-gray-300" />
                      <span className="text-gray-500 dark:text-slate-400 font-medium">
                        {searchTerm
                          ? "No se encontraron productos con ese criterio"
                          : "No hay productos registrados"}
                      </span>
                      {searchTerm && (
                        <span className="text-gray-400 text-sm">
                          Intenta con otro término de búsqueda
                        </span>
                      )}
                      {!searchTerm && (
                        <Link
                          href="/dashboard/products/new"
                          className="mt-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center gap-2"
                        >
                          <FaPlus /> Agregar primer producto
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isProductSelected(product.id)}
                        onChange={() => toggleProductSelection(product)}
                        aria-label={`Seleccionar ${product.name}`}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FaBarcode className="text-gray-400" />
                        <span className="text-sm font-mono text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {product.sku}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-slate-50">
                          {product.name}
                        </span>
                        {product.description && (
                          <span className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 italic">
                            {product.description.length > 50
                              ? product.description.substring(0, 50) + "..."
                              : product.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm font-bold text-green-600">
                        <FaDollarSign />
                        {product.price_minorista?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm font-bold text-blue-600">
                        <FaDollarSign />
                        {product.price_mayorista?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${product.stock === 0
                          ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-2 border-red-400 dark:border-red-900"
                          : product.stock <= 10
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-2 border-yellow-400 dark:border-yellow-900"
                            : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-2 border-green-400 dark:border-green-900"
                          }`}
                      >
                        {product.stock === 0 ? (
                          <>
                            <FaBan /> Sin stock
                          </>
                        ) : product.stock <= 10 ? (
                          <>
                            <FaExclamationTriangle /> {product.stock} uds
                          </>
                        ) : (
                          <>
                            <FaCheckCircle /> {product.stock} uds
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <ProductActions
                        productId={product.id}
                        userRole={userRole}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TARJETAS DE PRODUCTOS (Mobile) */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="text-gray-500 dark:text-slate-400 font-medium">
                Cargando productos...
              </span>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <FaInbox className="text-6xl text-gray-300" />
              <span className="text-gray-500 dark:text-slate-400 font-medium">
                {searchTerm
                  ? "No se encontraron productos con ese criterio"
                  : "No hay productos registrados"}
              </span>
              {!searchTerm && (
                <Link
                  href="/dashboard/products/new"
                  className="mt-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center gap-2"
                >
                  <FaPlus /> Agregar primer producto
                </Link>
              )}
            </div>
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 p-4"
            >
              {/* Header de la tarjeta */}
              <div className="flex justify-between items-start mb-3 gap-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-slate-50 text-lg leading-tight mb-1">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <FaBarcode className="text-gray-400 text-xs" />
                    <span className="text-xs font-mono text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {product.sku}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isProductSelected(product.id)}
                  onChange={() => toggleProductSelection(product)}
                  aria-label={`Seleccionar ${product.name}`}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Detalles */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gray-50 dark:bg-slate-950 p-2 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Minorista</p>
                  <p className="font-bold text-green-600 flex items-center gap-1">
                    <FaDollarSign className="text-xs" />
                    {product.price_minorista?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-950 p-2 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Mayorista</p>
                  <p className="font-bold text-blue-600 flex items-center gap-1">
                    <FaDollarSign className="text-xs" />
                    {product.price_mayorista?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {product.description && (
                <p className="text-xs text-gray-400 italic truncate">
                  {product.description}
                </p>
              )}

              {/* Footer de la tarjeta */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${product.stock === 0
                    ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                    : product.stock <= 10
                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                      : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                    }`}
                >
                  {product.stock === 0 ? (
                    <>
                      <FaBan /> Sin stock
                    </>
                  ) : product.stock <= 10 ? (
                    <>
                      <FaExclamationTriangle /> {product.stock} uds
                    </>
                  ) : (
                    <>
                      <FaCheckCircle /> {product.stock} uds
                    </>
                  )}
                </span>
                <div className="ml-auto">
                  <ProductActions productId={product.id} userRole={userRole} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PAGINACIÓN */}
      <div className="mt-6 mb-24 lg:mb-0 bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="flex items-center justify-center md:justify-start">
            <span className="w-full md:w-auto text-sm font-medium text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 px-4 py-2 rounded-lg flex items-center justify-center md:justify-start gap-2">
              <FaChartBar className="text-blue-600" />
              Mostrando{" "}
              <span className="font-bold text-blue-600">
                {products.length > 0
                  ? (currentPage - 1) * ITEMS_PER_PAGE + 1
                  : 0}
              </span>{" "}
              -{" "}
              <span className="font-bold text-blue-600">
                {(currentPage - 1) * ITEMS_PER_PAGE + products.length}
              </span>{" "}
              de <span className="font-bold">{totalCount}</span> productos
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 text-gray-700 dark:text-slate-200 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:from-gray-200 hover:to-gray-300 dark:hover:from-slate-600 dark:hover:to-slate-500 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              <FaChevronLeft /> Anterior
            </button>
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-lg border-2 border-blue-200 dark:border-slate-600">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                Página <span className="text-blue-600 text-lg">{currentPage}</span> de{" "}
                <span className="text-gray-900 dark:text-slate-50">{Math.max(1, totalPages)}</span>
              </span>
            </div>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 text-gray-700 dark:text-slate-200 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:from-gray-200 hover:to-gray-300 dark:hover:from-slate-600 dark:hover:to-slate-500 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              Siguiente <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      <MassUpdateModal
        isOpen={isMassUpdateModalOpen}
        onClose={() => setIsMassUpdateModalOpen(false)}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />

      <BarcodeModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
      />
    </div>
  );
}
