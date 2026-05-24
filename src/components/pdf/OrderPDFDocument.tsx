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
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "#1d4ed8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 10,
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  logo: { width: 62, height: 62, objectFit: "contain" },
  companyInfo: { textAlign: "right" },
  companyName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 3,
  },
  companyAddress: { fontSize: 9, color: "#475569", lineHeight: 1.35 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    color: "#0f172a",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 9,
    color: "#64748b",
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 9,
  },
  metaInfoItem: { flexDirection: "column", flex: 1 },
  metaInfoDivider: {
    width: 1,
    marginHorizontal: 10,
    backgroundColor: "#e2e8f0",
  },
  metaLabel: {
    fontWeight: "bold",
    fontSize: 8,
    color: "#64748b",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 10, color: "#0f172a" },
  customerSection: { marginBottom: 16 },
  customerTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  customerInfoBox: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  customerRow: { flexDirection: "row", marginBottom: 5 },
  customerLabel: { fontSize: 9, fontWeight: "bold", color: "#64748b", width: 82 },
  customerValue: { fontSize: 9, color: "#0f172a", flex: 1 },
  debtBox: {
    marginTop: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    borderRadius: 6,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  debtLabel: { fontSize: 10, fontWeight: "bold", color: "#b91c1c" },
  debtAmount: { fontSize: 13, fontWeight: "bold", color: "#b91c1c" },
  table: { width: "100%", marginTop: 6 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tableHeaderText: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 8,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    alignItems: "center",
    minHeight: 30,
    paddingHorizontal: 10,
  },
  tableRowAlt: {
    backgroundColor: "#f8fafc",
  },
  thProduct: { width: "50%" },
  thQty: { width: "15%", textAlign: "center" },
  thPrice: { width: "17.5%", textAlign: "right" },
  thTotal: { width: "17.5%", textAlign: "right" },
  tdProduct: { width: "50%", paddingVertical: 8, fontSize: 9, color: "#0f172a" },
  tdQty: { width: "15%", paddingVertical: 8, textAlign: "center", fontSize: 9, color: "#334155" },
  tdPrice: { width: "17.5%", paddingVertical: 8, textAlign: "right", fontSize: 9, color: "#334155" },
  tdTotal: {
    width: "17.5%",
    paddingVertical: 8,
    textAlign: "right",
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 18,
  },
  summaryBox: {
    width: 220,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 12,
    borderRadius: 6,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  summaryLabel: { color: "#1e40af", fontSize: 10, fontWeight: "bold" },
  summaryTotal: { fontWeight: "bold", fontSize: 17, color: "#1e3a8a" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#64748b",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
  },
  thankYou: { fontWeight: "bold", fontSize: 10, color: "#334155" },
});

export default function OrderPDFDocument({ order }: { order: any }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const documentTitle = order?.document_title || "Remito de Pedido";
  const documentNumberLabel =
    order?.document_number_label || "Número de Pedido";
  const documentFooterNote =
    order?.document_footer_note || "Este documento es un comprobante de pedido";
  const isBudgetDocument =
    String(documentTitle).toLowerCase().includes("presupuesto");
  const thankYouText = isBudgetDocument
    ? "Gracias por su consulta"
    : "¡Gracias por su compra!";

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
        <View style={styles.topAccent} />
        {/* 🔹 Encabezado */}
        <View style={styles.header}>
          <Image style={styles.logo} src={logoUrl} />
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{nombre}</Text>
            <Text style={styles.companyAddress}>{direccion}</Text>
            <Text style={styles.companyAddress}>{telefono}</Text>
          </View>
        </View>

        <Text style={styles.title}>{documentTitle}</Text>
        <Text style={styles.subtitle}>Documento comercial generado por sistema</Text>

        {/* Datos del pedido */}
        <View style={styles.metaInfo}>
          <View style={styles.metaInfoItem}>
            <Text style={styles.metaLabel}>{documentNumberLabel}</Text>
            <Text style={styles.metaValue}>
              {order.id?.substring(0, 8).toUpperCase()}
            </Text>
          </View>
          <View style={styles.metaInfoDivider} />
          <View style={styles.metaInfoItem}>
            <Text style={styles.metaLabel}>Fecha de Emisión</Text>
            <Text style={styles.metaValue}>
              {new Date(order.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.metaInfoDivider} />
          <View style={styles.metaInfoItem}>
            <Text style={styles.metaLabel}>Hora</Text>
            <Text style={styles.metaValue}>
              {new Date(order.created_at).toLocaleTimeString()}
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
                {order.customers?.full_name ?? "N/A"}
              </Text>
            </View>
            {order.customers?.customer_type && (
              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Tipo Cliente:</Text>
                <Text style={styles.customerValue}>
                  {order.customers.customer_type === "minorista"
                    ? "Consumidor Final"
                    : order.customers.customer_type === "mayorista"
                    ? "Mayorista"
                    : order.customers.customer_type}
                </Text>
              </View>
            )}
            {order.customers?.phone && (
              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Teléfono:</Text>
                <Text style={styles.customerValue}>
                  {order.customers.phone}
                </Text>
              </View>
            )}
            {order.customers?.address && (
              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Dirección:</Text>
                <Text style={styles.customerValue}>
                  {order.customers.address}
                </Text>
              </View>
            )}
            {order.customers?.reference && (
              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Referencia:</Text>
                <Text style={styles.customerValue}>
                  {order.customers.reference}
                </Text>
              </View>
            )}
          </View>
          {/* Deuda real del cliente (calculada desde pedidos y ventas pendientes) */}
          <View style={styles.debtBox}>
            <Text style={styles.debtLabel}>⚠ Deuda pendiente del cliente:</Text>
            <Text style={styles.debtAmount}>
              ${Number(order.customers?.realDebt ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
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
          {(order.order_items || []).map((item: any, index: number) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 !== 0 ? styles.tableRowAlt : {}]}
            >
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
              <Text style={styles.summaryLabel}>TOTAL</Text>
              <Text style={styles.summaryTotal}>
                ${order.total_amount?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Pie */}
        <View style={styles.footer}>
          <Text style={styles.thankYou}>{thankYouText}</Text>
          <Text style={{ fontSize: 8, marginTop: 4 }}>
            {documentFooterNote}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
