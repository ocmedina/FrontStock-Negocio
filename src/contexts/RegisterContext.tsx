'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getActiveRegisters, type Register } from '@/app/actions/registerActions';
import toast from 'react-hot-toast';

interface RegisterContextType {
  registers: Register[];
  activeRegister: Register | null;
  isAssignedFixed: boolean;
  isLoading: boolean;
  setActiveRegisterById: (registerId: number) => void;
  refreshRegisters: () => Promise<void>;
}

const RegisterContext = createContext<RegisterContextType | undefined>(undefined);

const STORAGE_KEY = 'frontstock_active_register_id';

export function RegisterProvider({ children }: { children: React.ReactNode }) {
  const [registers, setRegisters] = useState<Register[]>([]);
  const [activeRegister, setActiveRegister] = useState<Register | null>(null);
  const [isAssignedFixed, setIsAssignedFixed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const initRegisters = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Obtener cajas activas
      const result = await getActiveRegisters();
      const activeList = result.data || [];
      setRegisters(activeList);

      if (activeList.length === 0) {
        setIsLoading(false);
        return;
      }

      // 2. Verificar si el usuario autenticado tiene una caja fija asignada en su perfil
      const { data: { session } } = await supabase.auth.getSession();
      let fixedId: number | null = null;

      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('register_id')
          .eq('id', session.user.id)
          .single();

        if ((profile as any)?.register_id) {
          fixedId = Number((profile as any).register_id);
        }
      }

      // Si tiene caja fija asignada
      if (fixedId) {
        const match = activeList.find((r) => r.id === fixedId);
        if (match) {
          setActiveRegister(match);
          setIsAssignedFixed(true);
          setIsLoading(false);
          return;
        }
      }

      // 3. Si no tiene caja fija, leer de localStorage o asignar la primera activa
      setIsAssignedFixed(false);
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      const parsedId = savedId ? parseInt(savedId, 10) : null;

      const matched = parsedId ? activeList.find((r) => r.id === parsedId) : null;
      const resolved = matched || activeList[0] || null;

      setActiveRegister(resolved);
      if (resolved && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(resolved.id));
      }
    } catch (err) {
      console.error('[RegisterContext] Error initializing registers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initRegisters();
  }, [initRegisters]);

  const setActiveRegisterById = useCallback(
    (registerId: number) => {
      if (isAssignedFixed) {
        toast.error('Tu usuario tiene una caja asignada fija por el administrador.');
        return;
      }

      const match = registers.find((r) => r.id === registerId);
      if (match) {
        setActiveRegister(match);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, String(match.id));
        }
        toast.success(`Caja activa: ${match.name}`, { id: 'active-register-toast' });
      }
    },
    [registers, isAssignedFixed]
  );

  return (
    <RegisterContext.Provider
      value={{
        registers,
        activeRegister,
        isAssignedFixed,
        isLoading,
        setActiveRegisterById,
        refreshRegisters: initRegisters,
      }}
    >
      {children}
    </RegisterContext.Provider>
  );
}

export function useRegister() {
  const context = useContext(RegisterContext);
  if (!context) {
    throw new Error('useRegister debe utilizarse dentro de un RegisterProvider');
  }
  return context;
}
