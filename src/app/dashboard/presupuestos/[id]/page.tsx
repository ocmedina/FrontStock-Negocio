import { createClient } from "@/lib/server";
import Link from "next/link";
import BudgetDetailClient from "./BudgetDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getBudgetDetail(budgetId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select(
      `
      id,
      created_at,
      total_amount,
      status,
      customers ( full_name, customer_type, phone, address, reference ),
      budget_items ( quantity, price, products ( name ) )
      `
    )
    .eq("id", budgetId)
    .single();

  if (error) {
    console.error("Error fetching budget detail:", error);
    return null;
  }

  return data;
}

export default async function BudgetDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const budget = await getBudgetDetail(params.id);

  if (!budget) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-slate-700 text-center">
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
              Presupuesto no encontrado
            </h1>
            <p className="text-gray-600 dark:text-slate-300 mb-6">
              El presupuesto que buscas no existe o fue eliminado.
            </p>
            <Link
              href="/dashboard/presupuestos"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-lg"
            >
              Volver al listado
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <BudgetDetailClient budget={budget} />;
}
