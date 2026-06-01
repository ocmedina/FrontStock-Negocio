"use client";

import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import Link from "next/link";
import { FaEdit, FaTrash, FaClipboardList } from "react-icons/fa";

interface SupplierActionsProps {
  supplierId: string;
  onUpdate: () => void;
  userRole?: string | null;
}

export default function SupplierActions({
  supplierId,
  onUpdate,
  userRole,
}: SupplierActionsProps) {
  const handleDeactivate = async () => {
    if (!confirm("¿Estás seguro de que quieres desactivar este proveedor?")) {
      return;
    }

    const loadingToast = toast.loading("Desactivando proveedor...");

    const { error } = await supabase
      .from("suppliers")
      .update({ is_active: false })
      .eq("id", supplierId);

    if (error) {
      toast.error(`Error: ${error.message}`, { id: loadingToast });
    } else {
      toast.success("Proveedor desactivado exitosamente", { id: loadingToast });
      onUpdate();
    }
  };

  // Si no es administrador, mostrar nada o sin permisos
  if (userRole !== "administrador") {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          href={`/dashboard/proveedores/${supplierId}`}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-all"
          title="Ver Ficha de Cuenta"
        >
          <FaClipboardList className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/dashboard/proveedores/${supplierId}`}
        className="p-2 text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-405 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-all"
        title="Ver Ficha de Cuenta"
      >
        <FaClipboardList className="w-4 h-4" />
      </Link>
      
      <Link
        href={`/dashboard/proveedores/edit/${supplierId}`}
        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl transition-all"
        title="Editar Proveedor"
      >
        <FaEdit className="w-4 h-4" />
      </Link>
      
      <button
        onClick={handleDeactivate}
        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
        title="Desactivar Proveedor"
      >
        <FaTrash className="w-4 h-4" />
      </button>
    </div>
  );
}
