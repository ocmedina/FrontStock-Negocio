"use client";

import { use, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  FaSave,
  FaTimes,
  FaPlus,
  FaMinus,
  FaTrash,
  FaSearch,
  FaCheckCircle,
} from "react-icons/fa";
import { updateOrder } from "@/app/actions/orderActions";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  stock: number | null;
  price_mayorista: number | null;
  price_minorista: number | null;
};

type OrderItem = {
  id?: string;
  product_id: string;
  quantity: number;
  price: number;
  products?: Product;
};

type Customer = {
  id: string;
  full_name: string;
  customer_type: string;
  delivery_day?: string | null;
};

type Order = {
  id: string;
  customer_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  customers?: Customer;
  order_items: OrderItem[];
};

export default function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<
    "efectivo" | "fiado" | "transferencia" | "mixto"
  >("efectivo");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [deliveryDay, setDeliveryDay] = useState<string>("Sin reparto");

  // Búsqueda de productos
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadOrderData();
    loadCustomers();
  }, [id]);

  useEffect(() => {
    const cleanQuery = searchQuery.replace(/[(),]/g, "").trim();

    if (cleanQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchProducts = async () => {
      setSearching(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .or(`name.ilike.%${cleanQuery}%,sku.ilike.%${cleanQuery}%`)
        .eq("is_active", true)
        .limit(10);

      if (error) {
        console.error("Error buscando productos:", error);
        toast.error("Error al buscar productos");
      } else {
        setSearchResults(data || []);
      }
      setSearching(false);
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const loadOrderData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        customers (*),
        order_items (
          *,
          products (*)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error cargando pedido:", error);
      toast.error("Error al cargar el pedido");
      router.push("/dashboard/pedidos");
      return;
    }

    if (data.status !== "pendiente") {
      toast.error("Solo se pueden editar pedidos en estado pendiente");
      router.push(`/dashboard/pedidos/${id}`);
      return;
    }

    setOrder(data);
    setSelectedCustomerId(data.customer_id);
    setItems(data.order_items || []);
    setPaymentMethod(data.payment_method || "efectivo");
    setAmountReceived(data.amount_paid || 0);
    setDeliveryDay(data.customers?.delivery_day || "Sin reparto");
    setLoading(false);
  };

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("is_active", true)
      .order("full_name");

    if (error) {
      console.error("Error cargando clientes:", error);
    } else {
      setCustomers(data || []);
    }
  };

  const addProduct = (product: Product) => {
    const existingItem = items.find((item) => item.product_id === product.id);

    if (existingItem) {
      updateQuantity(items.indexOf(existingItem), 1);
      toast.success("Cantidad actualizada");
    } else {
      const selectedCustomer = customers.find(
        (c) => c.id === selectedCustomerId
      );
      const price =
        selectedCustomer?.customer_type === "mayorista"
          ? product.price_mayorista || 0
          : product.price_minorista || 0;

      setItems([
        ...items,
        {
          product_id: product.id,
          quantity: 1,
          price: price,
          products: product,
        },
      ]);
      toast.success("Producto agregado");
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    const newQuantity = newItems[index].quantity + delta;

    if (newQuantity <= 0) {
      removeItem(index);
      return;
    }

    const maxStock = newItems[index].products?.stock || 0;
    if (newQuantity > maxStock) {
      toast.error("No hay suficiente stock disponible");
      return;
    }

    newItems[index].quantity = newQuantity;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    toast.success("Producto eliminado");
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleSave = async () => {
    if (!selectedCustomerId) {
      toast.error("Selecciona un cliente");
      return;
    }

    if (items.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading("Guardando cambios...");

    try {
      const total = calculateTotal();

      // Si el día de reparto cambió, lo actualizamos en la base de datos
      const cust = customers.find((c) => c.id === selectedCustomerId);
      const originalDeliveryDay = cust?.delivery_day || "Sin reparto";
      if (deliveryDay !== originalDeliveryDay) {
        const dbDayValue = deliveryDay === "Sin reparto" ? null : deliveryDay;
        const { error: customerError } = await supabase
          .from("customers")
          .update({ delivery_day: dbDayValue })
          .eq("id", selectedCustomerId);
          
        if (customerError) {
          console.error("Error al actualizar día de reparto del cliente:", customerError);
        } else {
          setCustomers(prev => prev.map(c => c.id === selectedCustomerId ? { ...c, delivery_day: dbDayValue } : c));
        }
      }

      // Usar el Server Action para actualizar el pedido
      const result = await updateOrder(
        id,
        selectedCustomerId,
        total,
        items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        })),
        paymentMethod,
        amountReceived,
        total - amountReceived
      );

      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success("Pedido actualizado exitosamente");
        router.push(`/dashboard/pedidos/${id}`);
        router.refresh();
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error("Error guardando pedido:", error);
      toast.error(`Error al guardar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-full">
        <div className="text-gray-500 dark:text-slate-400">Cargando pedido...</div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-50">
              Editar Pedido
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
              ID: {order.id.substring(0, 8)}
            </p>
          </div>
          <Link
            href={`/dashboard/pedidos/${id}`}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-slate-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-800/80 dark:bg-slate-800 rounded-lg transition-all text-sm"
          >
            <FaTimes /> Cancelar
          </Link>
        </div>

        {/* Cliente */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
            Cliente
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => {
              const newCustId = e.target.value;
              setSelectedCustomerId(newCustId);
              const cust = customers.find((c) => c.id === newCustId);
              setDeliveryDay(cust?.delivery_day || "Sin reparto");
            }}
            className="w-full p-3 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800"
            title="Seleccionar cliente"
          >
            <option value="">Seleccionar cliente...</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.full_name} (
                {customer.customer_type === "mayorista"
                  ? "Mayorista"
                  : "Minorista"}
                )
              </option>
            ))}
          </select>
        </div>

        {/* Día de Reparto / Entrega */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
            Día de Entrega / Reparto
          </label>
          <select
            value={deliveryDay}
            onChange={(e) => setDeliveryDay(e.target.value)}
            disabled={!selectedCustomerId}
            className="w-full p-3 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 bg-white dark:bg-slate-800"
            title="Seleccionar día de entrega"
          >
            <option value="Sin reparto">Sin reparto (No organizar)</option>
            {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

        {/* Método de Pago */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
            Método de Pago
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setPaymentMethod("efectivo");
                setAmountReceived(calculateTotal());
              }}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${paymentMethod === "efectivo"
                ? "border-green-500 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 font-semibold"
                : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:border-gray-400 dark:hover:border-slate-500"
                }`}
            >
              💵 Efectivo
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentMethod("transferencia");
                setAmountReceived(calculateTotal());
              }}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${paymentMethod === "transferencia"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
                : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:border-gray-400 dark:hover:border-slate-500"
                }`}
            >
              🏦 Transferencia
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentMethod("fiado");
                setAmountReceived(0);
              }}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${paymentMethod === "fiado"
                ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-semibold"
                : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:border-gray-400 dark:hover:border-slate-500"
                }`}
            >
              📋 Fiado
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentMethod("mixto");
                setAmountReceived(0);
              }}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${paymentMethod === "mixto"
                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold"
                : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:border-gray-400 dark:hover:border-slate-500"
                }`}
            >
              💳 Mixto
            </button>
          </div>
        </div>

        {/* Monto Recibido */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
            Entrega Recibida
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 font-semibold">
                $
              </span>
              <input
                type="number"
                min="0"
                max={calculateTotal()}
                step="0.01"
                value={amountReceived === 0 ? "" : amountReceived}
                onChange={(e) => {
                  const value =
                    e.target.value === "" ? 0 : parseFloat(e.target.value);
                  setAmountReceived(Math.min(value, calculateTotal()));
                }}
                className="w-full pl-8 pr-3 py-3 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            <button
              type="button"
              onClick={() => setAmountReceived(0)}
              className="px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-semibold"
              title="Poner en cero"
            >
              ✕ 0
            </button>
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={() => setAmountReceived(calculateTotal())}
              className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold"
            >
              ✓ Pago completo
            </button>
          </div>
        </div>

        {/* Buscador de Productos */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
            Buscar Productos
          </label>
          <div className="relative">
            <div className="absolute left-3 top-3 text-gray-400">
              <FaSearch className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searching && (
              <div className="absolute right-3 top-3.5">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}

            {searchResults.length > 0 && (
              <ul className="absolute z-50 top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                {searchResults.map((product) => (
                  <li
                    key={product.id}
                    onClick={() => addProduct(product)}
                    className="px-3 sm:px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900 dark:text-slate-50 text-sm sm:text-base">
                          {product.name}
                        </span>
                        {product.sku && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {product.sku}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between sm:text-right">
                        <div className="text-sm font-medium text-blue-600">
                          $
                          {selectedCustomer?.customer_type === "mayorista"
                            ? product.price_mayorista?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : product.price_minorista?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div
                          className={`text-xs ml-3 ${(product.stock || 0) > 0
                            ? "text-green-600"
                            : "text-red-600"
                            }`}
                        >
                          Stock: {product.stock || 0}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Lista de Productos */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-50 mb-4">
            Productos en el Pedido
          </h2>

          {items.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-slate-950 rounded-lg">
              <p className="text-gray-500 dark:text-slate-400">No hay productos en el pedido</p>
              <p className="text-sm text-gray-400 mt-1">
                Busca y agrega productos arriba
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 dark:bg-slate-950 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-slate-700 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-50 text-sm sm:text-base">
                      {item.products?.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                      ${item.price.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} c/u
                      {item.products?.sku && ` • SKU: ${item.products.sku}`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg border border-gray-300 dark:border-slate-600">
                      <button
                        onClick={() => updateQuantity(index, -1)}
                        className="p-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-slate-50 hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 rounded-l-lg transition-all"
                        disabled={saving}
                        title="Disminuir cantidad"
                      >
                        <FaMinus size={12} />
                      </button>
                      <span className="px-2 sm:px-3 font-bold text-gray-900 dark:text-slate-50 min-w-[2.5rem] sm:min-w-[3rem] text-center text-sm sm:text-base">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(index, 1)}
                        className="p-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-slate-50 hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 rounded-r-lg transition-all"
                        disabled={saving}
                        title="Aumentar cantidad"
                      >
                        <FaPlus size={12} />
                      </button>
                    </div>

                    <div className="text-right min-w-[5rem] sm:min-w-[6rem]">
                      <p className="font-bold text-gray-900 dark:text-slate-50 text-sm sm:text-base">
                        ${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <button
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                      disabled={saving}
                      title="Eliminar"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total y Estado de Pago */}
        <div className="border-t-2 border-gray-200 dark:border-slate-700 pt-4 mb-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-50">
              Total:
            </span>
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ${calculateTotal().toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center text-green-700 bg-green-50 px-3 sm:px-4 py-2 rounded-lg">
            <span className="font-semibold text-sm sm:text-base">
              Entrega Recibida:
            </span>
            <span className="text-lg sm:text-xl font-bold">
              ${amountReceived.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {amountReceived < calculateTotal() ? (
            <div className="flex justify-between items-center text-orange-700 bg-orange-50 px-3 sm:px-4 py-3 rounded-lg border-2 border-orange-200">
              <span className="font-semibold text-sm sm:text-base">
                Saldo Pendiente:
              </span>
              <span className="text-xl sm:text-2xl font-bold">
                ${(calculateTotal() - amountReceived).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ) : (
            calculateTotal() > 0 && (
              <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 px-3 sm:px-4 py-2 rounded-lg border-2 border-green-200">
                <FaCheckCircle />
                <span className="font-semibold text-sm sm:text-base">
                  Pago Completo
                </span>
              </div>
            )
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={handleSave}
            disabled={saving || items.length === 0 || !selectedCustomerId}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg text-sm sm:text-base"
          >
            {saving ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Guardando...
              </>
            ) : (
              <>
                <FaSave />
                Guardar Cambios
              </>
            )}
          </button>

          <Link
            href={`/dashboard/pedidos/${id}`}
            className="px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-lg hover:bg-gray-300 transition-all text-center text-sm sm:text-base"
          >
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  );
}
