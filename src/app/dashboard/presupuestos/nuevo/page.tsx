"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Database } from "@/lib/database.types";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaBox,
  FaCheckCircle,
  FaMinus,
  FaPlus,
  FaSearch,
  FaShoppingCart,
  FaTrash,
  FaUser,
  FaFileInvoiceDollar,
  FaUndo,
  FaArrowRight,
} from "react-icons/fa";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type CartItem = Product & { quantity: number; price: number; isCustomPrice?: boolean };

export default function NewBudgetPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"catalog" | "cart">("catalog");

  useEffect(() => {
    const loadInitialData = async () => {
      const loadingToast = toast.loading("Cargando datos...");

      const [{ data: customersData, error: customersError }, { data: productsData, error: productsError }, sessionRes] = await Promise.all([
        supabase.from("customers").select("*").eq("is_active", true).order("full_name"),
        supabase.from("products").select("*").eq("is_active", true).order("name"),
        supabase.auth.getSession(),
      ]);

      if (customersError || productsError) {
        toast.error("Error al cargar datos", { id: loadingToast });
        return;
      }

      setCustomers(customersData || []);
      setProducts(productsData || []);
      setFilteredCustomers(customersData || []);
      setFilteredProducts(productsData || []);
      setCurrentUser(sessionRes.data.session?.user ?? null);
      toast.success("Datos cargados", { id: loadingToast });
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!customerSearchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const query = customerSearchQuery.toLowerCase();
    setFilteredCustomers(
      customers.filter(
        (customer) =>
          customer.full_name.toLowerCase().includes(query) ||
          customer.customer_type?.toLowerCase().includes(query)
      )
    );
  }, [customerSearchQuery, customers]);

  useEffect(() => {
    if (!productSearchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const query = productSearchQuery.toLowerCase();
    setFilteredProducts(
      products.filter((product) => product.name.toLowerCase().includes(query))
    );
  }, [productSearchQuery, products]);

  // Update cart prices if selected customer changes and prices aren't customized
  useEffect(() => {
    if (!selectedCustomer) return;
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.isCustomPrice) return item;
        const newPrice = selectedCustomer.customer_type === "mayorista"
          ? item.price_mayorista
          : item.price_minorista;
        return { ...item, price: newPrice ?? 0 };
      })
    );
  }, [selectedCustomer]);

  const total = useMemo(() => {
    return cart.reduce((acc, item) => {
      return acc + (item.price || 0) * item.quantity;
    }, 0);
  }, [cart]);

  const getPrice = (product: Product) => {
    if (!selectedCustomer) return 0;
    return selectedCustomer.customer_type === "mayorista"
      ? product.price_mayorista
      : product.price_minorista;
  };

  const handleAddProduct = (product: Product) => {
    if (!selectedCustomer) {
      toast.error("Selecciona un cliente primero");
      return;
    }

    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
      return;
    }

    const initialPrice = getPrice(product) ?? 0;
    setCart([...cart, { ...product, quantity: 1, price: initialPrice, isCustomPrice: false }]);
  };

  const handleUpdatePrice = (productId: string, newPrice: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === productId) {
          const defaultPrice = selectedCustomer?.customer_type === "mayorista"
            ? item.price_mayorista
            : item.price_minorista;
          const isCustom = newPrice !== defaultPrice;
          return { ...item, price: newPrice, isCustomPrice: isCustom };
        }
        return item;
      })
    );
  };

  const handleResetPrice = (productId: string) => {
    const originalProduct = products.find((p) => p.id === productId);
    if (!originalProduct) return;
    const originalPrice = getPrice(originalProduct) ?? 0;
    setCart(
      cart.map((item) =>
        item.id === productId
          ? { ...item, price: originalPrice, isCustomPrice: false }
          : item
      )
    );
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    const item = cart.find((cartItem) => cartItem.id === productId);
    if (!item) return;

    const nextQuantity = item.quantity + delta;

    if (nextQuantity <= 0) {
      setCart(cart.filter((cartItem) => cartItem.id !== productId));
      return;
    }

    setCart(
      cart.map((cartItem) =>
        cartItem.id === productId ? { ...cartItem, quantity: nextQuantity } : cartItem
      )
    );
  };

  const handleCreateBudget = async () => {
    if (!selectedCustomer || cart.length === 0 || !currentUser?.id) {
      toast.error("Faltan datos para crear el presupuesto");
      return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading("Guardando presupuesto...");

    try {
      const now = new Date();
      const argentinaTime = new Date(
        now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
      );

      const { data: budgetData, error: budgetError } = await (supabase as any)
        .from("budgets")
        .insert({
          customer_id: selectedCustomer.id,
          profile_id: currentUser.id,
          total_amount: total,
          status: "activo",
          created_at: argentinaTime.toISOString(),
        })
        .select()
        .single();

      if (budgetError || !budgetData) {
        throw new Error(budgetError?.message || "No se pudo crear el presupuesto");
      }

      const itemsPayload = cart.map((item) => ({
        budget_id: budgetData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("budget_items")
        .insert(itemsPayload);

      if (itemsError) {
        throw new Error(itemsError.message);
      }

      toast.success("Presupuesto creado", { id: loadingToast });
      router.push("/dashboard/presupuestos");
    } catch (error: any) {
      toast.error(error.message || "Error guardando presupuesto", { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/60 dark:border-slate-800 p-6 shadow-sm bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Generación de Presupuestos</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-slate-50 mt-1 flex items-center gap-3">
                <FaFileInvoiceDollar className="text-blue-600 dark:text-blue-400 animate-pulse" /> Nuevo Presupuesto
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Crea cotizaciones personalizadas sin afectar el stock físico.
              </p>
            </div>

            <button
              onClick={() => router.push("/dashboard/presupuestos")}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl transition-all font-semibold flex items-center justify-center gap-2 text-sm shadow-sm self-start sm:self-center"
            >
              <FaArrowLeft className="w-3.5 h-3.5" /> Volver
            </button>
          </div>
        </div>

        {/* Tab switcher for mobile */}
        <div className="flex lg:hidden bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-gray-200 dark:border-slate-800/80 shadow-sm mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`flex-1 py-2.5 text-center font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2 ${
              activeTab === "catalog"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 dark:text-slate-400 hover:bg-gray-100/80 dark:hover:bg-slate-800/80"
            }`}
          >
            <FaBox className="w-3.5 h-3.5" /> 1. Catálogo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cart")}
            className={`flex-1 py-2.5 text-center font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2 relative ${
              activeTab === "cart"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 dark:text-slate-400 hover:bg-gray-100/80 dark:hover:bg-slate-800/80"
            }`}
          >
            <FaShoppingCart className="w-3.5 h-3.5" /> 2. Resumen
            {totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>

        {/* Main Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24 lg:pb-6">
          
          {/* Catalog Panel (Selected Customer & Products catalog) */}
          <div className={`lg:col-span-2 space-y-6 ${activeTab === "catalog" ? "block" : "hidden lg:block"}`}>
            
            {/* Step 1: Customer Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-50 flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-black">1</span>
                Cliente
              </h2>

              {!selectedCustomer ? (
                <div className="space-y-4">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(event) => setCustomerSearchQuery(event.target.value)}
                      placeholder="Buscar cliente por nombre o tipo..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-800">
                    {filteredCustomers.length === 0 ? (
                      <p className="text-center py-6 text-xs text-gray-400">No se encontraron clientes.</p>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => setSelectedCustomer(customer)}
                          className="w-full text-left p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {customer.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-gray-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">{customer.full_name}</p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{customer.customer_type || "No especificado"}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 font-bold uppercase rounded-full ${
                            customer.customer_type === "mayorista"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          }`}>
                            {customer.customer_type || "Minorista"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900/40 dark:to-indigo-950/20 p-4.5 rounded-xl border border-blue-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                      {selectedCustomer.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-slate-50 text-base">{selectedCustomer.full_name}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className={`text-[10px] px-2.5 py-0.5 font-bold uppercase rounded-full ${
                          selectedCustomer.customer_type === "mayorista"
                            ? "bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                            : "bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}>
                          {selectedCustomer.customer_type === "mayorista" ? "Mayorista" : "Minorista"}
                        </span>
                        {selectedCustomer.phone && (
                          <span className="text-xs text-gray-500 dark:text-slate-400">Tel: {selectedCustomer.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCart([]);
                    }}
                    className="px-4 py-2 border border-red-200 hover:border-red-300 text-red-600 dark:text-red-400 bg-white dark:bg-slate-900 rounded-lg text-xs font-bold hover:bg-red-50 dark:hover:bg-slate-950 transition-all flex items-center justify-center gap-1.5 self-start sm:self-center"
                  >
                    Cambiar Cliente
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Catalog Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-50 flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-black">2</span>
                Catálogo de Productos
              </h2>

              {!selectedCustomer ? (
                <div className="text-center py-10 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50/50 dark:bg-slate-950/20">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-slate-800/30 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FaUser className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Selecciona un cliente para comenzar</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">Los precios de los productos se adaptarán según el tipo de tarifa asignada al cliente.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(event) => setProductSearchQuery(event.target.value)}
                      placeholder="Buscar producto por nombre o código..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-800">
                    {filteredProducts.length === 0 ? (
                      <div className="col-span-full py-10 text-center text-xs text-gray-400">No se encontraron productos.</div>
                    ) : (
                      filteredProducts.map((product) => {
                        const cartItem = cart.find((item) => item.id === product.id);
                        return (
                          <div
                            key={product.id}
                            className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800/80 p-4 hover:shadow-md transition-all flex flex-col justify-between gap-3 group relative overflow-hidden"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-gray-950 dark:text-slate-50 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {product.name}
                                </h4>
                                <span className={`text-[10px] px-2 py-0.5 font-bold rounded-full ${
                                  (product.stock || 0) > 10
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                    : (product.stock || 0) > 0
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                    : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                                }`}>
                                  {(product.stock || 0) > 10 ? "En Stock" : (product.stock || 0) > 0 ? `Stock: ${product.stock}` : "Sin Stock"}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                                Cod: {product.code || "N/A"}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-50 dark:border-slate-800/40">
                              <div>
                                <p className="text-[9px] text-gray-400 uppercase tracking-wider">
                                  {selectedCustomer?.customer_type === "mayorista" ? "Tarifa Mayorista" : "Tarifa Minorista"}
                                </p>
                                <p className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                                  ${getPrice(product).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-0.5 font-medium">
                                  {selectedCustomer?.customer_type === "mayorista"
                                    ? `Min: $${(product.price_minorista ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                                    : `May: $${(product.price_mayorista ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`}
                                </p>
                              </div>

                              {cartItem ? (
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-950 p-1 rounded-lg border border-gray-150 dark:border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuantity(product.id, -1)}
                                    className="w-7 h-7 rounded bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-slate-300 font-bold border border-gray-200 dark:border-slate-700 text-sm shadow-sm"
                                  >
                                    <FaMinus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="font-bold px-1.5 text-xs text-gray-800 dark:text-slate-100">{cartItem.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuantity(product.id, 1)}
                                    className="w-7 h-7 rounded bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-slate-300 font-bold border border-gray-200 dark:border-slate-700 text-sm shadow-sm"
                                  >
                                    <FaPlus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddProduct(product)}
                                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
                                >
                                  <FaPlus className="w-2.5 h-2.5" /> Agregar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Cart Summary Panel */}
          <div className={`lg:col-span-1 ${activeTab === "cart" ? "block" : "hidden lg:block"}`}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800/80 p-5 shadow-sm sticky top-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-50 flex items-center gap-2.5">
                <FaShoppingCart className="text-blue-600 dark:text-blue-400" />
                Resumen del Presupuesto
              </h2>

              <div className="space-y-3 max-h-[350px] overflow-y-auto mb-4 pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-800">
                {cart.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-14 h-14 bg-blue-50 dark:bg-slate-850 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <FaShoppingCart className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Carrito vacío</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">Selecciona un cliente y agrega productos del catálogo.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="p-3.5 rounded-xl border border-gray-150 dark:border-slate-800/60 bg-gray-50/50 dark:bg-slate-950/40 space-y-3 hover:border-gray-300 dark:hover:border-slate-700 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-slate-50 truncate" title={item.name}>{item.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Cod: {item.code || "N/A"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCart(cart.filter((cartItem) => cartItem.id !== item.id))}
                          className="text-red-500 hover:text-red-700 flex-shrink-0 p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-all"
                        >
                          <FaTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 border-t border-gray-150 dark:border-slate-800/60 pt-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-slate-400">P. Unitario:</span>
                          <div className="relative flex items-center gap-1.5">
                            <span className="text-gray-400">$</span>
                            <input
                              type="number"
                              value={item.price === 0 ? "" : item.price}
                              onChange={(e) => handleUpdatePrice(item.id, parseFloat(e.target.value) || 0)}
                              className="w-20 px-1.5 py-0.5 text-right border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-50 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs font-bold"
                              step="any"
                            />
                            {item.isCustomPrice && (
                              <button
                                type="button"
                                onClick={() => handleResetPrice(item.id)}
                                title="Restablecer precio original"
                                className="text-xs text-blue-500 hover:text-blue-700 font-semibold p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              >
                                <FaUndo className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quick Price selectors */}
                        <div className="flex items-center justify-between gap-1 text-[10px] bg-white dark:bg-slate-900/60 p-1.5 rounded-lg border border-gray-150 dark:border-slate-800/80">
                          <span className="text-gray-400 dark:text-slate-500">Precios base:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdatePrice(item.id, item.price_minorista ?? 0)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all border ${
                                item.price === item.price_minorista
                                  ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
                                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-850"
                              }`}
                            >
                              Min: ${(item.price_minorista ?? 0).toLocaleString("es-AR")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdatePrice(item.id, item.price_mayorista ?? 0)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all border ${
                                item.price === item.price_mayorista
                                  ? "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800"
                                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-850"
                              }`}
                            >
                              May: ${(item.price_mayorista ?? 0).toLocaleString("es-AR")}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              className="w-7 h-7 border border-gray-300 dark:border-slate-700 rounded flex items-center justify-center text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 shadow-sm"
                            >
                              <FaMinus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-7 text-center text-xs font-bold text-gray-900 dark:text-slate-50">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              className="w-7 h-7 border border-gray-300 dark:border-slate-700 rounded flex items-center justify-center text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 shadow-sm"
                            >
                              <FaPlus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <p className="font-bold text-gray-900 dark:text-slate-50 text-sm">
                            ${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total Calculation Display */}
              <div className="border-t border-gray-200 dark:border-slate-800 pt-4 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                    <span>Cantidad de productos:</span>
                    <span className="font-bold text-gray-800 dark:text-slate-200">{totalItemsCount}</span>
                  </div>
                  <div className="flex items-center justify-between font-extrabold text-lg pt-1 border-t border-dashed border-gray-150 dark:border-slate-800/80">
                    <span className="text-gray-900 dark:text-slate-50">Total</span>
                    <span className="text-green-600 dark:text-green-400">
                      ${total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateBudget}
                  disabled={cart.length === 0 || !selectedCustomer || isSaving}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:dark:from-slate-800 disabled:dark:to-slate-900 font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:pointer-events-none"
                >
                  <FaCheckCircle className="w-4 h-4" /> {isSaving ? "Guardando..." : "Confirmar Presupuesto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar for mobile catalog view */}
      {activeTab === "catalog" && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800/80 p-4.5 flex items-center justify-between z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] transition-all">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Acumulado</p>
            <p className="text-lg font-black text-green-600 dark:text-green-400">${total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <button
            onClick={() => setActiveTab("cart")}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 text-xs shadow-md shadow-blue-500/20 transition-all"
          >
            Ver Resumen ({cart.length}) <FaArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
