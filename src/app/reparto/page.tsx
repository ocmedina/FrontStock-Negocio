"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { User } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";
import { useRouter } from "next/navigation";

// Components
import DeliveryHeader from "./components/DeliveryHeader";
import NewOrderView from "./components/NewOrderView";
import DailyOrdersView from "./components/DailyOrdersView";
import HistoryView from "./components/HistoryView";
import DebtorsView from "./components/DebtorsView";

// Modals
import AddCustomerModal from "./components/modals/AddCustomerModal";
import AddProductModal from "./components/modals/AddProductModal";
import DeliveryConfirmationModal from "./components/modals/DeliveryConfirmationModal";
import RemitoModal from "./components/modals/RemitoModal";
import CancelOrderModal from "./components/modals/CancelOrderModal";
import OrderDetailsModal from "./components/modals/OrderDetailsModal";
import EditOrderModal from "./components/modals/EditOrderModal";
import AddExpenseModal from "./components/modals/AddExpenseModal";

// --- Tipos de Datos ---
type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type CartItem = Product & { quantity: number };
type Order = {
  id: string;
  customer_id: string;
  total_amount: number;
  amount_paid: number;
  amount_pending: number;
  payment_method: string | null;
  status: string;
  created_at: string;
  profile_id: string;
  customers: {
    full_name: string;
    address?: string | null;
    reference?: string | null;
  };
};

export default function RepartoPage() {
  const [view, setView] = useState("new_order");
  const [dailyOrders, setDailyOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isRemitoModalOpen, setIsRemitoModalOpen] = useState(false);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isCancelOrderModalOpen, setIsCancelOrderModalOpen] = useState(false);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);

  // Selection States
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] =
    useState<Order | null>(null);
  const [selectedOrderForCancel, setSelectedOrderForCancel] =
    useState<Order | null>(null);
  const [selectedOrderIdForRemito, setSelectedOrderIdForRemito] = useState<
    string | null
  >(null);
  const [selectedOrderIdForEdit, setSelectedOrderIdForEdit] = useState<
    string | null
  >(null);
  const [selectedOrderIdForDetails, setSelectedOrderIdForDetails] = useState<
    string | null
  >(null);

  const [discount, setDiscount] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [historyFilter, setHistoryFilter] = useState("all");

  // Date State for Daily View — usar zona horaria Argentina para evitar desfasaje con UTC
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    // toLocaleDateString con timeZone Argentina siempre devuelve la fecha local correcta
    return now.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }); // Formato YYYY-MM-DD
  });

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;

      if (data) {
        setCustomers(data);
        if (data.length > 0 && !selectedCustomer) {
          setSelectedCustomer(data[0]);
        }
      }
    } catch (error: any) {
      toast.error("Error al cargar clientes");
    }
  }, [selectedCustomer]);

  // Fetch daily orders
  const fetchDailyHistory = useCallback(
    async (_userId: string, date: string) => {
      try {
        // Create start and end timestamps for the selected date in Argentina timezone
        // We assume the date string is YYYY-MM-DD
        const startDate = `${date}T00:00:00-03:00`;

        // Calculate next day for the upper bound
        const dateObj = new Date(date);
        dateObj.setDate(dateObj.getDate() + 1);
        const nextDay = dateObj.toISOString().split("T")[0];
        const endDate = `${nextDay}T00:00:00-03:00`;

        const { data, error } = await (supabase as any)
          .from("orders")
          .select(
            "id, total_amount, status, created_at, customer_id, profile_id, amount_paid, amount_pending, payment_method, customers(full_name, address, reference)"
          )
          // Sin filtro de profile_id: se muestran todos los pedidos del negocio
          .gte("created_at", startDate)
          .lt("created_at", endDate)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setDailyOrders((data || []) as unknown as Order[]);
      } catch (error: any) {
        toast.error("No se pudo cargar el historial.");
      }
    },
    []
  );

  // Fetch all orders history
  const fetchAllOrdersHistory = useCallback(async (_userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select(
          "id, total_amount, status, created_at, customer_id, profile_id, customers(full_name, address, reference)"
        )
        // Sin filtro de profile_id: se muestran todos los pedidos del negocio
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setAllOrders((data || []) as unknown as Order[]);
    } catch (error: any) {
      toast.error("No se pudo cargar el historial completo.");
    }
  }, []);

  // Load initial data
  useEffect(() => {
    async function loadInitialData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        fetchAllOrdersHistory(session.user.id);
      } else {
        router.push("/login");
      }
      fetchCustomers();
    }
    loadInitialData();
  }, [
    fetchAllOrdersHistory,
    fetchCustomers,
    router,
  ]);

  useEffect(() => {
    if (!currentUser) return;
    fetchDailyHistory(currentUser.id, selectedDate);
  }, [currentUser, selectedDate, fetchDailyHistory]);

  // Real-time subscription for orders
  useEffect(() => {
    if (!currentUser) return;

    const ordersChannel = supabase
      .channel("realtime-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          // Sin filtro de profile_id: escucha cambios en todos los pedidos del negocio
        },
        (payload) => {
          console.log("Order change detected:", payload);
          fetchDailyHistory(currentUser.id, selectedDate);
          fetchAllOrdersHistory(currentUser.id);
        }
      )
      .subscribe();

    return () => {
      ordersChannel.unsubscribe();
    };
  }, [currentUser, fetchDailyHistory, fetchAllOrdersHistory, selectedDate]);

  // Calculate subtotal and total
  const subTotal = useMemo(() => {
    if (!selectedCustomer) return 0;
    return cart.reduce((acc, item) => {
      const price =
        selectedCustomer.customer_type === "mayorista"
          ? item.price_mayorista
          : item.price_minorista;
      const numericPrice = parseFloat(String(price)) || 0;
      const quantity = parseInt(String(item.quantity)) || 0;
      return acc + numericPrice * quantity;
    }, 0);
  }, [cart, selectedCustomer]);

  const total = useMemo(() => {
    const numericSubTotal = parseFloat(String(subTotal)) || 0;
    const numericDiscount = parseFloat(String(discount)) || 0;
    const numericShipping = parseFloat(String(shipping)) || 0;
    return (
      numericSubTotal -
      numericSubTotal * (numericDiscount / 100) +
      numericShipping
    );
  }, [subTotal, discount, shipping]);

  // Handle add product to cart
  const handleAddProduct = useCallback(
    (productToAdd: Product) => {
      if (!selectedCustomer) {
        toast.error("Por favor, selecciona un cliente.");
        return;
      }

      const existingItem = cart.find((item) => item.id === productToAdd.id);

      if (existingItem) {
        if (existingItem.quantity < (productToAdd.stock || 0)) {
          setCart(
            cart.map((item) =>
              item.id === productToAdd.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          );
          toast.success("Cantidad actualizada");
        } else {
          toast.error("No hay más stock disponible.");
        }
      } else {
        if ((productToAdd.stock || 0) > 0) {
          setCart([...cart, { ...productToAdd, quantity: 1 }]);
          toast.success("Producto agregado");
        } else {
          toast.error("Este producto no tiene stock.");
        }
      }
    },
    [cart, selectedCustomer]
  );

  // Handle update quantity
  const handleUpdateQuantity = useCallback(
    (productId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
        setCart(cart.filter((item) => item.id !== productId));
        toast.success("Producto eliminado");
      } else {
        const product = cart.find((item) => item.id === productId);
        if (product && newQuantity > (product.stock || 0)) {
          toast.error("No hay más stock disponible.");
          return;
        }
        setCart(
          cart.map((item) =>
            item.id === productId ? { ...item, quantity: newQuantity } : item
          )
        );
      }
    },
    [cart]
  );

  // Handle finalize order (Not used in this simplified view but kept for future use if needed, logic is inside NewOrderView potentially or handled by a button there)
  // Wait, NewOrderView doesn't have a "Finalize" button in the extracted code?
  // Checking extracted code... NewOrderView only has "Add Product" and "Add Customer".
  // I missed the "Finalize Order" button in the extraction! I need to add it back or pass it as a prop.
  // Actually, looking at the original code, there was no "Finalize Order" button visible in the `view === "new_order"` section I extracted?
  // Let me check the original code again.
  // Ah, I see. In the original code, there was no explicit "Finalize" button in the `view === "new_order"` block I saw?
  // Wait, I might have missed it.
  // Let's re-read the original code around line 2195.
  // It seems I might have missed the bottom part of the "new_order" view in the extraction or the original file view was truncated?
  // I will add the "Finalize Order" button to the main page or update NewOrderView.
  // For now, I'll add the logic here and check where to place the button.

  const handleFinalizeOrder = async () => {
    if (!selectedCustomer || cart.length === 0 || !currentUser?.id) {
      toast.error("Faltan datos para completar el pedido.");
      return;
    }

    if (total <= 0) {
      toast.error("El total debe ser mayor a 0.");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Guardando pedido...");

    try {
      // 1. Verificar stock actual en tiempo real
      for (const item of cart) {
        const { data: productData, error: stockError } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.id)
          .single();

        if (stockError)
          throw new Error(`Error al verificar stock de ${item.name}`);

        if (!productData || item.quantity > productData.stock) {
          throw new Error(
            `Stock insuficiente para "${item.name}". Solo quedan ${productData?.stock || 0
            }.`
          );
        }
      }

      // 2. Crear el pedido
      const { data: orderData, error: orderError } = await (supabase as any)
        .from("orders")
        .insert({
          customer_id: selectedCustomer.id,
          profile_id: currentUser.id,
          total_amount: total,
          status: "pendiente",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. Guardar items del pedido
      const orderItems = cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price:
          selectedCustomer.customer_type === "mayorista"
            ? item.price_mayorista
            : item.price_minorista,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        // Rollback: eliminar el pedido creado
        await (supabase as any).from("orders").delete().eq("id", orderData.id);
        throw itemsError;
      }

      toast.dismiss(loadingToast);
      toast.success("¡Pedido registrado exitosamente!");

      // Refrescar datos
      if (currentUser) {
        fetchDailyHistory(currentUser.id, selectedDate);
        fetchAllOrdersHistory(currentUser.id);
      }

      // Limpiar formulario
      setCart([]);
      if (customers.length > 0) setSelectedCustomer(customers[0]);
      setDiscount(0);
      setView("daily"); // Switch to daily view after order
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || "Error al registrar el pedido");
      console.error("Error creating order:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle confirm delivery
  const handleConfirmDelivery = async (
    orderId: string,
    amountPaid: number,
    paymentMethod: string
  ) => {
    // Buscar el pedido en ambas listas (diarios y historial)
    const order =
      dailyOrders.find((o) => o.id === orderId) ||
      allOrders.find((o) => o.id === orderId);
    if (!order) {
      toast.error("No se encontró el pedido");
      return;
    }

    const total = order.total_amount;
    const debtGenerated = total - amountPaid;

    try {
      // 1. Actualizar la deuda del cliente (si es necesario)
      if (debtGenerated > 0) {
        const { data: customerData } = await supabase
          .from("customers")
          .select("debt")
          .eq("id", order.customer_id)
          .single();

        const currentDebt = (customerData?.debt as number) || 0;
        const newDebt = currentDebt + debtGenerated;

        await supabase
          .from("customers")
          .update({ debt: newDebt })
          .eq("id", order.customer_id);
      }

      // 2. Registrar movimientos en la cuenta corriente
      const movements = [
        {
          customer_id: order.customer_id,
          order_id: order.id,
          type: "compra",
          amount: total,
          comment: `Pedido ${order.id.substring(0, 8)}`,
        },
      ];

      if (amountPaid > 0) {
        movements.push({
          customer_id: order.customer_id,
          order_id: order.id,
          type: "pago",
          amount: amountPaid,
          comment: `Pago en entrega (${paymentMethod})`,
        });
      }

      await supabase.from("payments").insert(movements);

      // 3. Marcar pedido como 'entregado' y actualizar método de pago usando RPC
      // Primero actualizamos los datos de pago
      await (supabase as any)
        .from("orders")
        .update({
          payment_method: paymentMethod,
          amount_paid: amountPaid,
          amount_pending: total - amountPaid,
        })
        .eq("id", orderId);

      // Luego llamamos al RPC para cambiar estado y descontar stock
      const { error } = await supabase.rpc("handle_order_status_change", {
        order_id_param: orderId,
        new_status_param: "entregado",
      });

      if (error) throw error;

      toast.success("✅ Pedido marcado como entregado.");

      // Refrescar datos
      if (currentUser) {
        fetchDailyHistory(currentUser.id, selectedDate);
        fetchAllOrdersHistory(currentUser.id);
      }
    } catch (error: any) {
      toast.error("Error al marcar el pedido como entregado");
      console.error(error);
    }
  };

  // Handle cancel order
  const handleCancelOrder = async (orderId: string) => {
    try {
      // 1. Usar RPC para cancelar y manejar stock automáticamente
      const { error } = await supabase.rpc("handle_order_status_change", {
        order_id_param: orderId,
        new_status_param: "cancelado",
      });

      if (error) throw error;

      toast.success("🚫 Pedido cancelado exitosamente. Stock devuelto.");

      // Refrescar datos
      if (currentUser) {
        fetchDailyHistory(currentUser.id, selectedDate);
        fetchAllOrdersHistory(currentUser.id);
      }
    } catch (error: any) {
      toast.error("Error al cancelar el pedido");
      console.error(error);
    }
  };

  // Handle customer added
  const handleCustomerAdded = (newCustomer: Customer) => {
    setCustomers((prev) =>
      [...prev, newCustomer].sort((a, b) =>
        a.full_name.localeCompare(b.full_name)
      )
    );
    setSelectedCustomer(newCustomer);
    toast.success(`Cliente ${newCustomer.full_name} seleccionado`);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch (error) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // ignore logout cleanup errors
      }
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  const pendingOrdersCount = dailyOrders.filter(
    (o) => o.status === "pendiente"
  ).length;
  const deliveredOrdersCount = dailyOrders.filter(
    (o) => o.status === "entregado"
  ).length;

  // Filter orders for history view
  const filteredHistoryOrders = useMemo(() => {
    if (historyFilter === "all") return allOrders;
    return allOrders.filter((o) => o.status === historyFilter);
  }, [allOrders, historyFilter]);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-screen font-sans">
      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProductAdd={handleAddProduct}
      />
      <DeliveryConfirmationModal
        isOpen={isDeliveryModalOpen}
        order={selectedOrderForDelivery}
        onClose={() => setIsDeliveryModalOpen(false)}
        onConfirm={handleConfirmDelivery}
      />
      <RemitoModal
        isOpen={isRemitoModalOpen}
        onClose={() => setIsRemitoModalOpen(false)}
        orderId={selectedOrderIdForRemito}
      />
      <EditOrderModal
        isOpen={isEditOrderModalOpen}
        onClose={() => setIsEditOrderModalOpen(false)}
        orderId={selectedOrderIdForEdit}
        onOrderUpdated={() => {
          if (currentUser) {
            fetchDailyHistory(currentUser.id, selectedDate);
            fetchAllOrdersHistory(currentUser.id);
          }
        }}
      />
      <AddCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onCustomerAdded={handleCustomerAdded}
      />
      <CancelOrderModal
        isOpen={isCancelOrderModalOpen}
        order={selectedOrderForCancel}
        onClose={() => setIsCancelOrderModalOpen(false)}
        onConfirm={handleCancelOrder}
      />
      <OrderDetailsModal
        isOpen={isOrderDetailsModalOpen}
        onClose={() => setIsOrderDetailsModalOpen(false)}
        orderId={selectedOrderIdForDetails}
      />
      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        userId={currentUser?.id || ""}
        onClose={() => setIsAddExpenseModalOpen(false)}
        onSuccess={() => {
          // If we want to refresh anything specific when an expense is added, we can do it here.
          // By default, it's just saved to the database.
        }}
      />

      <DeliveryHeader
        currentUser={currentUser}
        pendingOrdersCount={pendingOrdersCount}
        view={view}
        setView={setView}
        onLogout={handleLogout}
        onOpenExpenseModal={() => setIsAddExpenseModalOpen(true)}
      />

      {view === "new_order" && (
        <>
          <NewOrderView
            customers={customers}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            cart={cart}
            onAddProductClick={() => setIsModalOpen(true)}
            onAddCustomerClick={() => setIsAddCustomerModalOpen(true)}
            onUpdateQuantity={handleUpdateQuantity}
            subTotal={subTotal}
            discount={discount}
            setDiscount={setDiscount}
            shipping={shipping}
            setShipping={setShipping}
            total={total}
            onFinalizeOrder={handleFinalizeOrder}
            loading={loading}
          />
        </>
      )}

      {view === "daily" && (
        <DailyOrdersView
          dailyOrders={dailyOrders}
          pendingOrdersCount={pendingOrdersCount}
          deliveredOrdersCount={deliveredOrdersCount}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onViewDetails={(id) => {
            setSelectedOrderIdForDetails(id);
            setIsOrderDetailsModalOpen(true);
          }}
          onEditOrder={(id) => {
            setSelectedOrderIdForEdit(id);
            setIsEditOrderModalOpen(true);
          }}
          onPrintRemito={(id) => {
            setSelectedOrderIdForRemito(id);
            setIsRemitoModalOpen(true);
          }}
          onDeliverOrder={(order) => {
            setSelectedOrderForDelivery(order);
            setIsDeliveryModalOpen(true);
          }}
          onCancelOrder={(order) => {
            setSelectedOrderForCancel(order);
            setIsCancelOrderModalOpen(true);
          }}
        />
      )}

      {view === "history" && (
        <HistoryView
          filteredHistoryOrders={filteredHistoryOrders}
          historyFilter={historyFilter}
          setHistoryFilter={setHistoryFilter}
          onViewDetails={(id) => {
            setSelectedOrderIdForDetails(id);
            setIsOrderDetailsModalOpen(true);
          }}
          onEditOrder={(id) => {
            setSelectedOrderIdForEdit(id);
            setIsEditOrderModalOpen(true);
          }}
          onPrintRemito={(id) => {
            setSelectedOrderIdForRemito(id);
            setIsRemitoModalOpen(true);
          }}
          onDeliverOrder={(order) => {
            setSelectedOrderForDelivery(order);
            setIsDeliveryModalOpen(true);
          }}
          onCancelOrder={(order) => {
            setSelectedOrderForCancel(order);
            setIsCancelOrderModalOpen(true);
          }}
        />
      )}

      {view === "debtors" && (
        <DebtorsView
          onPrintRemito={(id) => {
            setSelectedOrderIdForRemito(id);
            setIsRemitoModalOpen(true);
          }}
        />
      )}
    </div>
  );
}

