"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import CustomerActions from "@/components/CustomerActions";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/numberFormat";
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
} from "react-icons/fa";

// 🔹 Tipos manuales para TypeScript
type CustomerRow = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  customer_type: string;
  debt?: number | null;
};

function CustomersPageContent() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const pathname = usePathname();

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [debtFilter, setDebtFilter] = useState(
    filterParam === "with_debt" ? "with_debt" : "all"
  );
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const loadingTimeoutRef = useRef<number | null>(null);

  const ITEMS_PER_PAGE = 50;

  // Debounce de búsqueda (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset a página 1 al buscar
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

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
    const fetchCustomers = async () => {
      setLoading(true);

      try {
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let query = supabase
          .from("customers")
          .select("id, full_name, email, phone, address, customer_type", { count: "exact" })
          .eq("is_active", true)
          .order("full_name", { ascending: true })
          .range(from, to);

        if (debouncedSearch.trim()) {
          query = query.or(
            `full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`
          );
        }

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("TIMEOUT_FORZADO")), 2000);
        });

        const result = await Promise.race([query, timeoutPromise]) as any;
        const customersData = result?.data;
        const customersError = result?.error;
        const count = result?.count;

        if (customersError) throw customersError;
        setTotalCount(count || 0);

        const customerIds = (customersData || [])
          .map((customer: any) => customer.id)
          .filter(Boolean);

        if (customerIds.length === 0) {
          setCustomers([]);
          setLoading(false);
          return;
        }

        const timeoutPromise2 = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("TIMEOUT_FORZADO")), 2000);
        });

        const debtsPromise = Promise.all([
          supabase
            .from("orders")
            .select("customer_id, amount_pending")
            .in("customer_id", customerIds)
            .gt("amount_pending", 0)
            .neq("status", "cancelado"),
          supabase
            .from("sales")
            .select("customer_id, amount_pending")
            .in("customer_id", customerIds)
            .eq("payment_method", "cuenta_corriente")
            .eq("is_cancelled", false)
            .gt("amount_pending", 0),
        ]);

        const [ordersDebtRes, salesDebtRes] = await Promise.race([debtsPromise, timeoutPromise2]) as any;

        if (ordersDebtRes.error) throw ordersDebtRes.error;
        if (salesDebtRes.error) throw salesDebtRes.error;

        const debtByCustomer = new Map<string, number>();
        const addDebt = (
          customerId: string | null,
          amountPending: number | null
        ) => {
          if (!customerId) return;
          const current = debtByCustomer.get(customerId) || 0;
          debtByCustomer.set(customerId, current + Number(amountPending || 0));
        };

        (ordersDebtRes.data || []).forEach((row: any) => {
          addDebt(row.customer_id, row.amount_pending);
        });
        (salesDebtRes.data || []).forEach((row: any) => {
          addDebt(row.customer_id, row.amount_pending);
        });

        const customersWithDebt = (customersData || []).map((customer: any) => ({
          ...customer,
          debt: debtByCustomer.get(customer.id) || 0,
        }));

        let filteredCustomers = customersWithDebt;
        if (debtFilter === "with_debt") {
          filteredCustomers = customersWithDebt.filter((c: any) => (c.debt || 0) > 0);
        } else if (debtFilter === "no_debt") {
          filteredCustomers = customersWithDebt.filter(
            (c: any) => (c.debt || 0) === 0
          );
        }

        setCustomers(filteredCustomers);
      } catch (error: any) {
        if (error.message === "TIMEOUT_FORZADO") {
          window.location.reload();
          return;
        }
        console.error("Error fetching customers:", error);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [debtFilter, currentPage, debouncedSearch, pathname]);

  // filteredCustomers ahora es directamente customers (búsqueda ya es server-side)
  const filteredCustomers = customers;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);


  const handleExportCustomersExcel = async () => {
    if (filteredCustomers.length === 0) {
      toast.error("No hay clientes para exportar");
      return;
    }

    const XLSX = await import("xlsx");

    const rows = filteredCustomers.map((customer) => {
      const normalizedType = (customer.customer_type || "").trim().toLowerCase();
      const customerTypeLabel =
        normalizedType === "mayorista"
          ? "Mayorista"
          : normalizedType === "minorista"
            ? "Minorista"
            : "No definido";

      return {
        Nombre: customer.full_name || "",
        Telefono: customer.phone || "",
        Direccion: customer.address || "",
        Email: customer.email || "",
        TipoCliente: customerTypeLabel,
        DeudaPendiente: Number((customer.debt || 0).toFixed(2)),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: ["Nombre", "Telefono", "Direccion", "Email", "TipoCliente", "DeudaPendiente"],
    });
    worksheet["!cols"] = [
      { wch: 35 },
      { wch: 18 },
      { wch: 35 },
      { wch: 32 },
      { wch: 14 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

    const exportDate = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `clientes_${exportDate}.xlsx`);
    toast.success("Clientes exportados correctamente");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <FaUsers className="text-blue-600" /> Gestión de Clientes
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mt-1">
            Administra tu cartera de clientes y sus cuentas
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <ExportAllCustomersMovementsButton />
          <ExportAllOrdersWithCustomerButton />
          <button
            onClick={handleExportCustomersExcel}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-lg hover:from-emerald-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2"
          >
            <FaFileExcel /> Exportar Excel
          </button>
          <Link
            href="/dashboard/clientes/deudores"
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2"
          >
            <FaExclamationTriangle /> Ver Deudores
          </Link>
          <Link
            href="/dashboard/clientes/new"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2"
          >
            <FaPlus /> Agregar Cliente
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
              placeholder="Buscar por nombre, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50"
            />
            {searchTerm && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                  {filteredCustomers.length}
                </span>
              </div>
            )}
          </div>

          {/* Filtro de deuda */}
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400 text-sm" />
            <select
              id="debtFilter"
              value={debtFilter}
              onChange={(e) => setDebtFilter(e.target.value)}
              className="px-3 py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm min-w-[180px] bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50"
            >
              <option value="all">Todos</option>
              <option value="with_debt">Con deudas</option>
              <option value="no_debt">Sin deudas</option>
            </select>
            {debtFilter === "with_debt" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-900">
                <FaExclamationTriangle className="text-xs" />
                <span className="text-xs font-semibold whitespace-nowrap">
                  Filtrado activo
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLA DE CLIENTES */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaUser /> Nombre
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaPhone /> Teléfono
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaEnvelope /> Email
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaUserTag /> Tipo
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaDollarSign /> Deuda Pendiente
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
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <span className="text-gray-500 dark:text-slate-400 font-medium">
                        Cargando clientes...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <FaInbox className="text-6xl text-gray-300" />
                      <span className="text-gray-500 dark:text-slate-400 font-medium">
                        {searchTerm
                          ? "No se encontraron clientes con ese criterio"
                          : "No hay clientes para mostrar"}
                      </span>
                      {searchTerm && (
                        <span className="text-gray-400 text-sm">
                          Intenta con otro término de búsqueda
                        </span>
                      )}
                      {debtFilter !== "all" && !searchTerm && (
                        <span className="text-gray-400 text-sm">
                          Intenta cambiar el filtro
                        </span>
                      )}
                      {debtFilter === "all" && !searchTerm && (
                        <Link
                          href="/dashboard/clientes/new"
                          className="mt-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center gap-2"
                        >
                          <FaPlus /> Agregar primer cliente
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${customer.debt && customer.debt > 0
                      ? "bg-red-50/30 border-l-4 border-red-400"
                      : ""
                      }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/dashboard/clientes/${customer.id}`}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {customer.full_name?.charAt(0).toUpperCase()}
                        </div>
                        {customer.full_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <FaPhone className="text-gray-400" />
                        {customer.phone || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <FaEnvelope className="text-gray-400" />
                        {customer.email || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${customer.customer_type === "mayorista"
                          ? "bg-purple-100 text-purple-800 border border-purple-300"
                          : "bg-blue-100 text-blue-800 border border-blue-300"
                          }`}
                      >
                        <FaUserTag />
                        {customer.customer_type === "mayorista"
                          ? "Mayorista"
                          : "Minorista"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.debt && customer.debt > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-2 border-red-400">
                            <FaExclamationTriangle />{formatCurrency(customer.debt)}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-green-600">
                          <FaDollarSign />
                          {formatCurrency(0).replace("$", "")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <CustomerActions
                        customerId={customer.id}
                        userRole={userRole}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount} clientes
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200 px-3">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-gray-500 dark:text-slate-400">Cargando...</div>
        </div>
      }
    >
      <CustomersPageContent />
    </Suspense>
  );
}
