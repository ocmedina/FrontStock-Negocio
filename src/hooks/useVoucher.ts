import { useState, useEffect, useMemo } from "react";
import { 
  VoucherType, 
  TaxRate, 
  VoucherCalculationResult, 
  CompanySettings 
} from "@/types/voucher";
import { voucherRepository, calculateVoucherTaxes } from "@/services/voucherService";
import toast from "react-hot-toast";

export const useVoucher = (
  selectedVoucherId: string,
  cartItems: Array<{
    price: number;
    quantity: number;
    taxRateVal?: number;
    taxRateId?: number;
  }>
) => {
  const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({});
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const loadVoucherData = async () => {
      try {
        setLoading(true);
        const [types, rates, settings] = await Promise.all([
          voucherRepository.getVoucherTypes(),
          voucherRepository.getTaxRates(),
          voucherRepository.getCompanySettings(),
        ]);
        setVoucherTypes(types);
        setTaxRates(rates);
        setCompanySettings(settings);
      } catch (err: any) {
        console.error("Error loading voucher data:", err);
        toast.error("Error al cargar configuración de comprobantes");
      } finally {
        setLoading(false);
      }
    };
    loadVoucherData();
  }, []);

  // Recalculate calculations dynamically based on pure calculation logic
  const calculations = useMemo<VoucherCalculationResult>(() => {
    return calculateVoucherTaxes(selectedVoucherId, cartItems);
  }, [selectedVoucherId, cartItems]);

  const activeVoucherType = useMemo(() => {
    return voucherTypes.find(t => t.id === selectedVoucherId) || null;
  }, [voucherTypes, selectedVoucherId]);

  return {
    voucherTypes,
    taxRates,
    companySettings,
    calculations,
    activeVoucherType,
    loading,
    refreshSettings: async () => {
      const settings = await voucherRepository.getCompanySettings();
      setCompanySettings(settings);
    }
  };
};
