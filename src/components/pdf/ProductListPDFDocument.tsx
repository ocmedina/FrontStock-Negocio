"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";

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
    fontSize: 9,
    paddingTop: 45,
    paddingBottom: 55,
    paddingHorizontal: 40,
    backgroundColor: "#ffffff",
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#4f46e5", // Indigo accent line at the very top
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 16,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    objectFit: "cover",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  logoPlaceholderText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#64748b",
  },
  businessInfo: {
    flexDirection: "column",
    justifyContent: "center",
  },
  businessName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 2,
  },
  businessMeta: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 1,
  },
  headerRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4f46e5", // Indigo title
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 8,
    color: "#475569",
    marginTop: 1,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 2,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  tableHeaderText: {
    color: "#475569",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rowAlt: {
    backgroundColor: "#fafafa",
  },
  colSku: {
    width: "18%",
  },
  colName: {
    width: "46%",
  },
  colMinorista: {
    width: "18%",
    textAlign: "right",
  },
  colMayorista: {
    width: "18%",
    textAlign: "right",
  },
  cellSku: {
    fontSize: 8,
    color: "#64748b",
    fontFamily: "Roboto",
  },
  cellName: {
    fontSize: 9,
    fontWeight: "normal",
    color: "#1e293b",
  },
  cellPrice: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
  },
  emptyState: {
    padding: 24,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7.5,
    color: "#94a3b8",
  },
  pageNumber: {
    fontSize: 7.5,
    color: "#94a3b8",
    textAlign: "right",
  },
});

type Product = {
  id: string;
  sku?: string | null;
  name?: string | null;
  price_minorista?: number | null;
  price_mayorista?: number | null;
};

export default function ProductListPDFDocument({
  products,
  settings = {},
}: {
  products: Product[];
  settings?: Record<string, string>;
}) {
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
        {/* Accent Top Border */}
        <View style={styles.accentBar} />

        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            {logoUrl ? (
              <Image style={styles.logo} src={logoUrl} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>FS</Text>
              </View>
            )}
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{businessName}</Text>
              {businessAddress ? (
                <Text style={styles.businessMeta}>{businessAddress}</Text>
              ) : null}
              {businessPhone ? (
                <Text style={styles.businessMeta}>Tel: {businessPhone}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>Catálogo de Productos</Text>
            <Text style={styles.subtitle}>Fecha: {formattedDate}</Text>
            <Text style={styles.subtitle}>Items: {products.length}</Text>
          </View>
        </View>

        {/* Products Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colSku]}>SKU / Código</Text>
          <Text style={[styles.tableHeaderText, styles.colName]}>Descripción del Producto</Text>
          <Text style={[styles.tableHeaderText, styles.colMinorista]}>P. Minorista</Text>
          <Text style={[styles.tableHeaderText, styles.colMayorista]}>P. Mayorista</Text>
        </View>

        {/* Table Rows */}
        {products.length === 0 ? (
          <Text style={styles.emptyState}>
            No hay productos seleccionados en este catálogo.
          </Text>
        ) : (
          products.map((product, index) => (
            <View
              key={product.id}
              style={[styles.row, index % 2 === 1 ? styles.rowAlt : null]}
            >
              <Text style={[styles.cellSku, styles.colSku]}>
                {product.sku || "-"}
              </Text>
              <Text style={[styles.cellName, styles.colName]}>
                {product.name || "Producto sin nombre"}
              </Text>
              <Text style={[styles.cellPrice, styles.colMinorista]}>
                ${formatMoney(product.price_minorista)}
              </Text>
              <Text style={[styles.cellPrice, styles.colMayorista]}>
                ${formatMoney(product.price_mayorista)}
              </Text>
            </View>
          ))
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {businessName} | Catálogo Oficial de Precios
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
