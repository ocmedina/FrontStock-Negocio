"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Database } from "@/lib/database.types";
import {
  FaBarcode,
  FaTag,
  FaDollarSign,
  FaCubes,
  FaSave,
  FaEdit,
  FaStoreAlt,
  FaWarehouse,
  FaLayerGroup,
  FaArrowLeft,
} from "react-icons/fa";
import toast from "react-hot-toast";

type Product = Database["public"]["Tables"]["products"]["Row"];

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [priceMinorista, setPriceMinorista] = useState("");
  const [priceMayorista, setPriceMayorista] = useState("");
  const [stock, setStock] = useState("");
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data: brandsData } = await supabase
        .from("brands")
        .select("*")
        .order("name");
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (brandsData) setBrands(brandsData);
      if (categoriesData) setCategories(categoriesData);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setProduct(data);
        setSku(data.sku);
        setName(data.name);
        setCostPrice(data.cost_price?.toString() || "");
        setPriceMinorista(data.price_minorista?.toString() || "");
        setPriceMayorista(data.price_mayorista?.toString() || "");
        setStock(data.stock?.toString() || "");
        setSelectedBrand(data.brand_id?.toString() || "");
        setSelectedCategory(data.category_id?.toString() || "");
      } else {
        console.error("Error fetching product:", error);
        router.push("/dashboard/products");
      }
    };

    fetchProduct();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sku || !name || !priceMinorista || !priceMayorista || !stock) {
      toast.error("Por favor, completa todos los campos.");
      return;
    }

    const loadingToast = toast.loading("Actualizando producto...");

    try {
      const currentStock = product?.stock || 0;
      const newStock = parseInt(stock, 10);
      const stockDiff = newStock - currentStock;

      const updateData: any = {
        sku,
        name,
        cost_price: costPrice ? parseFloat(costPrice) : null,
        price_minorista: parseFloat(priceMinorista),
        price_mayorista: parseFloat(priceMayorista),
        brand_id: selectedBrand ? parseInt(selectedBrand) : null,
        category_id: selectedCategory ? parseInt(selectedCategory) : null,
      };

      if (stockDiff === 0) {
        updateData.stock = newStock;
      }

      const { error: updateError } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", id);

      if (updateError) throw updateError;

      if (stockDiff !== 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error: movementError } = await supabase.rpc(
          "log_stock_movement",
          {
            p_product_id: id,
            p_movement_type: "ajuste_manual",
            p_quantity: stockDiff,
            p_user_id: user?.id || null,
            p_notes: "Ajuste manual desde edición de producto",
          }
        );

        if (movementError) throw movementError;
      }

      toast.success("✅ Producto actualizado exitosamente", {
        id: loadingToast,
      });
      router.push("/dashboard/products");
      router.refresh();
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast.error(`Error al actualizar: ${error.message}`, {
        id: loadingToast,
      });
    }
  };

  if (!product) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Cargando producto...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-full text-slate-800 dark:text-slate-100">
      <div className="max-w-[850px] mx-auto space-y-6">
        
        {/* BOTÓN VOLVER */}
        <div>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-755 dark:text-indigo-400 transition-colors"
          >
            <FaArrowLeft /> Volver al Catálogo
          </Link>
        </div>

        {/* CABECERA */}
        <div className="group relative overflow-hidden rounded-2xl border border-indigo-150 dark:border-indigo-900/40 bg-white dark:bg-slate-900 p-5 shadow-2xs flex items-center gap-4 text-left">
          <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-indigo-50/50 dark:bg-indigo-950/20" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-3xs flex-shrink-0 text-base">
            <FaEdit />
          </span>
          <div className="relative">
            <h1 className="text-lg font-black text-slate-900 dark:text-slate-50 leading-none">
              Editar Producto
            </h1>
            <p className="text-xs text-slate-500 mt-2">
              Editando la información de: <span className="font-bold text-slate-850 dark:text-slate-100">{product.name}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECCIÓN 1: IDENTIFICACIÓN Y DETALLES */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-3xs flex-shrink-0 text-sm">
                <FaTag />
              </span>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">
                  Información del Producto
                </h2>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                  Identificación general, SKU y código de barras
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ej: Alimento Balanceado Perros Adultos 15kg"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 placeholder:text-slate-400"
                />
              </div>

              {/* SKU */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                  SKU (Código) *
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                  placeholder="Ej: ALIM-PERR-001"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold bg-slate-50/50 dark:bg-slate-950 placeholder:text-slate-400"
                />
              </div>

              {/* Código de barras read-only or customizable */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                  Código de Barras
                </label>
                <input
                  type="text"
                  value={product.barcode || "Sin registrar"}
                  disabled
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-950/40 text-slate-450 dark:text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: CLASIFICACIÓN */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-3xs flex-shrink-0 text-sm">
                <FaLayerGroup />
              </span>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">
                  Clasificación y Filtros
                </h2>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                  Asigna marcas y categorías para organizar el catálogo
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Marca */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                  Marca
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950"
                >
                  <option value="">Seleccionar Marca...</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-355 mb-1.5">
                  Categoría
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950"
                >
                  <option value="">Seleccionar Categoría...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: PRECIOS Y STOCK */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-3xs flex-shrink-0 text-sm">
                <FaDollarSign />
              </span>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">
                  Lista de Precios y Stock
                </h2>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                  Costos de adquisición, precios de venta y control de stock
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Costo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                  Costo de Adquisición
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-450 dark:text-slate-500 font-bold text-xs">$</span>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Precio Minorista */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-355 mb-1.5">
                  Precio Minorista *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-450 dark:text-slate-500 font-bold text-xs">$</span>
                  <input
                    type="number"
                    value={priceMinorista}
                    onChange={(e) => setPriceMinorista(e.target.value)}
                    required
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Precio Mayorista */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-355 mb-1.5">
                  Precio Mayorista *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-450 dark:text-slate-500 font-bold text-xs">$</span>
                  <input
                    type="number"
                    value={priceMayorista}
                    onChange={(e) => setPriceMayorista(e.target.value)}
                    required
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-355 mb-1.5">
                  Stock Actual *
                </label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                  placeholder="0"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-755 text-white text-xs font-extrabold rounded-xl shadow-sm transition-colors"
            >
              <FaSave className="w-3.5 h-3.5" /> Actualizar Producto
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
