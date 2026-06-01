"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import {
  FaPlus,
  FaEye,
  FaEdit,
  FaFilePdf,
  FaCheck,
  FaTimes,
  FaClock,
  FaBox,
  FaFilter,
  FaSearch,
} from "react-icons/fa";
import toast from "react-hot-toast";

type PurchaseOrder = {
  id: string;
  order_number: string;
  supplier_id: number | null;
  status: "draft" | "sent" | "received" | "cancelled";
  total_amount: number;
  notes: string | null;
  created_at: string;
  sent_at: string | null;
  received_at: string | null;
  brands: {
    name: string;
  } | null;
  profiles: {
    full_name: string | null;
    username: string;
  } | null;
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("purchase_orders")
        .select(
          `
          *,
          brands (name),
          profiles:created_by (full_name, username)
        `
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Error al cargar las órdenes");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: {
        bg: "bg-gray-100",
        text: "text-gray-800",
        icon: <FaEdit />,
        label: "Borrador",
      },
      sent: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        icon: <FaClock />,
        label: "Enviada",
      },
      received: {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: <FaCheck />,
        label: "Recibida",
      },
      cancelled: {
        bg: "bg-red-100",
        text: "text-red-800",
        icon: <FaTimes />,
        label: "Cancelada",
      },
    };

    const badge = badges[status as keyof typeof badges];
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}
      >
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.brands?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: orders.length,
    draft: orders.filter((o) => o.status === "draft").length,
    sent: orders.filter((o) => o.status === "sent").length,
    received: orders.filter((o) => o.status === "received").length,
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
              <FaBox className="text-blue-600" /> Órdenes de Compra
            </h1>
            <p className="text-gray-600 dark:text-slate-300 mt-1">
              Gestiona tus órdenes de compra a proveedores
            </p>
          </div>
          <Link
            href="/dashboard/proveedores/ordenes/nueva"
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2"
          >
            <FaPlus /> Nueva Orden
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Total Órdenes</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-white dark:bg-slate-900/20 rounded-full flex items-center justify-center">
                <FaBox className="text-2xl" />
              </div>
            </div>
          </div>

          <button
            onClick={() => setStatusFilter("draft")}
            className={`bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg p-5 text-white hover:shadow-xl transition-all ${
              statusFilter === "draft" ? "ring-4 ring-gray-300" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Borradores</p>
                <p className="text-3xl font-bold mt-1">{stats.draft}</p>
              </div>
              <div className="w-12 h-12 bg-white dark:bg-slate-900/20 rounded-full flex items-center justify-center">
                <FaEdit className="text-2xl" />
              </div>
            </div>
          </button>

          <button
            onClick={() => setStatusFilter("sent")}
            className={`bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 text-white hover:shadow-xl transition-all ${
              statusFilter === "sent" ? "ring-4 ring-blue-300" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Enviadas</p>
                <p className="text-3xl font-bold mt-1">{stats.sent}</p>
              </div>
              <div className="w-12 h-12 bg-white dark:bg-slate-900/20 rounded-full flex items-center justify-center">
                <FaClock className="text-2xl" />
              </div>
            </div>
          </button>

          <button
            onClick={() => setStatusFilter("received")}
            className={`bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-5 text-white hover:shadow-xl transition-all ${
              statusFilter === "received" ? "ring-4 ring-green-300" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Recibidas</p>
                <p className="text-3xl font-bold mt-1">{stats.received}</p>
              </div>
              <div className="w-12 h-12 bg-white dark:bg-slate-900/20 rounded-full flex items-center justify-center">
                <FaCheck className="text-2xl" />
              </div>
            </div>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg mb-6 p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Buscar por número de orden o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-700 dark:text-slate-200 font-medium"
              />
            </div>
            <div className="flex items-center gap-3">
              <FaFilter className="text-gray-400 text-lg" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-700 dark:text-slate-200 font-medium min-w-[200px]"
              >
                <option value="all">📦 Todas las órdenes</option>
                <option value="draft">📝 Borradores</option>
                <option value="sent">🕐 Enviadas</option>
                <option value="received">✅ Recibidas</option>
                <option value="cancelled">❌ Canceladas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-slate-700">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <FaBox className="mx-auto text-6xl text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">
                No hay órdenes
              </h3>
              <p className="text-gray-600 dark:text-slate-300 mb-4">
                {searchTerm
                  ? "No se encontraron órdenes con ese criterio"
                  : "Comienza creando tu primera orden de compra"}
              </p>
              {!searchTerm && (
                <Link
                  href="/dashboard/proveedores/ordenes/nueva"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <FaPlus /> Nueva Orden
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                        Número
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                        Proveedor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-55 dark:hover:bg-slate-800 dark:bg-slate-950 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono font-bold text-blue-600">
                            {order.order_number}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-slate-50">
                            {order.brands?.name || "Sin proveedor"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-bold text-gray-900 dark:text-slate-50">
                            ${order.total_amount.toLocaleString("es-AR")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-slate-300">
                            {new Date(order.created_at).toLocaleDateString(
                              "es-AR"
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/dashboard/proveedores/ordenes/${order.id}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                              title="Ver detalles"
                            >
                              <FaEye />
                            </Link>
                            {order.status === "draft" && (
                              <Link
                                href={`/dashboard/proveedores/ordenes/${order.id}/editar`}
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <FaEdit />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-gray-150 dark:divide-slate-800">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 space-y-3 bg-white dark:bg-slate-900 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                        {order.order_number}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-slate-50">
                        {order.brands?.name || "Sin proveedor"}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                        Fecha: {new Date(order.created_at).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-2.5">
                      <span className="text-sm font-bold text-gray-900 dark:text-slate-50">
                        ${order.total_amount.toLocaleString("es-AR")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/dashboard/proveedores/ordenes/${order.id}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                        >
                          <FaEye className="w-3 h-3" /> Ver
                        </Link>
                        {order.status === "draft" && (
                          <Link
                            href={`/dashboard/proveedores/ordenes/${order.id}/editar`}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                          >
                            <FaEdit className="w-3 h-3" /> Editar
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
