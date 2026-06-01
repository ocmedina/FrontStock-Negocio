"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { FaUpload, FaSpinner, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaFileExcel } from "react-icons/fa";
import Link from "next/link";

interface ProductExcelRow {
  SKU: string;
  Nombre: string;
  PrecioMinorista: number;
  PrecioMayorista: number;
  Stock: number;
}

export default function ImportProductsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: number; duplicates: number } | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setResults(null);
      setErrorDetails([]);
    }
  };

  const processImport = useCallback(async () => {
    if (!file) {
      toast.error("Por favor, selecciona un archivo Excel.");
      return;
    }
    setLoading(true);
    setResults(null);
    setErrorDetails([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      let parsedRows = 0;
      try {
        const XLSX = await import("xlsx");
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ProductExcelRow>(worksheet);
        parsedRows = jsonData.length;

        if (jsonData.length === 0) {
          toast.error("El archivo Excel está vacío o no tiene el formato correcto.");
          setLoading(false);
          return;
        }

        const productsToInsert: any[] = [];
        const currentErrors: string[] = [];
        let duplicateCount = 0;

        jsonData.forEach((row, index) => {
          if (!row.SKU || !row.Nombre || row.PrecioMinorista == null || row.PrecioMayorista == null || row.Stock == null) {
            currentErrors.push(`Fila ${index + 2}: Faltan datos obligatorios (SKU, Nombre, Precios, Stock).`);
            return;
          }
          
          productsToInsert.push({
            sku: String(row.SKU).trim(),
            name: String(row.Nombre).trim(),
            price_minorista: parseFloat(String(row.PrecioMinorista)),
            price_mayorista: parseFloat(String(row.PrecioMayorista)),
            stock: parseInt(String(row.Stock), 10),
            is_active: true
          });
        });

        if (productsToInsert.length > 0) {
          const { error } = await supabase
            .from("products")
            .insert(productsToInsert);
             
          if (error) {
            if (error.message.includes("duplicate key value violates unique constraint")) {
              toast.error("Algunos productos no se importaron porque su SKU ya existe.");
              setResults({ success: productsToInsert.length - duplicateCount, errors: currentErrors.length, duplicates: duplicateCount });
            } else {
              throw new Error(error.message);
            }
          } else {
            setResults({ success: productsToInsert.length, errors: currentErrors.length, duplicates: duplicateCount });
          }
        } else {
          setResults({ success: 0, errors: currentErrors.length, duplicates: 0 });
        }
        
        setErrorDetails(currentErrors);
        
      } catch (err: any) {
        console.error("Error al procesar el archivo:", err);
        toast.error(`Error al procesar el archivo: ${err.message}`);
        setResults({ success: 0, errors: parsedRows, duplicates: 0 });
      } finally {
        setLoading(false);
        setFile(null);
        const fileInput = document.getElementById("file-upload") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        router.refresh();
      }
    };
    reader.readAsArrayBuffer(file);
  }, [file, router]);

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100">
      <div className="max-w-[850px] mx-auto space-y-6">
        
        {/* BOTÓN VOLVER */}
        <div>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-755 dark:text-indigo-400 transition-colors"
          >
            <FaArrowLeft /> Volver al Catálogo
          </Link>
        </div>

        {/* CABECERA */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <h1 className="text-lg font-black text-gray-900 dark:text-slate-55 flex items-center gap-2">
            <FaFileExcel className="text-indigo-600 w-5 h-5" /> Importar Catálogo desde Excel
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Carga de forma masiva tu base de productos mediante un archivo de hoja de cálculo.
          </p>
        </div>

        {/* INSTRUCCIONES */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Formato Requerido
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed">
            Asegúrate de que tu archivo de Excel (.xlsx o .csv) contenga en la primera hoja los encabezados con los nombres exactos definidos a continuación:
          </p>
          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto">
            SKU | Nombre | PrecioMinorista | PrecioMayorista | Stock
          </div>
          <p className="text-xs text-slate-500">
            * Nota: El SKU (Código Único) debe ser diferente para cada producto. Si intentas cargar un SKU existente, esa fila será ignorada para evitar sobrescribir precios incorrectamente.
          </p>
        </div>

        {/* DROPZONE DE ARCHIVO */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 space-y-4">
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center w-full h-40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
              <FaUpload className="w-8 h-8 mb-2.5 text-slate-400" />
              <p className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
                Haz clic para subir o arrastra el archivo aquí
              </p>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1">XLSX, XLS o CSV</p>
            </div>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
            />
          </label>
          
          {file && (
            <p className="text-xs font-bold text-center text-indigo-650 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/10 py-2 rounded-xl border border-indigo-100 dark:border-indigo-950">
              Archivo seleccionado: {file.name}
            </p>
          )}

          <button 
            onClick={processImport} 
            disabled={!file || loading}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-150 disabled:text-slate-400 disabled:dark:bg-slate-900 text-white text-xs font-extrabold rounded-xl shadow-sm transition-colors"
          >
            {loading ? <FaSpinner className="animate-spin w-3.5 h-3.5" /> : <FaUpload className="w-3.5 h-3.5" />}
            {loading ? "Procesando Importación..." : "Confirmar e Importar Productos"}
          </button>
        </div>

        {/* RESULTADOS */}
        {results && (
          <div className={`p-5 rounded-2xl border shadow-sm space-y-3 ${
            results.errors > 0
              ? "bg-rose-50/50 text-rose-800 border-rose-100 dark:bg-rose-950/10 dark:text-rose-400 dark:border-rose-950/50"
              : "bg-emerald-50/50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-950/50"
          }`}>
            <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              {results.errors > 0 ? (
                <FaTimesCircle className="text-rose-500 w-4 h-4" />
              ) : (
                <FaCheckCircle className="text-emerald-500 w-4 h-4" />
              )}
              Resultados del Procesamiento
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 bg-white dark:bg-slate-950/40 rounded-xl border border-inherit">
                <span className="text-[10px] text-slate-500 block">Productos Creados</span>
                <span className="font-extrabold mt-0.5 block">{results.success}</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-950/40 rounded-xl border border-inherit">
                <span className="text-[10px] text-slate-500 block">Filas Omitidas</span>
                <span className="font-extrabold mt-0.5 block">{results.errors}</span>
              </div>
            </div>

            {errorDetails.length > 0 && (
              <div className="mt-3 pt-3 border-t border-inherit">
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">Detalles de errores:</p>
                <ul className="list-disc list-inside text-3xs space-y-1 mt-1.5 max-h-32 overflow-y-auto">
                  {errorDetails.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}