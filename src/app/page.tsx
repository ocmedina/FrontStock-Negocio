"use client";

import React from "react";
import Link from "next/link";
import { Package, BarChart3, FileText, Settings, ArrowRight } from "lucide-react";
import MaintenanceBanner from "@/components/MaintenanceBanner";

export default function FrontStockWelcome() {
  const features = [
    {
      title: "Control de Inventario",
      description: "Monitorea tu stock en tiempo real con alertas automáticas y niveles críticos.",
      icon: Package,
      gradient: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/10",
    },
    {
      title: "Reportes y Análisis",
      description: "Visualiza tendencias de ventas, ingresos y comportamiento financiero en gráficos interactivos.",
      icon: BarChart3,
      gradient: "from-purple-500 to-indigo-600",
      shadow: "shadow-purple-500/10",
    },
    {
      title: "Gestión de Movimientos",
      description: "Registra entradas, salidas, transferencias y cierres de caja automatizados.",
      icon: FileText,
      gradient: "from-rose-500 to-orange-500",
      shadow: "shadow-rose-500/10",
    },
    {
      title: "Configuración Flexible",
      description: "Personaliza el sistema, controla roles de usuario y parametriza tu negocio a medida.",
      icon: Settings,
      gradient: "from-slate-700 to-slate-800",
      shadow: "shadow-slate-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col justify-between p-6">
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-indigo-600/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[450px] h-[450px] bg-blue-500/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Maintenance Banner */}
      <div className="w-full max-w-5xl mx-auto z-20">
        <MaintenanceBanner />
      </div>

      {/* Main Container */}
      <div className="max-w-5xl w-full mx-auto my-auto py-12 relative z-10">
        
        {/* Logo and Brand Header */}
        <div className="text-center mb-16 animate-fadeIn">
          <div className="inline-flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-3xl shadow-xl mb-6 relative">
            <img
              src="/favicon.png"
              alt="FrontStock Logo"
              className="w-16 h-16 object-contain rounded-2xl"
            />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-4">
            Bienvenido a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-600">
              FrontStock
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto font-medium">
            Tu sistema inteligente de control de inventario, finanzas y administración de negocio.
          </p>
        </div>

        {/* Features list */}
        <div className="grid md:grid-cols-2 gap-6 mb-14">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-slate-900/30 backdrop-blur-lg rounded-3xl p-6 border border-slate-800/70 hover:border-slate-700 hover:bg-slate-900/50 hover:-translate-y-1 transition-all duration-300 group flex items-start gap-5 shadow-2xs"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 shadow-md ${feature.shadow} group-hover:scale-105 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300">
                    {feature.title}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Primary action */}
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-650 text-white text-base font-black uppercase tracking-wider rounded-2xl hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/10 hover:shadow-xl transition-all duration-300"
          >
            Iniciar Sesión
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-slate-500 text-xs font-semibold relative z-10">
        <p>© {new Date().getFullYear()} FrontStock — Control operativo inteligente de inventarios.</p>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}