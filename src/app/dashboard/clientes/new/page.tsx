// src/app/dashboard/clientes/new/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaTruck,
  FaUserTag,
  FaArrowLeft,
  FaCheckCircle,
} from "react-icons/fa";

export default function NewCustomerPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [customerType, setCustomerType] = useState("minorista");
  const [deliveryDay, setDeliveryDay] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) {
      toast.error("El nombre es obligatorio.");
      return;
    }

    setIsSubmitting(true);
    const loadToast = toast.loading("Guardando cliente...");

    try {
      const { error } = await supabase.from("customers").insert([
        {
          full_name: fullName,
          phone: phone || null,
          email: email || null,
          address: address || null,
          reference: reference || null,
          customer_type: customerType,
          delivery_day: deliveryDay || null,
        },
      ]);

      if (error) throw error;

      toast.success("¡Cliente creado exitosamente!", { id: loadToast });
      router.push("/dashboard/clientes");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(`Error al crear el cliente: ${error.message || "Error desconocido"}`, { id: loadToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysOfWeek = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* BOTÓN VOLVER */}
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-750 dark:text-indigo-400 mb-2 transition-colors"
          >
            <FaArrowLeft /> Volver al Listado
          </button>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          
          {/* CABECERA */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <h1 className="text-sm font-bold text-gray-900 dark:text-slate-50 flex items-center gap-2">
              <FaUser className="text-indigo-500" /> Registrar Nuevo Cliente
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Completa los datos del cliente para habilitar su facturación y cuenta corriente.
            </p>
          </div>

          {/* FORMULARIO */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* SECCIÓN: Información Básica */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <FaUserTag /> Información de Cuenta
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="fullName"
                    className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Nombre Completo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Ej. Juan Pérez"
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-350 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 text-xs focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="customerType"
                    className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Lista de Precios / Categoría <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="customerType"
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    required
                    className="block w-full px-3 py-2.5 border border-slate-350 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 text-xs font-semibold focus:outline-none transition-all"
                  >
                    <option value="minorista">🛒 Minorista</option>
                    <option value="mayorista">📦 Mayorista</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN: Información de Contacto */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <FaPhone /> Datos de Contacto
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="phone"
                    className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Teléfono Celular / Fijo
                  </label>
                  <div className="relative">
                    <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej. +54 11 1234-5678"
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-350 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 text-xs focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="cliente@dominio.com"
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-350 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 text-xs focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN: Ubicación y Distribución */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold text-amber-605 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <FaMapMarkerAlt /> Logística de Distribución
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="address"
                    className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Dirección Física / Local
                  </label>
                  <div className="relative">
                    <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                    <input
                      type="text"
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ej. Av. Corrientes 1234, CABA"
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-350 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 text-xs focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="reference"
                    className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Referencia / Observaciones de Envío
                  </label>
                  <div className="relative">
                    <FaInfoCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                    <input
                      type="text"
                      id="reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Ej. Timbre B, portón negro"
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-350 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 text-xs focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="deliveryDay"
                    className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Día Asignado de Reparto
                  </label>
                  <div className="relative">
                    <FaTruck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                    <select
                      id="deliveryDay"
                      value={deliveryDay}
                      onChange={(e) => setDeliveryDay(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-350 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 text-xs font-semibold focus:outline-none transition-all"
                    >
                      <option value="">Ninguno</option>
                      {daysOfWeek.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTONES DE ENVÍO */}
            <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 sm:flex-none sm:px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none sm:px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <FaCheckCircle /> Guardar Cliente
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
