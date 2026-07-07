import { supabase } from "@/lib/supabaseClient";
import { 
  VoucherType, 
  TaxRate, 
  VoucherCalculationResult, 
  IvaBreakdownItem,
  CompanySettings
} from "@/types/voucher";

// Core tax calculations (pure functions)
export const calculateVoucherTaxes = (
  voucherTypeId: string,
  items: Array<{
    price: number; // Gross price (IVA included)
    quantity: number;
    taxRateVal?: number; // e.g. 21.0, 10.5, 27.0, 0.0. Defaults to 21.0
    taxRateId?: number; // Defaults to 1 (21%)
  }>
): VoucherCalculationResult => {
  let subtotalNeto = 0;
  let ivaAmount = 0;
  let total = 0;
  const breakdownMap = new Map<number, IvaBreakdownItem>();

  for (const item of items) {
    const ratePercent = item.taxRateVal !== undefined ? item.taxRateVal : 21.0;
    const rateId = item.taxRateId !== undefined ? item.taxRateId : 1;
    const itemQty = item.quantity;
    const itemPriceGross = item.price;
    const itemTotalGross = itemPriceGross * itemQty;

    let itemNet = 0;
    let itemIva = 0;

    if (voucherTypeId === "FA" || voucherTypeId === "NDA" || voucherTypeId === "NCA") {
      // Discriminates IVA (Factura A)
      // Net Price = PriceGross / (1 + ratePercent/100)
      const unitNet = itemPriceGross / (1 + ratePercent / 100);
      itemNet = unitNet * itemQty;
      itemIva = itemTotalGross - itemNet;
    } else if (voucherTypeId === "FB" || voucherTypeId === "NDB" || voucherTypeId === "NCB") {
      // Factura B: shows final price with IVA included, but calculates net internally
      const unitNet = itemPriceGross / (1 + ratePercent / 100);
      itemNet = unitNet * itemQty;
      itemIva = itemTotalGross - itemNet;
    } else {
      // Factura C, Presupuestos, Remitos: No VAT discriminated (Exempt or no VAT)
      itemNet = itemTotalGross;
      itemIva = 0;
    }

    subtotalNeto += itemNet;
    ivaAmount += itemIva;
    total += itemTotalGross;

    // Build breakdown group by tax rate
    const existing = breakdownMap.get(rateId);
    if (existing) {
      existing.neto += itemNet;
      existing.iva += itemIva;
    } else {
      breakdownMap.set(rateId, {
        taxRateId: rateId,
        rate: ratePercent,
        neto: itemNet,
        iva: itemIva,
      });
    }
  }

  // Round values to 2 decimal places
  const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  return {
    subtotalNeto: round(subtotalNeto),
    ivaAmount: round(ivaAmount),
    total: round(total),
    ivaBreakdown: Array.from(breakdownMap.values()).map(item => ({
      taxRateId: item.taxRateId,
      rate: item.rate,
      neto: round(item.neto),
      iva: round(item.iva),
    })),
  };
};

// Repository functions (Database boundary)
export const voucherRepository = {
  async getVoucherTypes(): Promise<VoucherType[]> {
    const { data, error } = await supabase
      .from("voucher_types")
      .select("*")
      .order("name");
    if (error) throw error;
    return data || [];
  },

  async getTaxRates(): Promise<TaxRate[]> {
    const { data, error } = await supabase
      .from("tax_rates")
      .select("*")
      .order("rate", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getCompanySettings(): Promise<CompanySettings> {
    const { data, error } = await supabase
      .from("settings")
      .select("key, value");
    if (error) throw error;

    const settings: CompanySettings = {};
    if (data) {
      for (const row of data) {
        if (row.key.startsWith("business_")) {
          settings[row.key as keyof CompanySettings] = row.value || "";
        }
      }
    }
    return settings;
  },

  async saveCompanySettings(settings: CompanySettings): Promise<void> {
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value: value || "",
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("settings")
      .upsert(updates, { onConflict: "key" });
    if (error) throw error;
  },

  async getSaleWithVoucher(saleId: string) {
    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        voucher_types (*),
        customers (*),
        profiles (full_name)
      `)
      .eq("id", saleId)
      .single();
    if (error) throw error;
    return data;
  },

  async getSaleItems(saleId: string) {
    const { data, error } = await supabase
      .from("sale_items")
      .select(`
        *,
        products (name, sku, barcode),
        tax_rates (*)
      `)
      .eq("sale_id", saleId);
    if (error) throw error;
    return data || [];
  }
};
