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
} from "react-icons/fa";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type CartItem = Product & { quantity: number };

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

  const total = useMemo(() => {
    if (!selectedCustomer) return 0;

    return cart.reduce((acc, item) => {
      const price =
        selectedCustomer.customer_type === "mayorista"
          ? item.price_mayorista
          : item.price_minorista;
      return acc + (price || 0) * item.quantity;
    }, 0);
  }, [cart, selectedCustomer]);

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

    setCart([...cart, { ...product, quantity: 1 }]);
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
        price: getPrice(item),
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

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-50 flex items-center gap-3">
              <FaFileInvoiceDollar className="text-blue-600" /> Nuevo Presupuesto
            </h1>
            <p className="text-gray-600 dark:text-slate-300 mt-1">
              Sección separada para presupuestar sin afectar stock
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard/presupuestos")}
            className="px-5 py-2.5 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-100 rounded-lg hover:bg-gray-300 transition-colors font-semibold flex items-center gap-2"
          >
            <FaArrowLeft /> Volver
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-50 flex items-center gap-2 mb-4">
                <FaUser className="text-blue-600" /> 1. Cliente
              </h2>

              <div className="relative mb-4">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(event) => setCustomerSearchQuery(event.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {filteredCustomers.map((customer) => {
                  const selected = selectedCustomer?.id === customer.id;
                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => setSelectedCustomer(customer)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                          : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-slate-50">{customer.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{customer.customer_type}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-50 flex items-center gap-2 mb-4">
                <FaBox className="text-purple-600" /> 2. Productos
              </h2>

              {!selectedCustomer ? (
                <p className="text-gray-500 dark:text-slate-400">Selecciona un cliente para empezar.</p>
              ) : (
                <>
                  <div className="relative mb-4">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(event) => setProductSearchQuery(event.target.value)}
                      placeholder="Buscar producto..."
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg"
                    />
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="p-3 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-50">{product.name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            ${getPrice(product).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Stock: {product.stock || 0}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-gray-200 dark:border-slate-700 p-6 h-fit sticky top-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-50 flex items-center gap-2 mb-4">
              <FaShoppingCart className="text-purple-600" /> Resumen
            </h2>

            <div className="space-y-3 max-h-[380px] overflow-y-auto mb-4">
              {cart.length === 0 ? (
                <p className="text-gray-500 dark:text-slate-400">Carrito vacío</p>
              ) : (
                cart.map((item) => {
                  const price = getPrice(item);
                  return (
                    <div key={item.id} className="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-50">{item.name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">${price.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} c/u</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCart(cart.filter((cartItem) => cartItem.id !== item.id))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTrash />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-7 h-7 border border-gray-300 dark:border-slate-600 rounded flex items-center justify-center"
                          >
                            <FaMinus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="w-7 h-7 border border-gray-300 dark:border-slate-600 rounded flex items-center justify-center"
                          >
                            <FaPlus className="w-3 h-3" />
                          </button>
                        </div>

                        <p className="font-semibold text-gray-900 dark:text-slate-50">
                          ${(price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-slate-700 pt-4 space-y-4">
              <div className="flex items-center justify-between font-bold text-lg">
                <span className="text-gray-900 dark:text-slate-50">Total</span>
                <span className="text-green-600">${total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <button
                type="button"
                onClick={handleCreateBudget}
                disabled={cart.length === 0 || !selectedCustomer || isSaving}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 font-bold flex items-center justify-center gap-2"
              >
                <FaCheckCircle /> {isSaving ? "Guardando..." : "Guardar Presupuesto"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
