import { useState, useEffect, useRef } from "react";
import {
  FaUser,
  FaUserPlus,
  FaShoppingCart,
  FaPlus,
  FaMinus,
  FaSearch,
  FaTimes,
  FaFileInvoiceDollar,
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
    <main className="max-w-7xl mx-auto p-4 pb-36">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Columna Izquierda: Cliente y Productos */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* CARD: Seleccionar Cliente */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/80 overflow-visible transition-all">
            <div className="bg-slate-50/50 dark:bg-slate-900/40 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center rounded-t-3xl">
              <label className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                <FaUser className="text-indigo-500" /> Cliente Destinatario
              </label>
              {selectedCustomer && (
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    selectedCustomer.customer_type === "mayorista"
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                      : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  {selectedCustomer.customer_type === "mayorista" ? "🏢 Mayorista" : "👤 Minorista"}
                </span>
              )}
            </div>
            
            <div className="p-5 relative" ref={dropdownRef}>
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
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
                  placeholder="Buscar cliente por nombre..."
                  className="w-full py-3 pl-11 pr-10 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold bg-slate-50/50 dark:bg-slate-950/40 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-800 dark:text-slate-100"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCustomer(null);
                      setIsDropdownOpen(true);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:text-slate-500"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>

              {/* Dropdown de Autocompletado */}
              {isDropdownOpen && (
                <div className="absolute z-50 left-5 right-5 mt-1 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setSearchTerm(c.full_name);
                          setIsDropdownOpen(false);
                        }}
                        className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer flex justify-between items-center transition-all group"
                      >
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-205 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {c.full_name}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            c.customer_type === "mayorista"
                              ? "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400"
                              : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {c.customer_type === "mayorista" ? "Mayorista" : "Minorista"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
                      No se encontraron clientes
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-850 pt-3">
                <span className="text-[11px] font-bold text-slate-450 dark:text-slate-500 truncate max-w-[65%]">
                  {selectedCustomer?.address ? `📍 ${selectedCustomer.address}` : "Debe seleccionar un cliente"}
                </span>
                <button
                  onClick={onAddCustomerClick}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black rounded-xl hover:shadow-md hover:shadow-emerald-500/10 active:scale-95 transition-all shrink-0"
                >
                  <FaUserPlus /> Crear Cliente
                </button>
              </div>
            </div>
          </div>

          {/* CARD: Productos del Pedido */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/80">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-black text-slate-850 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                <FaShoppingCart className="text-indigo-500" /> Detalle del Pedido
              </h2>
              <button
                onClick={onAddProductClick}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-955/60 text-indigo-600 dark:text-indigo-400 text-xs font-black rounded-xl active:scale-95 transition-all"
              >
                <FaPlus /> Agregar Producto
              </button>
            </div>

            <div className="space-y-2.5">
              {cart.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <FaShoppingCart className="text-4xl text-slate-200 dark:text-slate-800 mx-auto mb-2.5" />
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500">El pedido está vacío</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Agregue productos desde el botón superior</p>
                </div>
              ) : (
                cart.map((item) => {
                  const currentPrice = selectedCustomer?.customer_type === "mayorista"
                    ? item.price_mayorista
                    : item.price_minorista;
                  const priceNum = parseFloat(String(currentPrice)) || 0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/40 dark:border-slate-800/30"
                    >
                      <div className="flex-1 pr-3">
                        <p className="font-extrabold text-xs text-slate-800 dark:text-slate-100">{item.name}</p>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            ${priceNum.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            Stock: {item.stock}
                          </span>
                        </div>
                      </div>
                      
                      {/* Controles de Cantidad */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg active:scale-90 transition-all font-bold shadow-sm"
                        >
                          <FaMinus size={10} />
                        </button>
                        <span className="font-black text-xs w-6 text-center text-slate-800 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg active:scale-90 transition-all font-bold shadow-sm"
                        >
                          <FaPlus size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Liquidación */}
        <div className="lg:col-span-1">
          {/* CARD: Resumen de Cobro */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/80 space-y-3">
            <h3 className="text-xs font-black text-slate-805 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wider border-b border-slate-100 dark:border-slate-850 pb-2">
              <FaFileInvoiceDollar className="text-indigo-500" /> Liquidación
            </h3>
            
            <div className="flex justify-between items-center text-xs text-slate-655 dark:text-slate-400">
              <span className="font-bold">Subtotal:</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                ${subTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-1.5 border-t border-b border-slate-100/50 dark:border-slate-850/40">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Descuento (%)</span>
                <span className="text-[9px] text-slate-450">Aplicado al subtotal</span>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={discount || ""}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-20 p-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-center font-bold text-xs bg-slate-50/50 dark:bg-slate-950/40 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-1.5">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Costo Envío ($)</span>
                <span className="text-[9px] text-slate-455">Cargo de flete/reparto</span>
              </div>
              <input
                type="number"
                min="0"
                value={shipping || ""}
                onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                className="w-20 p-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-center font-bold text-xs bg-slate-50/50 dark:bg-slate-900/40 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/80 flex justify-between items-center">
              <span className="font-black text-xs text-slate-850 dark:text-slate-200 uppercase tracking-wider">Total Final:</span>
              <span className="font-black text-2xl text-emerald-600 dark:text-emerald-400">
                ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 backdrop-blur-md bg-white/60 dark:bg-slate-950/60 border-t border-slate-200/40 dark:border-slate-800/30 flex justify-center">
        <button
          onClick={onFinalizeOrder}
          disabled={loading || cart.length === 0 || !selectedCustomer}
          className={`w-full max-w-md font-black py-4 rounded-2xl shadow-lg transition-all duration-200 flex justify-between items-center px-6 ${
            loading || cart.length === 0 || !selectedCustomer
              ? "bg-slate-300 cursor-not-allowed text-slate-500 dark:bg-slate-800 dark:text-slate-600 shadow-none"
              : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          <span className="text-xs uppercase tracking-widest">
            {loading ? "Registrando..." : "Confirmar Pedido"}
          </span>
          <span className="text-sm bg-white/10 dark:bg-black/15 px-3 py-1 rounded-lg">
            ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </span>
        </button>
      </div>
    </main>
  );
}
