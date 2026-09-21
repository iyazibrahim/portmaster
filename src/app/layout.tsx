import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import "./globals.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TiangPass — Penang Bridge fishing ops",
  description:
    "Book a bridge location, pick your boat seats, check in with QR. Ops app for Penang Bridge anglers and boatmen.",
  applicationName: "TiangPass",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TiangPass",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c2340",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${newsreader.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <PwaRegister />
        <PwaInstallBanner />
        <CookieConsentBanner />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
