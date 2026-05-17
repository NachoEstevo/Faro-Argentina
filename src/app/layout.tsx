import type { Metadata } from "next";
import { Funnel_Sans, Geist, Geist_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const funnelSans = Funnel_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--cf-font-heading-src",
  weight: ["400", "500", "600", "700"],
});

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--cf-font-body-src",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--cf-font-data-src",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Faro - No acusa, ilumina",
  description: "Mapa de pistas verificables para seguir dinero publico con fuentes oficiales.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${funnelSans.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
