import { createClient } from "@/lib/server";
import { createLooseAdminClient } from "@/lib/admin";
import Link from "next/link";
import { Database } from "@/lib/database.types";
import { formatCurrency } from "@/lib/numberFormat";
import {
  FaMoneyBillWave,
  FaReceipt,
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";
import RegisterSupplierPayment from "@/components/payments/RegisterSupplierPayment";

export const dynamic = "force-dynamic";

type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
type Payment = Database["public"]["Tables"]["supplier_payments"]["Row"];
type Purchase = Database["public"]["Tables"]["purchases"]["Row"];

type HistoryItem =
  | (Purchase & { type: "compra"; amount: number })
  | (Payment & { type: "pago" });

type SupplierAccount = {
  supplier: Supplier | null;
  history: HistoryItem[];
};

async function fetchSupplierAccountWithClient(
  client: any,
  supplierId: string
): Promise<SupplierAccount> {
  const [{ data: supplier }, { data: purchases }, { data: payments }] =
    await Promise.all([
      client.from("suppliers").select("*").eq("id", supplierId).maybeSingle(),
      client
        .from("purchases")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false }),
      client
        .from("supplier_payments")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false }),
    ]);

  const history: HistoryItem[] = [
    ...((purchases || []).map((p: Purchase) => ({
      ...p,
      type: "compra" as const,
      amount: Number(p.total_amount) || 0,
    })) as Array<Purchase & { type: "compra"; amount: number }>),
    ...((payments || []).map((p: Payment) => ({
      ...p,
      type: "pago" as const,
    })) as Array<Payment & { type: "pago" }>),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return { supplier: (supplier as Supplier | null) || null, history };
}

async function getSupplierAccount(id: string) {
  const normalizedId = decodeURIComponent(id).trim();
  const supabase = await createClient();
  const account = await fetchSupplierAccountWithClient(supabase, normalizedId);

  if (account.supplier) {
    return account;
  }

  // Fallback defensivo: evita falsos "no encontrado" si la sesión SSR no está disponible.
  const adminClient = createLooseAdminClient();
  return fetchSupplierAccountWithClient(adminClient, normalizedId);
}

export default async function SupplierDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { supplier, history } = await getSupplierAccount(params.id);

  if (!supplier) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-slate-300">Proveedor no encontrado.</p>
          <Link
            href="/dashboard/proveedores"
            className="text-blue-600 mt-4 inline-block"
          >
            Volver a proveedores
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
        <Link
          href="/dashboard/proveedores"
          className="text-indigo-650 dark:text-indigo-400 mb-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider hover:text-indigo-750 dark:hover:text-indigo-300 transition-colors"
        >
          <FaArrowLeft /> Volver a Proveedores
        </Link>

        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mt-2">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {supplier.name}
            </h1>
            <div className="mt-3 space-y-1">
              {supplier.contact_person && (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Contacto: <span className="font-bold text-slate-850 dark:text-slate-200">{supplier.contact_person}</span>
                </p>
              )}
              {supplier.phone && (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Teléfono: <span className="font-bold text-slate-850 dark:text-slate-200">{supplier.phone}</span>
                </p>
              )}
            </div>
          </div>

          <div
            className={`px-6 py-4 rounded-2xl border transition-all duration-350 text-left md:text-right min-w-[200px] ${
              (supplier.debt || 0) > 0
                ? "bg-rose-50/50 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400"
                : (supplier.debt || 0) < 0
                ? "bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400"
                : "bg-slate-50 dark:bg-slate-850/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400"
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-wider flex items-center md:justify-end gap-1.5">
              {(supplier.debt || 0) > 0 ? (
                <>
                  <FaExclamationTriangle className="text-rose-500" /> Deuda Pendiente
                </>
              ) : (supplier.debt || 0) < 0 ? (
                <>
                  <FaCheckCircle className="text-emerald-500" /> Crédito a Favor
                </>
              ) : (
                "Saldo"
              )}
            </p>
            <p className="text-3xl font-black mt-1.5 tracking-tight">
              {formatCurrency(Math.abs(supplier.debt || 0))}
            </p>
          </div>
        </div>
      </div>

      <RegisterSupplierPayment
        supplierId={supplier.id}
        currentDebt={supplier.debt || 0}
      />

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-4">Historial de Cuenta</h2>
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-center text-slate-400 py-10 font-medium text-sm">No hay movimientos registrados</p>
          ) : (
            history.map((item) => {
              const isCompra = item.type === "compra";
              const displayTitle = isCompra
                ? `Factura #${
                    "invoice_number" in item && item.invoice_number
                      ? item.invoice_number
                      : item.id.substring(0, 8)
                  }`
                : "Pago Realizado";

              const noteText = String(
                "notes" in item
                  ? item.notes || ""
                  : "comment" in item
                  ? item.comment || ""
                  : ""
              );

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isCompra 
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" 
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isCompra ? (
                        <FaReceipt className="w-5 h-5" />
                      ) : (
                        <FaMoneyBillWave className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">{displayTitle}</p>
                      <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
                        {new Date(item.created_at).toLocaleDateString("es-AR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {noteText && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-md inline-block">
                          {noteText}
                        </p>
                      )}
                    </div>
                  </div>
                  <p
                    className={`font-black text-lg ${
                      isCompra ? "text-rose-600 dark:text-rose-455" : "text-emerald-600 dark:text-emerald-455"
                    } sm:text-right`}
                  >
                    {isCompra ? "+" : "-"}{formatCurrency(item.amount)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
