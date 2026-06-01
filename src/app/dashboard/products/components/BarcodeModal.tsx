import { useState, useRef, useEffect } from "react";
import { FaPrint, FaSearch, FaTimes, FaBarcode, FaPlus, FaTrash } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import { Database } from "@/lib/database.types";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface BarcodeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface QueueItem {
    product: Product;
    quantity: number;
}

export default function BarcodeModal({ isOpen, onClose }: BarcodeModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(false);

    const componentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const searchProducts = async () => {
            if (!searchTerm.trim()) {
                setProducts([]);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from("products")
                .select("*")
                .eq("is_active", true)
                .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
                .limit(10);

            if (error) {
                console.error(error);
            } else {
                setProducts(data || []);
            }
            setLoading(false);
        };

        const timeoutId = setTimeout(() => {
            searchProducts();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const addToQueue = (product: Product) => {
        setQueue((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
        toast.success("Agregado a la cola de impresión");
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity < 1) return;
        setQueue((prev) =>
            prev.map((item) =>
                item.product.id === productId ? { ...item, quantity } : item
            )
        );
    };

    const removeFromQueue = (productId: string) => {
        setQueue((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const clearQueue = () => {
        setQueue([]);
        setSearchTerm("");
        setProducts([]);
    };

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: "Etiquetas_Productos",
    } as any);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-2xl shadow-xl flex flex-col border border-slate-100 dark:border-slate-800">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-850/60 bg-slate-50/50 dark:bg-slate-950/20">
                    <h2 className="text-sm font-black text-slate-850 dark:text-slate-205 flex items-center gap-2">
                        <FaBarcode className="text-indigo-650 w-4 h-4" /> Generar e Imprimir Etiquetas de Barra
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-650 dark:hover:text-white transition-colors"
                    >
                        <FaTimes className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    
                    {/* Left Panel: Search & Queue */}
                    <div className="w-full lg:w-[350px] border-r border-slate-150 dark:border-slate-805 flex flex-col bg-slate-50/50 dark:bg-slate-950/40">
                        {/* Search Input */}
                        <div className="p-4 border-b border-slate-150 dark:border-slate-805 space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">
                                Buscar Producto
                            </label>
                            <div className="relative">
                                <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-3 h-3" />
                                <input
                                    type="text"
                                    placeholder="Nombre o SKU..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs font-semibold bg-white dark:bg-slate-950 placeholder:text-slate-400"
                                    autoFocus
                                />
                            </div>

                            {/* Search Results Dropdown */}
                            {searchTerm && (
                                <div className="absolute z-10 w-[318px] bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-150 dark:border-slate-800 max-h-48 overflow-y-auto mt-1 divide-y divide-slate-100 dark:divide-slate-800">
                                    {loading ? (
                                        <div className="p-3 text-center text-3xs font-semibold text-slate-400 uppercase tracking-wider">Buscando...</div>
                                    ) : products.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-slate-500 italic">No se encontraron productos</div>
                                    ) : (
                                        products.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => addToQueue(p)}
                                                className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-850 flex flex-col gap-1 text-xs transition-colors"
                                            >
                                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate w-full">{p.name}</span>
                                                <div className="flex justify-between w-full text-3xs font-extrabold text-slate-500">
                                                    <span className="font-mono bg-slate-50 dark:bg-slate-950 px-1 rounded border">SKU: {p.sku}</span>
                                                    <span className="text-indigo-600 dark:text-indigo-400">$ {p.price_minorista}</span>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Queue List */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-3xs font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Fila de Impresión</h3>
                                {queue.length > 0 && (
                                    <button onClick={clearQueue} className="text-3xs font-black uppercase tracking-wider text-rose-600 hover:text-rose-700">
                                        Limpiar
                                    </button>
                                )}
                            </div>

                            {queue.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed rounded-2xl bg-white/20 dark:bg-slate-900/10">
                                    <FaBarcode className="text-slate-300 dark:text-slate-700 w-8 h-8 mb-2" />
                                    <p className="text-[11px] font-bold text-slate-455">Cola vacía</p>
                                    <p className="text-[10px] text-slate-450 mt-1 max-w-[200px]">Busca productos arriba y agrégalos para armar tus plantillas.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {queue.map((item) => (
                                        <div key={item.product.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-2xs border border-slate-150 dark:border-slate-800 flex flex-col gap-2">
                                            <div className="flex justify-between items-start gap-1">
                                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight flex-1">
                                                    {item.product.name}
                                                </span>
                                                <button onClick={() => removeFromQueue(item.product.id)} className="text-slate-400 hover:text-rose-600 p-0.5">
                                                    <FaTimes className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between text-3xs font-extrabold text-slate-500">
                                                <span className="font-mono">SKU: {item.product.sku}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span>Copias:</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                                                        className="w-12 px-1.5 py-0.5 border rounded-lg dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 text-center font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Preview */}
                    <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-6 overflow-y-auto flex flex-col items-center justify-start border-l border-slate-100 dark:border-slate-805">
                        <div className="mb-4 text-center">
                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Hoja de Etiquetas Previsualizada</h3>
                            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">
                                Vista de distribución para páginas tamaño A4.
                            </p>
                        </div>

                        {/* Print Area Preview */}
                        <div className="bg-white shadow-lg p-8 min-h-[297mm] w-[210mm] origin-top transform scale-[0.45] sm:scale-[0.6] md:scale-[0.7] lg:scale-[0.8] xl:scale-[0.9] transition-transform rounded-sm">
                            <div ref={componentRef} className="print-area grid grid-cols-3 gap-3">
                                {queue.flatMap((item) =>
                                    Array.from({ length: item.quantity }).map((_, idx) => (
                                        <div
                                            key={`${item.product.id}-${idx}`}
                                            className="border border-dashed border-slate-200 p-2 flex flex-col items-center justify-center text-center h-[3.4cm] rounded bg-white page-break-inside-avoid"
                                        >
                                            <span className="text-[10px] font-extrabold truncate w-full px-1 mb-1 text-black">
                                                {item.product.name}
                                            </span>
                                            <div className="w-full flex justify-center overflow-hidden">
                                                <Barcode
                                                    value={item.product.sku || item.product.id.substring(0, 8)}
                                                    width={1.4}
                                                    height={38}
                                                    fontSize={9}
                                                    margin={0}
                                                />
                                            </div>
                                            <span className="text-base font-black mt-1 text-black">
                                                ${item.product.price_minorista?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    ))
                                )}
                                {queue.length === 0 && (
                                    <div className="col-span-3 text-center py-24 text-slate-350 dark:text-slate-500 font-bold text-xs italic">
                                        Las etiquetas cargadas se distribuirán aquí.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={queue.length === 0}
                        className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-755 text-white text-xs font-extrabold rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaPrint className="w-3.5 h-3.5" /> Confirmar e Imprimir
                    </button>
                </div>
            </div>

            <style jsx global>{`
              @media print {
                @page {
                  size: auto;
                  margin: 10mm;
                }
                body * {
                  visibility: hidden;
                }
                .print-area, .print-area * {
                  visibility: visible;
                }
                .print-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                }
                .print-area > div {
                   border-style: solid !important;
                   border-width: 1px !important;
                   border-color: #ddd !important;
                }
              }
            `}</style>
        </div>
    );
}
