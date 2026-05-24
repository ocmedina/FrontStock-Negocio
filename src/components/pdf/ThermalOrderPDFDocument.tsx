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
  ],
});

// 80mm = 226.77pt (ancho)
const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9,
    padding: 12,
    backgroundColor: "#fff",
    width: 226.77,
  },
  header: {
    textAlign: "center",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: "#000",
  },
  logo: {
    width: 45,
    height: 45,
    objectFit: "contain",
    alignSelf: "center",
    marginBottom: 4,
  },
  companyName: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  companyInfo: {
    fontSize: 7,
    color: "#444",
    marginBottom: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 6,
    backgroundColor: "#000",
    color: "#fff",
    padding: 4,
  },
  orderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    borderBottomStyle: "dashed",
  },
  orderInfoItem: {
    fontSize: 7,
  },
  orderInfoLabel: {
    fontWeight: "bold",
    fontSize: 7,
  },
  customerSection: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    borderBottomStyle: "dashed",
  },
  customerTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  customerRow: {
    fontSize: 8,
    marginBottom: 2,
  },
  customerLabel: {
    fontWeight: "bold",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 4,
    fontWeight: "bold",
    fontSize: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    fontSize: 7,
  },
  colProduct: {
    width: "48%",
    paddingRight: 2,
  },
  colQty: {
    width: "15%",
    textAlign: "center",
  },
  colPrice: {
    width: "18.5%",
    textAlign: "right",
    paddingRight: 2,
  },
  colTotal: {
    width: "18.5%",
    textAlign: "right",
  },
  totalSection: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 2,
    borderTopColor: "#000",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: "bold",
  },
  footer: {
    textAlign: "center",
    fontSize: 7,
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#000",
    borderTopStyle: "dashed",
  },
  footerText: {
    marginBottom: 2,
  },
  thankYou: {
    fontWeight: "bold",
    fontSize: 8,
  },
  debtSection: {
    marginTop: 6,
    marginBottom: 6,
    padding: 6,
    borderWidth: 1.5,
    borderColor: "#000",
    borderStyle: "dashed",
  },
  debtTitle: {
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 3,
  },
  debtRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  debtLabel: {
    fontSize: 9,
    fontWeight: "bold",
  },
  debtAmount: {
    fontSize: 10,
    fontWeight: "bold",
  },
});

export default function ThermalOrderPDFDocument({ order }: { order: any }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const documentTitle = order?.document_title || "REMITO DE PEDIDO";
  const documentNumberLabel = order?.document_number_label || "Pedido #";
  const documentFooterNote =
    order?.document_footer_note || "Conserve este comprobante";

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
      <Page size={{ width: 226.77, height: 841.89 }} style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Image style={styles.logo} src={logoUrl} />
          <Text style={styles.companyName}>{nombre}</Text>
          <Text style={styles.companyInfo}>{direccion}</Text>
          <Text style={styles.companyInfo}>{telefono}</Text>
        </View>

        <Text style={styles.title}>{documentTitle.toUpperCase()}</Text>

        {/* Info del pedido */}
        <View style={styles.orderInfo}>
          <View>
            <Text style={styles.orderInfoLabel}>{documentNumberLabel}</Text>
            <Text style={styles.orderInfoItem}>
              {order.id?.substring(0, 8).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.orderInfoLabel}>Fecha</Text>
            <Text style={styles.orderInfoItem}>
              {new Date(order.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Cliente */}
        <View style={styles.customerSection}>
          <Text style={styles.customerTitle}>Cliente</Text>
          <Text style={styles.customerRow}>
            <Text style={styles.customerLabel}>Nombre: </Text>
            {order.customers?.full_name ?? "N/A"}
          </Text>
          {order.customers?.customer_type && (
            <Text style={styles.customerRow}>
              <Text style={styles.customerLabel}>Tipo: </Text>
              {order.customers.customer_type === "minorista"
                ? "Consumidor Final"
                : order.customers.customer_type === "mayorista"
                ? "Mayorista"
                : order.customers.customer_type}
            </Text>
          )}
          {order.customers?.phone && (
            <Text style={styles.customerRow}>
              <Text style={styles.customerLabel}>Tel: </Text>
              {order.customers.phone}
            </Text>
          )}
          {order.customers?.address && (
            <Text style={styles.customerRow}>
              <Text style={styles.customerLabel}>Dir: </Text>
              {order.customers.address}
            </Text>
          )}
          {order.customers?.reference && (
            <Text style={styles.customerRow}>
              <Text style={styles.customerLabel}>Ref: </Text>
              {order.customers.reference}
            </Text>
          )}
        </View>

        {/* Deuda real del cliente (calculada desde pedidos y ventas pendientes) */}
        <View style={styles.debtSection}>
          <Text style={styles.debtTitle}>*** SALDO DEL CLIENTE ***</Text>
          <View style={styles.debtRow}>
            <Text style={styles.debtLabel}>Saldo adeudado:</Text>
            <Text style={styles.debtAmount}>
              ${Number(order.customers?.realDebt ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Tabla de productos */}
        <View style={styles.tableHeader}>
          <Text style={styles.colProduct}>Producto</Text>
          <Text style={styles.colQty}>Cant.</Text>
          <Text style={styles.colPrice}>P.Unit</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>

        {(order.order_items || []).map((item: any, index: number) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.colProduct}>
              {item.products?.name ?? "N/A"}
            </Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>${item.price?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <Text style={styles.colTotal}>
              ${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalAmount}>
              ${order.total_amount?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Pie */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{documentFooterNote}</Text>
          <Text style={styles.thankYou}>¡Gracias por su compra!</Text>
        </View>
      </Page>
    </Document>
  );
}
