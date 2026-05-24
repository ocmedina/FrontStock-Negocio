
"use client";

import { useEffect, useState } from "react";
import {
  Page,
  Text,
  View,
  Document,
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
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf",
      fontStyle: "italic",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 10,
    padding: 40,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#333",
  },
  logo: { width: 70, height: 70, objectFit: "contain" },
  companyInfo: { textAlign: "right" },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 4,
  },
  companyAddress: { fontSize: 9, color: "#555", lineHeight: 1.4 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#111",
    marginBottom: 25,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    padding: 14,
    borderRadius: 4,
    marginBottom: 20,
    fontSize: 9,
  },
  metaInfoItem: { flexDirection: "column" },
  metaLabel: {
    fontWeight: "bold",
    fontSize: 8,
    color: "#666",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 10, color: "#111" },
  customerSection: { marginBottom: 20 },
  customerTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 10,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 4,
  },
  customerInfoBox: {
    backgroundColor: "#fafafa",
    padding: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  customerRow: { flexDirection: "row", marginBottom: 6 },
  customerLabel: { fontSize: 9, fontWeight: "bold", color: "#555", width: 80 },
  customerValue: { fontSize: 9, color: "#111", flex: 1 },
  table: { width: "100%", marginTop: 10 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 2,
  },
  tableHeaderText: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 9,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    minHeight: 28,
  },
  thProduct: { width: "50%" },
  thQty: { width: "15%", textAlign: "center" },
  thPrice: { width: "17.5%", textAlign: "right" },
  thTotal: { width: "17.5%", textAlign: "right" },
  tdProduct: { width: "50%", padding: 8, fontSize: 9 },
  tdQty: { width: "15%", padding: 8, textAlign: "center", fontSize: 9 },
  tdPrice: { width: "17.5%", padding: 8, textAlign: "right", fontSize: 9 },
  tdTotal: {
    width: "17.5%",
    padding: 8,
    textAlign: "right",
    fontSize: 9,
    fontWeight: "bold",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 25,
  },
  summaryBox: {
    width: 200,
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  summaryLabel: { color: "#555", fontSize: 10 },
  summaryTotal: { fontWeight: "bold", fontSize: 16, color: "#111" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#999",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  thankYou: { fontWeight: "bold", fontSize: 10, color: "#555" },
});

export default function SalePDFDocument({ sale }: { sale: any }) {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const query = supabase
          .from("settings")
          .select("key, value");

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("TIMEOUT_FORZADO")), 2000);
        });

        const result = await Promise.race([query, timeoutPromise]) as any;
        const data = result?.data;
        const error = result?.error;

        if (error) {
          console.error("Error cargando settings:", error);
        } else if (data) {
          const mapped = Object.fromEntries(
            data.map((item: any) => [item.key, item.value])
          );
          setSettings(mapped);
        }
      } catch (error: any) {
        if (error.message === "TIMEOUT_FORZADO") {
          window.location.reload();
        } else {
          console.error("Error cargando settings:", error);
        }
      }
    };
    fetchSettings();
  }, []);

  const logoUrl = settings["logo_url"] || "https://via.placeholder.com/150";
  const nombre = settings["business_name"] || "FrontStock";
  const direccion = settings["business_address"] || "Calle Falsa 123, Ciudad";
  const telefono = settings["business_phone"] || "0000-000000";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 🔹 Encabezado */}
        <View style={styles.header}>
          <Image style={styles.logo} src={logoUrl} />
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{nombre}</Text>
            <Text style={styles.companyAddress}>{direccion}</Text>
            <Text style={styles.companyAddress}>{telefono}</Text>
          </View>
        </View>

        <Text style={styles.title}>Ticket de Venta</Text>

        {/* Datos de la venta */}
        <View style={styles.metaInfo}>
          <View style={styles.metaInfoItem}>
            <Text style={styles.metaLabel}>Número de Venta</Text>
            <Text style={styles.metaValue}>
              {sale.id?.substring(0, 8).toUpperCase()}
            </Text>
          </View>
          <View style={styles.metaInfoItem}>
            <Text style={styles.metaLabel}>Fecha de Emisión</Text>
            <Text style={styles.metaValue}>
              {new Date(sale.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.metaInfoItem}>
            <Text style={styles.metaLabel}>Hora</Text>
            <Text style={styles.metaValue}>
              {new Date(sale.created_at).toLocaleTimeString()}
            </Text>
          </View>
        </View>

        {/* Información del Cliente */}
        <View style={styles.customerSection}>
          <Text style={styles.customerTitle}>Información del Cliente</Text>
          <View style={styles.customerInfoBox}>
            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>Nombre:</Text>
              <Text style={styles.customerValue}>
                {sale.customers?.full_name ?? "Consumidor Final"}
              </Text>
            </View>
            {sale.customers?.customer_type && (
              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Tipo Cliente:</Text>
                <Text style={styles.customerValue}>
                  {sale.customers.customer_type === "minorista"
                    ? "Consumidor Final"
                    : sale.customers.customer_type === "mayorista"
                      ? "Mayorista"
                      : sale.customers.customer_type}
                </Text>
              </View>
            )}
            {sale.customers?.phone && (
              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Teléfono:</Text>
                <Text style={styles.customerValue}>
                  {sale.customers.phone}
                </Text>
              </View>
            )}
            {sale.customers?.address && (
              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Dirección:</Text>
                <Text style={styles.customerValue}>
                  {sale.customers.address}
                </Text>
              </View>
            )}
            {sale.customers?.reference && (
              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Referencia:</Text>
                <Text style={styles.customerValue}>
                  {sale.customers.reference}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Tabla de productos */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.thProduct]}>
              Producto
            </Text>
            <Text style={[styles.tableHeaderText, styles.thQty]}>Cantidad</Text>
            <Text style={[styles.tableHeaderText, styles.thPrice]}>
              Precio Unit.
            </Text>
            <Text style={[styles.tableHeaderText, styles.thTotal]}>
              Subtotal
            </Text>
          </View>
          {(sale.sale_items || []).map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tdProduct}>
                {item.products?.name ?? "N/A"}
              </Text>
              <Text style={styles.tdQty}>{item.quantity}</Text>
              <Text style={styles.tdPrice}>${item.price?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <Text style={styles.tdTotal}>
                ${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>TOTAL A PAGAR</Text>
              <Text style={styles.summaryTotal}>
                ${sale.total_amount?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Pie */}
        <View style={styles.footer}>
          <Text style={styles.thankYou}>¡Gracias por su compra!</Text>
          <Text style={{ fontSize: 8, marginTop: 4 }}>
            Este documento es un comprobante de venta
          </Text>
        </View>
      </Page>
    </Document>
  );
}