"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Database } from "@/lib/database.types";
import { User } from "@supabase/supabase-js";
import {
  FaSearch,
  FaShoppingCart,
  FaTrash,
  FaPlus,
  FaMinus,
  FaUser,
  FaBox,
  FaCheckCircle,
  FaArrowLeft,
  FaClipboardList,
  FaTruck,
  FaTag,
  FaBarcode,
  FaMoneyBillWave,
  FaChevronDown,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type CartItem = Product & { 
  quantity: number;
  customPrice?: number;
};

export default function NewOrderPage() {
  const router = useRouter();

  // Core Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Selector States
  const [customerQuery, setCustomerQuery] = useState("");
  const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deliveryDay, setDeliveryDay] = useState<string>("Sin reparto");
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  });

  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [isProductSearching, setIsProductSearching] = useState(false);

  // Cart, Adjustment, and Payment States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "fiado" | "transferencia" | "mixto">("efectivo");
  
  // Received payments (splits for mixed or simple received amount)
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [amountCash, setAmountCash] = useState<number>(0);
  const [amountTransfer, setAmountTransfer] = useState<number>(0);

  const customerMenuRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);

  // Helper Currency Formatter
  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Load Data
  useEffect(() => {
    async function loadData() {
      try {
        const { data: customersData, error: customersError } = await supabase
          .from("customers")
          .select("*")
          .eq("is_active", true)
          .order("full_name");

        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("name");

        const { data: { session } } = await supabase.auth.getSession();

        if (customersError) throw customersError;
        if (productsError) throw productsError;

        setCustomers(customersData || []);
        setProducts(productsData || []);
        setCurrentUser(session?.user ?? null);
      } catch (error) {
        console.error("Error loading order interface data:", error);
        toast.error("Error al iniciar los datos.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Click Outside Handlers for Dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        customerMenuRef.current &&
        !customerMenuRef.current.contains(event.target as Node)
      ) {
        setIsCustomerMenuOpen(false);
      }
      if (
        productSearchRef.current &&
        !productSearchRef.current.contains(event.target as Node)
      ) {
        setProductResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered Customer selection
  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.full_name?.toLowerCase().includes(q));
  }, [customers, customerQuery]);

  // Product Autocomplete Lookups (Debounced/Simulated via client-side for speed)
  useEffect(() => {
    const q = productQuery.trim().toLowerCase();
    if (q.length < 2) {
      setProductResults([]);
      return;
    }

    setIsProductSearching(true);
    const timeoutId = setTimeout(() => {
      const matches = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
      setProductResults(matches.slice(0, 8));
      setIsProductSearching(false);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [productQuery, products]);

  // Pricing Resolver
  const getProductPrice = useCallback((product: Product) => {
    if (!selectedCustomer) return 0;
    return selectedCustomer.customer_type === "mayorista"
      ? product.price_mayorista || 0
      : product.price_minorista || 0;
  }, [selectedCustomer]);

  // Cart Calculations (Subtotal, Adjustments, Total)
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = item.customPrice !== undefined ? item.customPrice : getProductPrice(item);
      return acc + price * item.quantity;
    }, 0);
  }, [cart, getProductPrice]);

  const totalAmount = useMemo(() => {
    const base = cartSubtotal + shippingCost - discount;
    return base >= 0 ? base : 0;
  }, [cartSubtotal, shippingCost, discount]);

  // Amount Received updates based on payment methods
  useEffect(() => {
    if (paymentMethod === "efectivo" || paymentMethod === "transferencia") {
      setAmountReceived(totalAmount);
    } else if (paymentMethod === "fiado") {
      setAmountReceived(0);
    } else if (paymentMethod === "mixto") {
      setAmountReceived(amountCash + amountTransfer);
    }
  }, [totalAmount, paymentMethod, amountCash, amountTransfer]);

  // Add Product to Cart
  const handleAddProduct = (product: Product) => {
    if (!selectedCustomer) {
      toast.error("Por favor, selecciona un cliente antes de agregar productos");
      return;
    }

    const existing = cart.find((i) => i.id === product.id);
    const stockLimit = product.stock || 0;

    if (existing) {
      if (existing.quantity < stockLimit) {
        setCart(
          cart.map((i) =>
            i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        );
        toast.success(`Cantidad actualizada: ${product.name}`);
      } else {
        toast.error("Stock insuficiente");
      }
    } else {
      if (stockLimit > 0) {
        const itemPrice = getProductPrice(product);
        setCart([...cart, { ...product, quantity: 1, customPrice: itemPrice }]);
        toast.success(`Agregado: ${product.name}`);
      } else {
        toast.error("Producto sin stock");
      }
    }
    setProductQuery("");
    setProductResults([]);
  };

  // Adjust Quantities
  const handleUpdateQuantity = (productId: string, delta: number) => {
    const item = cart.find((i) => i.id === productId);
    if (!item) return;

    const nextQty = item.quantity + delta;
    if (nextQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const maxStock = item.stock || 0;
    if (nextQty > maxStock) {
      toast.error("Límite de stock disponible alcanzado");
      return;
    }

    setCart(
      cart.map((i) =>
        i.id === productId ? { ...i, quantity: nextQty } : i
      )
    );
  };

  // Adjust Unit Prices
  const handleUpdateCustomPrice = (productId: string, valStr: string) => {
    if (valStr === "") {
      setCart(
        cart.map((i) => (i.id === productId ? { ...i, customPrice: 0 } : i))
      );
      return;
    }

    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0) return;

    setCart(
      cart.map((i) => (i.id === productId ? { ...i, customPrice: val } : i))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart(cart.filter((i) => i.id !== productId));
    toast.success("Producto retirado");
  };

  // Submit Order Creation
  const handleCreateOrder = async () => {
    if (!selectedCustomer) {
      toast.error("Selecciona un cliente");
      return;
    }
    if (cart.length === 0) {
      toast.error("El pedido no tiene productos");
      return;
    }
    if (!currentUser?.id) {
      toast.error("Sesión de usuario no válida");
      return;
    }

    setIsSubmitting(true);
    const loadToast = toast.loading("Registrando pedido...");

    try {
      // Si el día de reparto seleccionado es diferente al original del cliente, lo actualizamos en la base de datos
      const originalDeliveryDay = selectedCustomer.delivery_day || "Sin reparto";
      if (deliveryDay !== originalDeliveryDay) {
        const dbDayValue = deliveryDay === "Sin reparto" ? null : deliveryDay;
        const { error: customerError } = await supabase
          .from("customers")
          .update({ delivery_day: dbDayValue })
          .eq("id", selectedCustomer.id);
        
        if (customerError) {
          console.error("Error al actualizar día de reparto del cliente:", customerError);
        } else {
          selectedCustomer.delivery_day = dbDayValue;
        }
      }

      const now = new Date();
      const timePart = now.toTimeString().split(" ")[0]; // "HH:MM:SS"
      const createdDateString = `${deliveryDate}T${timePart}-03:00`;

      const orderPayload = {
        customer_id: selectedCustomer.id,
        profile_id: currentUser.id,
        total_amount: totalAmount,
        status: "pendiente",
        payment_method: paymentMethod,
        amount_paid: amountReceived,
        amount_pending: totalAmount - amountReceived,
        created_at: createdDateString,
      };

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

      if (orderError || !orderData) {
        throw new Error(orderError?.message || "Fallo en registro de cabecera de pedido.");
      }

      const itemsPayload = cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.customPrice !== undefined ? item.customPrice : getProductPrice(item),
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsPayload);

      if (itemsError) throw itemsError;

      // Handle Current Account Debt Movements
      const remainingDebt = totalAmount - amountReceived;
      if (remainingDebt > 0) {
        const { error: debtError } = await supabase.from("payments").insert({
          customer_id: selectedCustomer.id,
          type: "compra",
          amount: remainingDebt,
          payment_method: paymentMethod,
          comment: `Pedido #${orderData.id.slice(0, 8)} - saldo pendiente`,
          created_at: createdDateString,
        });
        if (debtError) throw debtError;
      }

      toast.success("¡Pedido registrado exitosamente!", { id: loadToast });
      setTimeout(() => {
        router.push("/dashboard/pedidos");
      }, 1000);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al completar el pedido", { id: loadToast });
      setIsSubmitting(false);
    }
  };

  // Keyboard Shortcuts Bindings (F10 search focus, F12 submit)
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === "F10") {
        e.preventDefault();
        const pInput = document.getElementById("search-product-input");
        if (pInput) pInput.focus();
        toast("Buscador enfocado", { icon: "🔍", duration: 1000 });
      }
      if (e.key === "F12") {
        e.preventDefault();
        if (cart.length > 0 && selectedCustomer && !isSubmitting) {
          handleCreateOrder();
        }
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [cart, selectedCustomer, isSubmitting, totalAmount, amountReceived, paymentMethod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-500">Cargando catálogo...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-6">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 space-y-6">
        
        {/* TOP BAR / HEADER COMPACTO */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/pedidos"
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Volver a Pedidos"
              >
                <FaArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-xl font-bold text-gray-905 dark:text-slate-50">Nuevo Pedido de Reparto</h1>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              F10 buscar producto · F12 registrar pedido · Asignación de cuenta corriente
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-900/30">
              Items: {cart.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-900/30">
              Total: {formatCurrency(totalAmount)}
            </span>
            {selectedCustomer && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border">
                👤 {selectedCustomer.full_name}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMNA IZQUIERDA: PRODUCTOS Y CARRO (col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* AGREGAR PRODUCTOS (Estilo POS / Autocomplete) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-visible">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <FaBox className="text-indigo-500" /> Agregar Productos al Pedido
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Busca productos del catálogo por nombre o SKU para añadirlos a la grilla.
                  </p>
                </div>
                <FaBarcode className="text-slate-400 w-5 h-5 hidden sm:block" />
              </div>

              <div className="p-6">
                <div className="relative" ref={productSearchRef}>
                  <div className="relative">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="search-product-input"
                      type="text"
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                      placeholder={
                        selectedCustomer 
                          ? "Escribe el nombre o SKU del producto para agregar..." 
                          : "⚠️ Selecciona un cliente primero para habilitar el buscador"
                      }
                      disabled={!selectedCustomer}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    {isProductSearching && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>

                  {productResults.length > 0 && (
                    <ul className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 animate-fadeIn">
                      {productResults.map((product) => {
                        const price = getProductPrice(product);
                        const stock = product.stock || 0;
                        const hasStock = stock > 0;
                        return (
                          <li
                            key={product.id}
                            onClick={() => handleAddProduct(product)}
                            className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex justify-between items-center text-xs"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 dark:text-slate-105 block">
                                {product.name}
                              </span>
                              {product.sku && (
                                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                                  SKU: {product.sku}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block">
                                {formatCurrency(price)}
                              </span>
                              <span className={`text-[10px] font-semibold ${hasStock ? "text-emerald-600" : "text-rose-500"}`}>
                                Stock: {stock} u.
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* CARRITO (TABLA DE ITEMS) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  <FaShoppingCart className="text-indigo-500" /> Detalle de Productos Cargados
                </h3>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {cart.length} productos diferentes
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                  <span className="text-4xl mb-3 opacity-30">🛒</span>
                  <p className="text-sm font-semibold">No hay productos cargados en el pedido</p>
                  <p className="text-xs text-slate-400 mt-1">Busca y añade items usando el buscador superior.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-850">
                    <thead className="bg-slate-50 dark:bg-slate-950">
                      <tr>
                        <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">
                          Cantidad
                        </th>
                        <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">
                          Precio Unitario ($)
                        </th>
                        <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">
                          Subtotal
                        </th>
                        <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">
                          Quitar
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
                      {cart.map((item) => {
                        const price = item.customPrice !== undefined ? item.customPrice : getProductPrice(item);
                        const subtotal = price * item.quantity;
                        const stockLimit = item.stock || 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors">
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                  {item.name}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {item.sku && (
                                    <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono">
                                      SKU: {item.sku}
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-bold ${stockLimit < 10 ? "text-amber-600" : "text-emerald-600"}`}>
                                    • Stock disponible: {stockLimit} u.
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, -1)}
                                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 flex items-center justify-center transition-colors"
                                >
                                  <FaMinus className="w-2 h-2" />
                                </button>
                                <span className="w-8 text-center font-bold text-slate-800 dark:text-white">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, 1)}
                                  disabled={item.quantity >= stockLimit}
                                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <FaPlus className="w-2 h-2" />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 font-bold">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.customPrice === 0 ? "" : item.customPrice}
                                  onChange={(e) => handleUpdateCustomPrice(item.id, e.target.value)}
                                  className="w-24 px-2 py-1 text-right border border-slate-250 dark:border-slate-750 focus:border-indigo-500 rounded bg-slate-50 dark:bg-slate-950 font-bold focus:outline-none"
                                  placeholder="0.00"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right font-extrabold text-slate-850 dark:text-slate-50">
                              {formatCurrency(subtotal)}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-center">
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-full transition-colors"
                                title="Quitar del pedido"
                              >
                                <FaTrash className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* COLUMNA DERECHA: CLIENTE Y FACTURACIÓN / RESUMEN (col-span-4) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            
            {/* SECCIÓN CLIENTE */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-visible">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  <FaUser className="text-indigo-500" /> Cliente Destinatario
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Selecciona a quién registrarás este pedido.
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="relative" ref={customerMenuRef}>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={customerQuery}
                      onChange={(e) => {
                        setCustomerQuery(e.target.value);
                        if (!isCustomerMenuOpen) setIsCustomerMenuOpen(true);
                      }}
                      onFocus={() => {
                        setIsCustomerMenuOpen(true);
                        if (!customerQuery && selectedCustomer) {
                          setCustomerQuery(selectedCustomer.full_name || "");
                        }
                      }}
                      placeholder="Escribe el nombre del cliente..."
                      className="w-full pl-9 pr-8 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 transition-colors text-xs"
                    />
                    <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3 cursor-pointer pointer-events-none" />
                  </div>

                  {isCustomerMenuOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl divide-y divide-slate-100 dark:divide-slate-850">
                      {filteredCustomers.length === 0 ? (
                        <div className="px-4 py-2.5 text-xs text-gray-500 dark:text-slate-400">
                          No hay clientes con ese nombre
                        </div>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setDeliveryDay(customer.delivery_day || "Sin reparto");
                              setCustomerQuery("");
                              setIsCustomerMenuOpen(false);
                              toast.success(`Cliente: ${customer.full_name}`);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                              selectedCustomer?.id === customer.id
                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200"
                            }`}
                          >
                            {customer.full_name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/15 rounded-xl border border-emerald-100 dark:border-emerald-900/30 space-y-3 animate-fadeIn text-xs">
                    <div className="flex justify-between items-center border-b border-emerald-100/50 dark:border-emerald-900/20 pb-2">
                      <span className="font-bold text-emerald-800 dark:text-emerald-350">Tipo de Cliente:</span>
                      <span className="capitalize font-bold text-emerald-700 dark:text-emerald-305">
                        {selectedCustomer.customer_type}
                      </span>
                    </div>

                    {/* Selector de Día de Reparto / Entrega */}
                    <div className="space-y-1">
                      <label className="font-bold text-emerald-850 dark:text-emerald-350 block">Día de Reparto Habitual:</label>
                      <select
                        value={deliveryDay}
                        onChange={(e) => setDeliveryDay(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-850 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        title="Seleccionar día de reparto"
                      >
                        <option value="Sin reparto">Sin reparto (No organizar)</option>
                        {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>

                    {/* Fecha Específica de Entrega para este Pedido */}
                    <div className="space-y-1">
                      <label className="font-bold text-emerald-855 dark:text-emerald-350 block">Fecha de Entrega de este Pedido:</label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-850 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                        title="Seleccionar fecha de entrega del pedido"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-emerald-100/50 dark:border-emerald-900/10">
                      <span className="font-bold text-amber-800 dark:text-amber-450">Deuda Corriente:</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        {formatCurrency(selectedCustomer.debt || 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RESUMEN DE COBROS Y REGISTRO */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  <FaMoneyBillWave className="text-indigo-500" /> Resumen y Liquidación
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Liquidación, descuentos y registro final.
                </p>
              </div>

              <div className="p-6 space-y-4">
                
                {/* Detalles de Subtotal */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Subtotal del Carro:</span>
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {formatCurrency(cartSubtotal)}
                    </span>
                  </div>
                  
                  {/* Envío y Descuento inputs */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <FaTruck /> Costo Envío
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input
                          id="input-costo-envio"
                          type="number"
                          min="0"
                          step="0.01"
                          value={shippingCost === 0 ? "" : shippingCost}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                            setShippingCost(val >= 0 ? val : 0);
                          }}
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs focus:border-indigo-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <FaTag /> Descuento
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input
                          id="input-descuento"
                          type="number"
                          min="0"
                          step="0.01"
                          value={discount === 0 ? "" : discount}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                            setDiscount(val >= 0 ? val : 0);
                          }}
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs focus:border-indigo-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Facturado */}
                <div className="p-4 bg-slate-950 rounded-xl text-white flex justify-between items-center border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400">TOTAL FACTURADO:</span>
                  <span className="text-xl font-black text-indigo-400">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>

                {/* Método de pago (Selectores de botones) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Forma de Cobro del Pedido
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "efectivo", label: "💵 Efectivo" },
                      { id: "transferencia", label: "🏦 Transferencia" },
                      { id: "fiado", label: "📋 Cuenta Cte." },
                      { id: "mixto", label: "💳 Pago Mixto" },
                    ].map((method) => {
                      const isActive = paymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          id={`payment-method-${method.id}`}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(method.id as any);
                            if (method.id === "efectivo" || method.id === "transferencia") {
                              setAmountReceived(totalAmount);
                            } else if (method.id === "fiado") {
                              setAmountReceived(0);
                            }
                            setAmountCash(0);
                            setAmountTransfer(0);
                          }}
                          className={`py-2 px-3 rounded-lg border-2 text-xs font-bold text-left transition-all ${
                            isActive
                              ? "border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-305"
                              : "border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {method.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* splits de pago mixto */}
                {paymentMethod === "mixto" ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800/80 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 block">💵 Efectivo ($)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-2xs">$</span>
                          <input
                            id="input-pago-mixto-efectivo"
                            type="number"
                            min="0"
                            step="0.01"
                            value={amountCash === 0 ? "" : amountCash}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                              setAmountCash(val >= 0 ? val : 0);
                            }}
                            className="w-full pl-5 pr-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded outline-none text-xs"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 block">🏦 Transferencia ($)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-2xs">$</span>
                          <input
                            id="input-pago-mixto-transferencia"
                            type="number"
                            min="0"
                            step="0.01"
                            value={amountTransfer === 0 ? "" : amountTransfer}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                              setAmountTransfer(val >= 0 ? val : 0);
                            }}
                            className="w-full pl-5 pr-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded outline-none text-xs"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-850">
                      <span>Total ingresado:</span>
                      <span>{formatCurrency(amountCash + amountTransfer)}</span>
                    </div>
                  </div>
                ) : (
                  /* cobro parcial simple */
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800/80 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Monto Cobrado ($)</label>
                      <button
                        id="btn-pago-completo"
                        type="button"
                        onClick={() => setAmountReceived(totalAmount)}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Cobro completo
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 font-bold">$</span>
                        <input
                          id="input-monto-recibido"
                          type="number"
                          min="0"
                          step="0.01"
                          value={amountReceived === 0 ? "" : amountReceived}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                            setAmountReceived(val >= 0 ? val : 0);
                          }}
                          className="w-full pl-6.5 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs"
                          placeholder="0.00"
                        />
                      </div>
                      <button
                        id="btn-poner-recibido-cero"
                        type="button"
                        onClick={() => setAmountReceived(0)}
                        className="px-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-350 rounded-lg text-xs font-bold transition-colors"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                )}

                {/* Feedback de deuda / cta corriente */}
                {amountReceived < totalAmount && selectedCustomer && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-250/20 rounded-xl flex justify-between items-center text-xs font-bold text-amber-700 dark:text-amber-400 animate-fadeIn">
                    <span>A Cuenta Corriente:</span>
                    <span>{formatCurrency(totalAmount - amountReceived)}</span>
                  </div>
                )}

                {amountReceived >= totalAmount && totalAmount > 0 && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250/20 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-450 animate-fadeIn">
                    <FaCheckCircle />
                    <span>Cubierto al 100% (Sin deuda)</span>
                  </div>
                )}

                {/* BOTÓN REGISTRAR DEFINITIVO */}
                <button
                  id="btn-confirmar-pedido"
                  onClick={handleCreateOrder}
                  disabled={cart.length === 0 || !selectedCustomer || isSubmitting}
                  className={`w-full py-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                    cart.length === 0 || !selectedCustomer || isSubmitting
                      ? "bg-slate-200 text-slate-450 dark:bg-slate-850 dark:text-slate-650 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.99]"
                  }`}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FaCheckCircle className="w-4 h-4" />
                      Registrar e Imprimir Remito
                    </>
                  )}
                </button>

              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}