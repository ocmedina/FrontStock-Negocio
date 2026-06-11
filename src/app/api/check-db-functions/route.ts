import { NextResponse } from "next/server";
import { createLooseAdminClient } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createLooseAdminClient();

  try {
    // 1. Query to see if functions exist in postgres
    const { data: functions, error: funcError } = await supabase.rpc("check_functions_existence_raw_sql", {}).catch(() => ({ data: null, error: true }));

    // Let's do a direct select on pg_proc using Supabase RPC or check if we can run query
    // If we don't have a direct sql query function, let's call both functions with mock IDs and inspect the exact error messages
    const cancelRes = await supabase.rpc("cancel_customer_payment_transaction", { p_payment_id: 999999999 });
    const editRes = await supabase.rpc("edit_customer_payment_transaction", { 
      p_payment_id: 999999999, 
      p_new_amount: 100, 
      p_new_payment_method: "efectivo", 
      p_new_comment: "test" 
    });

    return NextResponse.json({
      cancel_customer_payment_transaction: {
        error: cancelRes.error ? {
          message: cancelRes.error.message,
          details: cancelRes.error.details,
          hint: cancelRes.error.hint,
          code: cancelRes.error.code
        } : null,
        data: cancelRes.data
      },
      edit_customer_payment_transaction: {
        error: editRes.error ? {
          message: editRes.error.message,
          details: editRes.error.details,
          hint: editRes.error.hint,
          code: editRes.error.code
        } : null,
        data: editRes.data
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
