"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { FaEdit, FaTrash } from "react-icons/fa";

export default function ProductActions({
  productId,
  userRole,
}: {
  productId: string;
  userRole?: string | null;
}) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres DESACTIVAR este producto?")) {
      return;
    }

    const loadingToast = toast.loading("Desactivando producto...");

    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", productId);

    if (error) {
      toast.error(`Error al desactivar el producto: ${error.message}`, {
        id: loadingToast,
      });
    } else {
      toast.success("✅ Producto desactivado exitosamente", {
        id: loadingToast,
      });
      router.refresh();
    }
  };

  if (userRole !== "administrador") {
    return <span className="text-slate-400 dark:text-slate-550 text-3xs font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded border">Sin permisos</span>;
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <Link
        href={`/dashboard/products/edit/${productId}`}
        className="group relative overflow-hidden rounded-lg border border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-slate-900 p-1 shadow-3xs hover:shadow-2xs hover:scale-[1.02] transition-all flex items-center gap-1.5 text-left w-[100px]"
      >
        <div className="absolute -right-6 -top-6 h-10 w-10 rounded-full bg-indigo-50/50 dark:bg-indigo-950/20" />
        <span className="relative flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-3xs flex-shrink-0 text-[9px]">
          <FaEdit />
        </span>
        <div className="relative">
          <p className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 leading-none">
            Editar
          </p>
          <p className="text-[7.5px] text-slate-450 dark:text-slate-500 mt-0.5 font-medium leading-none">
            Modificar
          </p>
        </div>
      </Link>

      <button
        onClick={handleDelete}
        className="group relative overflow-hidden rounded-lg border border-rose-100 dark:border-rose-900/40 bg-white dark:bg-slate-900 p-1 shadow-3xs hover:shadow-2xs hover:scale-[1.02] transition-all flex items-center gap-1.5 text-left w-[100px]"
      >
        <div className="absolute -right-6 -top-6 h-10 w-10 rounded-full bg-rose-50/50 dark:bg-rose-950/20" />
        <span className="relative flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-3xs flex-shrink-0 text-[9px]">
          <FaTrash />
        </span>
        <div className="relative">
          <p className="text-[9px] font-black text-rose-700 dark:text-rose-400 leading-none">
            Borrar
          </p>
          <p className="text-[7.5px] text-slate-450 dark:text-slate-500 mt-0.5 font-medium leading-none">
            Desactivar
          </p>
        </div>
      </button>
    </div>
  );
}
