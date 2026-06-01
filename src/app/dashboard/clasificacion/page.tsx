"use client";

import { useState } from "react";
import BrandsManager from "./components/BrandsManager";
import CategoriesManager from "./components/CategoriesManager";
import { FaTags, FaLayerGroup, FaTag } from "react-icons/fa";

export default function ClassificationPage() {
  const [activeTab, setActiveTab] = useState<"brands" | "categories">("brands");

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <a
              href="/dashboard/products"
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 transition-all font-medium"
            >
              ← Volver a Productos
            </a>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <FaTags className="text-blue-600" /> Clasificación de Productos
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mt-2">
            Gestiona las Marcas y Categorías para organizar tu inventario.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("brands")}
            className={`pb-3 px-4 font-semibold flex items-center gap-2 transition-all border-b-2 ${
              activeTab === "brands"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <FaTag /> Marcas
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`pb-3 px-4 font-semibold flex items-center gap-2 transition-all border-b-2 ${
              activeTab === "categories"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <FaLayerGroup /> Categorías
          </button>
        </div>

        {/* Content */}
        <div className="animate-fadeIn">
          {activeTab === "brands" ? <BrandsManager /> : <CategoriesManager />}
        </div>
      </div>
    </div>
  );
}
