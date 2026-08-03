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
import { PriceList } from "@/types/priceList";

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
    backgroundColor: "#4f46e5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
    fontSize: 10,
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
    color: "#4f46e5",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 8,
    color: "#475569",
    marginTop: 1,
  },
  customerBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  customerLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "bold",
    marginBottom: 2,
  },
  customerValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0f172a",
  },
  customerMeta: {
    fontSize: 8,
    color: "#475569",
    marginTop: 2,
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

interface PriceListPDFDocumentProps {
  priceList: PriceList;
  settings?: Record<string, string>;
}

export default function PriceListPDFDocument({
  priceList,
  settings = {},
}: PriceListPDFDocumentProps) {
  const logoUrl = settings["logo_url"] || "";
  const businessName = settings["business_name"] || "FrontStock";
  const businessAddress = settings["business_address"] || "";
  const businessPhone = settings["business_phone"] || "";

  const createdDate = priceList.created_at
    ? new Date(priceList.created_at).toLocaleDateString("es-AR")
    : new Date().toLocaleDateString("es-AR");

  const validUntilDate = priceList.valid_until
    ? new Date(priceList.valid_until).toLocaleDateString("es-AR")
    : null;

  const items = priceList.items || [];

  const formatMoney = (value?: number | null) =>
    Number(value ?? 0).toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
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
            <Text style={styles.title}>LISTA DE PRECIOS</Text>
            <Text style={styles.subtitle}>Emisión: {createdDate}</Text>
            {validUntilDate && (
              <Text style={styles.subtitle}>Válida hasta: {validUntilDate}</Text>
            )}
          </View>
        </View>

        {/* Customer & List Info Box */}
        <View style={styles.customerBox}>
          <View>
            <Text style={styles.customerLabel}>Lista de Precios</Text>
            <Text style={styles.customerValue}>{priceList.name}</Text>
            {priceList.description && (
              <Text style={styles.customerMeta}>{priceList.description}</Text>
            )}
          </View>
          {priceList.customer && (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.customerLabel}>Cliente Destinatario</Text>
              <Text style={styles.customerValue}>
                {priceList.customer.full_name}
              </Text>
              {priceList.customer.phone && (
                <Text style={styles.customerMeta}>
                  Tel: {priceList.customer.phone}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Products Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colSku]}>SKU</Text>
          <Text style={[styles.tableHeaderText, styles.colName]}>
            Descripción del Producto
          </Text>
          <Text style={[styles.tableHeaderText, styles.colMinorista]}>
            P. Minorista
          </Text>
          <Text style={[styles.tableHeaderText, styles.colMayorista]}>
            P. Mayorista
          </Text>
        </View>

        {/* Table Rows */}
        {items.length === 0 ? (
          <Text style={styles.emptyState}>
            No hay productos cargados en esta lista de precios.
          </Text>
        ) : (
          items.map((item, index) => (
            <View
              key={item.id || index}
              style={[styles.row, index % 2 === 1 ? styles.rowAlt : null]}
            >
              <Text style={[styles.cellSku, styles.colSku]}>
                {item.product?.sku || "-"}
              </Text>
              <Text style={[styles.cellName, styles.colName]}>
                {item.product?.name || "Producto sin nombre"}
              </Text>
              <Text style={[styles.cellPrice, styles.colMinorista]}>
                ${formatMoney(item.custom_price_minorista)}
              </Text>
              <Text style={[styles.cellPrice, styles.colMayorista]}>
                ${formatMoney(item.custom_price_mayorista)}
              </Text>
            </View>
          ))
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {businessName} | Documento Oficial de Precios Personalizados
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
