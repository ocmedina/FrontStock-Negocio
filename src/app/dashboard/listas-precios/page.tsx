"use client";

import React from "react";
import Link from "next/link";
import {
  FaTools,
  FaFilePdf,
  FaCartPlus,
  FaFileInvoiceDollar,
  FaUserCheck,
  FaArrowLeft,
  FaChevronRight,
} from "react-icons/fa";

export default function PriceListsPlaceholderPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header and Back navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors mb-3 group"
          >
            <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            Volver al Panel
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <FaFileInvoiceDollar className="w-6 h-6" />
            </span>
            Listas de Precios
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            En Desarrollo
          </span>
        </div>
      </div>

      {/* Main card with Gradient and Logo */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white rounded-3xl shadow-xl p-8 sm:p-12 mb-10">
        {/* Decorative background grid pattern */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Soft glowing bubbles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Logo Frame */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-5 shadow-inner transform hover:rotate-6 transition-transform duration-350">
            <img
              src="/favicon.png"
              alt="FrontStock Logo"
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          </div>

          {/* Intro Text */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl sm:text-2xl font-black mb-3">
              Módulo: Gestión de Listas de Precios a Medida
            </h2>
            <p className="text-sm sm:text-base text-indigo-100 font-medium leading-relaxed max-w-3xl">
              Estamos construyendo una potente herramienta para que puedas crear,
              personalizar y enviar propuestas de precios específicas para cada uno
              de tus clientes, integrándolas directamente con el inventario y tu
              flujo de ventas.
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        
        {/* Card 1: Custom Prices */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow group">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
            <FaUserCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
            Asociación por Cliente
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Podrás seleccionar a cualquier cliente registrado para armarle su
            lista de precios personalizada. El sistema recordará qué valores
            negociaste con cada persona o comercio.
          </p>
        </div>

        {/* Card 2: Safe Pricing */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow group">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-450 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
            <FaFileInvoiceDollar className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
            Valores Independientes de Inventario
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Modificá los precios de los productos en la propuesta de forma
            individual. Los precios base del inventario general no sufrirán ningún
            cambio, manteniéndose seguros.
          </p>
        </div>

        {/* Card 3: PDF Generation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow group">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
            <FaFilePdf className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
            Generación y Envío de PDF
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Exportá la propuesta en un formato PDF limpio, estético y profesional.
            Ideal para imprimir o compartir por WhatsApp y correo electrónico con el
            nombre de tu cliente y los valores acordados.
          </p>
        </div>

        {/* Card 4: Convert to Sale */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow group">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
            <FaCartPlus className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
            Conversión Directa a Venta
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Una vez que tu cliente acepte la propuesta, podrás hacer clic en un
            botón para iniciar una venta con el cliente seleccionado y todos los
            productos precargados al precio especial pactado.
          </p>
        </div>

      </div>

      {/* Info Section / Status Check */}
      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 flex items-start gap-4">
        <div className="p-2 rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-400 flex-shrink-0">
          <FaTools className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-850 dark:text-slate-150 mb-1">
            Estado del Desarrollo
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Hemos finalizado la planificación y diseño estructural de las tablas de datos.
            Actualmente estamos integrando las vistas del panel de control de listas y la
            precarga del carrito de ventas. Muy pronto esta sección estará completamente activa
            en tu panel comercial de FrontStock.
          </p>
        </div>
      </div>
    </div>
  );
}
