// src/components/DashboardWrapper.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import StartingFloatModal from "./StartingFloatModal";

const CACHE_KEY = "frontstock_starting_float_check";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

function getTodayArg(): string {
  const now = new Date();
  const argDate = new Date(
    now.toLocaleString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
    })
  );
  return argDate.toISOString().split("T")[0];
}

function getCachedResult(): { date: string; needsFloat: boolean } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    const now = Date.now();
    if (now - cached.timestamp > CACHE_TTL_MS) return null;
    if (cached.date !== getTodayArg()) return null;
    return cached;
  } catch {
    return null;
  }
}

function setCachedResult(date: string, needsFloat: boolean) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ date, needsFloat, timestamp: Date.now() })
    );
  } catch {
    // sessionStorage may not be available
  }
}

export default function DashboardWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showStartingFloatModal, setShowStartingFloatModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const hasChecked = useRef(false);

  useEffect(() => {
    // Evitar doble-ejecución en StrictMode y navegaciones
    if (hasChecked.current) {
      setIsChecking(false);
      return;
    }
    hasChecked.current = true;

    checkStartingFloat();
  }, []);

  // GLOBAL KEEP-ALIVE PARA PREVENIR SUSPENSIÓN POR INACTIVIDAD
  // Ping a Supabase cada 45 segundos para que la conexión no muera.
  useEffect(() => {
    const keepAliveInterval = setInterval(async () => {
      try {
        await supabase.from("profiles").select("id").limit(1);
      } catch (e) {
        // Ignorar errores del ping
      }
    }, 45000); // 45 segundos

    return () => clearInterval(keepAliveInterval);
  }, []);

  const checkStartingFloat = async () => {
    try {
      const today = getTodayArg();

      // Verificar caché primero
      const cached = getCachedResult();
      if (cached) {
        if (cached.needsFloat) {
          setShowStartingFloatModal(true);
        }
        setIsChecking(false);
        return;
      }

      const yesterdayDate = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "America/Argentina/Buenos_Aires",
        })
      );
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split("T")[0];

      // 1. Verificar si existe un fondo inicial para hoy
      const { data: todayFloat } = await supabase
        .from("cash_movements")
        .select("id")
        .eq("type", "fondo_inicial")
        .gte("created_at", `${today}T00:00:00-03:00`)
        .lte("created_at", `${today}T23:59:59.999-03:00`)
        .maybeSingle();

      // Si ya hay fondo inicial de hoy, no mostrar modal
      if (todayFloat) {
        setCachedResult(today, false);
        setIsChecking(false);
        return;
      }

      // 2. Verificar si existe un cierre de caja de ayer
      const { data: yesterdayReport } = await supabase
        .from("daily_reports")
        .select("id")
        .eq("report_date", yesterday)
        .maybeSingle();

      // Si NO hay cierre de ayer, es el primer día o no se cerró ayer
      // En este caso NO mostramos el modal
      if (!yesterdayReport) {
        setCachedResult(today, false);
        setIsChecking(false);
        return;
      }

      // 3. Si hay cierre de ayer pero NO hay fondo inicial de hoy, mostrar modal
      setCachedResult(today, true);
      setShowStartingFloatModal(true);
    } catch (error) {
      console.error("Error checking starting float:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCloseModal = () => {
    setShowStartingFloatModal(false);
    // Actualizar caché: ya no necesita float (lo acaba de cargar)
    setCachedResult(getTodayArg(), false);
  };

  if (isChecking) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <StartingFloatModal
        isOpen={showStartingFloatModal}
        onClose={handleCloseModal}
        date={new Date().toISOString().split("T")[0]}
      />
    </>
  );
}
