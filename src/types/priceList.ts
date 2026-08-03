export interface PriceListItem {
  id?: number;
  price_list_id?: string;
  product_id: string;
  custom_price_minorista: number;
  custom_price_mayorista: number;
  created_at?: string;
  product?: {
    id: string;
    sku: string;
    name: string;
    price_minorista: number;
    price_mayorista: number;
    stock?: number;
    barcode?: string | null;
  };
}

export interface PriceList {
  id: string;
  name: string;
  customer_id: string | null;
  description: string | null;
  status: "activa" | "borrador" | "expirada";
  valid_until: string | null;
  discount_margin_percent: number;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    full_name: string;
    phone?: string | null;
    email?: string | null;
    customer_type?: string;
  } | null;
  items?: PriceListItem[];
  items_count?: number;
}
