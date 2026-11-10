'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface ProductStockUpdate {
  id: string;
  name: string;
  stock: number;
  sku?: string | null;
  price_minorista?: number;
  price_mayorista?: number;
  cost_price?: number;
}

interface UseRealtimeProductStockOptions {
  branchId?: number | null;
  onProductUpdate?: (updated: ProductStockUpdate) => void;
  enabled?: boolean;
}

export function useRealtimeProductStock({
  branchId,
  onProductUpdate,
  enabled = true,
}: UseRealtimeProductStockOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(onProductUpdate);

  useEffect(() => {
    callbackRef.current = onProductUpdate;
  }, [onProductUpdate]);

  useEffect(() => {
    if (!enabled) return;

    if (branchId) {
      // Subscripción en tiempo real aislada a la sucursal activa
      const channel = supabase
        .channel(`realtime_branch_stock_${branchId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'branch_stock',
            filter: `branch_id=eq.${branchId}`,
          },
          async (payload) => {
            if (payload.new) {
              const raw = payload.new as any;
              const { data: prod } = await supabase
                .from('products')
                .select('id, name, sku, price_minorista, price_mayorista, cost_price')
                .eq('id', raw.product_id)
                .single();

              if (prod) {
                const updated: ProductStockUpdate = {
                  id: prod.id,
                  name: prod.name,
                  stock: Number(raw.stock) || 0,
                  sku: prod.sku,
                  price_minorista: Number(prod.price_minorista) || 0,
                  price_mayorista: Number(prod.price_mayorista) || 0,
                  cost_price: Number(prod.cost_price) || 0,
                };

                if (callbackRef.current) {
                  callbackRef.current(updated);
                }
              }
            }
          }
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED');
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Fallback global legacy
      const channel = supabase
        .channel('realtime_products_stock_sync')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'products',
          },
          (payload) => {
            if (payload.new) {
              const raw = payload.new as any;
              const updated: ProductStockUpdate = {
                id: raw.id,
                name: raw.name,
                stock: Number(raw.stock) || 0,
                sku: raw.sku,
                price_minorista: Number(raw.price_minorista) || 0,
                price_mayorista: Number(raw.price_mayorista) || 0,
                cost_price: Number(raw.cost_price) || 0,
              };

              if (callbackRef.current) {
                callbackRef.current(updated);
              }
            }
          }
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED');
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [enabled, branchId]);

  return { isConnected };
}
