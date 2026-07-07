export interface VoucherType {
  id: string;
  name: string;
  code: string | null;
  letter: string | null;
}

export interface TaxRate {
  id: number;
  name: string;
  rate: number;
}

export interface IvaBreakdownItem {
  taxRateId: number;
  rate: number;
  neto: number;
  iva: number;
}

export interface VoucherCalculationResult {
  subtotalNeto: number;
  ivaAmount: number;
  total: number;
  ivaBreakdown: IvaBreakdownItem[];
}

export interface CompanySettings {
  business_name?: string;
  business_fantasy_name?: string;
  business_cuit?: string;
  business_iibb?: string;
  business_start_date?: string;
  business_iva_condition?: string;
  business_point_of_sale?: string;
  business_address?: string;
  business_locality?: string;
  business_province?: string;
  business_phone?: string;
  business_email?: string;
  business_logo_url?: string;
}

export interface CustomerVoucherData {
  id: string;
  full_name: string;
  cuit?: string | null;
  iva_condition?: string | null;
  address?: string | null;
  locality?: string | null;
  province?: string | null;
  email?: string | null;
  phone?: string | null;
  customer_type?: string;
}
