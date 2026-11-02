"use server";

import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/admin";

// ─── Generar código de referido único ────────────────────────────────────────
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "REF-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Obtener configuración del programa ──────────────────────────────────────
export async function getReferralSettings() {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("referral_settings" as any) as any)
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching referral settings:", error);
    return null;
  }
  return data;
}

// ─── Actualizar configuración del programa ───────────────────────────────────
export async function updateReferralSettings(settings: {
  referrer_discount_percent: number;
  referred_discount_percent: number;
  max_referrals_per_customer: number;
  is_active: boolean;
  expiration_days: number;
}) {
  const supabase = await createClient();

  const { data: existing } = await (supabase.from("referral_settings" as any) as any)
    .select("id")
    .limit(1)
    .single();

  if (!existing) {
    const { error } = await (supabase.from("referral_settings" as any) as any).insert({
      ...settings,
      updated_at: new Date().toISOString(),
    });
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await (supabase.from("referral_settings" as any) as any)
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}

// ─── Crear un nuevo código de referido para un cliente ───────────────────────
export async function createReferralCode(referrerCustomerId: string) {
  const supabase = await createClient();

  // Verificar configuración
  const settings = await getReferralSettings();
  if (!settings || !settings.is_active) {
    return { success: false, error: "El programa de referidos no está activo." };
  }

  // Contar referidos activos del cliente
  const { count } = await (supabase.from("referrals" as any) as any)
    .select("id", { count: "exact", head: true })
    .eq("referrer_customer_id", referrerCustomerId)
    .in("status", ["pending", "registered"]);

  if (count !== null && count >= settings.max_referrals_per_customer) {
    return {
      success: false,
      error: `Este cliente ya alcanzó el máximo de ${settings.max_referrals_per_customer} referidos activos.`,
    };
  }

  // Generar código único
  let referralCode = generateReferralCode();
  let attempts = 0;

  while (attempts < 10) {
    const { data: existing } = await (supabase.from("referrals" as any) as any)
      .select("id")
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (!existing) break;
    referralCode = generateReferralCode();
    attempts++;
  }

  // Calcular fecha de expiración
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (settings.expiration_days || 90));

  // Insertar referido
  const { data, error } = await (supabase.from("referrals" as any) as any).insert({
    referrer_customer_id: referrerCustomerId,
    referral_code: referralCode,
    status: "pending",
    referrer_discount_percent: settings.referrer_discount_percent,
    referred_discount_percent: settings.referred_discount_percent,
    expires_at: expiresAt.toISOString(),
  }).select().single();

  if (error) {
    console.error("Error creating referral:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ─── Obtener referidos de un cliente ─────────────────────────────────────────
export async function getCustomerReferrals(customerId: string) {
  const supabase = await createClient();

  const { data, error } = await (supabase.from("referrals" as any) as any)
    .select(`
      *,
      referrer:referrer_customer_id(id, full_name),
      referred:referred_customer_id(id, full_name)
    `)
    .eq("referrer_customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching referrals:", error);
    return [];
  }
  return data || [];
}

// ─── Obtener todos los referidos (admin) ─────────────────────────────────────
export async function getAllReferrals() {
  const supabase = await createClient();

  const { data, error } = await (supabase.from("referrals" as any) as any)
    .select(`
      *,
      referrer:referrer_customer_id(id, full_name),
      referred:referred_customer_id(id, full_name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all referrals:", error);
    return [];
  }
  return data || [];
}

// ─── Vincular un referido (cuando un nuevo cliente usa el código) ────────────
export async function linkReferral(referralCode: string, referredCustomerId: string) {
  const supabase = await createClient();

  const { data, error } = await (supabase as any).rpc("claim_referral_for_customer", {
    p_referral_code: referralCode.toUpperCase().trim(),
    p_referred_customer_id: referredCustomerId,
  });

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Código inválido o ya utilizado.",
    };
  }

  return { success: true, referral: data };
}

// ─── Verificar si un cliente tiene descuento de referido disponible ──────────
export async function checkReferralDiscount(customerId: string) {
  const supabase = await createClient();

  // 1. Verificar si es un referido con descuento pendiente
  const { data: asReferred } = await (supabase.from("referrals" as any) as any)
    .select("*, referrer:referrer_customer_id(full_name)")
    .eq("referred_customer_id", customerId)
    .eq("referred_discount_used", false)
    .eq("status", "registered")
    .maybeSingle();

  // 2. Verificar si es un referidor con descuento pendiente (tiene al menos un referido registrado)
  const { data: asReferrer } = await (supabase.from("referrals" as any) as any)
    .select("*, referred:referred_customer_id(full_name)")
    .eq("referrer_customer_id", customerId)
    .eq("referrer_discount_used", false)
    .in("status", ["registered", "completed"])
    .limit(1)
    .maybeSingle();

  return {
    asReferred: asReferred || null,
    asReferrer: asReferrer || null,
  };
}

// ─── Marcar descuento como usado ─────────────────────────────────────────────
export async function markReferralDiscountUsed(
  referralId: string,
  role: "referrer" | "referred",
  saleId: string
) {
  const supabase = await createClient();

  const { error } = await (supabase as any).rpc("consume_referral_discount", {
    p_referral_id: referralId,
    p_role: role,
    p_sale_id: saleId,
  });

  if (error) {
    console.error("Error marking referral discount as used:", error);
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

// ─── Buscar referido por código (público) ────────────────────────────────────
export async function getReferralByCode(code: string) {
  const supabase = createAdminClient();

  const { data, error } = await (supabase.from("referrals" as any) as any)
    .select(`
      id,
      referral_code,
      status,
      referred_discount_percent,
      referred_discount_used,
      expires_at,
      referrer:referrer_customer_id(full_name)
    `)
    .eq("referral_code", code.toUpperCase().trim())
    .in("status", ["pending", "registered"])
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

// ─── Obtener estadísticas de referidos ───────────────────────────────────────
export async function getReferralStats() {
  const supabase = await createClient();

  const { data: all } = await (supabase.from("referrals" as any) as any).select("status, referrer_discount_used, referred_discount_used");

  if (!all) return { total: 0, pending: 0, registered: 0, completed: 0, expired: 0, discountsGiven: 0 };

  const stats = {
    total: all.length,
    pending: all.filter((r: any) => r.status === "pending").length,
    registered: all.filter((r: any) => r.status === "registered").length,
    completed: all.filter((r: any) => r.status === "completed").length,
    expired: all.filter((r: any) => r.status === "expired").length,
    discountsGiven: all.filter((r: any) => r.referrer_discount_used || r.referred_discount_used).length,
  };

  return stats;
}
