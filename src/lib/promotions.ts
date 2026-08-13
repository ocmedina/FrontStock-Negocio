export interface ProductPromotion {
  enabled: boolean;
  buyQuantity: number;
  giftQuantity: number;
  giftProductId?: string | null;
}

export interface AppliedPromotion {
  applied: boolean;
  buyQuantity: number;
  giftQuantityPerPromotion: number;
  totalGiftQuantity: number;
  giftProductId?: string | null;
}

/**
 * Calcula la cantidad de unidades de regalo a entregar.
 * Lógica: Math.floor(cantidadVendida / buyQuantity) * giftQuantity
 */
export function calculateGiftQuantity(
  quantitySold: number,
  promotion?: ProductPromotion | null
): number {
  if (
    !promotion ||
    !promotion.enabled ||
    !promotion.buyQuantity ||
    promotion.buyQuantity <= 0 ||
    !promotion.giftQuantity ||
    promotion.giftQuantity <= 0 ||
    quantitySold <= 0
  ) {
    return 0;
  }

  return Math.floor(quantitySold / promotion.buyQuantity) * promotion.giftQuantity;
}

/**
 * Retorna los detalles de la promoción aplicada para un producto y su cantidad vendida.
 */
export function getAppliedPromotion(
  quantitySold: number,
  product?: { id?: string; promotion?: ProductPromotion | null } | null
): AppliedPromotion | null {
  if (!product?.promotion?.enabled) return null;
  const buyQty = product.promotion.buyQuantity;
  const giftQty = product.promotion.giftQuantity;

  if (!buyQty || buyQty <= 0 || !giftQty || giftQty <= 0) return null;

  const totalGift = calculateGiftQuantity(quantitySold, product.promotion);

  return {
    applied: true,
    buyQuantity: buyQty,
    giftQuantityPerPromotion: giftQty,
    totalGiftQuantity: totalGift,
    giftProductId: product.promotion.giftProductId || product.id || null,
  };
}
