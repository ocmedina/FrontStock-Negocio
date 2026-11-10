"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaBarcode,
  FaTag,
  FaDollarSign,
  FaCubes,
  FaSave,
  FaTimes,
  FaBoxOpen,
  FaStoreAlt,
  FaWarehouse,
  FaArrowLeft,
  FaLayerGroup,
  FaGift,
} from "react-icons/fa";
import toast from "react-hot-toast";
import { useBranch } from "@/contexts/BranchContext";

export default function NewProductPage() {
  const router = useRouter();
  const { branches, activeBranch } = useBranch();
  const [branchStocks, setBranchStocks] = useState<Record<number, number>>({});
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [priceMinorista, setPriceMinorista] = useState("");
  const [priceMayorista, setPriceMayorista] = useState("");
  const [stock, setStock] = useState("");
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Promoción por cantidad
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoBuyQty, setPromoBuyQty] = useState("10");
  const [promoGiftQty, setPromoGiftQty] = useState("1");
  const [promoGiftProductId, setPromoGiftProductId] = useState("same");
  const [productList, setProductList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: brandsData } = await supabase
        .from("brands")
        .select("id, name")
        .order("name");
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name")
        .order("name");

      if (brandsData) setBrands(brandsData);
      if (categoriesData) setCategories(categoriesData);
      if (productsData) setProductList(productsData);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (branches && branches.length > 0) {
      setBranchStocks((prev) => {
        const next = { ...prev };
        branches.forEach((b) => {
          if (next[b.id] === undefined) {
            next[b.id] = 0;
          }
        });
        return next;
      });
    }
  }, [branches]);

  const generateBarcode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const code = `200${timestamp}${random}`;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;

    setBarcode(`${code}${checkDigit}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sku || !name || !priceMinorista || !priceMayorista) {
      toast.error("Por favor, completa todos los campos obligatorios.");
      return;
    }

    if (promoEnabled) {
      const buyQty = parseInt(promoBuyQty, 10);
      const giftQty = parseInt(promoGiftQty, 10);
      if (isNaN(buyQty) || buyQty <= 0 || isNaN(giftQty) || giftQty <= 0) {
        toast.error("Los valores 'Cada X unidades' y 'Regalar Y unidades' deben ser enteros mayores a 0.");
        return;
      }
    }

    const promotionPayload = promoEnabled
      ? {
          enabled: true,
          buyQuantity: parseInt(promoBuyQty, 10),
          giftQuantity: parseInt(promoGiftQty, 10),
          giftProductId: promoGiftProductId === "same" ? null : promoGiftProductId,
        }
      : {
          enabled: false,
          buyQuantity: 0,
          giftQuantity: 0,
          giftProductId: null,
        };

    const loadingToast = toast.loading("Creando producto...");

    const totalStock = branches.length > 0
      ? branches.reduce((sum, b) => sum + (Number(branchStocks[b.id]) || 0), 0)
      : parseInt(stock, 10) || 0;

    const { data, error } = await supabase.from("products").insert([
      {
        sku,
        barcode: barcode || null,
        name,
        cost_price: costPrice ? parseFloat(costPrice) : null,
        price_minorista: parseFloat(priceMinorista),
        price_mayorista: parseFloat(priceMayorista),
        stock: totalStock,
        brand_id: selectedBrand ? parseInt(selectedBrand) : null,
        category_id: selectedCategory ? parseInt(selectedCategory) : null,
        promotion: promotionPayload,
      },
    ]).select("id").single();

    if (error) {
      if (error.code === "23505") {
        const { data: existingProduct, error: existingError } = await supabase
          .from("products")
          .select("id, name")
          .eq("sku", sku)
          .maybeSingle();

        if (!existingError && existingProduct) {
          const branchList = branches.length > 0 ? branches : activeBranch ? [activeBranch] : [];
          for (const b of branchList) {
            const qty = Number(branchStocks[b.id]) || 0;
            if (qty > 0) {
              await (supabase as any).rpc("increment_branch_stock", {
                p_branch_id: b.id,
                p_product_id: existingProduct.id,
                p_quantity: qty,
              });
            }
          }

          toast.success(
            `El producto "${existingProduct.name}" ya existía. Se asignó el stock a las sucursales.`,
            { id: loadingToast }
          );
          router.push("/dashboard/products");
          router.refresh();
          return;
        }
      }
      toast.error(`Error al crear el producto: ${error.message}`, {
        id: loadingToast,
      });
      console.error(error);
    } else {
      const createdProductId = (data as { id: string } | null)?.id;
      if (createdProductId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const branchList = branches.length > 0 ? branches : activeBranch ? [activeBranch] : [];

        for (const b of branchList) {
          const qty = Number(branchStocks[b.id]) || 0;
          await (supabase as any)
            .from("branch_stock")
            .upsert(
              {
                branch_id: b.id,
                product_id: createdProductId,
                stock: qty,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "branch_id,product_id" }
            );

          if (qty > 0) {
            await (supabase as any).from("stock_movements").insert({
              product_id: createdProductId,
              branch_id: b.id,
              user_id: user?.id || null,
              movement_type: "stock_inicial",
              quantity: qty,
              previous_stock: 0,
              new_stock: qty,
              notes: `Stock inicial en ${b.name}`,
            });
          }
        }
      }
      toast.success("✅ Producto creado exitosamente", { id: loadingToast });
      router.push("/dashboard/products");
      router.refresh();
    }
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-full text-slate-800 dark:text-slate-100">
      <div className="max-w-[850px] mx-auto space-y-6">
        
        {/* BOTÓN VOLVER */}
        <div>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-750 dark:text-indigo-400 transition-colors"
          >
            <FaArrowLeft /> Volver al Catálogo
          </Link>
        </div>

        {/* CABECERA */}
        <div className="group relative overflow-hidden rounded-2xl border border-indigo-150 dark:border-indigo-900/40 bg-white dark:bg-slate-900 p-5 shadow-2xs flex items-center gap-4 text-left">
          <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-indigo-50/50 dark:bg-indigo-950/20" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-3xs flex-shrink-0 text-base">
            <FaBoxOpen />
          </span>
          <div className="relative">
            <h1 className="text-lg font-black text-slate-900 dark:text-slate-50 leading-none">
              Agregar Nuevo Producto
            </h1>
            <p className="text-xs text-slate-500 mt-2">
              Completa los siguientes campos para registrar un nuevo producto en tu stock.
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
                  Información Básica
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
                  SKU (Código Interno) *
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

              {/* Código de barras */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                  Código de Barras (Opcional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Escanear o generar..."
                    className="flex-1 px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold bg-slate-50/50 dark:bg-slate-950 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={generateBarcode}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border transition-colors"
                  >
                    Generar
                  </button>
                </div>
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
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
            </div>

            {/* SECCIÓN STOCK INICIAL POR SUCURSAL */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FaWarehouse className="text-emerald-500 text-xs" />
                    Stock Inicial por Sucursal
                  </h3>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500">
                    Definí el stock de entrada para cada sucursal de manera independiente
                  </p>
                </div>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/40 w-fit">
                  Total consolidado: {branches.reduce((acc, b) => acc + (Number(branchStocks[b.id]) || 0), 0)} unidades
                </span>
              </div>

              {branches.length === 0 ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                    Stock Inicial *
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
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {branches.map((b) => {
                    const isCurrent = activeBranch?.id === b.id;
                    return (
                      <div
                        key={b.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isCurrent
                            ? "border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-2xs"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isCurrent ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {b.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-md">
                              Activa
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={branchStocks[b.id] ?? 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setBranchStocks((prev) => ({
                                ...prev,
                                [b.id]: isNaN(val) ? 0 : Math.max(0, val),
                              }));
                            }}
                            className="w-full pl-3 pr-16 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="0"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold pointer-events-none">
                            unidades
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 3: PROMOCIÓN POR CANTIDAD */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-3xs flex-shrink-0 text-sm">
                  <FaGift />
                </span>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">
                    Promoción por cantidad
                  </h2>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                    Configurar regla de regalo ("Cada X unidades vendidas, regalar Y unidades")
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={promoEnabled}
                  onChange={(e) => setPromoEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  Activar promoción
                </span>
              </label>
            </div>

            {promoEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 animate-in fade-in duration-200">
                {/* Cada X unidades */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                    Cada X unidades *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={promoBuyQty}
                    onChange={(e) => setPromoBuyQty(e.target.value)}
                    required={promoEnabled}
                    placeholder="Ej: 10"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Cantidad vendida requerida</p>
                </div>

                {/* Regalar Y unidades */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                    Regalar Y unidades *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={promoGiftQty}
                    onChange={(e) => setPromoGiftQty(e.target.value)}
                    required={promoEnabled}
                    placeholder="Ej: 1"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Cantidad entregada de regalo</p>
                </div>

                {/* Selector de producto de regalo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">
                    Producto de regalo
                  </label>
                  <select
                    value={promoGiftProductId}
                    onChange={(e) => setPromoGiftProductId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                  >
                    <option value="same">El mismo producto</option>
                    {productList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Por defecto: El mismo producto</p>
                </div>
              </div>
            )}
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
              <FaSave className="w-3.5 h-3.5" /> Guardar Producto
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
