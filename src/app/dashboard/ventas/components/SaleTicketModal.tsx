
import { useState, useEffect } from "react";
import CustomLoader from "@/components/CustomLoader";
import { FaPrint, FaTimes } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import SaleTicketDownloadButton from "@/components/pdf/SaleTicketDownloadButton";
import { Database } from "@/lib/database.types"; // Assuming this is where types are. If not I'll just use any for now to match other files.

interface SaleTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    saleId: string | null;
}

export default function SaleTicketModal({
    isOpen,
    onClose,
    saleId,
}: SaleTicketModalProps) {
    const [saleData, setSaleData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [printFormat, setPrintFormat] = useState<"A4" | "thermal">("thermal");

    useEffect(() => {
        if (isOpen && saleId) {
            setLoading(true);
            const fetchFullSale = async () => {
                try {
                    let query = supabase
                        .from("sales")
                        .select("*, customers(*), sale_items(*, products(*))")
                        .eq("id", saleId)
                        .single();

                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error("TIMEOUT_FORZADO")), 2000);
                    });

                    const result = await Promise.race([query, timeoutPromise]) as any;
                    const sale = result?.data;
                    const error = result?.error;

                    if (error) throw error;

                    if (sale) {
                        setSaleData(sale);
                    }
                } catch (error: any) {
                    if (error.message === "TIMEOUT_FORZADO") {
                        window.location.reload();
                        return;
                    }
                    toast.error("No se pudieron cargar los datos de la venta.");
                    console.error(error);
                    onClose();
                } finally {
                    setLoading(false);
                }
            };
            fetchFullSale();
        }
    }, [isOpen, saleId, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full">
                <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-5 rounded-t-3xl flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaPrint /> Imprimir Ticket
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white dark:bg-slate-900 hover:bg-opacity-20 rounded-full p-2"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>
                <div className="p-8">
                    {loading || !saleData ? (
                        <div className="flex flex-col items-center justify-center h-48">
                            <CustomLoader size={60} text="Cargando ticket..." />
                        </div>
                    ) : (
                        <>
                            <p className="mb-4 text-gray-700 dark:text-slate-200 text-center">
                                El comprobante para{" "}
                                <span className="font-bold">
                                    {saleData.customers?.full_name || "Consumidor Final"}
                                </span>{" "}
                                está listo.
                            </p>

                            {/* Selector de formato */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                                    Formato de Impresión:
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setPrintFormat("thermal")}
                                        className={`py-3 px-4 rounded-xl border-2 transition-all font-semibold text-sm ${printFormat === "thermal"
                                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                            : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <FaPrint className="text-xl" />
                                            <span>Térmica 80mm</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setPrintFormat("A4")}
                                        className={`py-3 px-4 rounded-xl border-2 transition-all font-semibold text-sm ${printFormat === "A4"
                                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                            : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <FaPrint className="text-xl" />
                                            <span>A4 Normal</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <SaleTicketDownloadButton
                                saleData={saleData}
                                printFormat={printFormat}
                            />

                            <button
                                onClick={onClose}
                                className="w-full mt-3 py-3 text-gray-600 dark:text-slate-300 font-semibold hover:bg-gray-100 dark:hover:bg-slate-800/80 dark:bg-slate-800 rounded-xl"
                            >
                                Cerrar
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
