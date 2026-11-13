import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: { default: "ELP Hub — EquityBCDC · Equity Leaders Program", template: "%s · ELP Hub" },
  description: "La plateforme de suivi du programme ELP : un dossier unique par élève, des statuts en temps réel et des relances automatiques.",
  appleWebApp: { capable: true, title: "ELP Hub", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#a32a29", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
