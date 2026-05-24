import { useState, useEffect } from "react";
import CustomLoader from "@/components/CustomLoader";
import { FaPrint, FaTimes } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import PDFDownloadButton from "@/components/pdf/PDFDownloadButton";
import { Database } from "@/lib/database.types";
import { getCustomerRealDebt } from "@/app/actions/cashCloseActions";

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

interface RemitoModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}

export default function RemitoModal({
  isOpen,
  onClose,
  orderId,
}: RemitoModalProps) {
  const [orderData, setOrderData] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [printFormat, setPrintFormat] = useState<"A4" | "thermal">("thermal");

  useEffect(() => {
    if (isOpen && orderId) {
      // Reset stale data to prevent showing old PDF after HMR or re-open
      setOrderData(null);
      setLoading(true);
      const fetchFullOrder = async () => {
        try {
          const query = (supabase as any)
            .from("orders")
            .select("*, customers(*), order_items(*, products(*))")
            .eq("id", orderId)
            .single();

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("TIMEOUT_FORZADO")), 2000);
          });

          const result = await Promise.race([query, timeoutPromise]) as any;
          const order = result?.data;
          const error = result?.error;

          if (error) throw error;

          if (order) {
            const customerId = order.customer_id;
            let realDebt = 0;

            try {
              const debtsPromise = Promise.all([
                supabase
                  .from("orders")
                  .select("amount_pending, status, total_amount, id")
                  .eq("customer_id", customerId)
                  .neq("status", "cancelado"),
                supabase
                  .from("sales")
                  .select("amount_pending, payment_method, is_cancelled, id")
                  .eq("customer_id", customerId)
              ]);

              const timeoutPromise2 = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("TIMEOUT_FORZADO")), 2000);
              });

              const [ordersRes, salesRes] = await Promise.race([debtsPromise, timeoutPromise2]) as any;

              const ordersDebt = (ordersRes.data || [])
                .filter((o: any) => o.status !== "cancelado" && Number(o.amount_pending || 0) > 0)
                .reduce((s: number, o: any) => s + Number(o.amount_pending), 0);

              const salesDebt = (salesRes.data || [])
                .filter(
                  (sv: any) =>
                    !sv.is_cancelled &&
                    (sv.payment_method || "").toLowerCase() === "cuenta_corriente" &&
                    Number(sv.amount_pending || 0) > 0
                )
                .reduce((s: number, sv: any) => s + Number(sv.amount_pending), 0);

              realDebt = ordersDebt + salesDebt;
              (order as any)._debugDebt = {
                customerId,
                realDebt,
                ordersPendingLength: (ordersRes.data || []).filter((o: any) => Number(o.amount_pending || 0) > 0).length,
                salesPendingLength: (salesRes.data || []).filter((s: any) => Number(s.amount_pending || 0) > 0).length,
                rawOrders: ordersRes.data,
                rawSales: salesRes.data
              };
            } catch (debtErr: any) {
              if (debtErr.message === "TIMEOUT_FORZADO") {
                window.location.reload();
                return;
              }
              console.error("[RemitoModal] error calculando deuda:", debtErr);
            }

            setOrderData({
              ...order,
              customers: { ...order.customers, realDebt },
            } as FullOrder);
          }
        } catch (error: any) {
          if (error.message === "TIMEOUT_FORZADO") {
            window.location.reload();
            return;
          }
          toast.error("No se pudieron cargar los datos del remito.");
          console.error(error);
          onClose();
        } finally {
          setLoading(false);
        }
      };
      fetchFullOrder();
    }
  }, [isOpen, orderId, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-5 rounded-t-3xl flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FaPrint /> Generar Remito
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white dark:bg-slate-900 hover:bg-opacity-20 rounded-full p-2"
          >
            <FaTimes size={20} />
          </button>
        </div>
        <div className="p-8">
          {loading || !orderData ? (
            <div className="flex flex-col items-center justify-center h-48">
              <CustomLoader size={60} text="Cargando remito..." />
            </div>
          ) : (
            <>
              {/* BLOQUE DE DEBUG TEMPORAL PARA IDENTIFICAR POR QUÉ ES 0 */}
              <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-900/50 text-xs">
                <p className="font-bold text-amber-800 dark:text-amber-500 mb-1">🔍 DEBUG INFO (enviame captura de esto):</p>
                <p className="text-amber-700 dark:text-amber-400">ID Cliente: {(orderData as any)._debugDebt?.customerId}</p>
                <p className="text-amber-700 dark:text-amber-400">Total Calculado: ${(orderData as any)._debugDebt?.realDebt}</p>
                <p className="text-amber-700 dark:text-amber-400">Pedidos con deuda &gt; 0: {(orderData as any)._debugDebt?.ordersPendingLength}</p>
                <p className="text-amber-700 dark:text-amber-400">Ventas con deuda &gt; 0: {(orderData as any)._debugDebt?.salesPendingLength}</p>
              </div>

              <p className="mb-4 text-gray-700 dark:text-slate-200 text-center">
                El remito para{" "}
                <span className="font-bold">
                  {orderData.customers?.full_name}
                </span>{" "}
                está listo.
              </p>

              {/* Selector de formato */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Formato de Impresión:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPrintFormat("thermal")}
                    className={`py-3 px-4 rounded-xl border-2 transition-all font-semibold text-sm ${printFormat === "thermal"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"
                      }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <FaPrint className="text-xl" />
                      <span>Térmica 80mm</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setPrintFormat("A4")}
                    className={`py-3 px-4 rounded-xl border-2 transition-all font-semibold text-sm ${printFormat === "A4"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"
                      }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <FaPrint className="text-xl" />
                      <span>A4 Normal</span>
                    </div>
                  </button>
                </div>
              </div>

              <PDFDownloadButton
                orderData={orderData}
                printFormat={printFormat}
              />

              <button
                onClick={onClose}
                className="w-full mt-3 py-3 text-gray-600 dark:text-slate-300 font-semibold hover:bg-gray-100 dark:hover:bg-slate-800/80 dark:bg-slate-800 rounded-xl"
              >
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
