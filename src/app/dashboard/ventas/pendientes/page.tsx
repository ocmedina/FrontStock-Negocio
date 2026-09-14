"use client";

import UnifiedPendingVouchersList from "@/components/payments/UnifiedPendingVouchersList";

export default function VentasPendientesPage() {
  return (
    <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 min-h-full text-slate-800 dark:text-slate-100">
      <div className="max-w-[1550px] mx-auto">
        <UnifiedPendingVouchersList
          initialTab="sales"
          pageTitle="Ventas Mostrador con Saldo en Cuenta Corriente (Fiados)"
          pageSubtitle="Hub Unificado: Consulta y cobra ventas fiadas de mostrador o cambia de pestaña para ver pedidos de reparto."
          backHref="/dashboard/ventas"
          backLabel="Volver a Ventas"
        />
      </div>
    </div>
  );
}
