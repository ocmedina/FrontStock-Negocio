"use server";

import { revalidatePath } from "next/cache";
import { createLooseAdminClient } from "@/lib/admin";
import { requirePermission } from "@/lib/serverAuth";

type CancelPurchaseResult = {
  success: boolean;
  error?: string;
  alreadyCancelled?: boolean;
};

export async function cancelPurchase(purchaseId: string): Promise<CancelPurchaseResult> {
  try {
    const ctx = await requirePermission("CREAR_COMPRAS");
    if (!purchaseId) return { success: false, error: "Factura inválida." };

    const supabase = createLooseAdminClient();
    const [{ data: purchase, error: purchaseError }, { data: assignments, error: assignmentsError }] =
      await Promise.all([
        (supabase as any)
          .from("purchases")
          .select("supplier_id, branch_id")
          .eq("id", purchaseId)
          .single(),
        (supabase as any)
          .from("profile_branch_assignments")
          .select("branch_id")
          .eq("profile_id", ctx.user.id),
      ]);

    if (purchaseError) throw purchaseError;
    if (assignmentsError) throw assignmentsError;
    if (purchase.branch_id == null) {
      return {
        success: false,
        error: "Esta factura no tiene una sucursal identificada y no se puede devolver el stock con seguridad.",
      };
    }

    const branchId = Number(purchase.branch_id);
    const assignedBranchIds = (assignments || []).map((row: any) => Number(row.branch_id));
    if (assignedBranchIds.length > 0 && !assignedBranchIds.includes(branchId)) {
      return { success: false, error: "No tienes acceso a la sucursal de esta factura." };
    }

    const { data, error } = await (supabase as any).rpc("cancel_purchase_transaction", {
      p_purchase_id: purchaseId,
      p_actor_id: ctx.user.id,
    });
    if (error) throw error;

    revalidatePath("/dashboard/proveedores");
    revalidatePath("/dashboard/proveedores/" + purchase.supplier_id);
    return {
      success: true,
      alreadyCancelled: Boolean(data?.already_cancelled),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo anular la factura.";
    console.error("[cancelPurchase]", message);
    return { success: false, error: message };
  }
}
