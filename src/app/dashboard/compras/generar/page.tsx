"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaBox,
  FaCheckCircle,
  FaWhatsapp,
  FaEnvelope,
  FaClock,
} from "react-icons/fa";

export default function GenerateOrderRedirectPage() {
  const router = useRouter();

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-full flex items-center justify-center">
      <div className="max-w-3xl w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-slate-700">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center relative">
              <FaBox className="text-4xl text-white" />
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                BETA
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Sistema de Órdenes de Compra
          </h1>
          <p className="text-center text-orange-600 font-semibold mb-6 flex items-center justify-center gap-2">
            <FaClock /> En Desarrollo Activo
          </p>

          {/* Description */}
          <p className="text-center text-gray-600 dark:text-slate-300 mb-8">
            Estamos construyendo un sistema completo de gestión de órdenes de
            compra con funcionalidades avanzadas
          </p>

          {/* Features */}
          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-50">
                  Gestión Completa de Órdenes
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Crea, edita y gestiona órdenes con estados (Borrador → Enviada
                  → Recibida)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-50">
                  Actualización Automática de Stock
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Al recibir una orden, el inventario se actualiza
                  automáticamente
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-50">
                  Generación de PDFs Profesionales
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Descarga órdenes en formato PDF con diseño profesional
                </p>
              </div>
            </div>

            {/* Upcoming Features */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <p className="text-sm font-bold text-purple-600 mb-3 uppercase">
                Próximamente:
              </p>

              <div className="flex items-start gap-3">
                <FaWhatsapp className="text-green-600 mt-1 flex-shrink-0 text-xl" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-50">
                    Integración con WhatsApp
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    Envía órdenes directamente a tus proveedores por WhatsApp
                    con un solo clic
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 mt-3">
                <FaEnvelope className="text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-50">Envío por Email</p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    Envía órdenes automáticamente por correo electrónico
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 mt-3">
                <FaCheckCircle className="text-purple-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-50">
                    Seguimiento de Entregas
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    Notificaciones y recordatorios de órdenes pendientes
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Message */}
          <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 mb-2">
                🚀 Próximamente
              </p>
              <p className="text-gray-700 dark:text-slate-200 font-medium">
                Estamos trabajando activamente en estas funcionalidades
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-2">
                El sistema estará disponible pronto con todas las
                características mencionadas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
