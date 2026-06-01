// src/components/CustomerActions.tsx
"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { FaEdit, FaTrash } from "react-icons/fa";

interface CustomerActionsProps {
  customerId: string;
  userRole?: string | null;
}

export default function CustomerActions({
  customerId,
  userRole,
}: CustomerActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (
      !confirm(
        "¿Estás seguro de que quieres DESACTIVAR este cliente? Ya no aparecerá en las listas."
      )
    ) {
      return;
    }

    const loadingToast = toast.loading("Desactivando cliente...");

    const { error } = await supabase
      .from("customers")
      .update({ is_active: false })
      .match({ id: customerId });

    if (error) {
      toast.error(`Error: ${error.message}`, { id: loadingToast });
    } else {
      toast.success("Cliente desactivado exitosamente", { id: loadingToast });
      router.refresh();
    }
  };

  // Si no es administrador, mostrar mensaje o nada
  if (userRole !== "administrador") {
    return <span className="text-gray-400 text-xs">Sin permisos</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/dashboard/clientes/edit/${customerId}`}
        title="Editar"
        className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm h-8 w-8 sm:w-auto"
      >
        <FaEdit className="flex-shrink-0" />
        <span className="hidden sm:inline">Editar</span>
      </Link>
      <button
        onClick={handleDelete}
        title="Borrar"
        className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm h-8 w-8 sm:w-auto"
      >
        <FaTrash className="flex-shrink-0" />
        <span className="hidden sm:inline">Borrar</span>
      </button>
    </div>
  );
}
