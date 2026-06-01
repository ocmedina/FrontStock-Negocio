// src/app/dashboard/pedidos/[id]/page.tsx
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import { Database } from "@/lib/database.types";
import OrderDetailsClient from "./OrderDetailsClient"; // Componente cliente

// Forzar renderizado dinámico para evitar caché
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Función para obtener los detalles del pedido desde el servidor
async function getOrderDetails(orderId: string) {
  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      created_at,
      total_amount,
      status,
      payment_method,
      amount_paid,
      amount_pending,
      customers ( full_name, customer_type, phone, address, reference ),
      profiles ( full_name ),
      order_items (
        quantity,
        price,
        products ( id, name, sku, stock )
      )
    `
    )
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("Error fetching order details:", error);
    return null;
  }
  return data;
}

// Componente de servidor principal
export default async function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const order = await getOrderDetails(params.id);

  if (!order) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-full">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-slate-700 text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-2">
              Pedido no encontrado
            </h1>
            <p className="text-gray-600 dark:text-slate-300 mb-6">
              El pedido que buscas no existe o fue eliminado
            </p>
            <Link
              href="/dashboard/pedidos"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg"
            >
              ← Volver al listado
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <OrderDetailsClient initialOrder={order} />;
}
