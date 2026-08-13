"use client";

import { FaTrash, FaMinus, FaPlus, FaGift } from "react-icons/fa";
import { CartItem } from "../types";
import { getAppliedPromotion } from "@/lib/promotions";

interface CartListProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onUpdateCustomPrice: (productId: string, newPrice: string) => void;
  onUpdateTaxRate?: (productId: string, taxRateId: number, taxRateVal: number) => void;
}

export default function CartList({
  cart,
  onUpdateQuantity,
  onRemoveFromCart,
  onUpdateCustomPrice,
  onUpdateTaxRate,
}: CartListProps) {
  const totalItems = cart.reduce((acc, item) => {
    const promo = getAppliedPromotion(item.quantity, item);
    return acc + item.quantity + (promo?.totalGiftQuantity || 0);
  }, 0);

  if (cart.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
              Carrito
            </h3>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              0 items
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white dark:bg-slate-900">
          <div className="text-5xl mb-4 opacity-20">🛒</div>
          <p className="text-lg font-medium">El carrito está vacío</p>
          <p className="text-sm">Agrega productos para comenzar la venta</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
            Carrito
          </h3>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {totalItems} unidades totales
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
          <thead className="bg-gray-50 dark:bg-slate-950">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Producto
              </th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Cantidad / Entrega
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Precio Unit.
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Subtotal
              </th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
            {cart.map((item) => {
              const price =
                item.customPrice !== undefined
                  ? item.customPrice
                  : item.price_minorista || 0; // Default to minorista for display if not set

              const promo = getAppliedPromotion(item.quantity, item);
              const giftQty = promo?.totalGiftQuantity || 0;

              return (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-gray-900 dark:text-slate-50">
                        {item.name}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.sku && (
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            SKU: {item.sku}
                          </span>
                        )}
                        {item.promotion?.enabled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                            <FaGift size={10} /> Cada {item.promotion.buyQuantity}, regalar {item.promotion.giftQuantity}
                          </span>
                        )}
                      </div>
                      {giftQty > 0 && (
                        <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/50 mt-0.5">
                          <span className="font-bold">{item.quantity} unidades cobradas</span> + <span className="font-bold">{giftQty} unidades de regalo</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                        >
                          <FaMinus size={12} />
                        </button>
                        <span className="w-8 text-center font-bold text-gray-800 dark:text-slate-100 text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 rounded transition-colors"
                        >
                          <FaPlus size={12} />
                        </button>
                      </div>
                      {giftQty > 0 ? (
                        <div className="flex flex-col items-center text-[10px]">
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <FaGift size={10} /> +{giftQty} regalo
                          </span>
                          <span className="font-semibold text-slate-500 dark:text-slate-400">
                            Total entregado: {item.quantity + giftQty}
                          </span>
                        </div>
                      ) : (
                        item.promotion?.enabled && (
                          <span className="text-[10px] text-slate-400">
                            Faltan {item.promotion.buyQuantity - (item.quantity % item.promotion.buyQuantity)} para regalo
                          </span>
                        )
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) =>
                          onUpdateCustomPrice(item.id, e.target.value)
                        }
                        className={`w-24 px-2 py-1 text-right border-b focus:outline-none bg-transparent transition-colors font-medium ${
                          price === 0
                            ? "border-red-300 text-red-600 placeholder-red-300"
                            : "border-transparent hover:border-gray-300 focus:border-blue-500 text-gray-700"
                        }`}
                        placeholder="0.00"
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="font-bold text-gray-900 dark:text-slate-50">
                      ${(price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => onRemoveFromCart(item.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Eliminar del carrito"
                    >
                      <FaTrash size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
