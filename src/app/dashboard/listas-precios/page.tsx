"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaPlus,
  FaSearch,
  FaFileInvoiceDollar,
  FaUserCheck,
  FaArrowLeft,
  FaEdit,
  FaTrashAlt,
  FaShoppingCart,
  FaFilePdf,
  FaExchangeAlt,
  FaCheckCircle,
  FaClock,
  FaBoxOpen,
} from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import PriceListDownloadButton from "@/components/pdf/PriceListDownloadButton";
import { PriceList } from "@/types/priceList";

export default function PriceListsDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchPriceLists = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("price_lists")
        .select(
          `
          *,
          customer:customers (id, full_name, phone, email, customer_type),
          items:price_list_items (
            id,
            product_id,
            custom_price_minorista,
            custom_price_mayorista,
            product:products (id, sku, name, price_minorista, price_mayorista)
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        ...item,
        items_count: item.items ? item.items.length : 0,
      }));

      setPriceLists(formatted);
    } catch (err: any) {
      console.error("Error al cargar listas de precios:", err);
      toast.error("No se pudieron cargar las listas de precios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceLists();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar la lista "${name}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    const toastId = toast.loading("Eliminando lista de precios...");
    try {
      const { error } = await supabase.from("price_lists").delete().eq("id", id);
      if (error) throw error;

      toast.success("Lista de precios eliminada", { id: toastId });
      setPriceLists((prev) => prev.filter((p) => p.id !== id));
    } catch (error: any) {
      console.error("Error eliminando lista de precios:", error);
      toast.error(error.message || "Error al eliminar la lista", { id: toastId });
    }
  };

  const handleConvertToBudget = async (list: PriceList) => {
    if (!list.customer_id) {
      toast.error("Debes asignar un cliente a la lista para crear un presupuesto");
      return;
    }
    if (!list.items || list.items.length === 0) {
      toast.error("La lista de precios no contiene productos");
      return;
    }

    const toastId = toast.loading("Generando presupuesto desde lista...");
    try {
      const totalAmount = list.items.reduce((acc, item) => {
        const price =
          list.customer?.customer_type === "mayorista"
            ? item.custom_price_mayorista
            : item.custom_price_minorista;
        return acc + price;
      }, 0);

      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .insert([
          {
            customer_id: list.customer_id,
            total_amount: totalAmount,
            status: "activo",
          },
        ])
        .select()
        .single();

      if (budgetError) throw budgetError;

      const budgetItems = list.items.map((item) => ({
        budget_id: budgetData.id,
        product_id: item.product_id,
        quantity: 1,
        price:
          list.customer?.customer_type === "mayorista"
            ? item.custom_price_mayorista
            : item.custom_price_minorista,
      }));

      const { error: itemsError } = await supabase
        .from("budget_items")
        .insert(budgetItems);

      if (itemsError) throw itemsError;

      toast.success("¡Presupuesto creado con éxito!", { id: toastId });
      router.push(`/dashboard/presupuestos/${budgetData.id}`);
    } catch (error: any) {
      console.error("Error al convertir a presupuesto:", error);
      toast.error(error.message || "Error al crear presupuesto", { id: toastId });
    }
  };

  const handleConvertToSale = (list: PriceList) => {
    if (!list.items || list.items.length === 0) {
      toast.error("La lista de precios no contiene productos");
      return;
    }

    // Save to session storage for seamless load in sales page
    sessionStorage.setItem("load_price_list", JSON.stringify(list));
    toast.success("Cargando productos en la nueva venta...");
    router.push(`/dashboard/ventas/nueva?from_price_list=${list.id}`);
  };

  const filteredLists = priceLists.filter((list) => {
    const matchesSearch =
      list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (list.customer?.full_name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || list.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalLists = priceLists.length;
  const activeLists = priceLists.filter((l) => l.status === "activa").length;
  const customClientLists = priceLists.filter((l) => l.customer_id !== null).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Navigation & Header */}
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
            <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 shadow-3xs">
              <FaFileInvoiceDollar className="w-6 h-6" />
            </span>
            Listas de Precios Personalizadas
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/listas-precios/nueva"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            <FaPlus className="w-3.5 h-3.5" />
            Nueva Lista de Precios
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-3xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center text-xl flex-shrink-0">
            <FaFileInvoiceDollar />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total de Listas
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50">
              {totalLists}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-3xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center text-xl flex-shrink-0">
            <FaCheckCircle />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Listas Activas
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50">
              {activeLists}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-3xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center text-xl flex-shrink-0">
            <FaUserCheck />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Personalizadas por Cliente
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50">
              {customClientLists}
            </h3>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 mb-6 shadow-3xs flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            placeholder="Buscar por nombre o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-semibold bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Filter Status */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
            Estado:
          </span>
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "all"
                ? "bg-indigo-600 text-white shadow-3xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setStatusFilter("activa")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "activa"
                ? "bg-emerald-600 text-white shadow-3xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Activas
          </button>
          <button
            onClick={() => setStatusFilter("borrador")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "borrador"
                ? "bg-amber-600 text-white shadow-3xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Borradores
          </button>
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-3xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium animate-pulse text-xs">
            Cargando listas de precios...
          </div>
        ) : filteredLists.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 text-2xl">
              <FaBoxOpen />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
              No se encontraron listas de precios
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
              Crea tu primera lista de precios a medida para asociarla a tus clientes
              o generar propuestas comerciales en PDF.
            </p>
            <Link
              href="/dashboard/listas-precios/nueva"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
            >
              <FaPlus /> Crear Nueva Lista
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-950/40 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
                <tr>
                  <th className="px-5 py-3.5">Nombre de Lista</th>
                  <th className="px-5 py-3.5">Cliente Asociado</th>
                  <th className="px-5 py-3.5">Productos</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Validez</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredLists.map((list) => (
                  <tr
                    key={list.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors group"
                  >
                    {/* Name */}
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/listas-precios/${list.id}`}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block text-sm"
                      >
                        {list.name}
                      </Link>
                      {list.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                          {list.description}
                        </p>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      {list.customer ? (
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {list.customer.full_name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {list.customer.full_name}
                            </span>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {list.customer.customer_type || "minorista"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                          General (Sin cliente)
                        </span>
                      )}
                    </td>

                    {/* Products count */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                        <FaBoxOpen className="text-slate-400" />
                        {list.items_count || 0} ítems
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-4">
                      {list.status === "activa" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Borrador
                        </span>
                      )}
                    </td>

                    {/* Validity Date */}
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {list.valid_until ? (
                        <span className="flex items-center gap-1.5 font-semibold">
                          <FaClock className="text-slate-400" />
                          {new Date(list.valid_until).toLocaleDateString("es-AR")}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Indefinida</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Convert to Sale */}
                        <button
                          onClick={() => handleConvertToSale(list)}
                          title="Convertir a Venta"
                          className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        >
                          <FaShoppingCart className="w-3.5 h-3.5" />
                        </button>

                        {/* Convert to Budget */}
                        <button
                          onClick={() => handleConvertToBudget(list)}
                          title="Convertir a Presupuesto"
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        >
                          <FaExchangeAlt className="w-3.5 h-3.5" />
                        </button>

                        {/* Download PDF */}
                        <PriceListDownloadButton
                          priceList={list}
                          className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                          readyLabel=""
                        />

                        {/* Edit */}
                        <Link
                          href={`/dashboard/listas-precios/${list.id}`}
                          title="Ver / Editar Lista"
                          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <FaEdit className="w-3.5 h-3.5" />
                        </Link>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(list.id, list.name)}
                          title="Eliminar Lista"
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <FaTrashAlt className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
