"use client";

import { useEffect, useState, type ReactElement } from "react";
import { FaPrint, FaSpinner } from "react-icons/fa";

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
  const [LinkComponent, setLinkComponent] = useState<(() => ReactElement) | null>(
    null
  );

  useEffect(() => {
    let mounted = true;
    setIsClient(true);

    Promise.all([import("@react-pdf/renderer"), import("./ProductListPDFDocument")])
      .then(([pdfModule, docModule]) => {
        if (!mounted) return;

        const { PDFDownloadLink } = pdfModule;
        const ProductListPDFDocument = docModule.default;

        const DownloadLink = () => (
          <PDFDownloadLink
            document={<ProductListPDFDocument products={products} />}
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
  }, [className, fileName, loadingLabel, products, readyLabel]);

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
