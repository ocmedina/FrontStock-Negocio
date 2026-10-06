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
  onProductUpdate?: (updated: ProductStockUpdate) => void;
  enabled?: boolean;
}

export function useRealtimeProductStock({
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
  }, [enabled]);

  return { isConnected };
}
