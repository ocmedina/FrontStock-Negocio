"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/numberFormat";
import toast from "react-hot-toast";
import SupplierActions from "@/components/SupplierActions";
import {
  FaPlus,
  FaTruck,
  FaSearch,
  FaFilter,
  FaUser,
  FaPhone,
  FaDollarSign,
  FaInbox,
  FaExclamationTriangle,
  FaShoppingCart,
  FaBuilding,
  FaUserTie,
} from "react-icons/fa";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debtFilter, setDebtFilter] = useState("all");
  const [userRole, setUserRole] = useState<string | null>(null);
  const pathname = usePathname();
  const loadingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT_FORZADO")), 2000);
      });

      const result = await Promise.race([query, timeoutPromise]) as any;
      const data = result?.data;
      const error = result?.error;

      if (error) {
        console.error("Error fetching suppliers:", error);
        return;
      }

      setSuppliers(data || []);
    } catch (error: any) {
      if (error.message === "TIMEOUT_FORZADO") {
        window.location.reload();
        return;
      }
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Obtener el rol del usuario una sola vez
  useEffect(() => {
    const fetchUserRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (profile) {
          setUserRole(profile.role);
        }
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    fetchSuppliers();

    // Recargar cuando la página se vuelve visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchSuppliers();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Limpiar el event listener cuando el componente se desmonte
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname]);

  // Filtrar proveedores por búsqueda y deuda
  const filteredSuppliers = useMemo(() => {
    let filtered = suppliers;

    // Filtrar por deuda
    if (debtFilter === "with_debt") {
      filtered = filtered.filter((s) => (s.debt || 0) > 0);
    } else if (debtFilter === "no_debt") {
      filtered = filtered.filter((s) => (s.debt || 0) === 0);
    } else if (debtFilter === "with_credit") {
      filtered = filtered.filter((s) => (s.debt || 0) < 0);
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (supplier) =>
          supplier.name?.toLowerCase().includes(search) ||
          supplier.contact_person?.toLowerCase().includes(search) ||
          supplier.phone?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [suppliers, searchTerm, debtFilter]);

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
            <FaTruck className="text-orange-600" /> Gestión de Proveedores
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mt-1">
            Administra tus proveedores y compras
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/compras/nueva"
            className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2 text-sm"
          >
            <FaShoppingCart /> Registrar Compra
          </Link>
          <Link
            href="/dashboard/compras/generar"
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2 text-sm"
          >
            <FaShoppingCart /> Generar Orden
          </Link>
          <Link
            href="/dashboard/proveedores/nuevo"
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2 text-sm"
          >
            <FaPlus /> Agregar Proveedor
          </Link>
        </div>
      </div>

      {/* BÚSQUEDA Y FILTROS */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg mb-6 p-4 border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Barra de búsqueda */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, contacto o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50"
            />
            {searchTerm && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                  {filteredSuppliers.length}
                </span>
              </div>
            )}
          </div>

          {/* Filtro de deuda */}
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400 text-sm" />
            <select
              value={debtFilter}
              onChange={(e) => setDebtFilter(e.target.value)}
              aria-label="Filtrar por estado de deuda"
              className="px-3 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-sm min-w-[180px] bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50"
            >
              <option value="all">Todos</option>
              <option value="with_debt">Con deudas</option>
              <option value="no_debt">Sin deudas</option>
              <option value="with_credit">Créditos a favor</option>
            </select>
            {(debtFilter === "with_debt" || debtFilter === "with_credit") && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${debtFilter === "with_debt"
                  ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 border-red-200 dark:border-red-900"
                  : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 border-green-200 dark:border-green-900"
                  }`}
              >
                <FaExclamationTriangle className="text-xs" />
                <span className="text-xs font-semibold whitespace-nowrap">
                  Filtrado activo
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLA DE PROVEEDORES */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaBuilding /> Nombre
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaUserTie /> Contacto
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaPhone /> Teléfono
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaDollarSign /> Deuda Actual
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                      <span className="text-gray-500 dark:text-slate-400 font-medium">
                        Cargando proveedores...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <FaInbox className="text-6xl text-gray-300" />
                      <span className="text-gray-500 dark:text-slate-400 font-medium">
                        {searchTerm
                          ? "No se encontraron proveedores con ese criterio"
                          : "No hay proveedores registrados"}
                      </span>
                      {searchTerm && (
                        <span className="text-gray-400 text-sm">
                          Intenta con otro término de búsqueda
                        </span>
                      )}
                      {!searchTerm && suppliers.length === 0 && (
                        <Link
                          href="/dashboard/proveedores/nuevo"
                          className="mt-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center gap-2"
                        >
                          <FaPlus /> Agregar primer proveedor
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const debt = supplier.debt || 0;
                  return (
                    <tr
                      key={supplier.id}
                      className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${debt > 0
                        ? "bg-red-50/30 dark:bg-red-950/20 border-l-4 border-red-400"
                        : debt < 0
                          ? "bg-green-50/30 dark:bg-green-950/20 border-l-4 border-green-400"
                          : ""
                        }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/dashboard/proveedores/${supplier.id}`}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                            {supplier.name?.charAt(0).toUpperCase()}
                          </div>
                          {supplier.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <FaUser className="text-gray-400" />
                          {supplier.contact_person || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <FaPhone className="text-gray-400" />
                          {supplier.phone || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {debt > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-2 border-red-400">
                              <FaExclamationTriangle />
                              Deuda: {formatCurrency(debt)}
                            </span>
                          </div>
                        ) : debt < 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-2 border-green-400">
                              <FaDollarSign />A favor: {formatCurrency(Math.abs(debt))}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-600 dark:text-slate-300">
                            <FaDollarSign />
                            {formatCurrency(0)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <SupplierActions
                          supplierId={supplier.id}
                          onUpdate={fetchSuppliers}
                          userRole={userRole}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
