import { useState, useEffect, useRef } from "react";
import {
  FaUser,
  FaUserPlus,
  FaShoppingCart,
  FaPlus,
  FaMinus,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import { Database } from "@/lib/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type CartItem = Product & { quantity: number };

interface NewOrderViewProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  cart: CartItem[];
  onAddProductClick: () => void;
  onAddCustomerClick: () => void;
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  subTotal: number;
  discount: number;
  setDiscount: (value: number) => void;
  shipping: number;
  setShipping: (value: number) => void;
  total: number;
  onFinalizeOrder: () => void;
  loading: boolean;
}

export default function NewOrderView({
  customers,
  selectedCustomer,
  setSelectedCustomer,
  cart,
  onAddProductClick,
  onAddCustomerClick,
  onUpdateQuantity,
  subTotal,
  discount,
  setDiscount,
  shipping,
  setShipping,
  total,
  onFinalizeOrder,
  loading,
}: NewOrderViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter customers based on search term
  const filteredCustomers = customers.filter((c) =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <main className="p-4 space-y-4 pb-32 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-visible">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 rounded-t-2xl">
          <label className="flex items-center gap-2 text-sm font-semibold text-white">
            <FaUser /> Cliente Seleccionado
          </label>
        </div>
        <div className="p-5 relative" ref={dropdownRef}>
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
                if (
                  selectedCustomer &&
                  e.target.value !== selectedCustomer.full_name
                ) {
                  setSelectedCustomer(null);
                }
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Buscar cliente..."
              className="w-full py-3 pl-12 pr-10 border-2 border-gray-200 dark:border-slate-700 rounded-xl text-lg font-semibold bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-gray-800 dark:text-slate-100"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCustomer(null);
                  setIsDropdownOpen(true);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-300"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {isDropdownOpen && (
            <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto mx-5">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setSearchTerm(c.full_name);
                      setIsDropdownOpen(false);
                    }}
                    className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b last:border-b-0 flex justify-between items-center group"
                  >
                    <span className="font-medium text-gray-700 dark:text-slate-200 group-hover:text-blue-700">
                      {c.full_name}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${c.customer_type === "mayorista"
                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                        : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        }`}
                    >
                      {c.customer_type === "mayorista"
                        ? "Mayorista"
                        : "Minorista"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-slate-400">
                  No se encontraron clientes.
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            {selectedCustomer ? (
              <span
                className={`text-xs font-medium px-3 py-1.5 rounded-full ${selectedCustomer.customer_type === "mayorista"
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                  : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  }`}
              >
                {selectedCustomer.customer_type === "mayorista"
                  ? "🏢 Mayorista"
                  : "👤 Minorista"}
              </span>
            ) : (
              <span></span>
            )}
            <button
              onClick={onAddCustomerClick}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-md"
            >
              <FaUserPlus /> Nuevo Cliente
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <FaShoppingCart className="text-blue-600" /> Productos del Pedido
          </h2>
          <button
            onClick={onAddProductClick}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
          >
            <FaPlus /> Añadir
          </button>
        </div>
        <div className="space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <FaShoppingCart className="text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">El pedido está vacío</p>
              <p className="text-sm text-gray-400 mt-1">
                Agrega productos para comenzar
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-700"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-slate-100">{item.name}</p>
                  <p className="text-sm text-green-600 font-medium mt-1">
                    $
                    {selectedCustomer?.customer_type === "mayorista"
                      ? item.price_mayorista
                      : item.price_minorista}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-all font-bold"
                  >
                    <FaMinus size={12} />
                  </button>
                  <span className="font-bold text-lg w-8 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-green-200 text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-all font-bold"
                  >
                    <FaPlus size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 space-y-4">
        <div className="flex justify-between items-center text-gray-600 dark:text-slate-300">
          <span className="font-medium">Subtotal:</span>
          <span className="font-bold text-lg">${subTotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <label className="font-medium text-gray-600 dark:text-slate-300 sm:whitespace-nowrap">
            Descuento (%):
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={discount}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            className="w-full sm:w-24 p-2 border border-gray-300 dark:border-slate-600 rounded-lg text-right font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <label className="font-medium text-gray-600 dark:text-slate-300 sm:whitespace-nowrap">
            Envío ($):
          </label>
          <input
            type="number"
            min="0"
            value={shipping}
            onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
            className="w-full sm:w-24 p-2 border border-gray-300 dark:border-slate-600 rounded-lg text-right font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <span className="font-bold text-xl text-gray-800 dark:text-slate-100">Total:</span>
          <span className="font-bold text-3xl text-green-600">
            ${total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Floating Action Button for Finalizing Order */}
      <div className="fixed bottom-4 left-4 right-4 z-50">
        <button
          onClick={onFinalizeOrder}
          disabled={loading || cart.length === 0}
          className={`w-full font-bold py-4 rounded-xl shadow-xl transition-all transform flex justify-between items-center px-6 ${loading || cart.length === 0
            ? "bg-gray-400 cursor-not-allowed text-white"
            : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-2xl hover:-translate-y-1"
            }`}
        >
          <span className="text-lg">
            {loading ? "Procesando..." : "Confirmar Pedido"}
          </span>
          <span className="text-2xl bg-opacity-20 px-3 py-1 rounded-lg">
            ${total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </button>
      </div>
    </main>
  );
}
