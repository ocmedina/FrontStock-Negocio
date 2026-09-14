"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HiSparkles,
  HiOutlineChevronRight,
  HiOutlineChevronLeft,
} from "react-icons/hi";
import {
  FaTimes,
  FaCheckCircle,
  FaArrowRight,
  FaLayerGroup,
  FaBolt,
  FaFileInvoiceDollar,
  FaTable,
  FaMobileAlt,
  FaRegLightbulb,
  FaShoppingCart,
  FaCalculator,
  FaMoneyBillWave,
  FaExchangeAlt,
  FaShieldAlt,
  FaUserCheck,
  FaCompass,
  FaRegEye,
} from "react-icons/fa";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const VERSION_KEY = "system_updates_v2_7_views_count";
const MAX_AUTO_SHOWS = 3;

interface StepItem {
  id: string;
  tag: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: any;
  color: string;
  glowColor: string;
  accent: string;
  bgAccent: string;
  borderAccent: string;
  actionHref?: string;
  actionLabel?: string;
}

export default function SystemUpdatesModal({
  forceOpen = false,
  onClose,
}: {
  forceOpen?: boolean;
  onClose?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [systemLogo, setSystemLogo] = useState<string>(
    "https://i.ibb.co/sJc1Tq7g/DALL-E-2025-02-05-18-50-59-A-modern-and-minimalist-round-app-logo-icon-for-a-supermarket-management.webp"
  );
  const [systemName, setSystemName] = useState<string>("FrontStock");

  const steps: StepItem[] = [
    {
      id: "unificacion",
      tag: "Finanzas & Clientes",
      title: "Unificación Total de Cuentas Corrientes y Fiados",
      shortTitle: "Cuenta Corriente Unificada",
      subtitle:
        "Pedidos de reparto y ventas de mostrador ahora forman una sola cuenta transparente por cliente.",
      icon: FaLayerGroup,
      color: "from-indigo-600 to-blue-600",
      glowColor: "rgba(79, 70, 229, 0.15)",
      accent: "text-indigo-500",
      bgAccent: "bg-indigo-50 dark:bg-indigo-950/40",
      borderAccent: "border-indigo-200 dark:border-indigo-800",
      actionHref: "/dashboard/clientes/deudores",
      actionLabel: "Explorar Cartera de Deudores",
    },
    {
      id: "alerta-deuda",
      tag: "Control en Vivo",
      title: "Alertas de Deuda en Tiempo Real y Proyección al Fiar",
      shortTitle: "Alertas & Proyección",
      subtitle:
        "Detección instantánea de saldo pendiente al seleccionar cliente y cálculo del saldo proyectado.",
      icon: FaBolt,
      color: "from-amber-500 to-orange-600",
      glowColor: "rgba(245, 158, 11, 0.15)",
      accent: "text-amber-500",
      bgAccent: "bg-amber-50 dark:bg-amber-950/40",
      borderAccent: "border-amber-200 dark:border-amber-800",
      actionHref: "/dashboard/ventas/nueva",
      actionLabel: "Probar en Nueva Venta",
    },
    {
      id: "hub-comprobantes",
      tag: "Cobranzas Centralizadas",
      title: "Hub Centralizado de Comprobantes con Saldo",
      shortTitle: "Hub de Comprobantes",
      subtitle:
        "Consulta y cobra pedidos fiados y ventas mostrador en una pantalla unificada con filtros rápidos.",
      icon: FaFileInvoiceDollar,
      color: "from-purple-600 to-pink-600",
      glowColor: "rgba(168, 85, 247, 0.15)",
      accent: "text-purple-500",
      bgAccent: "bg-purple-50 dark:bg-purple-950/40",
      borderAccent: "border-purple-200 dark:border-purple-800",
      actionHref: "/dashboard/pedidos/pendientes",
      actionLabel: "Abrir Hub de Comprobantes",
    },
    {
      id: "extracto-contable",
      tag: "Libro Mayor",
      title: "Extracto Contable: Debe, Haber y Saldo Acumulado",
      shortTitle: "Extracto Contable",
      subtitle:
        "Historial financiero cronológico con cálculo matemático acumulado en la ficha de cada cliente.",
      icon: FaTable,
      color: "from-emerald-600 to-teal-600",
      glowColor: "rgba(16, 185, 129, 0.15)",
      accent: "text-emerald-500",
      bgAccent: "bg-emerald-50 dark:bg-emerald-950/40",
      borderAccent: "border-emerald-200 dark:border-emerald-800",
      actionHref: "/dashboard/clientes",
      actionLabel: "Ver Ficha de un Cliente",
    },
    {
      id: "responsive",
      tag: "Experiencia Móvil",
      title: "Diseño 100% Responsivo en Celulares, Tablets y PC",
      shortTitle: "Diseño Móvil & Tablet",
      subtitle:
        "Tarjetas táctiles nativas, botones ampliados y flujos ágiles para operar desde cualquier teléfono.",
      icon: FaMobileAlt,
      color: "from-cyan-600 to-blue-600",
      glowColor: "rgba(6, 182, 212, 0.15)",
      accent: "text-cyan-500",
      bgAccent: "bg-cyan-50 dark:bg-cyan-950/40",
      borderAccent: "border-cyan-200 dark:border-cyan-800",
    },
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from("settings").select("key, value");
        if (data) {
          const logoObj = data.find((s) => s.key === "system_logo_url" || s.key === "logo_url");
          const nameObj = data.find((s) => s.key === "system_name" || s.key === "business_name");
          if (logoObj?.value) setSystemLogo(logoObj.value);
          if (nameObj?.value) setSystemName(nameObj.value);
        }
      } catch (e) {}
    };
    fetchSettings();

    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    try {
      const views = Number(localStorage.getItem(VERSION_KEY) || 0);
      if (views < MAX_AUTO_SHOWS) {
        setIsOpen(true);
        localStorage.setItem(VERSION_KEY, (views + 1).toString());
      }
    } catch (e) {
      console.error(e);
    }
  }, [forceOpen]);

  const handleClose = useCallback(() => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(VERSION_KEY, MAX_AUTO_SHOWS.toString());
      } catch (e) {}
    }
    setIsOpen(false);
    if (onClose) onClose();
  }, [dontShowAgain, onClose]);

  // Keyboard navigation (Escape, Left, Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowRight" && activeStep < steps.length - 1) {
        setActiveStep((prev) => prev + 1);
      } else if (e.key === "ArrowLeft" && activeStep > 0) {
        setActiveStep((prev) => prev - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeStep, steps.length, handleClose]);

  if (!isOpen) return null;

  const currentStep = steps[activeStep];
  const progressPercentage = ((activeStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-all duration-300">
        
        {/* ============================================================ */}
        {/* HEADER MODERNO CON BRANDING, PROGRESO Y CONTROLES */}
        {/* ============================================================ */}
        <div className="bg-slate-950 text-white px-5 sm:px-7 py-4 sm:py-5 relative overflow-hidden border-b border-slate-800 shrink-0">
          {/* Ambient Glow mesh */}
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-700 -mr-24 -mt-24"
            style={{ backgroundColor: currentStep.glowColor }}
          />

          <div className="flex justify-between items-center relative z-10">
            {/* Logo & Version */}
            <div className="flex items-center gap-3.5">
              <div className="relative group shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-indigo-500 to-cyan-500 rounded-2xl blur-md opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-2 bg-white rounded-2xl shadow-lg ring-1 ring-white/20 flex items-center justify-center">
                  <img
                    src={systemLogo}
                    alt={systemName}
                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-slate-200 tracking-wider uppercase">
                    {systemName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-sm flex items-center gap-1">
                    <HiSparkles size={11} /> Versión 2.7
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                  Novedades del Sistema: Cuenta Corriente Unificada
                </h2>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700/60 active:scale-95"
              title="Cerrar (Esc)"
            >
              <FaTimes size={15} />
            </button>
          </div>

          {/* Barra de Progreso Lineal Fina */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-4 text-xs relative z-10">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
              <span>Paso {activeStep + 1} de {steps.length}</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400 font-extrabold">{currentStep.tag}</span>
            </div>

            <div className="w-36 sm:w-48 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-400 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MOBILE STEPPER (CHIPS EN MÓVILES) */}
        {/* ============================================================ */}
        <div className="md:hidden px-3 pt-3 bg-slate-50/90 dark:bg-slate-950/80 border-b border-slate-150 dark:border-slate-800 overflow-x-auto flex items-center gap-1.5 no-scrollbar shrink-0">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveStep(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeStep === idx
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
              }`}
            >
              <s.icon size={11} className={activeStep === idx ? "text-amber-300" : ""} />
              <span>{idx + 1}. {s.shortTitle}</span>
            </button>
          ))}
        </div>

        {/* ============================================================ */}
        {/* CUERPO DEL MODAL (SIDEBAR + SHOWCASE) */}
        {/* ============================================================ */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* SIDEBAR DE NAVEGACIÓN (ESCRITORIO) */}
          <div className="hidden md:flex flex-col w-72 bg-slate-50/80 dark:bg-slate-950/60 p-4 border-r border-slate-200/80 dark:border-slate-800 shrink-0 space-y-2 overflow-y-auto">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 block mb-1">
              Índice de Novedades
            </span>

            {steps.map((step, idx) => {
              const isActive = activeStep === idx;
              const Icon = step.icon;

              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full text-left p-3 rounded-2xl transition-all duration-200 flex items-start gap-3 border ${
                    isActive
                      ? "bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-600 shadow-md ring-2 ring-indigo-500/15 scale-[1.02]"
                      : "bg-transparent border-transparent hover:bg-white/60 dark:hover:bg-slate-900/40 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black transition-all ${
                      isActive
                        ? `bg-gradient-to-r ${step.color} text-white shadow-sm`
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Icon />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        0{idx + 1}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          Activo
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs font-black truncate mt-0.5 ${
                        isActive
                          ? "text-slate-900 dark:text-slate-100"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {step.shortTitle}
                    </p>
                    <span className="text-[10px] text-slate-450 dark:text-slate-500 block truncate">
                      {step.tag}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* MAIN SHOWCASE CANVAS (CONTENIDO DINÁMICO) */}
          <div className="flex-1 p-5 sm:p-7 overflow-y-auto space-y-5">
            
            {/* Hero Card de la novedad activa */}
            <div
              className={`p-5 rounded-3xl border ${currentStep.bgAccent} ${currentStep.borderAccent} relative overflow-hidden transition-all duration-300`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider bg-white/90 dark:bg-slate-900/90 shadow-xs border ${currentStep.borderAccent} ${currentStep.accent}`}
                    >
                      <currentStep.icon className="text-xs" /> {currentStep.tag}
                    </span>
                    <span className="text-[11px] font-bold text-slate-450 dark:text-slate-400">
                      Novedad 0{activeStep + 1}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-50 leading-tight">
                    {currentStep.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {currentStep.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* WIDGETS INTERACTIVOS DE DEMOSTRACIÓN VISUAL SEGÚN EL PASO */}
            {/* ============================================================ */}

            {/* SLIDE 0: UNIFICACIÓN DE CUENTAS CORRIENTES */}
            {activeStep === 0 && (
              <div className="space-y-4 animate-fadeIn">
                {/* Visual Sandbox / Mockup */}
                <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs">
                        JP
                      </div>
                      <div>
                        <span className="font-black text-xs block text-slate-100">Juan Pérez</span>
                        <span className="text-[10px] text-slate-400">Cliente Mayorista · Ficha Unificada</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-950/80 text-rose-300 border border-rose-900/60">
                      Saldo Total Cta. Cte.: $37.500,00
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-950/80 text-amber-300 border border-amber-900/50">
                          📦 Pedido #7A3B
                        </span>
                        <span className="text-[11px] text-slate-300">Reparto semanal</span>
                      </div>
                      <span className="font-black text-amber-400">$25.000,00</span>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-950/80 text-purple-300 border border-purple-900/50">
                          🏪 Mostrador #4C19
                        </span>
                        <span className="text-[11px] text-slate-300">Venta rápida</span>
                      </div>
                      <span className="font-black text-purple-400">$12.500,00</span>
                    </div>
                  </div>
                </div>

                {/* 3 Value propositions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <strong className="text-slate-900 dark:text-slate-100 font-extrabold block">Saldo Consolidado</strong>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Se acabó la división confusa. El cliente y el negocio ven un solo número real adeudado.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <strong className="text-slate-900 dark:text-slate-100 font-extrabold block">Trazabilidad Total</strong>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Cada comprobante mantiene su identidad original con badges claros de pedido o mostrador.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <strong className="text-slate-900 dark:text-slate-100 font-extrabold block">Cobro Dual</strong>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Imputación automática a la deuda más antigua o selección de comprobantes específicos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 1: ALERTAS DE DEUDA EN VIVO Y PROYECCIÓN */}
            {activeStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                {/* Mini Simulator Mockup */}
                <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <FaBolt /> Simulador de Alerta y Proyección al Vender
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Nueva Venta / Nuevo Pedido</span>
                  </div>

                  <div className="p-3.5 bg-amber-950/40 border border-amber-900/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                        Alerta: Cliente con deuda previa detectada
                      </span>
                      <span className="font-extrabold text-white mt-0.5 block">
                        Saldo Previo: <span className="text-amber-400 font-black">$18.000,00</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-black text-sm">
                      <span>+ Venta: $7.000,00</span>
                      <FaArrowRight className="text-amber-400 text-xs" />
                      <span className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded-lg shadow-sm">
                        Nuevo Saldo: $25.000,00
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold text-xs">
                      <FaBolt />
                    </div>
                    <strong className="text-slate-900 dark:text-slate-100 font-extrabold block">Sin Sorpresas al Cobrar</strong>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      El cajero o vendedor conoce al instante si el cliente adeuda entregas previas antes de confirmar una nueva entrega fiada.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold text-xs">
                      <FaCalculator />
                    </div>
                    <strong className="text-slate-900 dark:text-slate-100 font-extrabold block">Cálculo Matemático en Vivo</strong>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Al presionar "Cuenta Corriente (Fiado)", el modal proyecta la suma exacta para informarle al cliente su nuevo saldo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 2: HUB CENTRALIZADO DE COMPROBANTES CON SALDO */}
            {activeStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                {/* Visual tabs mockup */}
                <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl w-fit text-xs font-bold border border-slate-800">
                    <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg shadow-xs">
                      Todos (14)
                    </span>
                    <span className="px-3 py-1 text-slate-400 hover:text-white">
                      📦 Pedidos (8)
                    </span>
                    <span className="px-3 py-1 text-slate-400 hover:text-white">
                      🏪 Mostrador (6)
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-950 text-purple-300 border border-purple-900">
                        🏪 Mostrador #9921
                      </span>
                      <div>
                        <span className="font-bold text-slate-100 block">Distribuidora Norte</span>
                        <span className="text-[10px] text-slate-400">Total: $42.000 · Pagado: $20.000</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-rose-400 text-sm">$22.000,00 adeudado</span>
                      <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black">
                        Cobrar
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <span className="font-extrabold text-purple-600 block">Pestañas Instantáneas</span>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Alterna entre pedidos y ventas sin recargar la página ni perder el foco.
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <span className="font-extrabold text-purple-600 block">Búsqueda en Vivo</span>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Escribe el nombre del cliente, vendedor o código para encontrar comprobantes al segundo.
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <span className="font-extrabold text-purple-600 block">Cobro en 1 Clic</span>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Modal de liquidación rápida que actualiza el comprobante y genera el registro en caja.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 3: EXTRACTO CONTABLE (DEBE / HABER / SALDO) */}
            {activeStep === 3 && (
              <div className="space-y-4 animate-fadeIn">
                {/* Visual Ledger table preview */}
                <div className="bg-slate-950 text-white rounded-2xl p-4 border border-slate-800 space-y-2 font-mono text-xs">
                  <div className="grid grid-cols-4 text-[10px] font-bold text-slate-400 border-b border-slate-800 pb-1.5">
                    <span>Concepto</span>
                    <span className="text-right text-rose-400">Debe (+)</span>
                    <span className="text-right text-emerald-400">Haber (-)</span>
                    <span className="text-right text-indigo-400">Saldo</span>
                  </div>
                  <div className="grid grid-cols-4 py-1 border-b border-slate-900 text-[11px]">
                    <span className="font-sans truncate">🛒 Pedido #1024</span>
                    <span className="text-right text-rose-400">+$15.000</span>
                    <span className="text-right text-slate-500">-</span>
                    <span className="text-right font-black">$15.000</span>
                  </div>
                  <div className="grid grid-cols-4 py-1 border-b border-slate-900 text-[11px]">
                    <span className="font-sans truncate">💰 Cobro Efectivo</span>
                    <span className="text-right text-slate-500">-</span>
                    <span className="text-right text-emerald-400">-$10.000</span>
                    <span className="text-right font-black">$5.000</span>
                  </div>
                  <div className="grid grid-cols-4 py-1 text-[11px]">
                    <span className="font-sans truncate">🏪 Venta Mostrador</span>
                    <span className="text-right text-rose-400">+$8.000</span>
                    <span className="text-right text-slate-500">-</span>
                    <span className="text-right font-black text-amber-400">$13.000</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-xs space-y-1.5">
                  <strong className="text-emerald-800 dark:text-emerald-300 font-extrabold block">
                    Libro Mayor de Partida Doble
                  </strong>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Visualiza exactamente cómo evoluciona la deuda en cada paso. Además, cuenta con botones para anular pagos de forma segura restaurando la deuda automáticamente.
                  </p>
                </div>
              </div>
            )}

            {/* SLIDE 4: DISEÑO 100% RESPONSIVO EN MÓVILES */}
            {activeStep === 4 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-cyan-400 uppercase tracking-wider block">
                      📱 Experiencia de App Nativa en Teléfonos
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                      En pantallas estrechas (320px a 768px), las tablas financieras de 6 columnas se transforman en <strong>tarjetas táctiles autoajustables</strong> con botones anchos y tipografía nítida.
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-3xl shrink-0">
                    <FaMobileAlt />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <strong className="text-slate-900 dark:text-slate-100 font-extrabold block">Cero Desplazamientos Rotos</strong>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Sin tablas cortadas ni botones que se salen del ancho útil de la pantalla.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <strong className="text-slate-900 dark:text-slate-100 font-extrabold block">Operativa Cómoda a Una Mano</strong>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Áreas táctiles generosas para registrar cobros y consultar saldos en movimiento.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action link button at bottom of active step */}
            {currentStep.actionHref && (
              <div className="pt-2 flex justify-end">
                <Link
                  href={currentStep.actionHref}
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02]"
                >
                  <FaCompass className="text-indigo-400 dark:text-indigo-600" />
                  <span>{currentStep.actionLabel || "Ir a la sección"}</span>
                  <FaArrowRight className="text-xs" />
                </Link>
              </div>
            )}

          </div>

        </div>

        {/* ============================================================ */}
        {/* FOOTER BAR CON TOGGLE Y BOTONES DE NAVEGACIÓN */}
        {/* ============================================================ */}
        <div className="px-5 sm:px-7 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          {/* Modern Toggle Switch */}
          <label className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
            />
            <span>No volver a mostrar automáticamente al iniciar</span>
          </label>

          {/* Controls Prev / Next */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {activeStep > 0 && (
              <button
                onClick={() => setActiveStep(activeStep - 1)}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <HiOutlineChevronLeft /> Anterior
              </button>
            )}

            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-95"
              >
                Siguiente Novedad <HiOutlineChevronRight />
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
              >
                <FaCheckCircle /> ¡Entendido / Explorar Sistema!
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
