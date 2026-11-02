"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaGift, FaPercentage } from "react-icons/fa";

interface ReferralDiscount {
  id: string;
  referral_code: string;
  discount_percent: number;
  role: "referrer" | "referred";
  referrer_name?: string;
  referred_name?: string;
}

interface ReferralBadgeProps {
  customerId: string | null;
  onDiscountAvailable?: (discount: ReferralDiscount | null) => void;
}

export default function ReferralBadge({ customerId, onDiscountAvailable }: ReferralBadgeProps) {
  const [discount, setDiscount] = useState<ReferralDiscount | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId) {
      setDiscount(null);
      onDiscountAvailable?.(null);
      return;
    }

    let isMounted = true;

    async function checkDiscount() {
      setLoading(true);
      try {
        // 1. Check if customer is a referred with unused discount
        const { data: asReferred } = await (supabase.from("referrals" as any) as any)
          .select("id, referral_code, referred_discount_percent, referrer_customer_id, status, referred_discount_used, referrer:referrer_customer_id(full_name)")
          .eq("referred_customer_id", customerId)
          .eq("referred_discount_used", false)
          .eq("status", "registered")
          .limit(1)
          .maybeSingle();

        if (asReferred && isMounted) {
          const d: ReferralDiscount = {
            id: asReferred.id,
            referral_code: asReferred.referral_code,
            discount_percent: asReferred.referred_discount_percent,
            role: "referred",
            referrer_name: asReferred.referrer?.full_name,
          };
          setDiscount(d);
          onDiscountAvailable?.(d);
          setLoading(false);
          return;
        }

        // 2. Check if customer is a referrer with unused discount
        const { data: asReferrer } = await (supabase.from("referrals" as any) as any)
          .select("id, referral_code, referrer_discount_percent, referred_customer_id, status, referrer_discount_used, referred:referred_customer_id(full_name)")
          .eq("referrer_customer_id", customerId)
          .eq("referrer_discount_used", false)
          .in("status", ["registered", "completed"])
          .limit(1)
          .maybeSingle();

        if (asReferrer && isMounted) {
          const d: ReferralDiscount = {
            id: asReferrer.id,
            referral_code: asReferrer.referral_code,
            discount_percent: asReferrer.referrer_discount_percent,
            role: "referrer",
            referred_name: asReferrer.referred?.full_name,
          };
          setDiscount(d);
          onDiscountAvailable?.(d);
          setLoading(false);
          return;
        }

        if (isMounted) {
          setDiscount(null);
          onDiscountAvailable?.(null);
        }
      } catch (err) {
        console.error("Error checking referral discount:", err);
        if (isMounted) {
          setDiscount(null);
          onDiscountAvailable?.(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkDiscount();
    return () => { isMounted = false; };
  }, [customerId]);

  if (loading || !discount) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl animate-fadeIn">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
        <FaGift className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 truncate">
          🎉 Descuento por referido: {discount.discount_percent}%
        </p>
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate">
          {discount.role === "referred"
            ? `Referido por ${discount.referrer_name}`
            : `Por referir a ${discount.referred_name}`}
        </p>
      </div>
      <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white rounded-lg flex-shrink-0">
        <FaPercentage className="w-2.5 h-2.5" />
        <span className="text-xs font-black">{discount.discount_percent}%</span>
      </div>
    </div>
  );
}
