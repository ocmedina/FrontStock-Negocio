"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineXCircle,
  HiOutlineRefresh,
  HiOutlineDatabase,
  HiOutlineDesktopComputer,
  HiOutlineTerminal,
  HiOutlineChip,
  HiOutlineCloudDownload,
  HiOutlineGlobeAlt,
  HiOutlineKey,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineFolder,
  HiOutlineClock,
  HiOutlineInformationCircle,
} from "react-icons/hi";

interface HealthData {
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  timestamp: string;
  serverLatencyMs: number;
  environment: string;
  backend: {
    database: {
      status: "HEALTHY" | "DEGRADED" | "DOWN";
      latencyMs: number;
      error: string | null;
    };
    auth: {
      status: "HEALTHY" | "DOWN";
      error: string | null;
    };
    storage: {
      status: "HEALTHY" | "DEGRADED" | "DOWN";
      error: string | null;
    };
    recordCounts: {
      products: number;
      sales: number;
      customers: number;
      suppliers: number;
      purchaseOrders: number;
    };
    memoryMb: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    } | null;
  };
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

export default function DevMonitorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  // Health data state
  const [health, setHealth] = useState<HealthData | null>(null);
  const [clientPing, setClientPing] = useState<number | null>(null);

  // Frontend state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [storageUsageMb, setStorageUsageMb] = useState<string>("0.00");
  const [swActive, setSwActive] = useState<boolean>(false);
  const [viewport, setViewport] = useState<string>("");

  // Control state
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10); // seconds (0 = off)
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (type: LogEntry["type"], message: string) => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    setLogs((prev) => [entry, ...prev.slice(0, 49)]); // keep last 50 logs
  };

  // Check authorization
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        const role = profile?.role;
        const isAdmin = role === "administrador";
        const isDevEnv = process.env.NODE_ENV === "development";

        if (!isAdmin && !isDevEnv) {
          addLog("error", "Acceso denegado: Se requieren permisos de administrador.");
          setTimeout(() => router.push("/dashboard"), 1500);
          return;
        }

        setAuthorized(true);
        addLog("info", `Sesión validada como ${role || "desarrollador"}.`);
      } catch (err: any) {
        addLog("error", "Error al verificar permisos.");
        router.push("/dashboard");
      }
    };

    checkAuth();
  }, [router]);

  // Client metrics setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        addLog("success", "Conexión a internet restablecida en el cliente.");
      };
      const handleOffline = () => {
        setIsOnline(false);
        addLog("warning", "El cliente ha perdido la conexión a internet.");
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Viewport
      setViewport(`${window.innerWidth}x${window.innerHeight}`);

      // Service worker status
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        setSwActive(true);
      }

      // Storage estimate
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalBytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
        }
      }
      setStorageUsageMb((totalBytes / (1024 * 1024)).toFixed(2));

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Fetch health metrics
  const fetchHealth = useCallback(async () => {
    setRefreshing(true);
    const startPing = Date.now();

    try {
      const res = await fetch("/api/dev/health", { cache: "no-store" });
      const elapsedPing = Date.now() - startPing;
      setClientPing(elapsedPing);

      if (res.ok) {
        const data: HealthData = await res.json();
        setHealth(data);

        if (data.status === "HEALTHY") {
          addLog("success", `Diagnóstico ejecutado: Sistema 100% Operativo (Ping RTT ${elapsedPing}ms, DB ${data.backend.database.latencyMs}ms).`);
        } else if (data.status === "DEGRADED") {
          addLog("warning", `Diagnóstico ejecutado: Estado Degradado detectado (DB Ping ${data.backend.database.latencyMs}ms).`);
        } else {
          addLog("error", `Diagnóstico ejecutado: Fallo en servicios backend.`);
        }
      } else {
        addLog("error", `Error HTTP ${res.status} al consultar endpoint de health.`);
      }
    } catch (err: any) {
      addLog("error", `Error de red al consultar backend: ${err?.message || err}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch once authorized
  useEffect(() => {
    if (authorized) {
      fetchHealth();
    }
  }, [authorized, fetchHealth]);

  // Auto-refresh interval
  useEffect(() => {
    if (!authorized || autoRefreshInterval === 0) return;

    const timer = setInterval(() => {
      fetchHealth();
    }, autoRefreshInterval * 1000);

    return () => clearInterval(timer);
  }, [authorized, autoRefreshInterval, fetchHealth]);

  if (!authorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 animate-spin">
          <HiOutlineRefresh className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Verificando Credenciales de Desarrollador...</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Validando rol de administrador y entorno del sistema.</p>
      </div>
    );
  }

  const getStatusBadge = (status?: "HEALTHY" | "DEGRADED" | "DOWN") => {
    switch (status) {
      case "HEALTHY":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <HiOutlineCheckCircle className="w-4 h-4 text-emerald-500" />
            OPERATIVO (HEALTHY)
          </span>
        );
      case "DEGRADED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <HiOutlineExclamationCircle className="w-4 h-4 text-amber-500" />
            DEGRADADO
          </span>
        );
      case "DOWN":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <HiOutlineXCircle className="w-4 h-4 text-rose-500" />
            CAÍDO (DOWN)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-500/10 text-slate-500 border border-slate-500/20">
            DESCONOCIDO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <HiOutlineTerminal className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Developer System Monitor
                  </h1>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {health?.environment || "production"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Diagnóstico en tiempo real de infraestructura Frontend, Backend y Supabase
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Overall status badge */}
            {getStatusBadge(health?.status)}

            {/* Auto refresh selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
              <span className="px-2.5 text-slate-500 dark:text-slate-400 text-[11px] font-extrabold uppercase">Auto-Refresh:</span>
              {[0, 5, 10, 30].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setAutoRefreshInterval(sec)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    autoRefreshInterval === sec
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {sec === 0 ? "Off" : `${sec}s`}
                </button>
              ))}
            </div>

            {/* Manual refresh button */}
            <button
              onClick={fetchHealth}
              disabled={refreshing}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <HiOutlineRefresh className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Diagnosticando..." : "Actualizar Diagnóstico"}</span>
            </button>
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80">
          <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1">
              Latencia Cliente (RTT)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900 dark:text-white">
                {clientPing !== null ? `${clientPing} ms` : "--"}
              </span>
              <span className="text-[10px] text-emerald-500 font-bold">Client ➔ Server</span>
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1">
              Latencia Supabase DB
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900 dark:text-white">
                {health?.backend.database.latencyMs !== undefined ? `${health.backend.database.latencyMs} ms` : "--"}
              </span>
              <span className="text-[10px] text-indigo-500 font-bold">PostgreSQL Query</span>
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1">
              Estado de Red
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-base font-black ${isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                {isOnline ? "CONECTADO" : "SIN CONEXIÓN"}
              </span>
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1">
              Última Verificación
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : "--"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid containing Frontend & Backend Diagnosis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* FRONTEND CARD */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <HiOutlineDesktopComputer className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Diagnóstico Frontend (Cliente)</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Entorno del navegador y rendimiento client-side</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                BROWSER ENGINE
              </span>
            </div>

            <div className="space-y-4">
              {/* Item: Network Status */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <HiOutlineGlobeAlt className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Red del Navegador</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Evento window navigator.onLine</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${isOnline ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600"}`}>
                  {isOnline ? "ONLINE" : "OFFLINE"}
                </span>
              </div>

              {/* Item: Latency */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <HiOutlineClock className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Latencia RTT Cliente ➔ Servidor</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Tiempo de respuesta HTTP GET /api/dev/health</p>
                  </div>
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {clientPing !== null ? `${clientPing} ms` : "Calculando..."}
                </span>
              </div>

              {/* Item: Storage Usage */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <HiOutlineFolder className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Almacenamiento Local (LocalStorage)</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Datos guardados en cache del navegador</p>
                  </div>
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {storageUsageMb} MB / ~5 MB
                </span>
              </div>

              {/* Item: Service Worker */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <HiOutlineCloudDownload className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">PWA & Service Worker</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Soporte Offline y controladores instalados</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${swActive ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                  {swActive ? "ACTIVO" : "INACTIVO / STANDALONE"}
                </span>
              </div>

              {/* Item: Viewport */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <HiOutlineInformationCircle className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Resolución & Viewport</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Pantalla actual</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {viewport}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BACKEND CARD */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-800/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <HiOutlineDatabase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Diagnóstico Backend & Supabase</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Salud de la Base de Datos, Auth y Storage</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                SUPABASE CLOUD
              </span>
            </div>

            <div className="space-y-4">
              {/* Database Ping */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <HiOutlineDatabase className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">PostgreSQL Latency (Ping)</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {health?.backend.database.error ? `Error: ${health.backend.database.error}` : "Tiempo de respuesta de query a DB"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {health?.backend.database.latencyMs !== undefined ? `${health.backend.database.latencyMs} ms` : "--"}
                  </span>
                  {getStatusBadge(health?.backend.database.status)}
                </div>
              </div>

              {/* Supabase Auth */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <HiOutlineKey className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Supabase Auth Service</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Verificación de sesiones y tokens</p>
                  </div>
                </div>
                {getStatusBadge(health?.backend.auth.status)}
              </div>

              {/* Supabase Storage */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <HiOutlineShieldCheck className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Supabase Storage Buckets</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Almacenamiento de archivos y PDFs</p>
                  </div>
                </div>
                {getStatusBadge(health?.backend.storage.status)}
              </div>

              {/* Record Counts */}
              <div className="p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-2">Conteo de Registros de Tablas Críticas</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Productos</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{health?.backend.recordCounts.products ?? 0}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Ventas</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{health?.backend.recordCounts.sales ?? 0}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Órdenes C.</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{health?.backend.recordCounts.purchaseOrders ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Node.js Heap Memory */}
              {health?.backend.memoryMb && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <HiOutlineChip className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Memoria Node.js (Server Heap)</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Proceso servidor Next.js</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {health.backend.memoryMb.heapUsed} MB / {health.backend.memoryMb.heapTotal} MB
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal / Live Diagnostic Console Logs */}
      <div className="bg-slate-950 text-slate-100 rounded-3xl p-6 border border-slate-800 shadow-xl overflow-hidden font-mono text-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            </div>
            <span className="text-slate-400 text-xs font-bold ml-2">Console Diagnostic Feed (Live Logs)</span>
          </div>
          <button
            onClick={() => setLogs([])}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
          >
            Limpiar Consola
          </button>
        </div>

        <div className="h-44 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
          {logs.length === 0 ? (
            <p className="text-slate-600 italic">Esperando eventos de diagnóstico...</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <span className="text-slate-500 shrink-0 font-bold">[{log.timestamp}]</span>
                <span
                  className={
                    log.type === "success"
                      ? "text-emerald-400"
                      : log.type === "warning"
                      ? "text-amber-400"
                      : log.type === "error"
                      ? "text-rose-400 font-bold"
                      : "text-slate-300"
                  }
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
