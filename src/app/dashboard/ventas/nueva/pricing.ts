import type { Product } from "./types";

export function isWholesaleCustomer(customerType?: string | null): boolean {
  return customerType?.trim().toLowerCase() === "mayorista";
}

export function getCustomerProductPrice(
  product: Pick<Product, "price_minorista" | "price_mayorista">,
  customerType?: string | null
): number {
  const isWholesale = isWholesaleCustomer(customerType);
  const selectedPrice = isWholesale
    ? product.price_mayorista
    : product.price_minorista;
  const fallbackPrice = isWholesale ? product.price_minorista : 0;

  return Number(selectedPrice ?? fallbackPrice ?? 0);
}
