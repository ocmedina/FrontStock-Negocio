"use client";

import { useState, useEffect, useMemo } from "react";
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
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debtFilter, setDebtFilter] = useState("all");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [areActionsOpen, setAreActionsOpen] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      toast.error("Error al cargar los proveedores.");
    } else {
      setSuppliers(data || []);
    }
    setLoading(false);
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
  }, []);

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
    <div className="p-4 md:p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER AREA */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
              <FaTruck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Gestión de Proveedores
              </h1>
              <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Administración operativa, compras y estados de cuentas corrientes
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 w-full lg:w-auto relative z-10">
            <button
              onClick={() => setAreActionsOpen((prev) => !prev)}
              className="lg:hidden w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs flex items-center justify-between text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition-all"
            >
              <span>Acciones Rápidas</span>
              {areActionsOpen ? <FaChevronUp className="w-3.5 h-3.5" /> : <FaChevronDown className="w-3.5 h-3.5" />}
            </button>
            <div
              className={`${areActionsOpen ? "grid" : "hidden"} lg:grid grid-cols-1 sm:grid-cols-3 gap-4`}
            >
              {/* Registrar Compra */}
              <Link
                href="/dashboard/compras/nueva"
                className="group relative overflow-hidden rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 transition-transform group-hover:scale-125 duration-500" />
                <div className="relative flex items-center gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <FaShoppingCart className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Registrar Compra
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Ingreso de stock y facturación
                    </p>
                  </div>
                </div>
              </Link>
              
              {/* Generar Orden */}
              <Link
                href="/dashboard/proveedores/ordenes"
                className="group relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 transition-transform group-hover:scale-125 duration-500" />
                <div className="relative flex items-center gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    <FaPlus className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                      Generar Orden
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Crear orden de compra en PDF
                    </p>
                  </div>
                </div>
              </Link>

              {/* Nuevo Proveedor */}
              <Link
                href="/dashboard/proveedores/nuevo"
                className="group relative overflow-hidden rounded-2xl border border-orange-100 dark:border-orange-900/40 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-orange-500/5 dark:bg-orange-500/10 transition-transform group-hover:scale-125 duration-500" />
                <div className="relative flex items-center gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    <FaPlus className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                      Nuevo Proveedor
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Alta rápida en base de datos
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* SEARCH AND FILTERS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search */}
            <div className="flex-1 w-full relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, contacto o teléfono del proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-24 py-3 border-2 border-slate-200 dark:border-slate-700/80 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all text-sm font-semibold placeholder-slate-400"
              />
              {searchTerm && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
                    {filteredSuppliers.length} encontrados
                  </span>
                </div>
              )}
            </div>

            {/* Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-850 rounded-2xl px-3 py-2 bg-slate-50 dark:bg-slate-950">
                <FaFilter className="text-slate-400 w-3.5 h-3.5" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Filtro:</span>
              </div>
              <select
                value={debtFilter}
                onChange={(e) => setDebtFilter(e.target.value)}
                aria-label="Filtrar por estado de deuda"
                className="w-full lg:min-w-[200px] px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all text-sm font-bold"
              >
                <option value="all">Ver Todos</option>
                <option value="with_debt">Con Deudas</option>
                <option value="no_debt">Sin Deudas</option>
                <option value="with_credit">Créditos a Favor</option>
              </select>
              {(debtFilter === "with_debt" || debtFilter === "with_credit") && (
                <div
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-bold whitespace-nowrap ${
                    debtFilter === "with_debt"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  }`}
                >
                  <FaExclamationTriangle className="w-3.5 h-3.5" />
                  <span>Filtrado Activo</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SUPPLIERS TABLE (DESKTOP) */}
        <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-xs overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
            <thead className="bg-slate-50/60 dark:bg-slate-900/60">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Estado de Cuenta
                </th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[200px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-500 border-t-transparent"></div>
                      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        Cargando proveedores...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                      <FaInbox className="text-5xl text-slate-300 dark:text-slate-600 animate-bounce" />
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300 mt-2">
                        {searchTerm
                          ? "No se encontraron proveedores"
                          : "No hay proveedores registrados"}
                      </span>
                      <p className="text-xs text-slate-450 dark:text-slate-400 text-center">
                        {searchTerm
                          ? "Prueba modificando los filtros de búsqueda o el tipo de cuenta corriente."
                          : "Comienza dando de alta un nuevo proveedor para poder registrar compras."}
                      </p>
                      {!searchTerm && suppliers.length === 0 && (
                        <Link
                          href="/dashboard/proveedores/nuevo"
                          className="mt-3 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md text-xs font-black uppercase tracking-wider"
                        >
                          Agregar Proveedor
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
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/dashboard/proveedores/${supplier.id}`}
                          className="flex items-center gap-3.5 group"
                        >
                          <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-150 dark:border-slate-750 flex items-center justify-center text-slate-700 dark:text-slate-250 font-black text-base shadow-2xs group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500 transition-all duration-300 shrink-0">
                            {supplier.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {supplier.name}
                            </span>
                            <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 tracking-wider">
                              {supplier.cuit ? `CUIT: ${supplier.cuit}` : "Sin CUIT registrado"}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {supplier.contact_person || (
                          <span className="text-slate-405 dark:text-slate-500 italic font-medium">Sin contacto</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-400 font-mono">
                        {supplier.phone || (
                          <span className="text-slate-405 dark:text-slate-500 italic font-sans">Sin teléfono</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {debt > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse"></span>
                            Debe: {formatCurrency(debt)}
                          </span>
                        ) : debt < 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                            A favor: {formatCurrency(Math.abs(debt))}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-450 border border-slate-200/50 dark:border-slate-800/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-600"></span>
                            Al día: {formatCurrency(0)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end">
                          <SupplierActions
                            supplierId={supplier.id}
                            onUpdate={fetchSuppliers}
                            userRole={userRole}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS VIEW */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-10 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto"></div>
              <span className="text-xs font-bold text-slate-500 mt-2 block">
                Cargando proveedores...
              </span>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-10 text-center space-y-3">
              <FaInbox className="text-4xl text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-500">No se encontraron resultados.</p>
            </div>
          ) : (
            filteredSuppliers.map((supplier) => {
              const debt = supplier.debt || 0;
              return (
                <div
                  key={supplier.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800/80 p-5 shadow-2xs space-y-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <Link
                      href={`/dashboard/proveedores/${supplier.id}`}
                      className="flex items-center gap-3 flex-1 group"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-slate-55 dark:bg-slate-800/85 border border-slate-150 dark:border-slate-750 flex items-center justify-center text-slate-705 dark:text-slate-250 font-black text-sm shrink-0">
                        {supplier.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-650 transition-colors">
                          {supplier.name}
                        </h4>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block mt-0.5">
                          {supplier.cuit ? `CUIT: ${supplier.cuit}` : "Sin CUIT registrado"}
                        </span>
                      </div>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 bg-slate-50/50 dark:bg-slate-955/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Contacto</span>
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 truncate block mt-0.5">
                        {supplier.contact_person || (
                          <span className="text-slate-400 dark:text-slate-500 font-medium italic">Sin contacto</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Teléfono</span>
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-350 truncate block mt-0.5 font-mono">
                        {supplier.phone || (
                          <span className="text-slate-400 dark:text-slate-550 font-medium italic font-sans">Sin teléfono</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-850">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Actual</span>
                      <div className="mt-1">
                        {debt > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <span className="w-1 h-1 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse"></span>
                            Debe: {formatCurrency(debt)}
                          </span>
                        ) : debt < 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                            A favor: {formatCurrency(Math.abs(debt))}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/80">
                            <span className="w-1 h-1 rounded-full bg-slate-350 dark:bg-slate-600"></span>
                            Al día: {formatCurrency(0)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 scale-95 origin-right">
                      <SupplierActions
                        supplierId={supplier.id}
                        onUpdate={fetchSuppliers}
                        userRole={userRole}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
