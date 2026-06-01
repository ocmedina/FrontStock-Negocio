import { createClient } from "@/lib/server";
import SaleDetailsClient from "./SaleDetailsClient";
import { Database } from "@/lib/database.types";
import Link from "next/link";

// Cambia el tipo de params a Promise
export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await params antes de usarlo
  const { id } = await params;

  // --- LÓGICA DE CARGA DIRECTAMENTE AQUÍ ---
  const supabase = await createClient();

  const { data: sale, error } = await supabase
    .from("sales")
    .select(
      `
      id,
      created_at,
      total_amount,
      customers ( * ),
      profiles ( * ),
      sale_items ( *, products ( * ) )
    `
    )
    .eq("id", id) // Usa el id extraído
    .single();

  if (error || !sale) {
    console.error("Error al obtener detalles de la venta:", error?.message);
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-full flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-gray-200 dark:border-slate-700">
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50 mb-2">
              Venta no encontrada
            </h1>
            <p className="text-gray-600 dark:text-slate-300">
              No se pudieron cargar los detalles de esta venta.
            </p>
          </div>
          <Link
            href="/dashboard/ventas"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Volver al historial
          </Link>
        </div>
      </div>
    );
  }

  // Pasamos los datos cargados al componente cliente
  return <SaleDetailsClient sale={sale} />;
}
