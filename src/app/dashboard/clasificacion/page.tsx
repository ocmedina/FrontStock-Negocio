"use client";

import { useState, useEffect } from "react";
import BrandsManager from "./components/BrandsManager";
import CategoriesManager from "./components/CategoriesManager";
import {
  FaTags,
  FaLayerGroup,
  FaTag,
  FaBoxes,
  FaExclamationTriangle,
  FaArrowLeft,
  FaPercentage,
} from "react-icons/fa";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ClassificationPage() {
  const [activeTab, setActiveTab] = useState<"categories" | "brands">("categories");
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalBrands: 0,
    classifiedProducts: 0,
    unclassifiedProducts: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      // Fetch categories count
      const { count: catCount } = await supabase
        .from("categories")
        .select("id", { count: "exact", head: true });

      // Fetch brands count
      const { count: brandCount } = await supabase
        .from("brands")
        .select("id", { count: "exact", head: true });

      // Fetch all products classification status in chunks
      let allProducts: { category_id: number | null; brand_id: number | null }[] = [];
      let from = 0;
      const step = 300;

      while (true) {
        const { data: chunk, error: prodErr } = await supabase
          .from("products")
          .select("category_id, brand_id")
          .range(from, from + step - 1);

        if (prodErr) throw prodErr;
        if (!chunk || chunk.length === 0) break;
        allProducts = [...allProducts, ...chunk];
        if (chunk.length < step) break;
        from += step;
      }

      let classified = 0;
      let unclassified = 0;

      allProducts.forEach((p) => {
        if (p.category_id || p.brand_id) {
          classified++;
        } else {
          unclassified++;
        }
      });

      setStats({
        totalCategories: catCount || 0,
        totalBrands: brandCount || 0,
        classifiedProducts: classified,
        unclassifiedProducts: unclassified,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 min-h-full">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
            >
              <FaArrowLeft /> Volver a Productos
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
              <FaTags className="text-purple-600" /> Clasificación y Precios
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Crea categorías y marcas, mete productos de forma masiva y ajusta los precios según tu clasificación.
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Categorías */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
              <FaLayerGroup size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Categorías</span>
              <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                {loadingStats ? "..." : stats.totalCategories}
              </p>
            </div>
          </div>

          {/* Marcas */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              <FaTag size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Marcas</span>
              <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                {loadingStats ? "..." : stats.totalBrands}
              </p>
            </div>
          </div>

          {/* Clasificados */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <FaBoxes size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Prod. Clasificados</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {loadingStats ? "..." : stats.classifiedProducts}
              </p>
            </div>
          </div>

          {/* Sin Clasificar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
              <FaExclamationTriangle size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Sin Clasificar</span>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                {loadingStats ? "..." : stats.unclassifiedProducts}
              </p>
            </div>
          </div>

        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
          <button
            onClick={() => setActiveTab("categories")}
            className={`pb-3 px-5 font-bold text-sm flex items-center gap-2 transition-all border-b-2 ${
              activeTab === "categories"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FaLayerGroup /> Categorías ({stats.totalCategories})
          </button>

          <button
            onClick={() => setActiveTab("brands")}
            className={`pb-3 px-5 font-bold text-sm flex items-center gap-2 transition-all border-b-2 ${
              activeTab === "brands"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FaTag /> Marcas ({stats.totalBrands})
          </button>
        </div>

        {/* Tab View */}
        <div className="animate-fadeIn">
          {activeTab === "categories" ? <CategoriesManager /> : <BrandsManager />}
        </div>

      </div>
    </div>
  );
}
