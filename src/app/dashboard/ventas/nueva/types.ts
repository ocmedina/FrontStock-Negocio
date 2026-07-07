import { Database } from "@/lib/database.types";

export type Customer = Database["public"]["Tables"]["customers"]["Row"] & {
  debt?: number | null;
};
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type CartItem = Product & { 
  quantity: number; 
  customPrice?: number;
  taxRateId?: number;
  taxRateVal?: number;
};

export type SaleTab = {
  id: number;
  name: string;
  selectedCustomer: Customer | null;
  cart: CartItem[];
  total: number;
  amountPaid: string;
  paymentMethod: string;
  useMixedPayment: boolean;
  paymentMethods: Array<{ method: string; amount: string }>;
  showPaymentPanel: boolean;
  payToSupplier: boolean;
  selectedSupplierId: string | null;
  voucherTypeId?: string;
  pointOfSale?: number;
  observations?: string;
};

export type Supplier = {
  id: string;
  name: string;
  debt: number;
};
