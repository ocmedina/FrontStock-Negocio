'use client'

import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Asegúrate de tener la fuente Roboto registrada como en los otros PDFs
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
  ]
});

const styles = StyleSheet.create({
  page: { 
    fontFamily: 'Roboto', 
    fontSize: 9, 
    padding: 40, 
    color: '#000000' 
  },
  
  // Header Container layout (Open, no border)
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    minHeight: 90, 
    marginBottom: 8
  },
  headerLeft: { 
    width: '45%', 
    justifyContent: 'flex-start' 
  },
  logo: { 
    width: 90, 
    height: 'auto',
    marginBottom: 8 
  },
  companyName: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: '#000000',
    marginBottom: 3
  },
  companyDetail: { 
    fontSize: 8.5, 
    color: '#71717a', 
    marginTop: 2.5,
    lineHeight: 1.3
  },
  
  headerMiddle: { 
    width: '10%', 
    alignItems: 'center', 
    justifyContent: 'flex-start',
    paddingTop: 5
  },
  letterBox: { 
    width: 44, 
    height: 44, 
    borderWidth: 1, 
    borderColor: '#000000', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#ffffff'
  },
  letterText: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#000000'
  },
  codeText: { 
    fontSize: 7, 
    marginTop: 4, 
    textAlign: 'center', 
    color: '#000000' 
  },
  
  headerRight: { 
    width: '45%', 
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 5
  },
  invoiceTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#000000',
    marginBottom: 6,
    letterSpacing: 0.5
  },
  invoiceDetail: { 
    fontSize: 8.5, 
    marginVertical: 1.5, 
    color: '#000000',
    textAlign: 'right'
  },
  metaLabel: { 
    color: '#71717a',
    fontWeight: 'normal'
  },
  
  // Thick horizontal divider below header
  headerDivider: {
    height: 2,
    backgroundColor: '#000000',
    width: '100%',
    marginBottom: 20
  },

  // Customer info section (Grey rounded box)
  customerContainer: { 
    borderWidth: 1, 
    borderColor: '#e4e4e7', 
    borderRadius: 8, 
    padding: 15, 
    marginBottom: 25, 
    backgroundColor: '#f8fafc' 
  },
  customerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  customerCol: { 
    width: '48%',
    flexDirection: 'column'
  },
  customerBlock: {
    marginBottom: 8
  },
  customerLabel: { 
    fontSize: 8, 
    color: '#71717a', 
    marginBottom: 2 
  },
  customerValue: { 
    fontSize: 9.5, 
    fontWeight: 'bold', 
    color: '#000000' 
  },
  
  // Table styles (Open, clean design)
  table: { 
    width: '100%', 
    marginBottom: 20 
  },
  tableHeader: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#a1a1aa', 
    paddingBottom: 6, 
    fontWeight: 'bold',
    color: '#71717a'
  },
  tableRow: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e4e4e7', 
    paddingVertical: 8, 
    alignItems: 'center' 
  },
  
  colProduct: { width: '50%', textAlign: 'left', fontSize: 9, color: '#000000', paddingRight: 10 },
  colQty: { width: '12%', textAlign: 'right', fontSize: 9, color: '#000000' },
  colPrice: { width: '18%', textAlign: 'right', fontSize: 9, color: '#000000' },
  colTotal: { width: '20%', textAlign: 'right', fontSize: 9, color: '#000000', fontWeight: 'bold' },
  
  // Summary/Total on bottom right
  summaryContainer: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginTop: 10 
  },
  summaryBox: { 
    width: 250, 
    borderTopWidth: 1,
    borderColor: '#a1a1aa',
    paddingTop: 8
  },
  summaryRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 3, 
    fontSize: 8.5, 
    color: '#71717a' 
  },
  summaryTotalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 5
  },
  summaryTotalLabel: { 
    fontWeight: 'bold', 
    fontSize: 12, 
    color: '#000000' 
  },
  summaryTotalValue: { 
    fontWeight: 'bold', 
    fontSize: 14, 
    color: '#000000' 
  },
  
  footer: { 
    position: 'absolute', 
    bottom: 14, 
    left: 40, 
    right: 40, 
    borderTopWidth: 0.5, 
    borderColor: '#e2e8f0', 
    paddingTop: 3,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  footerDisclaimer: {
    fontSize: 6.5,
    color: '#94a3b8',
    textAlign: 'center'
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4
  },
  footerLogo: {
    width: 45,
    height: 45,
    opacity: 0.85,
    marginTop: -12,
    marginBottom: -12
  },
  footerText: { 
    fontSize: 7, 
    color: '#94a3b8',
    letterSpacing: 0.2
  },
  footerUrl: {
    fontSize: 7,
    color: '#64748b',
    letterSpacing: 0.3,
    fontWeight: 'bold'
  },
  fiscalWarning: { 
    fontSize: 7.5, 
    color: '#ef4444', 
    fontWeight: 'bold', 
    marginTop: 2, 
    textAlign: 'center', 
    textTransform: 'uppercase' 
  }
});

const formatPdfCurrency = (amount: number, includeDecimals = false) => {
  return "$ " + amount.toLocaleString("es-AR", { 
    minimumFractionDigits: includeDecimals ? 2 : 0, 
    maximumFractionDigits: 2 
  });
};

export default function InvoicePDFDocument({ invoiceData, settings }: { invoiceData: any, settings: any }) {
  const logoUrl = settings?.logo_url || null;

  const invoiceType = (invoiceData.invoice_type || invoiceData.customer_data?.invoice_type || 'B').toUpperCase();
  const customerCuit = invoiceData.customer_cuit || invoiceData.customer_data?.cuit || 'N/A';
  const customerIvaCondition = invoiceData.customer_iva_condition || invoiceData.customer_data?.iva_condition || 'Consumidor Final';
  const customerAddress = invoiceData.customer_data?.address || 'N/A';
  const customerLocality = invoiceData.customer_data?.locality || '';
  const customerProvince = invoiceData.customer_data?.province || '';
  const customerName = invoiceData.customer_data?.full_name || 'Cliente General';

  const voucherTitle = (invoiceData.customer_data?.voucher_name || 'Factura').toUpperCase();
  const observations = invoiceData.observations || invoiceData.customer_data?.observations || '';

  const isTypeA = invoiceType === 'A';
  const isTypeC = invoiceType === 'C';

  const totalAmount = invoiceData.total_amount || 0;
  let netAmountSum = 0;
  let vatAmountSum = 0;
  const vatBreakdown: Record<string, { rate: number; neto: number; iva: number }> = {};

  if (invoiceData.items_data && Array.isArray(invoiceData.items_data)) {
    invoiceData.items_data.forEach((item: any) => {
      const rateVal = item.taxRateVal !== undefined ? item.taxRateVal : 21.00;
      let itemNet = 0;
      let itemIva = 0;

      if (item.subtotal_neto !== undefined && item.iva_amount !== undefined) {
        itemNet = item.subtotal_neto;
        itemIva = item.iva_amount;
      } else {
        if (isTypeC) {
          itemNet = item.price * item.quantity;
          itemIva = 0;
        } else {
          itemNet = (item.price * item.quantity) / (1 + rateVal / 100);
          itemIva = (item.price * item.quantity) - itemNet;
        }
      }

      netAmountSum += itemNet;
      vatAmountSum += itemIva;

      const rateKey = rateVal.toFixed(1) + "%";
      if (!vatBreakdown[rateKey]) {
        vatBreakdown[rateKey] = { rate: rateVal, neto: 0, iva: 0 };
      }
      vatBreakdown[rateKey].neto += itemNet;
      vatBreakdown[rateKey].iva += itemIva;
    });
  }

  const getInvoiceCode = (type: string) => {
    switch (type) {
      case 'A': return 'COD. 001';
      case 'B': return 'COD. 006';
      case 'C': return 'COD. 011';
      default: return 'COD. 006';
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* COMPROBANTE CABECERA */}
        <View style={styles.headerContainer}>
          
          {/* LADO IZQUIERDO: EMISOR */}
          <View style={styles.headerLeft}>
            {logoUrl && <Image style={styles.logo} src={logoUrl} />}
            <Text style={styles.companyName}>{settings?.business_name || settings?.business_razon_social || 'Tu Negocio'}</Text>
            {settings?.business_fantasy_name && (
              <Text style={[styles.companyDetail, { fontStyle: 'italic' }]}>{settings.business_fantasy_name}</Text>
            )}
            <Text style={styles.companyDetail}>{settings?.business_address || 'Dirección no configurada'}</Text>
            <Text style={styles.companyDetail}>
              {settings?.business_locality || ''}
              {settings?.business_province ? ` - ${settings.business_province}` : ''}
            </Text>
            <Text style={styles.companyDetail}>
              {settings?.business_iva_condition || 'Responsable Inscripto'}
            </Text>
          </View>
          
          {/* CENTRO: LETRA IDENTIFICATORIA */}
          <View style={styles.headerMiddle}>
            <View style={styles.letterBox}>
              <Text style={styles.letterText}>{invoiceType}</Text>
            </View>
            <Text style={styles.codeText}>{getInvoiceCode(invoiceType)}</Text>
          </View>
          
          {/* LADO DERECHO: DETALLE DE FACTURA */}
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>{voucherTitle}</Text>
            <Text style={styles.invoiceDetail}>
              <Text style={styles.metaLabel}>N°: </Text>{invoiceData.invoice_number}
            </Text>
            <Text style={styles.invoiceDetail}>
              <Text style={styles.metaLabel}>Fecha: </Text>
              {new Date(invoiceData.created_at).toLocaleDateString('es-AR')}
            </Text>
            <Text style={styles.invoiceDetail}>
              <Text style={styles.metaLabel}>CUIT: </Text>
              {settings?.business_cuit || '30-00000000-9'}
            </Text>
            <Text style={styles.invoiceDetail}>
              <Text style={styles.metaLabel}>Ingresos Brutos: </Text>
              {settings?.business_iibb || 'Convenio Multilateral'}
            </Text>
            <Text style={styles.invoiceDetail}>
              <Text style={styles.metaLabel}>Inicio de Actividades: </Text>
              {settings?.business_start_date || '01/01/2026'}
            </Text>
          </View>
          
        </View>

        {/* Thick divider line */}
        <View style={styles.headerDivider} />

        {/* DATOS DEL CLIENTE / RECEPTOR */}
        <View style={styles.customerContainer}>
          <View style={styles.customerRow}>
            <View style={styles.customerCol}>
              <View style={styles.customerBlock}>
                <Text style={styles.customerLabel}>Cliente:</Text>
                <Text style={styles.customerValue}>{customerName}</Text>
              </View>
              <View style={styles.customerBlock}>
                <Text style={styles.customerLabel}>Condición IVA:</Text>
                <Text style={styles.customerValue}>{customerIvaCondition}</Text>
              </View>
            </View>
            
            <View style={styles.customerCol}>
              <View style={styles.customerBlock}>
                <Text style={styles.customerLabel}>CUIT / DNI:</Text>
                <Text style={styles.customerValue}>{customerCuit === 'N/A' || !customerCuit ? '-' : customerCuit}</Text>
              </View>
              <View style={styles.customerBlock}>
                <Text style={styles.customerLabel}>Condición de venta:</Text>
                <Text style={styles.customerValue}>Contado</Text>
              </View>
            </View>
          </View>
        </View>

        {/* TABLA DE DETALLES */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colProduct, { color: '#71717a', fontWeight: 'bold' }]}>Descripción</Text>
            <Text style={[styles.colQty, { color: '#71717a', fontWeight: 'bold' }]}>Cantidad</Text>
            <Text style={[styles.colPrice, { color: '#71717a', fontWeight: 'bold' }]}>Precio Unit.</Text>
            <Text style={[styles.colTotal, { color: '#71717a', fontWeight: 'bold' }]}>Subtotal</Text>
          </View>
          
          {invoiceData.items_data?.map((item: any, index: number) => {
            const rateVal = item.taxRateVal !== undefined ? item.taxRateVal : 21.00;
            const unitPrice = isTypeA 
              ? (item.subtotal_neto !== undefined ? (item.subtotal_neto / item.quantity) : (item.price / (1 + rateVal / 100))) 
              : item.price;
            const subtotal = unitPrice * item.quantity;

            return (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.colProduct}>{item.name ?? 'N/A'}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>{formatPdfCurrency(unitPrice)}</Text>
                <Text style={styles.colTotal}>{formatPdfCurrency(subtotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* OBSERVACIONES */}
        {observations ? (
          <View style={{ marginTop: 10, padding: 8, border: 1, borderColor: '#e4e4e7', backgroundColor: '#f8fafc', borderRadius: 6 }}>
            <Text style={{ fontSize: 7.5, fontWeight: 'bold', textTransform: 'uppercase', color: '#71717a', marginBottom: 2 }}>Observaciones:</Text>
            <Text style={{ fontSize: 8.5, color: '#000000', lineHeight: 1.3 }}>{observations}</Text>
          </View>
        ) : null}

        {/* RESUMEN DE IMPORTES */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            {isTypeA && (
              <>
                <View style={styles.summaryRow}>
                  <Text>Subtotal Neto Gravado:</Text>
                  <Text>{formatPdfCurrency(netAmountSum, true)}</Text>
                </View>
                {Object.values(vatBreakdown).map((b: any, idx: number) => (
                  <View key={idx} style={styles.summaryRow}>
                    <Text>IVA ({b.rate}%):</Text>
                    <Text>{formatPdfCurrency(b.iva, true)}</Text>
                  </View>
                ))}
              </>
            )}
            
            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>TOTAL:</Text>
              <Text style={styles.summaryTotalValue}>{formatPdfCurrency(totalAmount, true)}</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          {/* Aviso legal */}
          <Text style={styles.footerDisclaimer}>
            Comprobante no válido como factura fiscal. No registrado ante AFIP.
          </Text>
          {/* Marca del sistema */}
          <View style={styles.footerRow}>
            <Image
              style={styles.footerLogo}
              src={typeof window !== 'undefined'
                ? `${window.location.origin}/frontio-logo.png`
                : '/frontio-logo.png'}
            />
            <Text style={styles.footerText}>Diseñado por Frontio Web Solutions</Text>
            <Text style={styles.footerText}>·</Text>
            <Text style={styles.footerUrl}>www.frontio.com.ar</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}