import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  FaDollarSign,
  FaUser,
  FaPhone,
  FaSearch,
  FaPrint,
  FaTrash,
  FaHistory,
  FaChevronDown,
  FaChevronUp,
  FaShoppingBag,
  FaExclamationCircle,
} from "react-icons/fa";
import RegisterPayment from "@/components/payments/RegisterPayment";

type DebtDetail = {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  customer_type: string;
  ordersDebt: number;
  salesDebt: number;
  totalDebt: number;
  ordersCount: number;
  salesCount: number;
  orders: any[];
  sales: any[];
  payments: any[];
};

export default function DebtorsView({ onPrintRemito }: { onPrintRemito: (orderId: string) => void }) {
  const [deudores, setDeudores] = useState<DebtDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<DebtDetail | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [cancellingPaymentId, setCancellingPaymentId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchDeudores();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchDeudores = async () => {
    setLoading(true);

    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select("*");

    if (customersError) {
      console.error("Error fetching customers:", customersError);
      setLoading(false);
      return;
    }

    const deudoresData = await Promise.all(
      (customersData || []).map(async (customer) => {
        // Pending Orders
        const { data: ordersData } = await supabase
          .from("orders")
          .select("id, created_at, total_amount, amount_pending, order_items(id, quantity, price, products(name))")
          .eq("customer_id", customer.id)
          .gt("amount_pending", 0)
          .neq("status", "cancelado")
          .order('created_at', { ascending: false });

        const ordersDebt = (ordersData || []).reduce(
          (sum, order) => sum + (order.amount_pending || 0),
          0
        );

        // Pending Sales (Current Account)
        const { data: salesData } = await supabase
          .from("sales")
          .select("id, created_at, total_amount, amount_pending, description")
          .eq("customer_id", customer.id)
          .eq("payment_method", "cuenta_corriente")
          .gt("amount_pending", 0)
          .eq("is_cancelled", false)
          .order('created_at', { ascending: false });

        const salesDebt = (salesData || []).reduce(
          (sum, sale) => sum + ((sale as any).amount_pending || 0),
          0
        );

        // Recent Payments
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("*")
          .eq("customer_id", customer.id)
          .eq("type", "pago")
          .order("created_at", { ascending: false })
          .limit(20);

        return {
          id: customer.id,
          full_name: customer.full_name,
          phone: customer.phone,
          email: customer.email,
          customer_type: customer.customer_type,
          ordersDebt,
          salesDebt,
          totalDebt: ordersDebt + salesDebt,
          ordersCount: ordersData?.length || 0,
          salesCount: salesData?.length || 0,
          orders: ordersData || [],
          sales: salesData || [],
          payments: paymentsData || []
        };
      })
    );

    const clientesConDeuda = deudoresData
      .filter((d) => d.totalDebt > 0 || d.payments.some((p) => p.payment_method !== 'anulado'))
      .sort((a, b) => b.totalDebt - a.totalDebt);

    setDeudores(clientesConDeuda);
    setLoading(false);
  };

  const handleOpenPayment = (customer: DebtDetail) => {
    setSelectedCustomer(customer);
    setShowPaymentModal(true);
  };

  const handleClosePayment = () => {
    setShowPaymentModal(false);
    setSelectedCustomer(null);
    fetchDeudores();
  };

  const toggleExpand = (customerId: string) => {
    setExpandedCustomerId(expandedCustomerId === customerId ? null : customerId);
  }

  const handleCancelPayment = async (e: React.MouseEvent, payment: any) => {
    e.stopPropagation(); // Evitar colapsar la tarjeta
    if (payment.payment_method === 'anulado') return;

    if (!window.confirm(`¿Está seguro de anular este pago de $${payment.amount}? Esta acción restaurará la deuda al cliente.`)) {
      return;
    }

    setCancellingPaymentId(payment.id);

    try {
      const { data: txData, error: txError } = await supabase.rpc(
        "cancel_customer_payment_transaction",
        { p_payment_id: payment.id }
      );

      if (txError) throw txError;

      const result = (txData || {}) as { remaining_unrestored?: number | null };
      const remainingUnrestored = Number(result.remaining_unrestored || 0);

      if (remainingUnrestored > 0.01) {
        alert(
          `Pago anulado exitosamente.\nParte del monto no pudo restaurarse: $${remainingUnrestored.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        );
      } else {
        alert("Pago anulado exitosamente. La deuda ha sido restaurada.");
      }

      fetchDeudores();

    } catch (error: any) {
      console.error("Error cancelling payment:", error);
      alert("Error al anular el pago: " + error.message);
    } finally {
      setCancellingPaymentId(null);
    }
  };

  const filteredDeudores = deudores.filter((d) =>
    d.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const DEBTORS_PAGE_SIZE = 8;
  const totalPages = Math.max(1, Math.ceil(filteredDeudores.length / DEBTORS_PAGE_SIZE));
  const startIndex = (currentPage - 1) * DEBTORS_PAGE_SIZE;
  const paginatedDeudores = filteredDeudores.slice(startIndex, startIndex + DEBTORS_PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 max-w-md mx-auto">
        <div className="animate-spin rounded-full h-9 w-9 border-2 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4 pb-24">
      {/* Buscador y Resumen */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/80 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-955/30 flex items-center justify-center">
            <FaUser className="text-rose-500 text-sm" />
          </div>
          <h2 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">
            Saldos y Cuentas Corrientes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Buscador */}
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar deudor por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold bg-slate-50/50 dark:bg-slate-950/40 focus:bg-white dark:focus:bg-slate-900 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all outline-none text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Indicador de Deuda Global */}
          <div className="bg-gradient-to-br from-rose-500 to-red-650 p-5 rounded-2xl text-white shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-black tracking-wider opacity-85">Deuda Global Clientes</p>
              <p className="text-2xl font-black mt-0.5">
                ${deudores.reduce((sum, d) => sum + d.totalDebt, 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <FaDollarSign className="text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Listado de Clientes con Deuda */}
      {filteredDeudores.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-205 dark:border-slate-800">
          <FaUser className="text-4xl text-slate-200 dark:text-slate-800 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500">No se encontraron deudores</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedDeudores.map((deudor) => (
            <div
              key={deudor.id}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/80 overflow-hidden transition-all duration-200"
            >
              {/* Encabezado Principal de Tarjeta */}
              <div
                className="p-5 flex justify-between items-start cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-colors"
                onClick={() => toggleExpand(deudor.id)}
              >
                <div className="min-w-0 pr-3">
                  <h3 className="font-extrabold text-xs text-slate-850 dark:text-slate-100 truncate">
                    {deudor.full_name}
                  </h3>
                  {deudor.phone && (
                    <a
                      href={`tel:${deudor.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-1.5 w-fit"
                    >
                      <FaPhone className="text-[9px]" /> {deudor.phone}
                    </a>
                  )}
                </div>
                
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <p className="font-black text-rose-600 dark:text-rose-400 text-sm">
                      ${deudor.totalDebt.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                      {expandedCustomerId === deudor.id ? 'Ocultar info' : 'Ver detalles'}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {expandedCustomerId === deudor.id ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                  </div>
                </div>
              </div>

              {/* Contenido Expandible */}
              {expandedCustomerId === deudor.id && (
                <div className="bg-slate-50/50 dark:bg-slate-950/40 p-5 border-t border-b border-slate-100 dark:border-slate-850 space-y-5 max-h-[60vh] overflow-y-auto">
                  
                  {/* Sección: Últimos Pagos */}
                  <div>
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <FaHistory /> Historial de Pagos Recientes
                    </p>
                    {deudor.payments && deudor.payments.length > 0 ? (
                      <div className="space-y-2">
                        {deudor.payments.map((payment) => {
                          const isCancelled = payment.payment_method === 'anulado';
                          return (
                            <div
                              key={payment.id}
                              className={`flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-2xl border ${
                                isCancelled
                                  ? 'border-red-100 dark:border-red-950/40 opacity-60'
                                  : 'border-emerald-100/30 dark:border-emerald-950/20'
                              }`}
                            >
                              <div>
                                <p className={`font-black text-xs ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-850 dark:text-slate-200'}`}>
                                  ${payment.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                                  {new Date(payment.created_at).toLocaleDateString("es-AR")} - {isCancelled ? 'ANULADO' : payment.payment_method}
                                </p>
                              </div>
                              {!isCancelled && (
                                <button
                                  onClick={(e) => handleCancelPayment(e, payment)}
                                  disabled={cancellingPaymentId === payment.id}
                                  className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  title="Anular pago"
                                >
                                  {cancellingPaymentId === payment.id ? (
                                    <div className="animate-spin h-3.5 w-3.5 border-2 border-rose-550 border-t-transparent rounded-full"></div>
                                  ) : (
                                    <FaTrash size={11} />
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 italic font-bold pl-1">No hay cobros registrados</p>
                    )}
                  </div>

                  {/* Sección: Pedidos Pendientes */}
                  {deudor.orders.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                        Pedidos con Saldo
                      </p>
                      <div className="space-y-3">
                        {deudor.orders.map((order: any) => (
                          <div key={order.id} className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/40 dark:border-slate-800/40">
                            <div className="flex justify-between items-center mb-2.5 border-b border-slate-100 dark:border-slate-850 pb-2 gap-2">
                              <div>
                                <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                                  Pedido #{order.id.slice(0, 6).toUpperCase()}
                                </p>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                                  {new Date(order.created_at).toLocaleDateString("es-AR")}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <button
                                  onClick={() => onPrintRemito(order.id)}
                                  className="text-[10px] font-black px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100/30 dark:border-indigo-900/10 flex items-center gap-1 hover:bg-indigo-100 transition-colors ml-auto mb-1.5"
                                >
                                  <FaPrint size={10} /> Remito
                                </button>
                                <p className="font-black text-rose-600 dark:text-rose-400 text-xs">
                                  Saldo: ${order.amount_pending.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                                  Total: ${order.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>

                            {/* Desglose de Productos */}
                            <div className="space-y-1 pl-1">
                              {order.order_items?.map((item: any) => (
                                <div key={item.id} className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                  <span className="font-bold">{item.quantity}x {item.products?.name}</span>
                                  <span className="font-mono">${item.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sección: Cuenta Corriente (Ventas directas) */}
                  {deudor.sales.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                        Cuenta Corriente (Ventas)
                      </p>
                      <div className="space-y-2">
                        {deudor.sales.map((sale: any) => (
                          <div key={sale.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
                            <div>
                              <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                                {sale.description || 'Venta Manual'}
                              </p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                                {new Date(sale.created_at).toLocaleDateString("es-AR")}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-black text-rose-600 dark:text-rose-450 text-xs">
                                Debe: ${sale.amount_pending.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                                Total: ${sale.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botón de Pago Rápido en Footer de Tarjeta */}
              <div className="p-4 flex items-center justify-between bg-slate-50/10 dark:bg-slate-950/5">
                <div>
                  <p className="text-[9px] text-rose-600 dark:text-rose-400 font-black uppercase tracking-wider">Deuda Total</p>
                  <p className="text-base font-black text-rose-700 dark:text-rose-400">
                    ${deudor.totalDebt.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenPayment(deudor)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-sm text-xs font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <FaDollarSign /> Cobrar Deuda
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación de Deudores */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sig
            </button>
          </div>
        </div>
      )}

      {/* Modal de Registro de Cobro */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-none border border-slate-200/50 dark:border-slate-800/80">
            <div className="p-4 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
              <div>
                <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">
                  Registrar Cobro
                </h3>
                <p className="text-[11px] text-slate-500 font-bold dark:text-slate-400 mt-0.5">
                  Cliente: {selectedCustomer.full_name}
                </p>
              </div>
              <button
                onClick={handleClosePayment}
                className="w-7 h-7 flex items-center justify-center text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 rounded-lg hover:bg-slate-105 dark:hover:bg-slate-800 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-5">
              <RegisterPayment
                customerId={selectedCustomer.id}
                currentDebt={selectedCustomer.totalDebt}
                onSuccess={handleClosePayment}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
