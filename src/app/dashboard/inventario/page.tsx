"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  FaHistory,
  FaSearch,
  FaFilter,
  FaArrowUp,
  FaArrowDown,
  FaExchangeAlt,
  FaCalendarAlt,
  FaPlus,
  FaFileExcel,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import toast from "react-hot-toast";
import AdjustmentModal from "./components/AdjustmentModal";

type StockMovement = {
  id: string;
  created_at: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  notes: string | null;
  products: {
    name: string;
    sku: string;
  } | null;
  profiles: {
    full_name: string | null;
    username: string | null;
  } | null;
};

export default function InventoryKardexPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0]
  ); // Últimos 30 días por defecto
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [areActionsOpen, setAreActionsOpen] = useState(false);

  useEffect(() => {
    fetchMovements();
  }, [startDate, endDate, typeFilter]);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("stock_movements")
        .select(
          `
          *,
          products (name, sku),
          profiles (full_name, username)
        `
        )
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`)
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("movement_type", typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtrado por búsqueda en cliente (por ahora, para simplificar query compleja)
      let filteredData = (data as any[]) || [];
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filteredData = filteredData.filter(
          (m) =>
            m.products?.name.toLowerCase().includes(lowerTerm) ||
            m.products?.sku.toLowerCase().includes(lowerTerm) ||
            m.notes?.toLowerCase().includes(lowerTerm)
        );
      }

      setMovements(filteredData);
    } catch (error: any) {
      console.error("Error fetching movements:", error);
      toast.error("Error al cargar movimientos");
    } finally {
      setLoading(false);
    }
  };

  // Re-filtrar cuando cambia el término de búsqueda sin recargar todo
  useEffect(() => {
    if (!loading) {
      fetchMovements();
    }
  }, [searchTerm]);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "venta":
        return <FaArrowDown className="text-red-500" />;
      case "compra":
        return <FaArrowUp className="text-green-500" />;
      case "devolucion":
        return <FaArrowUp className="text-green-500" />;
      case "ajuste_manual":
        return <FaExchangeAlt className="text-orange-500" />;
      case "cancelacion":
        return <FaArrowUp className="text-green-500" />;
      default:
        return <FaExchangeAlt className="text-gray-500 dark:text-slate-400" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case "venta":
        return (
          <span className="text-red-700 bg-red-100 px-2 py-1 rounded text-xs font-bold">
            Venta
          </span>
        );
      case "compra":
        return (
          <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold">
            Compra
          </span>
        );
      case "devolucion":
        return (
          <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold">
            Devolución
          </span>
        );
      case "ajuste_manual":
        return (
          <span className="text-orange-700 bg-orange-100 px-2 py-1 rounded text-xs font-bold">
            Ajuste Manual
          </span>
        );
      case "cancelacion":
        return (
          <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold">
            Cancelación
          </span>
        );
      default:
        return (
          <span className="text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold">
            {type}
          </span>
        );
    }
  };

  const handleExportExcel = async () => {
    if (movements.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const XLSX = await import("xlsx");

    const dataToExport = movements.map((m) => ({
      Fecha: new Date(m.created_at).toLocaleString("es-AR"),
      Producto: m.products?.name || "N/A",
      SKU: m.products?.sku || "N/A",
      Tipo: m.movement_type,
      Cantidad: m.quantity,
      "Stock Resultante": m.new_stock,
      Usuario: m.profiles?.full_name || m.profiles?.username || "Sistema",
      Notas: m.notes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kardex");

    XLSX.writeFile(workbook, `kardex_${startDate}_${endDate}.xlsx`);
  };

  // Cálculos de resumen
  const totalEntries = movements
    .filter((m) => m.quantity > 0)
    .reduce((acc, m) => acc + m.quantity, 0);
  const totalExits = movements
    .filter((m) => m.quantity < 0)
    .reduce((acc, m) => acc + Math.abs(m.quantity), 0);
  const netChange = totalEntries - totalExits;

  return (
    <div className="p-6 bg-gray-50 dark:bg-slate-950 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-3">
            <FaHistory className="text-blue-600" /> Historial de Movimientos
            (Kardex)
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mt-2">
            Auditoría completa de entradas y salidas de inventario.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <button
            onClick={() => setAreActionsOpen((prev) => !prev)}
            className="md:hidden w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm flex items-center justify-between text-gray-700 dark:text-slate-200 font-semibold"
          >
            Acciones
            {areActionsOpen ? <FaChevronUp /> : <FaChevronDown />}
          </button>
          <div
            className={`${areActionsOpen ? "grid" : "hidden"} grid-cols-2 gap-2 md:flex md:gap-3`}
          >
            <button
              onClick={handleExportExcel}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-medium text-sm"
            >
              <FaFileExcel /> Exportar Excel
            </button>
            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-bold text-sm"
            >
              <FaPlus /> Nuevo Ajuste
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 font-medium">Total Entradas</p>
          <p className="text-xl md:text-2xl font-bold text-green-600">+{totalEntries}</p>
          <p className="text-xs text-gray-400 mt-1">Unidades ingresadas</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl shadow-sm border-l-4 border-red-500">
          <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 font-medium">Total Salidas</p>
          <p className="text-xl md:text-2xl font-bold text-red-600">-{totalExits}</p>
          <p className="text-xs text-gray-400 mt-1">Unidades retiradas</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 font-medium">Cambio Neto</p>
          <p
            className={`text-xl md:text-2xl font-bold ${
              netChange >= 0 ? "text-blue-600" : "text-orange-600"
            }`}
          >
            {netChange > 0 ? "+" : ""}
            {netChange}
          </p>
          <p className="text-xs text-gray-400 mt-1">Balance del período</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-md mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
            Buscar Producto
          </label>
          <div className="relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Nombre, SKU o notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="w-full md:w-auto">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
            Tipo de Movimiento
          </label>
          <div className="relative">
            <FaFilter className="absolute left-3 top-3 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full md:w-auto pl-10 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900"
            >
              <option value="all">Todos</option>
              <option value="venta">Venta</option>
              <option value="compra">Compra</option>
              <option value="devolucion">Devolución</option>
              <option value="ajuste_manual">Ajuste Manual</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tabla (Desktop) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Stock Resultante
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Usuario / Notas
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-gray-500 dark:text-slate-400"
                  >
                    Cargando movimientos...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-gray-500 dark:text-slate-400"
                  >
                    No se encontraron movimientos en este período.
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                      {new Date(movement.created_at).toLocaleString("es-AR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-50">
                        {movement.products?.name || "Producto Eliminado"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {movement.products?.sku}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getMovementIcon(movement.movement_type)}
                        {getMovementLabel(movement.movement_type)}
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                        movement.quantity > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {movement.quantity > 0 ? "+" : ""}
                      {movement.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-slate-200">
                      <span className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {movement.new_stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-slate-50 font-medium">
                        {movement.profiles?.full_name ||
                          movement.profiles?.username ||
                          "Sistema"}
                      </div>
                      {movement.notes && (
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 italic">
                          "{movement.notes}"
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tarjetas (Mobile) */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500 dark:text-slate-400">
            Cargando movimientos...
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
            No se encontraron movimientos en este período.
          </div>
        ) : (
          movements.map((movement) => (
            <div
              key={movement.id}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-4 border border-gray-100"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-slate-50">
                    {movement.products?.name || "Producto Eliminado"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {movement.products?.sku}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block mb-1">
                    {new Date(movement.created_at).toLocaleDateString("es-AR")}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(movement.created_at).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  {getMovementIcon(movement.movement_type)}
                  {getMovementLabel(movement.movement_type)}
                </div>
                <div
                  className={`text-lg font-bold ${
                    movement.quantity > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {movement.quantity > 0 ? "+" : ""}
                  {movement.quantity}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-sm">
                <div className="text-gray-600 dark:text-slate-300">
                  Stock:{" "}
                  <span className="font-medium">{movement.new_stock}</span>
                </div>
                <div className="text-gray-500 dark:text-slate-400 text-xs">
                  {movement.profiles?.full_name ||
                    movement.profiles?.username ||
                    "Sistema"}
                </div>
              </div>

              {movement.notes && (
                <div className="mt-2 text-xs text-gray-500 dark:text-slate-400 italic bg-gray-50 dark:bg-slate-950 p-2 rounded">
                  "{movement.notes}"
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <AdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSuccess={() => {
          fetchMovements();
          toast.success("Lista actualizada");
        }}
      />
    </div>
  );
}
