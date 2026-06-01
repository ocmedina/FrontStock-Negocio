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
  FaInbox,
  FaFilter,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBan,
  FaPercentage,
  FaFileExcel,
  FaChevronDown,
  FaChevronUp,
  FaFilePdf,
} from "react-icons/fa";
import MassUpdateModal from "./components/MassUpdateModal";
import BarcodeModal from "./components/BarcodeModal";
import CustomPricesModal from "./components/CustomPricesModal";

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
  const [isCustomPricesModalOpen, setIsCustomPricesModalOpen] = useState(false);
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

      if (searchTerm.trim()) {
        query = query.or(
          `name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`
        );
      }

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

    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [currentPage, searchTerm, stockFilter, refreshKey]);

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
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-full text-slate-800 dark:text-slate-100">
      <div className="max-w-[1250px] mx-auto space-y-6">
        
        {/* CABECERA */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-slate-55 flex items-center gap-2">
              <FaBoxes className="text-indigo-600 w-5 h-5" /> Catálogo de Productos
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Administra e inspecciona el inventario, marcas, categorías y listas de precios.
            </p>
          </div>
          
          <div className="flex flex-col gap-2 w-full lg:w-auto">
            <button
              onClick={() => setAreActionsOpen((prev) => !prev)}
              className="lg:hidden w-full px-4 py-2 bg-white dark:bg-slate-900 border rounded-xl shadow-sm flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-205"
            >
              <span>Acciones Catálogo</span>
              {areActionsOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            
            <div
              className={`${
                areActionsOpen ? "flex" : "hidden"
              } flex-col sm:grid sm:grid-cols-2 gap-2 lg:flex lg:flex-row lg:items-center lg:gap-2`}
            >
              <button
                onClick={handleExportCurrentStock}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border transition-colors"
              >
                <FaFileExcel className="text-emerald-500 w-3.5 h-3.5" />
                Exportar Excel
              </button>
              
              <button
                onClick={() => setIsMassUpdateModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border transition-colors"
              >
                <FaPercentage className="text-purple-500 w-3.5 h-3.5" />
                Ajustar Precios
              </button>
              
              <button
                onClick={() => setIsBarcodeModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border transition-colors"
              >
                <FaBarcode className="text-slate-500 w-3.5 h-3.5" />
                Etiquetas
              </button>
              
              <Link
                href="/dashboard/clasificacion"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border transition-colors"
              >
                <FaTags className="text-orange-500 w-3.5 h-3.5" />
                Clasificación
              </Link>
              
              <Link
                href="/dashboard/products/importar"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border transition-colors"
              >
                <FaUpload className="text-green-500 w-3.5 h-3.5" />
                Importar
              </Link>
              
              <Link
                href="/dashboard/products/new"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-colors"
              >
                <FaPlus className="w-3 h-3" />
                Agregar Producto
              </Link>
            </div>
          </div>
        </div>

        {/* METRICAS DE STOCK */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Total */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Catálogo Total</span>
              <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{stats.total}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-450 dark:text-slate-500 flex items-center justify-center border">
              <FaBoxes className="w-4 h-4" />
            </div>
          </div>

          {/* Sin Stock */}
          <button
            onClick={() => setStockFilter(stockFilter === "sin_stock" ? "all" : "sin_stock")}
            className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all text-left group
              ${stockFilter === "sin_stock" ? "border-rose-300 dark:border-rose-900/60 ring-2 ring-rose-50/80 dark:ring-rose-950/20" : "border-slate-150 dark:border-slate-800/80"}`}
          >
            <div>
              <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider block">Sin Stock</span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-455 mt-1 block">{stats.sinStock}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-50/50 dark:bg-rose-950/15 text-rose-500 flex items-center justify-center border border-rose-100/50 dark:border-rose-900/30">
              <FaBan className="w-4 h-4 group-hover:scale-105 transition-transform" />
            </div>
          </button>

          {/* Stock Bajo */}
          <button
            onClick={() => setStockFilter(stockFilter === "stock_bajo" ? "all" : "stock_bajo")}
            className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all text-left group
              ${stockFilter === "stock_bajo" ? "border-amber-300 dark:border-amber-900/60 ring-2 ring-amber-50/80 dark:ring-amber-950/20" : "border-slate-150 dark:border-slate-800/80"}`}
          >
            <div>
              <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider block">Stock Crítico</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-455 mt-1 block">{stats.stockBajo}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-50/50 dark:bg-amber-950/15 text-amber-500 flex items-center justify-center border border-amber-100/50 dark:border-amber-900/30">
              <FaExclamationTriangle className="w-3.5 h-3.5 group-hover:scale-105 transition-transform" />
            </div>
          </button>

          {/* Con Stock */}
          <button
            onClick={() => setStockFilter(stockFilter === "con_stock" ? "all" : "con_stock")}
            className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all text-left group
              ${stockFilter === "con_stock" ? "border-emerald-300 dark:border-emerald-900/60 ring-2 ring-emerald-50/80 dark:ring-emerald-950/20" : "border-slate-150 dark:border-slate-800/80"}`}
          >
            <div>
              <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider block">Con Stock</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-455 mt-1 block">{stats.conStock}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/15 text-emerald-500 flex items-center justify-center border border-emerald-100/50 dark:border-emerald-900/30">
              <FaCheckCircle className="w-4 h-4 group-hover:scale-105 transition-transform" />
            </div>
          </button>

        </div>

        {/* BUSCADOR Y FILTROS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Input buscar */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar productos por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs font-medium bg-slate-50/50 dark:bg-slate-950 placeholder:text-slate-400"
              />
            </div>

            {/* Select stock */}
            <div className="flex items-center gap-2">
              <FaFilter className="text-slate-400 w-3.5 h-3.5" />
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                aria-label="Filtrar por stock"
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 text-slate-700 dark:text-slate-205"
              >
                <option value="all">📦 Todos los productos</option>
                <option value="sin_stock">❌ Sin stock (0)</option>
                <option value="stock_bajo">⚠️ Stock crítico (1-10)</option>
                <option value="con_stock">✅ Con stock (&gt;10)</option>
              </select>
            </div>
          </div>

          {/* Filtros Activos Badges */}
          {(searchTerm || stockFilter !== "all") && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-3xs font-extrabold border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/10 dark:text-indigo-400 dark:border-indigo-900/50">
                  Buscar: "{searchTerm}"
                  <button onClick={() => setSearchTerm("")} className="hover:text-indigo-900 font-black ml-0.5">×</button>
                </span>
              )}
              {stockFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-3xs font-extrabold border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/10 dark:text-purple-400 dark:border-purple-900/50">
                  Stock: {stockFilter === "sin_stock" ? "Agotados" : stockFilter === "stock_bajo" ? "Crítico" : "En Stock"}
                  <button onClick={() => setStockFilter("all")} className="hover:text-purple-900 font-black ml-0.5">×</button>
                </span>
              )}
              {totalCount > 0 && (
                <span className="text-3xs font-bold text-slate-450 dark:text-slate-500">
                  ({totalCount} coincidencias)
                </span>
              )}
            </div>
          )}

          {/* Acciones por Lote */}
          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 font-semibold text-slate-650 dark:text-slate-350 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelectedOnPage}
                  onChange={toggleSelectAllCurrentPage}
                  disabled={loading || products.length === 0}
                  className="h-4 w-4 rounded border-slate-200 text-indigo-650 focus:ring-indigo-500 dark:bg-slate-950"
                />
                Seleccionar página
              </label>

              <span className="text-[10px] font-extrabold bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg border">
                Elegidos: {selectedProducts.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                disabled={selectedProducts.length === 0}
                className="px-3 py-1.5 border rounded-xl text-3xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Limpiar Selección
              </button>
              
              <button
                onClick={() => setIsCustomPricesModalOpen(true)}
                disabled={selectedProducts.length === 0}
                className="px-3.5 py-1.5 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl text-3xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
              >
                <FaFilePdf /> Personalizar Catálogo PDF
              </button>
              
              <ProductListDownloadButton
                products={selectedProducts}
                disabled={selectedProducts.length === 0}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-3xs font-black uppercase tracking-wider shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* TABLA DE PRODUCTOS (Desktop Layout) */}
        <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800/60">
              <thead className="bg-slate-50/50 dark:bg-slate-950/20">
                <tr>
                  <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider w-[60px]">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={toggleSelectAllCurrentPage}
                      disabled={loading || products.length === 0}
                      aria-label="Seleccionar todo"
                      className="h-4 w-4 rounded border-slate-200 text-indigo-650 focus:ring-indigo-500 dark:bg-slate-950"
                    />
                  </th>
                  <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider w-[140px]">
                    SKU
                  </th>
                  <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider w-[160px]">
                    P. Minorista
                  </th>
                  <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider w-[160px]">
                    P. Mayorista
                  </th>
                  <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider w-[140px]">
                    Inventario
                  </th>
                  <th className="px-6 py-3.5 text-right text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider w-[240px]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 bg-white dark:bg-slate-900">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Cargando catálogo...</span>
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                        <FaInbox className="text-3xl text-slate-300 dark:text-slate-700" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">
                          Sin coincidencias en catálogo
                        </span>
                        <span className="text-3xs text-slate-500">
                          {searchTerm
                            ? "Prueba utilizando otros términos de búsqueda o quitando filtros de stock."
                            : "Aún no has registrado ningún producto en tu inventario."}
                        </span>
                        {!searchTerm && (
                          <Link
                            href="/dashboard/products/new"
                            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                          >
                            <FaPlus className="w-2.5 h-2.5" /> Agregar primer producto
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors"
                    >
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isProductSelected(product.id)}
                          onChange={() => toggleProductSelection(product)}
                          aria-label={`Seleccionar ${product.name}`}
                          className="h-4 w-4 rounded border-slate-200 text-indigo-650 focus:ring-indigo-500 dark:bg-slate-950"
                        />
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-550 dark:text-slate-350">
                        <span className="bg-slate-50 dark:bg-slate-950 border px-2 py-0.5 rounded-lg">
                          {product.sku}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {product.name}
                          </span>
                          {product.description && (
                            <span className="text-[10px] text-slate-450 dark:text-slate-500 truncate max-w-[280px] mt-0.5">
                              {product.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {product.price_minorista ? (
                          <span>$ {product.price_minorista.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">Sin precio</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {product.price_mayorista ? (
                          <span>$ {product.price_mayorista.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">Sin precio</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-3xs font-extrabold border ${
                            product.stock === 0
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/10 dark:text-rose-400 dark:border-rose-900/50"
                              : product.stock <= 10
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900/50"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/50"
                          }`}
                        >
                          {product.stock === 0 ? "Agotado" : `${product.stock} unidades`}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right">
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

        {/* TARJETAS DE PRODUCTOS (Mobile Layout) */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block mt-2">Cargando...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border p-6 text-center">
              <span className="text-xs text-slate-500">Sin productos disponibles.</span>
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 p-4 space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-50 leading-tight">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-slate-500">
                      <span>SKU:</span>
                      <span className="bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 rounded border">
                        {product.sku}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isProductSelected(product.id)}
                    onChange={() => toggleProductSelection(product)}
                    aria-label={`Seleccionar ${product.name}`}
                    className="h-4 w-4 rounded border-slate-200 text-indigo-650 focus:ring-indigo-500 dark:bg-slate-950"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50/50 dark:bg-slate-950 p-2 rounded-xl border">
                    <span className="text-3xs text-slate-550 block">Minorista</span>
                    <span className="font-extrabold text-slate-850 dark:text-slate-100 mt-0.5 block">
                      $ {product.price_minorista?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-950 p-2 rounded-xl border">
                    <span className="text-3xs text-slate-550 block">Mayorista</span>
                    <span className="font-extrabold text-slate-850 dark:text-slate-100 mt-0.5 block">
                      $ {product.price_mayorista?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-3xs font-extrabold border ${
                      product.stock === 0
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/10"
                        : product.stock <= 10
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/10"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/10"
                    }`}
                  >
                    {product.stock === 0 ? "Agotado" : `Stock: ${product.stock}`}
                  </span>
                  
                  <ProductActions productId={product.id} userRole={userRole} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* PAGINACIÓN */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold">
            <span className="text-slate-500">
              Mostrando {products.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} a {(currentPage - 1) * ITEMS_PER_PAGE + products.length} de {totalCount} productos
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="px-3.5 py-1.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-40 transition-colors inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-202"
              >
                <FaChevronLeft className="w-2.5 h-2.5" /> Anterior
              </button>

              <span className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border text-slate-700 dark:text-slate-250 font-bold">
                Página {currentPage} de {Math.max(1, totalPages)}
              </span>

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="px-3.5 py-1.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-40 transition-colors inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-202"
              >
                Siguiente <FaChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>
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

      <CustomPricesModal
        isOpen={isCustomPricesModalOpen}
        onClose={() => setIsCustomPricesModalOpen(false)}
        selectedProducts={selectedProducts}
      />
    </div>
  );
}
