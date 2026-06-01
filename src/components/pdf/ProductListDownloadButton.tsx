"use client";

import { useEffect, useState, type ReactElement } from "react";
import { FaPrint, FaSpinner } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";

interface ProductListDownloadButtonProps {
  products: any[];
  className?: string;
  fileName?: string;
  loadingLabel?: string;
  readyLabel?: string;
  disabledLabel?: string;
  disabled?: boolean;
}

export default function ProductListDownloadButton({
  products,
  className =
    "inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700",
  fileName,
  loadingLabel = "Generando PDF...",
  readyLabel = "Descargar PDF",
  disabledLabel = "Selecciona productos",
  disabled = false,
}: ProductListDownloadButtonProps) {
  const [isClient, setIsClient] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [LinkComponent, setLinkComponent] = useState<(() => ReactElement) | null>(
    null
  );

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value");
      if (error) {
        console.error("Error cargando settings:", error);
        return;
      }
      const mapped = Object.fromEntries(
        data.map((item: { key: string; value: string }) => [
          item.key,
          item.value,
        ])
      );
      setSettings(mapped);
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsClient(true);

    if (Object.keys(settings).length === 0) return;

    Promise.all([import("@react-pdf/renderer"), import("./ProductListPDFDocument")])
      .then(([pdfModule, docModule]) => {
        if (!mounted) return;

        const { PDFDownloadLink } = pdfModule;
        const ProductListPDFDocument = docModule.default;

        const DownloadLink = () => (
          <PDFDownloadLink
            document={<ProductListPDFDocument products={products} settings={settings} />}
            fileName={
              fileName ||
              `productos_seleccionados_${new Date()
                .toISOString()
                .split("T")[0]}.pdf`
            }
            className={className}
          >
            {({ loading }: { loading: boolean }) =>
              loading ? (
                <>
                  <FaSpinner className="animate-spin" /> {loadingLabel}
                </>
              ) : (
                <>
                  <FaPrint /> {readyLabel}
                </>
              )
            }
          </PDFDownloadLink>
        );

        setLinkComponent(() => DownloadLink);
      })
      .catch((error) => {
        console.error("Error cargando PDF de productos:", error);
      });

    return () => {
      mounted = false;
    };
  }, [className, fileName, loadingLabel, products, readyLabel, settings]);

  if (disabled || !products || products.length === 0) {
    return (
      <button disabled className={className + " opacity-60 cursor-not-allowed"}>
        <FaPrint /> {disabledLabel}
      </button>
    );
  }

  if (!isClient || !LinkComponent) {
    return (
      <button disabled className={className + " opacity-60 cursor-not-allowed"}>
        <FaSpinner className="animate-spin" /> {loadingLabel}
      </button>
    );
  }

  const DownloadLink = LinkComponent;
  return <DownloadLink />;
}
