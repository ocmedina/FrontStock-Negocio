"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  FaPlus,
  FaTimes,
  FaSave,
  FaTruck,
  FaBuilding,
  FaUser,
  FaIdCard,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
} from "react-icons/fa";

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const supplierData = {
      name: formData.get("name") as string,
      contact_person: formData.get("contact_person") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      address: formData.get("address") as string,
      cuit: formData.get("cuit") as string,
    };

    // Validación
    if (!supplierData.name?.trim()) {
      toast.error("El nombre del proveedor es obligatorio");
      return;
    }

    const loadingToast = toast.loading("Creando proveedor...");
    setLoading(true);

    const { error } = await supabase.from("suppliers").insert([supplierData]);

    if (error) {
      toast.error(`Error: ${error.message}`, { id: loadingToast });
    } else {
      toast.success("Proveedor creado exitosamente", { id: loadingToast });
      router.push("/dashboard/proveedores");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-full">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
          <FaPlus className="text-orange-600" /> Agregar Nuevo Proveedor
        </h1>
        <p className="text-gray-600 dark:text-slate-300 mt-1">
          Completa la información del proveedor
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <FaTruck className="text-orange-600" /> Información Básica
          </h2>
          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label
                htmlFor="name"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2"
              >
                <FaBuilding className="text-orange-600" /> Nombre / Razón Social
                *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Ej: Distribuidora San Juan S.A."
                className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Este campo es obligatorio
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Persona de Contacto */}
              <div>
                <label
                  htmlFor="contact_person"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2"
                >
                  <FaUser className="text-blue-600" /> Persona de Contacto
                </label>
                <input
                  id="contact_person"
                  name="contact_person"
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              {/* CUIT */}
              <div>
                <label
                  htmlFor="cuit"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2"
                >
                  <FaIdCard className="text-purple-600" /> CUIT / CUIL
                </label>
                <input
                  id="cuit"
                  name="cuit"
                  type="text"
                  placeholder="Ej: 20-12345678-9"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: INFORMACIÓN DE CONTACTO */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <FaPhone className="text-green-600" /> Información de Contacto
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Teléfono */}
              <div>
                <label
                  htmlFor="phone"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2"
                >
                  <FaPhone className="text-green-600" /> Teléfono
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Ej: +54 9 264 123-4567"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2"
                >
                  <FaEnvelope className="text-blue-600" /> Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Ej: contacto@proveedor.com"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label
                htmlFor="address"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2"
              >
                <FaMapMarkerAlt className="text-red-600" /> Dirección
              </label>
              <input
                id="address"
                name="address"
                type="text"
                placeholder="Ej: Av. Libertador 1234, San Juan Capital"
                className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-100 rounded-lg hover:bg-gray-300 transition-all font-semibold flex items-center gap-2"
          >
            <FaTimes /> Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all font-semibold flex items-center gap-2 shadow-lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                <FaSave /> Guardar Proveedor
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
