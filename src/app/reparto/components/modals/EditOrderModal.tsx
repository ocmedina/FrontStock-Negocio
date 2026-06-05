import { useState, useEffect } from "react";
import {
  FaEdit,
  FaTimes,
  FaSpinner,
  FaShoppingCart,
  FaMinus,
  FaPlus,
  FaCheck,
  FaTrashAlt,
} from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { Database } from "@/lib/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type FullOrder = {
  id: string;
  customer_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  profile_id: string;
  customers: Customer;
  order_items: {
    id: string;
    quantity: number;
    price: number;
    product_id: string;
    products: { name: string; sku: string; stock: number } | null;
  }[];
};

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  onOrderUpdated: () => void;
}

export default function EditOrderModal({
  isOpen,
  onClose,
  orderId,
  onOrderUpdated,
}: EditOrderModalProps) {
  const [orderData, setOrderData] = useState<FullOrder | null>(null);
  const [editedItems, setEditedItems] = useState<
    {
      id: string;
      product_id: string;
      product_name: string;
      quantity: number;
      price: number;
      original_quantity: number;
      stock: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      setLoading(true);
      const fetchFullOrder = async () => {
        try {
          const { data: order, error } = await (supabase as any)
            .from("orders")
            .select("*, customers(*), order_items(*, products(*))")
            .eq("id", orderId)
            .single();

          if (error) throw error;

          if (order) {
            setOrderData(order as FullOrder);
            const items = order.order_items.map((item: any) => ({
              id: item.id,
              product_id: item.product_id,
              product_name: item.products?.name || "Producto desconocido",
              quantity: item.quantity,
              price: item.price,
              original_quantity: item.quantity,
              stock: item.products?.stock || 0,
            }));
            setEditedItems(items);
          }
        } catch (error: any) {
          toast.error("No se pudieron cargar los datos del pedido.");
          console.error(error);
          onClose();
        } finally {
          setLoading(false);
        }
      };
      fetchFullOrder();
    }
  }, [isOpen, orderId, onClose]);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    setEditedItems(
      editedItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setEditedItems(editedItems.filter((item) => item.id !== itemId));
  };

  const calculateNewTotal = () => {
    return editedItems.reduce(
      (acc, item) => acc + item.quantity * item.price,
      0
    );
  };

  const handleSave = async () => {
    if (!orderData) return;

    setIsSaving(true);
    const loadingToast = toast.loading("Actualizando pedido...");

    try {
      const newTotal = calculateNewTotal();

      // 1. Actualizar el total del pedido
      const { error: orderError } = await (supabase as any)
        .from("orders")
        .update({ total_amount: newTotal })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // 2. Procesar cambios en los items
      for (const item of editedItems) {
        const quantityDiff = item.quantity - item.original_quantity;

        if (quantityDiff !== 0) {
          // Actualizar cantidad en order_items
          const { error: itemError } = await (supabase as any)
            .from("order_items")
            .update({ quantity: item.quantity })
            .eq("id", item.id);

          if (itemError) throw itemError;

          // Ajustar stock del producto SOLO si el pedido ya fue entregado
          if (orderData.status === "entregado") {
            const { data: productData } = await supabase
              .from("products")
              .select("stock")
              .eq("id", item.product_id)
              .single();

            if (productData) {
              const newStock = productData.stock - quantityDiff;
              await supabase
                .from("products")
                .update({ stock: Math.max(0, newStock) })
                .eq("id", item.product_id);
            }
          }
        }
      }

      // 3. Eliminar items que fueron removidos
      const removedItems = orderData.order_items.filter(
        (original: any) =>
          !editedItems.find((edited) => edited.id === original.id)
      );

      for (const removedItem of removedItems) {
        // Devolver stock SOLO si el pedido ya fue entregado
        if (orderData.status === "entregado") {
          const { data: productData } = await supabase
            .from("products")
            .select("stock")
            .eq("id", removedItem.product_id)
            .single();

          if (productData) {
            const newStock = productData.stock + removedItem.quantity;
            await supabase
              .from("products")
              .update({ stock: newStock })
              .eq("id", removedItem.product_id);
          }
        }

        // Eliminar item
        await (supabase as any)
          .from("order_items")
          .delete()
          .eq("id", removedItem.id);
      }

      toast.dismiss(loadingToast);
      toast.success("¡Pedido actualizado exitosamente!");
      onOrderUpdated();
      onClose();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || "Error al actualizar el pedido");
      console.error("Error updating order:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col border border-slate-205 dark:border-slate-800/80 animate-slide-up sm:animate-none">
        
        {/* Cabecera del Modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-955/20 flex items-center justify-center">
              <FaEdit className="text-indigo-600 dark:text-indigo-400 text-sm" />
            </div>
            <h2 className="text-xs font-black text-slate-855 dark:text-slate-100 uppercase tracking-wider">
              Editar Productos de Pedido
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-7 h-7 flex items-center justify-center text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {loading || !orderData ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FaSpinner className="animate-spin text-3xl text-indigo-600 mb-3" />
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Cargando datos del pedido...</p>
            </div>
          ) : (
            <>
              {/* Info Cliente */}
              <div className="bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/35">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-1">Cliente Destinatario</p>
                <p className="text-sm font-black text-slate-850 dark:text-slate-100">
                  {orderData.customers?.full_name}
                </p>
              </div>

              {/* Listado de Productos */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-[11px] text-slate-455 uppercase tracking-wider flex items-center gap-1.5">
                  <FaShoppingCart /> Ítems en el Pedido
                </h3>
                
                {editedItems.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <FaShoppingCart className="text-4xl text-slate-200 dark:text-slate-800 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-550">No hay productos cargados</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {editedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/40 dark:bg-slate-950/30 rounded-2xl border border-slate-200/40 dark:border-slate-805/40 gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate">
                            {item.product_name}
                          </p>
                          <div className="flex gap-2 items-center mt-1">
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">
                              ${item.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })} c/u
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                              Stock disp: {item.stock + item.original_quantity}
                            </span>
                          </div>
                        </div>
                        
                        {/* Controles de Cantidad y Borrado */}
                        <div className="flex items-center gap-2.5 justify-between sm:justify-end shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-850">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg active:scale-90 transition-all font-bold shadow-sm"
                            >
                              <FaMinus size={9} />
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                handleQuantityChange(item.id, val);
                              }}
                              className="w-12 py-1 border border-slate-200 dark:border-slate-800 rounded-lg text-center font-black text-xs bg-white dark:bg-slate-900 outline-none text-slate-800 dark:text-white"
                            />
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg active:scale-90 transition-all font-bold shadow-sm"
                            >
                              <FaPlus size={9} />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="w-7 h-7 flex items-center justify-center bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg transition-all"
                            title="Eliminar producto"
                          >
                            <FaTrashAlt size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comparador de Totales */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-850 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-450 dark:text-slate-500">Monto Original:</span>
                  <span className="font-extrabold text-slate-500 line-through">
                    ${orderData.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase font-black text-slate-800 dark:text-slate-200 tracking-wider">Nuevo Total Calculado:</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    ${calculateNewTotal().toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-955/10 rounded-b-3xl flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving || loading || editedItems.length === 0}
            className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:shadow-md hover:shadow-indigo-500/10 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <FaSpinner className="animate-spin text-sm" /> Guardando...
              </>
            ) : (
              <>
                <FaCheck /> Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
