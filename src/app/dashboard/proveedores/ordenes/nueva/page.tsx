"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  FaSave,
  FaPaperPlane,
  FaPlus,
  FaTrash,
  FaArrowLeft,
} from "react-icons/fa";
import toast from "react-hot-toast";

type Brand = {
  id: number;
  name: string;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  price_mayorista: number | null;
  stock: number;
};

type OrderItem = {
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("Error al cargar proveedores");
    } else {
      setSuppliers(data || []);
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, price_mayorista, stock")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching products:", error);
      toast.error("Error al cargar productos");
    } else {
      setProducts(data || []);
    }
  };

  const addProduct = (product: Product) => {
    if (orderItems.find((item) => item.product_id === product.id)) {
      toast.error("Este producto ya está en la orden");
      return;
    }

    const newItem: OrderItem = {
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      quantity: 1,
      unit_price: product.price_mayorista || 0,
      subtotal: product.price_mayorista || 0,
    };

    setOrderItems([...orderItems, newItem]);
    setShowProductSelector(false);
    setSearchTerm("");
  };

  const updateQuantity = (index: number, quantity: number) => {
    const newItems = [...orderItems];
    newItems[index].quantity = quantity;
    newItems[index].subtotal = quantity * newItems[index].unit_price;
    setOrderItems(newItems);
  };

  const updatePrice = (index: number, price: number) => {
    const newItems = [...orderItems];
    newItems[index].unit_price = price;
    newItems[index].subtotal = newItems[index].quantity * price;
    setOrderItems(newItems);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const saveOrder = async (status: "draft" | "sent") => {
    if (!selectedSupplier) {
      toast.error("Selecciona un proveedor");
      return;
    }

    if (orderItems.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }

    setLoading(true);
    try {
      console.log("Step 1: Getting user...");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      console.log("User ID:", user.id);

      // Create order (no tenant_id needed for non-SaaS)
      const orderData = {
        supplier_id: selectedSupplier,
        status: status,
        total_amount: calculateTotal(),
        notes: notes || null,
        created_by: user.id,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      };

      console.log("Step 2: Creating order with data:", orderData);

      const { data: order, error: orderError } = await supabase
        .from("purchase_orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error("Order creation error:", orderError);
        throw orderError;
      }

      console.log("Order created:", order);

      // Create order items
      const items = orderItems.map((item) => ({
        purchase_order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

      console.log("Step 3: Creating order items:", items);

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(items);

      if (itemsError) {
        console.error("Items creation error:", itemsError);
        throw itemsError;
      }

      console.log("Success! Redirecting...");
      toast.success(
        status === "draft"
          ? "Orden guardada como borrador"
          : "Orden enviada exitosamente"
      );
      router.push("/dashboard/proveedores/ordenes");
    } catch (error: any) {
      console.error("Error saving order:", error);
      console.error("Error type:", typeof error);
      console.error("Error details:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        full: JSON.stringify(error),
      });
      toast.error(error?.message || "Error al guardar la orden");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 transition-all font-medium mb-4"
          >
            <FaArrowLeft /> Volver
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Nueva Orden de Compra
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mt-1">
            Crea una nueva orden de compra para un proveedor
          </p>
        </div>

        {/* Supplier Selection */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-slate-700">
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-200 mb-2">
            Proveedor *
          </label>
          <select
            value={selectedSupplier || ""}
            onChange={(e) => setSelectedSupplier(Number(e.target.value))}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-700 dark:text-slate-200 font-medium"
          >
            <option value="">Selecciona un proveedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        {/* Products Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">Productos</h2>
            <button
              onClick={() => setShowProductSelector(!showProductSelector)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
            >
              <FaPlus /> Agregar Producto
            </button>
          </div>

          {/* Product Selector */}
          {showProductSelector && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-950 rounded-lg border-2 border-blue-200">
              <input
                type="text"
                placeholder="Buscar producto por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg mb-3"
              />
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    className="w-full text-left px-4 py-3 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-50">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">
                          ${product.price_mayorista?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Stock: {product.stock}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Order Items Table */}
          {orderItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              <p>No hay productos en la orden</p>
              <p className="text-sm mt-2">
                Haz clic en "Agregar Producto" para comenzar
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-slate-200 uppercase">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-200 uppercase">
                      Precio Unit.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-200 uppercase">
                      Subtotal
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-slate-200 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                  {orderItems.map((item, index) => (
                    <tr key={item.product_id}>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-slate-50">
                            {item.product_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {item.product_sku}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(index, parseInt(e.target.value) || 1)
                          }
                          className="w-20 px-2 py-1 text-center border border-gray-300 dark:border-slate-600 rounded"
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            updatePrice(index, parseFloat(e.target.value) || 0)
                          }
                          className="w-24 px-2 py-1 text-right border border-gray-300 dark:border-slate-600 rounded"
                        />
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-gray-900 dark:text-slate-50">
                        ${item.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-slate-950">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-4 text-right font-bold text-gray-700 dark:text-slate-200 uppercase"
                    >
                      Total:
                    </td>
                    <td
                      colSpan={2}
                      className="px-4 py-4 text-right text-xl font-bold text-blue-600"
                    >
                      ${calculateTotal().toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-slate-700">
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-200 mb-2">
            Notas / Observaciones
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-700 dark:text-slate-200"
            placeholder="Agrega notas o instrucciones especiales para esta orden..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={() => saveOrder("draft")}
            disabled={loading}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-lg font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <FaSave /> Guardar Borrador
          </button>
          <button
            onClick={() => saveOrder("sent")}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors shadow-lg font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <FaPaperPlane /> Enviar Orden
          </button>
        </div>
      </div>
    </div>
  );
}
