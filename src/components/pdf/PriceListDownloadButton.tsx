"use client";

import { useEffect, useState, type ReactElement } from "react";
import { FaFilePdf, FaSpinner } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import { PriceList } from "@/types/priceList";

interface PriceListDownloadButtonProps {
  priceList: PriceList;
  className?: string;
  fileName?: string;
  loadingLabel?: string;
  readyLabel?: string;
  disabled?: boolean;
}

export default function PriceListDownloadButton({
  priceList,
  className = "inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer",
  fileName,
  loadingLabel = "Generando PDF...",
  readyLabel = "Descargar PDF",
  disabled = false,
}: PriceListDownloadButtonProps) {
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
      if (data) {
        const mapped = Object.fromEntries(
          data.map((item: { key: string; value: string }) => [
            item.key,
            item.value,
          ])
        );
        setSettings(mapped);
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsClient(true);

    Promise.all([
      import("@react-pdf/renderer"),
      import("./PriceListPDFDocument"),
    ])
      .then(([pdfModule, docModule]) => {
        if (!mounted) return;

        const { PDFDownloadLink } = pdfModule;
        const PriceListPDFDocument = docModule.default;

        const defaultFileName = `${priceList.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_")}_${new Date()
          .toISOString()
          .split("T")[0]}.pdf`;

        const DownloadLink = () => (
          <PDFDownloadLink
            document={
              <PriceListPDFDocument priceList={priceList} settings={settings} />
            }
            fileName={fileName || defaultFileName}
            className={className}
          >
            {({ loading }: { loading: boolean }) =>
              loading ? (
                <>
                  <FaSpinner className="animate-spin" /> {loadingLabel}
                </>
              ) : (
                <>
                  <FaFilePdf /> {readyLabel}
                </>
              )
            }
          </PDFDownloadLink>
        );

        setLinkComponent(() => DownloadLink);
      })
      .catch((error) => {
        console.error("Error cargando PDF de Lista de Precios:", error);
      });

    return () => {
      mounted = false;
    };
  }, [className, fileName, loadingLabel, priceList, readyLabel, settings]);

  if (disabled || !priceList) {
    return (
      <button disabled className={className + " opacity-60 cursor-not-allowed"}>
        <FaFilePdf /> {readyLabel}
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
