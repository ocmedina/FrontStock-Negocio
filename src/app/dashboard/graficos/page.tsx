"use client";

import dynamic from "next/dynamic";

const ReportsCharts = dynamic(() => import("@/components/ReportsCharts"), {
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-950 p-6">
      <div className="flex items-center justify-center h-72">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-300">Cargando gráficos...</p>
        </div>
      </div>
    </div>
  ),
  ssr: false,
});

export default function GraficosPage() {
  return <ReportsCharts variant="page" />;
}
