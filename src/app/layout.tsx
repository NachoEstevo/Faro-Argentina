import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
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

const metadataBase = getMetadataBase();

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Faro - No acusa, ilumina",
    template: "%s | Faro",
  },
  description:
    "Expedientes verificables para seguir dinero público con fuentes oficiales, receipts, caveats y contexto territorial.",
  applicationName: "Faro",
  generator: "Next.js",
  keywords: [
    "Faro",
    "obra pública",
    "contrataciones públicas",
    "datos abiertos",
    "evidencia oficial",
    "rendición de cuentas",
  ],
  authors: [{ name: "Faro" }],
  creator: "Faro",
  publisher: "Faro",
  category: "civic technology",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Faro - No acusa, ilumina",
    description:
      "Scanner investigativo de expedientes verificables con fuentes oficiales, receipts y caveats.",
    siteName: "Faro",
    locale: "es_AR",
    type: "website",
    images: [
      {
        url: "/brand/faro-og.png",
        width: 1200,
        height: 630,
        alt: "Faro - No acusa, ilumina",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Faro - No acusa, ilumina",
    description:
      "Expedientes verificables para seguir dinero público con fuentes oficiales.",
    images: ["/brand/faro-og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

function getMetadataBase(): URL {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  try {
    return new URL(configuredUrl ?? "http://127.0.0.1:3002");
  } catch {
    return new URL("http://127.0.0.1:3002");
  }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html
        lang="es"
        className={`${funnelSans.variable} ${geist.variable} ${geistMono.variable}`}
      >
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
