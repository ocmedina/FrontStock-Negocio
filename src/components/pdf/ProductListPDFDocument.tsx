"use client";

import { useEffect, useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import { supabase } from "@/lib/supabaseClient";

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
      fontWeight: "normal",
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 10,
    padding: 36,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 12,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 46, height: 46, objectFit: "contain" },
  logoPlaceholder: {
    width: 46,
    height: 46,
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  logoPlaceholderText: { fontSize: 8, color: "#64748b" },
  businessName: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  businessMeta: { fontSize: 9, color: "#64748b" },
  headerRight: { alignItems: "flex-end" },
  title: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  subtitle: { fontSize: 9, color: "#475569", marginTop: 2 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  rowAlt: { backgroundColor: "#f8fafc" },
  colName: { width: "58%" },
  colMinorista: { width: "21%", textAlign: "right" },
  colMayorista: { width: "21%", textAlign: "right" },
  cell: { fontSize: 9, color: "#0f172a" },
  emptyState: {
    padding: 16,
    textAlign: "center",
    color: "#64748b",
    fontSize: 10,
  },
});

type Product = {
  id: string;
  name?: string | null;
  price_minorista?: number | null;
  price_mayorista?: number | null;
};

export default function ProductListPDFDocument({
  products,
}: {
  products: Product[];
}) {
  const [settings, setSettings] = useState<Record<string, string>>({});

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

  const logoUrl = settings["logo_url"] || "";
  const businessName = settings["business_name"] || "FrontStock";
  const businessAddress = settings["business_address"] || "";
  const businessPhone = settings["business_phone"] || "";
  const formattedDate = new Date().toLocaleDateString("es-AR");

  const formatMoney = (value?: number | null) =>
    Number(value ?? 0).toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {logoUrl ? (
              <Image style={styles.logo} src={logoUrl} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>LOGO</Text>
              </View>
            )}
            <View>
              <Text style={styles.businessName}>{businessName}</Text>
              {businessAddress ? (
                <Text style={styles.businessMeta}>{businessAddress}</Text>
              ) : null}
              {businessPhone ? (
                <Text style={styles.businessMeta}>{businessPhone}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>Lista de productos</Text>
            <Text style={styles.subtitle}>Generado: {formattedDate}</Text>
            <Text style={styles.subtitle}>Total: {products.length}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colName]}>Producto</Text>
          <Text style={[styles.tableHeaderText, styles.colMinorista]}>
            Minorista
          </Text>
          <Text style={[styles.tableHeaderText, styles.colMayorista]}>
            Mayorista
          </Text>
        </View>

        {products.length === 0 ? (
          <Text style={styles.emptyState}>
            No hay productos seleccionados para imprimir.
          </Text>
        ) : (
          products.map((product, index) => (
            <View
              key={product.id}
              style={[styles.row, index % 2 === 1 ? styles.rowAlt : null]}
            >
              <Text style={[styles.cell, styles.colName]}>
                {product.name || "Producto sin nombre"}
              </Text>
              <Text style={[styles.cell, styles.colMinorista]}>
                ${formatMoney(product.price_minorista)}
              </Text>
              <Text style={[styles.cell, styles.colMayorista]}>
                ${formatMoney(product.price_mayorista)}
              </Text>
            </View>
          ))
        )}
      </Page>
    </Document>
  );
}
