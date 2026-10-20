// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import ConditionalChristmasDecorations from "@/components/ConditionalChristmasDecorations";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FrontStock",
  description: "Sistema de Gestión de Stock y Ventas",
  manifest: "/manifest.json",
  icons: {
    icon: "/Logo-nuevo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <ConditionalChristmasDecorations
            density="heavy"
            showSnow={true}
            showLights={true}
            showFloating={false}
          />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: "#333",
                color: "#fff",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
