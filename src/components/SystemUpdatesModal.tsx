"use client";

import { useState, useEffect } from "react";
import {
  HiSparkles,
  HiOutlineChevronRight,
  HiOutlineChevronLeft,
  HiOutlineCheck,
} from "react-icons/hi";
import {
  FaTimes,
  FaDollarSign,
  FaTruck,
  FaBroom,
  FaHistory,
  FaCheckCircle,
  FaArrowRight,
  FaTag,
  FaBoxes,
  FaShieldAlt,
  FaCalculator,
  FaLayerGroup,
  FaListOl,
  FaCheckDouble,
  FaRegLightbulb,
} from "react-icons/fa";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const VERSION_KEY = "system_updates_v2_5_views_count";
const MAX_AUTO_SHOWS = 3;

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
  const [systemLogo, setSystemLogo] = useState<string>("/favicon.png");
  const [systemName, setSystemName] = useState<string>("FrontStock");

  useEffect(() => {
    // Fetch system logo from settings if available
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

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(VERSION_KEY, MAX_AUTO_SHOWS.toString());
      } catch (e) {}
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  const steps = [
    {
      id: "precios",
      title: "Listas de Precios y Selección Individual",
      subtitle: "Nuevas opciones para aumentos masivos o por productos específicos",
      icon: FaDollarSign,
      color: "from-indigo-600 to-blue-600",
      accent: "text-indigo-500",
      bgAccent: "bg-indigo-50 dark:bg-indigo-950/50",
      borderAccent: "border-indigo-200 dark:border-indigo-800",
    },
    {
      id: "proveedores",
      title: "Estructura Proveedores ➔ Marcas",
      subtitle: "Organización por distribuidor y aumentos masivos de catálogo",
      icon: FaTruck,
      color: "from-emerald-600 to-teal-600",
      accent: "text-emerald-500",
      bgAccent: "bg-emerald-50 dark:bg-emerald-950/50",
      borderAccent: "border-emerald-200 dark:border-emerald-800",
    },
    {
      id: "mantenimiento",
      title: "Mantenimiento y Diagnóstico de Seguridad",
      icon: FaBroom,
      subtitle: "Escáner de residuos en Configuración con protección Antierrores",
      color: "from-purple-600 to-pink-600",
      accent: "text-purple-500",
      bgAccent: "bg-purple-50 dark:bg-purple-950/50",
      borderAccent: "border-purple-200 dark:border-purple-800",
    },
    {
      id: "paginacion",
      title: "Memoria Inteligente de Navegación",
      subtitle: "El sistema recuerda exactamente tu página y filtros al volver",
      icon: FaHistory,
      color: "from-blue-600 to-cyan-600",
      accent: "text-blue-500",
      bgAccent: "bg-blue-50 dark:bg-blue-950/50",
      borderAccent: "border-blue-200 dark:border-blue-800",
    },
  ];

  if (!isOpen) return null;

  const currentStepInfo = steps[activeStep];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn">
        
        {/* Header Principal con Logotipo Oficial y Efecto Neón Glassmorphic */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white p-5 sm:p-6 relative overflow-hidden border-b border-slate-800 shrink-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none animate-pulse" />
          
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3.5">
              {/* Logo Oficial de la Empresa / App con Fondo Claro de Alto Contraste */}
              <div className="relative group shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-purple-500 to-indigo-500 rounded-2xl blur-md opacity-85 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-2 bg-white border border-white/60 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-white/30">
                  <img
                    src={systemLogo}
                    alt={systemName}
                    className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-slate-200 tracking-wide">
                    {systemName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-sm flex items-center gap-1">
                    <HiSparkles size={11} /> Versión 2.5
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                  Novedades y Actualizaciones del Sistema
                </h2>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700/50"
              title="Cerrar modal"
            >
              <FaTimes size={16} />
            </button>
          </div>

          {/* Stepper Tabs Bar con Efectos Visuales */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 relative z-10">
            {steps.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-extrabold transition-all duration-300 border ${
                  activeStep === idx
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/40 scale-[1.03]"
                    : "bg-slate-800/50 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <step.icon size={13} className={activeStep === idx ? "text-amber-300 animate-bounce" : ""} />
                <span className="hidden sm:inline">Novedad {idx + 1}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Slide Content Container with Animated Transitions */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Subheader Banner for Current Step */}
          <div className={`p-4 rounded-2xl border ${currentStepInfo.bgAccent} ${currentStepInfo.borderAccent} flex items-center justify-between gap-4 transition-all duration-500`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 bg-gradient-to-r ${currentStepInfo.color} text-white rounded-2xl shadow-md`}>
                <currentStepInfo.icon size={22} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Novedad {activeStep + 1} de {steps.length}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 leading-tight">
                  {currentStepInfo.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentStepInfo.subtitle}
                </p>
              </div>
            </div>

            <span className="hidden md:inline-flex items-center gap-1 px-3 py-1 bg-white/80 dark:bg-slate-900/80 rounded-xl text-xs font-bold border text-slate-600 dark:text-slate-300">
              <FaRegLightbulb className="text-amber-400" /> Guía Informativa
            </span>
          </div>

          {/* SLIDE 1: Listas de Precios y Selección Individual */}
          {activeStep === 0 && (
            <div className="space-y-4 animate-fadeIn">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Ahora el módulo de <strong>Clasificación y Precios</strong> ofrece un control total sobre cómo aumentan tus precios. Puedes aplicar aumentos masivos por porcentaje o monto fijo, o modificar artículos de forma individual sin alterar el resto del inventario.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all group">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">
                    1
                  </div>
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                    Casillas por Producto
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Cada producto incluye una casilla de verificación. Si solo aumentaron algunos artículos, desmarca los demás para mantener su precio original.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all group">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">
                    2
                  </div>
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                    Sobrescritura Manual
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Puedes escribir directamente el nuevo precio final en los campos numéricos de la previsualización antes de guardar.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all group">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">
                    3
                  </div>
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                    Redondeo Inteligente
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Aplica reglas de redondeo superior hacia números enteros, múltiplos de $10, $50 o $100 para evitar decimales o números irregulares.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href="/dashboard/clasificacion"
                  onClick={handleClose}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                >
                  Ir a Clasificación y Precios <FaArrowRight />
                </Link>
              </div>
            </div>
          )}

          {/* SLIDE 2: Proveedores y Marcas */}
          {activeStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Incorporamos la jerarquía completa <strong>Proveedores ➔ Marcas ➔ Productos</strong>. Ahora puedes agrupar tus marcas bajo cada proveedor que te abastece y ajustar precios a nivel de distribuidor.
              </p>

              <div className="space-y-3">
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl space-y-2">
                  <span className="font-extrabold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                    <FaCheckDouble /> ¿Cómo utilizar la nueva estructura?
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="text-emerald-500 shrink-0" />
                      1. En la pestaña <strong>Proveedores</strong>, crea tus proveedores (ej: Distribuidora Central).
                    </li>
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="text-emerald-500 shrink-0" />
                      2. Haz clic en <strong>"Ver / Asignar Marcas"</strong> para vincular las marcas que vende cada proveedor.
                    </li>
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="text-emerald-500 shrink-0" />
                      3. Utiliza el botón <strong>"Cambiar Precios del Proveedor"</strong> para actualizar el catálogo completo de ese distribuidor en un solo paso.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href="/dashboard/clasificacion"
                  onClick={handleClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                >
                  Ver Proveedores y Marcas <FaArrowRight />
                </Link>
              </div>
            </div>
          )}

          {/* SLIDE 3: Limpieza y Seguridad */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Nueva herramienta de <strong>Limpieza y Mantenimiento del Sistema</strong> ubicada dentro de <strong>Configuración</strong> (`/dashboard/configuracion`), diseñada para mantener tu base de datos optimizada y libre de registros obsoletos.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-extrabold text-purple-600 flex items-center gap-1.5">
                    <FaBoxes /> Escáner de Residuos
                  </span>
                  <p className="text-slate-500 leading-relaxed">
                    Diagnostica automáticamente categorías y marcas vacías (con 0 productos), productos inactivos sin ventas, registros cancelados antiguos y contactos en desuso.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-extrabold text-green-600 flex items-center gap-1.5">
                    <FaShieldAlt /> Protección Antierrores (Cascade Check)
                  </span>
                  <p className="text-slate-500 leading-relaxed">
                    Garantía total: el sistema verifica dependencias y **bloquea la eliminación** de cualquier artículo, cliente o movimiento que posea historial comercial o saldo activo.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href="/dashboard/configuracion"
                  onClick={handleClose}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                >
                  Abrir Mantenimiento en Configuración <FaArrowRight />
                </Link>
              </div>
            </div>
          )}

          {/* SLIDE 4: Memoria de Paginación */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Hemos optimizado la navegación en todas las listas del sistema (**Productos**, **Pedidos**, **Clientes**). Ahora la aplicación recuerda automáticamente tu posición sin reiniciar la vista a la página 1.
              </p>

              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-2 text-xs text-blue-950 dark:text-blue-200">
                <strong className="font-bold block text-sm text-blue-700 dark:text-blue-300">
                  ¿Cómo te beneficia este cambio?
                </strong>
                <p className="leading-relaxed">
                  Si estás revisando los artículos en la <strong>Página 38</strong> y editas un producto, al presionar <strong>"Guardar"</strong>, <strong>"Volver"</strong> o usar la flecha <strong>"Atrás"</strong> del navegador, regresarás exactamente a la <strong>Página 38</strong> conservando tus búsquedas y filtros activos.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href="/dashboard/products"
                  onClick={handleClose}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                >
                  Ir a Productos <FaArrowRight />
                </Link>
              </div>
            </div>
          )}

        </div>

        {/* Footer con Controles de Navegación de Carrusel */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            No volver a mostrar automáticamente en el inicio
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {activeStep > 0 && (
              <button
                onClick={() => setActiveStep(activeStep - 1)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <HiOutlineChevronLeft /> Anterior
              </button>
            )}

            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md hover:scale-[1.02]"
              >
                Siguiente Novedad <HiOutlineChevronRight />
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-2 hover:scale-[1.02]"
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
