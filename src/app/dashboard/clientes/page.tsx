"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import CustomerActions from "@/components/CustomerActions";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import ExportAllCustomersMovementsButton from "@/components/exports/ExportAllCustomersMovementsButton";
import ExportAllOrdersWithCustomerButton from "@/components/exports/ExportAllOrdersWithCustomerButton";
import {
  FaUsers,
  FaPlus,
  FaFilter,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaUserTag,
  FaDollarSign,
  FaInbox,
  FaExclamationTriangle,
  FaSearch,
  FaFileExcel,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

type CustomerRow = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  customer_type: string;
  debt?: number | null;
};

const ITEMS_PER_PAGE = 12;

function CustomersPageContent() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [debtFilter, setDebtFilter] = useState(
    filterParam === "with_debt" ? "with_debt" : "all"
  );
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [areActionsOpen, setAreActionsOpen] = useState(false);

  // Helper Currency Formatter
  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Fetch User Role
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

  // Fetch Customers and calculate debts in memory to avoid N+1
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const { data: customersData, error: customersError } = await supabase
          .from("customers")
          .select("id, full_name, email, phone, address, customer_type")
          .eq("is_active", true)
          .order("full_name", { ascending: true });

        if (customersError) throw customersError;

        const [ordersDebtRes, salesDebtRes] = await Promise.all([
          supabase
            .from("orders")
            .select("customer_id, amount_pending")
            .gt("amount_pending", 0)
            .neq("status", "cancelado"),
          supabase
            .from("sales")
            .select("customer_id, amount_pending")
            .eq("payment_method", "cuenta_corriente")
            .eq("is_cancelled", false)
            .gt("amount_pending", 0),
        ]);

        if (ordersDebtRes.error) throw ordersDebtRes.error;
        if (salesDebtRes.error) throw salesDebtRes.error;

        const debtByCustomer = new Map<string, number>();
        const addDebt = (customerId: string | null, amountPending: number | null) => {
          if (!customerId) return;
          const current = debtByCustomer.get(customerId) || 0;
          debtByCustomer.set(customerId, current + Number(amountPending || 0));
        };

        (ordersDebtRes.data || []).forEach((row) => {
          addDebt(row.customer_id, row.amount_pending as number | null);
        });
        (salesDebtRes.data || []).forEach((row) => {
          addDebt(row.customer_id, row.amount_pending as number | null);
        });

        const customersWithDebt = (customersData || []).map((customer) => ({
          ...customer,
          debt: debtByCustomer.get(customer.id) || 0,
        }));

        let filtered = customersWithDebt;
        if (debtFilter === "with_debt") {
          filtered = customersWithDebt.filter((c) => (c.debt || 0) > 0);
        } else if (debtFilter === "no_debt") {
          filtered = customersWithDebt.filter((c) => (c.debt || 0) === 0);
        }

        setCustomers(filtered);
      } catch (error) {
        console.error("Error fetching customers:", error);
        toast.error("Error al cargar la lista de clientes.");
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [debtFilter]);

  // Search Filter
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const search = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.phone?.toLowerCase().includes(search)
    );
  }, [customers, searchTerm]);

  // Reset page on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, debtFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE));

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, filteredCustomers]);

  // Export to Excel handler
  const handleExportCustomersExcel = async () => {
    if (filteredCustomers.length === 0) {
      toast.error("No hay clientes para exportar");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const rows = filteredCustomers.map((c) => {
        const typeLabel =
          (c.customer_type || "").trim().toLowerCase() === "mayorista"
            ? "Mayorista"
            : "Minorista";
        return {
          Nombre: c.full_name || "",
          Telefono: c.phone || "",
          Direccion: c.address || "",
          Email: c.email || "",
          TipoCliente: typeLabel,
          DeudaPendiente: Number((c.debt || 0).toFixed(2)),
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: ["Nombre", "Telefono", "Direccion", "Email", "TipoCliente", "DeudaPendiente"],
      });
      
      worksheet["!cols"] = [
        { wch: 30 },
        { wch: 18 },
        { wch: 30 },
        { wch: 28 },
        { wch: 14 },
        { wch: 16 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

      const exportDate = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `clientes_${exportDate}.xlsx`);
      toast.success("Excel descargado correctamente");
    } catch (e) {
      console.error(e);
      toast.error("Error al generar el archivo Excel");
    }
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-full text-slate-800 dark:text-slate-100">
      <div className="max-w-[1550px] mx-auto space-y-6">
        
        {/* HEADER DE LA SECCIÓN */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-905 dark:text-slate-50 flex items-center gap-2">
              <FaUsers className="text-indigo-500 text-lg" /> Gestión de Clientes
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Administra las cuentas corrientes, los datos de contacto y el tipo de facturación de tus clientes.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full lg:w-auto">
            {/* Acciones Móviles Toggle */}
            <button
              onClick={() => setAreActionsOpen((prev) => !prev)}
              className="lg:hidden w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <span>Acciones Rápidas</span>
              {areActionsOpen ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
            </button>

            {/* Fila de Acciones */}
            <div
              className={`${
                areActionsOpen ? "flex flex-col gap-2" : "hidden"
              } lg:flex lg:flex-row lg:flex-wrap lg:items-center lg:gap-2.5`}
            >
              <ExportAllCustomersMovementsButton />
              <ExportAllOrdersWithCustomerButton />
              
              <button
                onClick={handleExportCustomersExcel}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <FaFileExcel className="text-emerald-600" /> Exportar Excel
              </button>

              <Link
                href="/dashboard/clientes/deudores"
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:bg-rose-50/40 dark:hover:bg-rose-950/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <FaExclamationTriangle className="text-rose-500" /> Ver Deudores
              </Link>

              <Link
                href="/dashboard/clientes/new"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
              >
                <FaPlus /> Nuevo Cliente
              </Link>
            </div>
          </div>
        </div>

        {/* BÚSQUEDA Y FILTROS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Input de Búsqueda */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-24 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-xs outline-none"
              />
              {searchTerm && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">
                    {filteredCustomers.length} hallados
                  </span>
                </div>
              )}
            </div>

            {/* Select Filtro de Deuda */}
            <div className="flex items-center gap-2">
              <FaFilter className="text-slate-400 text-xs" />
              <select
                id="debtFilter"
                value={debtFilter}
                onChange={(e) => setDebtFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-semibold min-w-[160px]"
              >
                <option value="all">Ver Todos</option>
                <option value="with_debt">Con Cta. Cte. Activa</option>
                <option value="no_debt">Sin saldo pendiente</option>
              </select>
              {debtFilter === "with_debt" && (
                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/10 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-lg text-2xs font-extrabold flex items-center gap-1">
                  <FaExclamationTriangle /> Filtrado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* LISTADO DE CLIENTES (DESKTOP) */}
        <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-850">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><FaUser /> Nombre</span>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-40">
                    <span className="flex items-center gap-1.5"><FaPhone /> Teléfono</span>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-64">
                    <span className="flex items-center gap-1.5"><FaEnvelope /> Email</span>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">
                    <span className="flex items-center gap-1.5"><FaUserTag /> Tipo de Cliente</span>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-44">
                    <span className="flex items-center justify-end gap-1.5"><FaDollarSign /> Deuda Acumulada</span>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-slate-500 font-semibold">Cargando clientes...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FaInbox className="text-4xl opacity-35" />
                        <span className="font-bold">No se encontraron clientes</span>
                        <span className="text-2xs text-slate-400">Prueba con otro filtro o término de búsqueda.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer) => {
                    const hasDebt = customer.debt && customer.debt > 0;
                    return (
                      <tr
                        key={customer.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors"
                      >
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <Link
                            href={`/dashboard/clientes/${customer.id}`}
                            className="font-bold text-indigo-600 hover:text-indigo-850 dark:text-indigo-400 hover:underline flex items-center gap-2.5"
                          >
                            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center font-black text-xs border border-indigo-100/50 dark:border-indigo-900/30">
                              {customer.full_name?.charAt(0).toUpperCase()}
                            </div>
                            {customer.full_name}
                          </Link>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-slate-650 dark:text-slate-350 font-medium">
                          {customer.phone || "—"}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-slate-650 dark:text-slate-350">
                          {customer.email || "—"}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-3xs font-extrabold border ${
                              customer.customer_type === "mayorista"
                                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/10 dark:text-purple-400 dark:border-purple-900/50"
                                : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/10 dark:text-blue-400 dark:border-blue-900/50"
                            }`}
                          >
                            <FaUserTag />
                            {customer.customer_type === "mayorista" ? "Mayorista" : "Minorista"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right font-bold">
                          {hasDebt ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/15 dark:text-rose-450 dark:border-rose-900/50">
                              <FaExclamationTriangle className="text-3xs" />
                              {formatCurrency(customer.debt!)}
                            </span>
                          ) : (
                            <span className="text-slate-450 dark:text-slate-500 font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-center">
                          <CustomerActions customerId={customer.id} userRole={userRole} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* LISTADO TARJETAS (MOBILE) */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="text-center py-10 text-slate-500">Cargando clientes...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-slate-500 text-xs">
              No se encontraron clientes.
            </div>
          ) : (
            paginatedCustomers.map((customer) => {
              const hasDebt = customer.debt && customer.debt > 0;
              return (
                <div
                  key={customer.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 border border-slate-100 dark:border-slate-800 space-y-3"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <Link
                        href={`/dashboard/clientes/${customer.id}`}
                        className="font-bold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 hover:underline flex items-center gap-2 text-xs"
                      >
                        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center font-black text-xs">
                          {customer.full_name?.charAt(0).toUpperCase()}
                        </div>
                        {customer.full_name}
                      </Link>
                      <div className="mt-2.5 space-y-1 text-3xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <FaPhone className="text-slate-400 w-2.5 h-2.5" />
                          <span>{customer.phone || "—"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FaEnvelope className="text-slate-400 w-2.5 h-2.5" />
                          <span>{customer.email || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <CustomerActions customerId={customer.id} userRole={userRole} />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-3xs font-extrabold border ${
                        customer.customer_type === "mayorista"
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/10 dark:text-purple-400 dark:border-purple-900/50"
                          : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/10 dark:text-blue-400 dark:border-blue-900/50"
                      }`}
                    >
                      <FaUserTag />
                      {customer.customer_type === "mayorista" ? "Mayorista" : "Minorista"}
                    </span>

                    {hasDebt ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/15 dark:text-rose-450 dark:border-rose-900/50">
                        <FaExclamationTriangle className="text-3xs" /> {formatCurrency(customer.debt!)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-450 font-semibold">Sin saldo</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PAGINACIÓN */}
        {filteredCustomers.length > 0 && (
          <div className="mb-24 lg:mb-0 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-350">
              Mostrando <span className="font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a{" "}
              <span className="font-bold">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)}
              </span>{" "}
              de <span className="font-bold">{filteredCustomers.length}</span> clientes
            </span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border"
              >
                Anterior
              </button>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Pág. <span className="font-bold text-slate-850 dark:text-white">{currentPage}</span> de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-full bg-slate-50 dark:bg-slate-950">
          <div className="text-slate-505 font-bold">Cargando interfaz...</div>
        </div>
      }
    >
      <CustomersPageContent />
    </Suspense>
  );
}
