import { createClient } from "@/lib/server";
import { createLooseAdminClient } from "@/lib/admin";
import Link from "next/link";
import { Database } from "@/lib/database.types";
import { formatCurrency } from "@/lib/numberFormat";
import {
  FaMoneyBillWave,
  FaReceipt,
  FaArrowLeft,
  FaMapMarkerAlt,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaShoppingCart,
  FaFileInvoiceDollar,
} from "react-icons/fa";
import RegisterPayment from "@/components/payments/RegisterPayment";
import PaymentHistoryList from "@/components/payments/PaymentHistoryList";
import ExportCustomerMovementsButton from "@/components/exports/ExportCustomerMovementsButton";

export const dynamic = "force-dynamic";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type PaymentHistoryEntry = {
  id: number | string;
  amount: number;
  created_at: string;
  type: string;
  customer_id: string;
  payment_method: string | null;
  comment: string | null;
};

type PaymentHistoryRaw = PaymentHistoryEntry & {
  sale_id?: string | null;
};

const PAYMENTS_SELECT_WITH_SALE_ID =
  "id, amount, created_at, type, customer_id, payment_method, comment, sale_id";
const PAYMENTS_SELECT_BASE =
  "id, amount, created_at, type, customer_id, payment_method, comment";

function isMissingSaleIdColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: string }).message || "").toLowerCase();
  const details = String((error as { details?: string }).details || "").toLowerCase();
  return message.includes("sale_id") || details.includes("sale_id");
}

async function fetchPaymentRows(client: any, customerId: string): Promise<{
  rows: PaymentHistoryRaw[];
  error: unknown;
}> {
  const withSaleId = await client
    .from("payments")
    .select(PAYMENTS_SELECT_WITH_SALE_ID)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (!withSaleId.error) {
    return {
      rows: (withSaleId.data || []) as PaymentHistoryRaw[],
      error: null,
    };
  }

  if (!isMissingSaleIdColumnError(withSaleId.error)) {
    return { rows: [], error: withSaleId.error };
  }

  const withoutSaleId = await client
    .from("payments")
    .select(PAYMENTS_SELECT_BASE)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (withoutSaleId.error) {
    return { rows: [], error: withoutSaleId.error };
  }

  return {
    rows: ((withoutSaleId.data || []) as PaymentHistoryEntry[]).map((row) => ({
      ...row,
      sale_id: null,
    })),
    error: null,
  };
}

type OrderHistoryRow = {
  id: string;
  created_at: string;
  payment_method: string | null;
  status: string | null;
  total_amount?: number | null;
  amount_paid?: number | null;
  amount_pending?: number | null;
};

type SaleHistoryRow = {
  id: string;
  created_at: string;
  payment_method: string | null;
  total_amount?: number | null;
  amount_paid?: number | null;
  amount_pending?: number | null;
  is_cancelled?: boolean | null;
};

function buildSyntheticMovements(
  customerId: string,
  payments: PaymentHistoryRaw[],
  orders: OrderHistoryRow[],
  sales: SaleHistoryRow[]
): PaymentHistoryEntry[] {
  const useTotalAmountFallback = payments.length === 0;

  const saleIdsWithPurchaseMovement = new Set(
    payments
      .filter((p) => p.type === "compra" && !!p.sale_id)
      .map((p) => String(p.sale_id))
  );

  const hasOrderPurchaseMovement = (orderId: string) => {
    const shortId = orderId.slice(0, 8).toLowerCase();
    return payments.some((p) => {
      if (p.type !== "compra" || !p.comment) return false;
      const comment = p.comment.toLowerCase();
      return (
        comment.includes(`pedido #${shortId}`) ||
        comment.includes(`pedido ${shortId}`)
      );
    });
  };

  const synthetic: PaymentHistoryEntry[] = [];

  for (const order of orders) {
    if (order.status === "cancelado") continue;

    const totalAmount = Number(order.total_amount || 0);
    const amountPaid = Number(order.amount_paid || 0);
    const currentPending = Number(order.amount_pending || 0);
    const inferredDebtAtCreation = Math.max(0, totalAmount - amountPaid);
    const movementAmount = inferredDebtAtCreation > 0.01
      ? inferredDebtAtCreation
      : useTotalAmountFallback
      ? totalAmount
      : currentPending;

    if (movementAmount <= 0.01) continue;
    if (hasOrderPurchaseMovement(order.id)) continue;

    synthetic.push({
      id: `order-${order.id}`,
      amount: movementAmount,
      created_at: order.created_at,
      type: "compra",
      customer_id: customerId,
      payment_method: order.payment_method,
      comment: `Pedido #${order.id.slice(0, 8)} - saldo pendiente`,
    });
  }

  for (const sale of sales) {
    if (sale.is_cancelled) continue;

    const totalAmount = Number(sale.total_amount || 0);
    const amountPaid = Number(sale.amount_paid || 0);
    const currentPending = Number(sale.amount_pending || 0);
    const inferredDebtAtCreation = Math.max(0, totalAmount - amountPaid);
    const movementAmount = inferredDebtAtCreation > 0.01
      ? inferredDebtAtCreation
      : useTotalAmountFallback
      ? totalAmount
      : currentPending;

    if (movementAmount <= 0.01) continue;
    if (saleIdsWithPurchaseMovement.has(sale.id)) continue;

    synthetic.push({
      id: `sale-${sale.id}`,
      amount: movementAmount,
      created_at: sale.created_at,
      type: "compra",
      customer_id: customerId,
      payment_method: sale.payment_method,
      comment: `Venta #${sale.id.slice(0, 8)} - cuenta corriente`,
    });
  }

  return synthetic;
}

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage(props: CustomerDetailPageProps) {
  const params = await props.params;
  const normalizedId = decodeURIComponent(params.id).trim();
  const supabase = await createClient();
  const adminClient = createLooseAdminClient();

  // Fetch Customer Row
  const { data: customerData } = await supabase
    .from("customers")
    .select("*")
    .eq("id", normalizedId)
    .maybeSingle();

  const customer =
    customerData ||
    (
      (
        await adminClient
          .from("customers")
          .select("*")
          .eq("id", normalizedId)
          .maybeSingle()
      ).data as CustomerRow | null
    );

  if (!customer) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-full flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-sm">
          <FaExclamationTriangle className="text-4xl text-rose-500 mx-auto" />
          <h1 className="text-base font-bold text-gray-900 dark:text-slate-100">
            Cliente no encontrado
          </h1>
          <p className="text-xs text-slate-500">
            No pudimos ubicar la ficha del cliente solicitado en la base de datos.
          </p>
          <Link
            href="/dashboard/clientes"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border transition-colors"
          >
            <FaArrowLeft /> Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  // Fetch payments
  const primaryPayments = await fetchPaymentRows(supabase, normalizedId);
  let basePayments: PaymentHistoryRaw[] = primaryPayments.rows;

  if (primaryPayments.error || basePayments.length === 0) {
    const adminPayments = await fetchPaymentRows(adminClient, normalizedId);
    if (adminPayments.rows.length > 0 || primaryPayments.error) {
      basePayments = adminPayments.rows;
    }
  }

  // Fetch orders
  const { data: ordersHistoryData, error: ordersHistoryError } = await supabase
    .from("orders")
    .select("id, created_at, payment_method, status, total_amount, amount_paid, amount_pending")
    .eq("customer_id", normalizedId)
    .neq("status", "cancelado")
    .order("created_at", { ascending: false });

  const ordersHistory = ordersHistoryError
    ? ((
        await adminClient
          .from("orders")
          .select("id, created_at, payment_method, status, total_amount, amount_paid, amount_pending")
          .eq("customer_id", normalizedId)
          .neq("status", "cancelado")
          .order("created_at", { ascending: false })
      ).data as OrderHistoryRow[] | null)
    : (ordersHistoryData as unknown as OrderHistoryRow[] | null);

  // Fetch sales
  const { data: salesHistoryData, error: salesHistoryError } = await supabase
    .from("sales")
    .select("id, created_at, payment_method, total_amount, amount_paid, amount_pending, is_cancelled")
    .eq("customer_id", normalizedId)
    .eq("is_cancelled", false)
    .order("created_at", { ascending: false });

  const salesHistory = salesHistoryError
    ? ((
        await adminClient
          .from("sales")
          .select("id, created_at, payment_method, total_amount, amount_paid, amount_pending, is_cancelled")
          .eq("customer_id", normalizedId)
          .eq("is_cancelled", false)
          .order("created_at", { ascending: false })
      ).data as SaleHistoryRow[] | null)
    : (salesHistoryData as unknown as SaleHistoryRow[] | null);

  const customerReference = (customer as any).reference as string | null;

  const ordersData = (ordersHistory || []).filter(
    (order) => Number(order.amount_pending || 0) > 0
  );

  const salesData = (salesHistory || []).filter(
    (sale) =>
      (sale.payment_method || "") === "cuenta_corriente" &&
      Number(sale.amount_pending || 0) > 0 &&
      !sale.is_cancelled
  );

  const ordersDebt = (ordersData || []).reduce(
    (sum, order) => sum + Number(order.amount_pending || 0),
    0
  );

  const salesDebt = (salesData || []).reduce(
    (sum, sale) => sum + Number(sale.amount_pending || 0),
    0
  );

  const currentDebt = ordersDebt + salesDebt;

  const syntheticMovements = buildSyntheticMovements(
    customer.id,
    basePayments,
    ordersHistory || [],
    salesHistory || []
  );

  const historyMovements: PaymentHistoryEntry[] = [
    ...basePayments,
    ...syntheticMovements,
  ].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-full text-slate-800 dark:text-slate-100">
      <div className="max-w-[1250px] mx-auto space-y-6">
        
        {/* BOTÓN VOLVER */}
        <div>
          <Link
            href="/dashboard/clientes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-750 dark:text-indigo-400 transition-colors"
          >
            <FaArrowLeft /> Volver a Clientes
          </Link>
        </div>

        {/* DETALLE PRINCIPAL DEL CLIENTE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center font-black text-base border border-indigo-100/50 dark:border-indigo-900/30">
                {customer.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 dark:text-slate-50">
                  {customer.full_name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-3xs font-extrabold border mt-1 ${
                    customer.customer_type === "mayorista"
                      ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/10 dark:text-purple-400 dark:border-purple-900/50"
                      : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/10 dark:text-blue-400 dark:border-blue-900/50"
                  }`}
                >
                  {customer.customer_type === "mayorista" ? "Categoría: Mayorista" : "Categoría: Minorista"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 text-xs text-slate-600 dark:text-slate-300">
              {customer.email && (
                <div className="flex items-center gap-2">
                  <FaEnvelope className="text-slate-400 w-3.5 h-3.5" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <FaPhone className="text-slate-400 w-3.5 h-3.5" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-2">
                  <FaMapMarkerAlt className="text-slate-400 w-3.5 h-3.5 mt-0.5" />
                  <div>
                    <span>{customer.address}</span>
                    {customerReference && (
                      <span className="block text-[10px] text-slate-450 italic mt-0.5">Ref: {customerReference}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DEUDA ACUMULADA */}
          <div className="bg-slate-50/60 dark:bg-slate-950/20 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-center min-w-[220px] w-full md:w-auto">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Saldo Pendiente Cuenta</span>
            <span
              className={`text-2xl font-black mt-1 block ${
                currentDebt > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {formatCurrency(currentDebt)}
            </span>
            <span className="text-3xs text-slate-450 dark:text-slate-500 block mt-1">
              {currentDebt > 0 ? "Posee facturación o pedidos impagos" : "Cuenta corriente al día"}
            </span>
          </div>
        </div>

        {/* REGISTRAR COBRO (Solo si debe) */}
        {currentDebt > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <FaMoneyBillWave className="text-emerald-500" /> Registrar Entrega de Pago
            </h2>
            <RegisterPayment customerId={customer.id} currentDebt={currentDebt} />
          </div>
        )}

        {/* PEDIDOS / VENTAS FIADAS (Solo si debe) */}
        {currentDebt > 0 && (ordersData?.length > 0 || salesData?.length > 0) && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <FaExclamationTriangle className="text-amber-500" /> Comprobantes con Saldo Pendiente
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Pedidos con Deuda */}
              {ordersData && ordersData.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block flex items-center gap-1">
                    <FaShoppingCart className="text-amber-550 w-3 h-3" /> Pedidos Pendientes
                  </span>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {ordersData.map((order: any) => (
                      <div
                        key={order.id}
                        className="bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/30 rounded-xl p-3.5 flex justify-between items-center text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Pedido #{order.id?.substring(0, 8)}
                          </span>
                          <span className="text-3xs text-slate-500 block mt-0.5">
                            Fecha: {new Date(order.created_at).toLocaleDateString("es-AR")}
                          </span>
                          <Link
                            href={`/dashboard/pedidos/${order.id}`}
                            className="text-3xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline block mt-1.5"
                          >
                            Ver Detalles Pedido →
                          </Link>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Saldo</span>
                          <span className="font-extrabold text-amber-600 block mt-0.5">
                            {formatCurrency(order.amount_pending)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ventas con Deuda */}
              {salesData && salesData.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block flex items-center gap-1">
                    <FaFileInvoiceDollar className="text-rose-550 w-3 h-3" /> Cuenta Corriente (Ventas)
                  </span>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {salesData.map((sale: any) => (
                      <div
                        key={sale.id}
                        className="bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/30 rounded-xl p-3.5 flex justify-between items-center text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Venta #{sale.id?.substring(0, 8)}
                          </span>
                          <span className="text-3xs text-slate-500 block mt-0.5">
                            Fecha: {new Date(sale.created_at).toLocaleDateString("es-AR")}
                          </span>
                          <Link
                            href={`/dashboard/ventas/${sale.id}`}
                            className="text-3xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline block mt-1.5"
                          >
                            Ver Comprobante Venta →
                          </Link>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Saldo</span>
                          <span className="font-extrabold text-rose-600 block mt-0.5">
                            {formatCurrency(sale.amount_pending)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* HISTORIAL COMPLETO DE MOVIMIENTOS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <FaCalendarAlt className="text-indigo-500" /> Historial de Movimientos de Cuenta
            </h2>
            <ExportCustomerMovementsButton
              customerName={customer.full_name}
              payments={historyMovements}
            />
          </div>
          <PaymentHistoryList initialPayments={historyMovements} />
        </div>

      </div>
    </div>
  );
}
