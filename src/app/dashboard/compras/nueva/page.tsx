"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { User } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";
import { formatCurrency } from "@/lib/numberFormat";
import {
  FaTimes,
  FaShoppingCart,
  FaPlus,
  FaBoxOpen,
  FaSearch,
  FaTruck,
  FaFileInvoice,
  FaSave,
  FaDollarSign,
  FaBoxes,
  FaTag,
  FaCubes,
  FaBarcode,
  FaTrash,
} from "react-icons/fa";

type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type CartItem = {
  product: Product;
  quantity: number;
  cost_price: string;
};

// Modal para crear nuevo producto
function NewProductModal({
  isOpen,
  onClose,
  onProductCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: Product) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price_minorista: "",
    price_mayorista: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("El nombre del producto es obligatorio");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Creando producto...");

    try {
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: formData.name.trim(),
          sku: formData.sku.trim() || `PROD-${Date.now()}`,
          price_minorista: parseFloat(formData.price_minorista) || 0,
          price_mayorista: parseFloat(formData.price_mayorista) || 0,
          stock: 0, // Comienza en 0, se sumará con la compra
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      if (!data) {
        throw new Error("No se recibió información del producto creado");
      }

      toast.success("Producto creado exitosamente", { id: toastId });
      onProductCreated(data);
      handleClose();
    } catch (error: any) {
      console.error("Error creating product:", error);
      const errorMessage =
        error?.message ||
        error?.error_description ||
        "Error desconocido al crear el producto";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      sku: "",
      price_minorista: "",
      price_mayorista: "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <FaBoxOpen className="text-blue-600" />
              Crear Nuevo Producto
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                Nombre del Producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ej: Aceite Motor 10W40"
                required
                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                SKU / Código
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sku: e.target.value }))
                }
                placeholder="Opcional"
                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Precio Minorista <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_minorista}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      price_minorista: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  required
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Precio Mayorista <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_mayorista}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      price_mayorista: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  required
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> El producto se creará con stock inicial
                en 0. La cantidad que agregues en esta compra se sumará
                automáticamente.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear Producto"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Componente de Búsqueda de Producto
function ProductSearch({
  onProductSelect,
  cartProductIds,
  onNewProductClick,
}: {
  onProductSelect: (product: Product) => void;
  cartProductIds: string[];
  onNewProductClick: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("Error cargando productos");
      console.error(error);
    }
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const availableProducts = products.filter(
    (p) => !cartProductIds.includes(p.id)
  );

  // Filtrar productos por búsqueda
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) {
      return availableProducts;
    }

    const search = searchTerm.toLowerCase();
    return availableProducts.filter(
      (p) =>
        p.name?.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search)
    );
  }, [availableProducts, searchTerm]);

  return (
    <div className="space-y-3">
      {/* Barra de búsqueda */}
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, SKU o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
        />
        {searchTerm && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
              {filteredProducts.length}
            </span>
          </div>
        )}
      </div>

      {/* Select y botón nuevo */}
      <div className="flex gap-2">
        <select
          onChange={(e) => {
            const product = products.find((p) => p.id === e.target.value);
            if (product) {
              onProductSelect(product);
              e.target.value = "";
              setSearchTerm("");
            }
          }}
          className="flex-1 px-3 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
          disabled={loading}
        >
          <option value="">
            {loading
              ? "Cargando productos..."
              : filteredProducts.length === 0
                ? "No hay productos disponibles"
                : `Seleccionar producto (${filteredProducts.length} disponibles)...`}
          </option>
          {filteredProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.sku ? `[${p.sku}]` : ""} - Stock: {p.stock}
            </option>
          ))}
        </select>

        <button
          onClick={onNewProductClick}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center gap-2 whitespace-nowrap shadow-md text-sm"
          title="Crear nuevo producto"
        >
          <FaPlus /> Nuevo
        </button>
      </div>
    </div>
  );
}

export default function NewPurchasePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      const [suppliersResult, userResult] = await Promise.all([
        supabase
          .from("suppliers")
          .select("*")
          .eq("is_active", true)
          .order("name"),
        supabase.auth.getUser(),
      ]);

      if (suppliersResult.error) {
        toast.error("Error cargando proveedores");
        console.error(suppliersResult.error);
      } else {
        setSuppliers(suppliersResult.data || []);
      }

      if (userResult.data.user) {
        setCurrentUser(userResult.data.user);
      } else {
        toast.error("Usuario no autenticado");
        router.push("/login");
      }
    };

    fetchInitialData();
  }, [router]);

  const handleAddProduct = (product: Product) => {
    setCart((prev) => [
      ...prev,
      {
        product,
        quantity: 1,
        cost_price: product.cost_price?.toString() || "",
      },
    ]);
    toast.success(`${product.name} agregado al carrito`);
  };

  const handleProductCreated = (product: Product) => {
    handleAddProduct(product);
    toast.success("Producto creado y agregado al carrito");
  };

  const handleCartChange = (
    productId: string,
    field: "quantity" | "cost_price",
    value: string
  ) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? {
            ...item,
            [field]:
              field === "quantity"
                ? Math.max(1, parseInt(value) || 1)
                : value,
          }
          : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    toast.success("Producto eliminado del carrito");
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const quantity = item.quantity || 0;
      const price = parseFloat(item.cost_price) || 0;
      return sum + quantity * price;
    }, 0);
  }, [cart]);

  const validateForm = (): boolean => {
    if (!selectedSupplier) {
      toast.error("Debes seleccionar un proveedor");
      return false;
    }

    if (cart.length === 0) {
      toast.error("Debes agregar al menos un producto");
      return false;
    }

    if (!currentUser?.id) {
      toast.error("Usuario no autenticado");
      return false;
    }

    // Validar que todos los productos tengan precio de costo
    const invalidItems = cart.filter(
      (item) => !item.cost_price || parseFloat(item.cost_price) <= 0
    );
    if (invalidItems.length > 0) {
      toast.error(
        `Debes completar el costo unitario de: ${invalidItems
          .map((i) => i.product.name)
          .join(", ")}`
      );
      return false;
    }

    return true;
  };

  const handleFinalizePurchase = async () => {
    if (!validateForm()) return;

    setLoading(true);
    let toastId = toast.loading("Registrando compra...");

    try {
      const paid = parseFloat(amountPaid) || 0;
      const debtGenerated = totalAmount - paid;

      // Obtener timestamp en zona horaria Argentina
      const now = new Date();
      const argentinaTime = new Date(
        now.toLocaleString("en-US", {
          timeZone: "America/Argentina/Buenos_Aires",
        })
      );

      // 1. Crear el registro de la compra
      toast.loading("Guardando factura...", { id: toastId });
      const { data: purchase, error: purchaseError } = await supabase
        .from("purchases")
        .insert({
          supplier_id: selectedSupplier,
          profile_id: currentUser!.id,
          invoice_number: invoiceNumber || null,
          total_amount: totalAmount,
          amount_paid: paid,
          created_at: argentinaTime.toISOString(),
        })
        .select()
        .single();

      if (purchaseError)
        throw new Error(`Error al guardar compra: ${purchaseError.message}`);

      // 2. Insertar los items de la compra
      toast.loading("Guardando productos...", { id: toastId });
      const purchaseItems = cart.map((item) => ({
        purchase_id: purchase.id,
        product_id: item.product.id,
        quantity: item.quantity,
        cost_price: parseFloat(item.cost_price),
      }));

      const { error: itemsError } = await supabase
        .from("purchase_items")
        .insert(purchaseItems);

      if (itemsError)
        throw new Error(`Error al guardar items: ${itemsError.message}`);

      // 3. Actualizar stock de todos los productos
      toast.loading("Actualizando inventario...", { id: toastId });
      const stockUpdatePromises = cart.map((item) =>
        supabase.rpc("increment_stock", {
          product_id_in: item.product.id,
          quantity_in: item.quantity,
        })
      );

      const stockResults = await Promise.allSettled(stockUpdatePromises);

      // Verificar si hubo errores en las actualizaciones de stock
      const failedStockUpdates = stockResults
        .map((result, index) => ({ result, item: cart[index] }))
        .filter(({ result }) => result.status === "rejected");

      if (failedStockUpdates.length > 0) {
        console.error("Stock update errors:", failedStockUpdates);
        toast.error(
          "Algunos productos no actualizaron su stock correctamente",
          { id: toastId }
        );
        // Continuar de todos modos, pero notificar
      }

      // 4. Actualizar deuda del proveedor (si corresponde)
      if (debtGenerated !== 0) {
        toast.loading("Actualizando cuenta del proveedor...", { id: toastId });
        const { error: debtError } = await supabase.rpc(
          "increment_supplier_debt",
          {
            supplier_id_in: selectedSupplier,
            amount_in: debtGenerated,
          }
        );

        if (debtError) {
          console.error("Debt update error:", debtError);
          toast.error("Error al actualizar deuda del proveedor", {
            id: toastId,
          });
        }
      }

      toast.success("¡Compra registrada exitosamente!", { id: toastId });

      // Pequeño delay para que el usuario vea el mensaje de éxito
      setTimeout(() => {
        router.push("/dashboard/proveedores");
        router.refresh();
      }, 500);
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al registrar la compra",
        { id: toastId }
      );
      setLoading(false);
    }
  };

  const cartProductIds = cart.map((item) => item.product.id);

  return (
    <>
      <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-screen">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-3">
              <FaShoppingCart className="text-green-600" /> Registrar Compra
            </h1>
            <p className="text-gray-600 mt-1">
              Agrega productos al carrito y registra la factura
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-100 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-all font-semibold flex items-center gap-2"
          >
            <FaTimes /> Cancelar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA PRINCIPAL */}
          <div className="lg:col-span-2 space-y-6">
            {/* INFORMACIÓN DE LA COMPRA */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FaTruck className="text-green-600" /> Información de la Compra
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="supplier"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2"
                  >
                    <FaTruck className="text-orange-600" /> Proveedor *
                  </label>
                  <select
                    id="supplier"
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{" "}
                        {s.debt > 0 && `(Deuda: ${formatCurrency(s.debt)})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="invoice"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2"
                  >
                    <FaFileInvoice className="text-blue-600" /> Nº de
                    Factura/Remito
                  </label>
                  <input
                    id="invoice"
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Ej: 0001-00001234"
                    className="w-full px-3 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* AGREGAR PRODUCTOS */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FaBoxes className="text-blue-600" /> Agregar Productos al
                Carrito
              </h2>
              <ProductSearch
                onProductSelect={handleAddProduct}
                cartProductIds={cartProductIds}
                onNewProductClick={() => setShowNewProductModal(true)}
              />
            </div>

            {/* CARRITO */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <FaShoppingCart className="mx-auto text-6xl text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">
                    No hay productos en el carrito
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Busca y selecciona productos para agregarlos
                  </p>
                </div>
              ) : (
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="text-left text-xs font-bold text-gray-700 uppercase p-3">
                          <div className="flex items-center gap-2">
                            <FaTag /> Producto
                          </div>
                        </th>
                        <th className="text-left text-xs font-bold text-gray-700 uppercase p-3">
                          <div className="flex items-center gap-2">
                            <FaCubes /> Cantidad
                          </div>
                        </th>
                        <th className="text-left text-xs font-bold text-gray-700 uppercase p-3">
                          <div className="flex items-center gap-2">
                            <FaDollarSign /> Costo Unit. *
                          </div>
                        </th>
                        <th className="text-left text-xs font-bold text-gray-700 uppercase p-3">
                          <div className="flex items-center gap-2">
                            <FaDollarSign /> Subtotal
                          </div>
                        </th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                      {cart.map((item) => {
                        const subtotal =
                          item.quantity * (parseFloat(item.cost_price) || 0);
                        return (
                          <tr
                            key={item.product.id}
                            className="hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 transition-colors"
                          >
                            <td className="p-3">
                              <div>
                                <p className="font-semibold text-gray-800 dark:text-slate-100">
                                  {item.product.name}
                                </p>
                                {item.product.sku && (
                                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <FaBarcode /> {item.product.sku}
                                  </p>
                                )}
                                <p className="text-xs text-blue-600 font-medium mt-0.5">
                                  Stock actual: {item.product.stock}
                                </p>
                              </div>
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleCartChange(
                                    item.product.id,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                                className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium"
                              />
                            </td>
                            <td className="p-3">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                                  $
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.cost_price}
                                  onChange={(e) =>
                                    handleCartChange(
                                      item.product.id,
                                      "cost_price",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0.00"
                                  required
                                  className="w-32 pl-7 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium"
                                />
                              </div>
                              {/* Cost Variation Indicator */}
                              {(() => {
                                const currentCost = item.product.cost_price || 0;
                                const newCost = parseFloat(item.cost_price) || 0;

                                if (!currentCost) return null; // No previous cost to compare

                                const diff = newCost - currentCost;
                                const percent = (diff / currentCost) * 100;

                                if (Math.abs(diff) < 0.01) return null; // No change

                                return (
                                  <div className={`text-xs mt-1 font-bold flex items-center gap-1 ${diff > 0 ? "text-red-500" : "text-green-600"}`}>
                                    {diff > 0 ? "▲" : "▼"}
                                    {Math.abs(percent).toFixed(1)}%
                                    <span className="text-gray-400 font-normal">
                                      ({formatCurrency(currentCost)})
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="p-3 font-bold text-green-600 text-lg">
                              {formatCurrency(subtotal)}
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() =>
                                  handleRemoveFromCart(item.product.id)
                                }
                                className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all"
                                title="Eliminar producto"
                              >
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="lg:hidden divide-y divide-gray-200 dark:divide-slate-700">
                  {cart.map((item) => {
                    const subtotal =
                      item.quantity * (parseFloat(item.cost_price) || 0);
                    return (
                      <div key={item.product.id} className="p-4 space-y-3">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-slate-100">
                            {item.product.name}
                          </p>
                          {item.product.sku && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <FaBarcode /> {item.product.sku}
                            </p>
                          )}
                          <p className="text-xs text-blue-600 font-medium mt-0.5">
                            Stock actual: {item.product.stock}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500">Cantidad</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleCartChange(
                                  item.product.id,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Costo unit.</label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                                $
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.cost_price}
                                onChange={(e) =>
                                  handleCartChange(
                                    item.product.id,
                                    "cost_price",
                                    e.target.value
                                  )
                                }
                                placeholder="0.00"
                                required
                                className="w-full pl-7 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium"
                              />
                            </div>
                            {(() => {
                              const currentCost = item.product.cost_price || 0;
                              const newCost = parseFloat(item.cost_price) || 0;

                              if (!currentCost) return null;

                              const diff = newCost - currentCost;
                              const percent = (diff / currentCost) * 100;

                              if (Math.abs(diff) < 0.01) return null;

                              return (
                                <div
                                  className={`text-xs mt-1 font-bold flex items-center gap-1 ${diff > 0 ? "text-red-500" : "text-green-600"}`}
                                >
                                  {diff > 0 ? "▲" : "▼"}
                                  {Math.abs(percent).toFixed(1)}%
                                  <span className="text-gray-400 font-normal">
                                    ({formatCurrency(currentCost)})
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">Subtotal</div>
                          <div className="font-bold text-green-600 text-lg">
                            {formatCurrency(subtotal)}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleRemoveFromCart(item.product.id)}
                            className="px-3 py-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all text-sm font-semibold"
                            title="Eliminar producto"
                          >
                            <FaTrash /> Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* PANEL DE RESUMEN */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700 space-y-6 h-fit sticky top-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <FaFileInvoice className="text-green-600" /> Resumen de Compra
            </h2>

            <div className="space-y-3 py-4 border-y border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center gap-2">
                  <FaBoxes className="text-blue-600" /> Productos:
                </span>
                <span className="font-bold text-lg">{cart.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center gap-2">
                  <FaCubes className="text-purple-600" /> Unidades totales:
                </span>
                <span className="font-bold text-lg">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg p-4 border-2 border-green-200 dark:border-green-900">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-700 dark:text-slate-200">Total Factura:</span>
                <span className="font-bold text-3xl text-green-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="amountPaid"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2"
              >
                <FaDollarSign className="text-green-600" /> Monto Pagado
                (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400 font-medium">
                  $
                </span>
                <input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  min="0"
                  max={totalAmount}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div
              className={`rounded-lg p-4 border-2 ${totalAmount - (parseFloat(amountPaid) || 0) > 0
                ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-900"
                : "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-900"
                }`}
            >
              <div className="flex justify-between items-center">
                <span
                  className={`font-bold ${totalAmount - (parseFloat(amountPaid) || 0) > 0
                    ? "text-red-700 dark:text-red-300"
                    : "text-green-700 dark:text-green-300"
                    }`}
                >
                  Deuda Generada:
                </span>
                <span
                  className={`font-bold text-2xl ${totalAmount - (parseFloat(amountPaid) || 0) > 0
                    ? "text-red-600"
                    : "text-green-600"
                    }`}
                >
                  {formatCurrency(totalAmount - (parseFloat(amountPaid) || 0))}
                </span>
              </div>
            </div>

            <button
              onClick={handleFinalizePurchase}
              disabled={loading || cart.length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <FaSave /> Finalizar Compra y Agregar Stock
                </>
              )}
            </button>

            {cart.length === 0 && (
              <p className="text-xs text-center text-gray-500 bg-gray-50 rounded-lg py-2">
                Agrega productos para continuar
              </p>
            )}
          </div>
        </div>
      </div>

      <NewProductModal
        isOpen={showNewProductModal}
        onClose={() => setShowNewProductModal(false)}
        onProductCreated={handleProductCreated}
      />
    </>
  );
}
