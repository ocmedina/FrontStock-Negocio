"use client";

import UnifiedPendingVouchersList from "@/components/payments/UnifiedPendingVouchersList";

export default function PedidosPendientesPage() {
  return (
    <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 min-h-full text-slate-800 dark:text-slate-100">
      <div className="max-w-[1550px] mx-auto">
        <UnifiedPendingVouchersList
          initialTab="orders"
          pageTitle="Pedidos con Saldo en Cuenta Corriente (Fiados)"
          pageSubtitle="Hub Unificado: Consulta y cobra pedidos fiados de reparto o cambia de pestaña para ver ventas de mostrador."
          backHref="/dashboard/pedidos"
          backLabel="Volver a Pedidos"
        />
      </div>
    </div>
  );
}
