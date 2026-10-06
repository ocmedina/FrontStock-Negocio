'use client';

export type PrinterPaperFormat = 'thermal_80mm' | 'thermal_58mm' | 'a4';

export interface TerminalPrinterSettings {
  format: PrinterPaperFormat;
  autoPrintAfterSale: boolean;
  printCopies: number;
  headerNote?: string;
  footerNote?: string;
}

const DEFAULT_SETTINGS: TerminalPrinterSettings = {
  format: 'thermal_80mm',
  autoPrintAfterSale: false,
  printCopies: 1,
  footerNote: '¡Gracias por su compra!',
};

export function getTerminalPrinterSettings(registerId?: number | null): TerminalPrinterSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const key = `frontstock_printer_cfg_${registerId || 'default'}`;
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveTerminalPrinterSettings(
  registerId: number | null | undefined,
  settings: Partial<TerminalPrinterSettings>
): TerminalPrinterSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const current = getTerminalPrinterSettings(registerId);
    const updated = { ...current, ...settings };
    const key = `frontstock_printer_cfg_${registerId || 'default'}`;
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
