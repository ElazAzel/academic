/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PWARegister } from "@/components/lms/pwa-register";
import { Heartbeat } from "@/components/lms/heartbeat";
import { BackgroundAnimations } from "@/components/lms/background-animations";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AI Strategic Academy",
  description: "Закрытая LMS академии для AI-стратегии, потоков, кураторов и отчётности.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  icons: {
    icon: "/favicon.ico",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "AI Academy",
    statusBarStyle: "black-translucent",
    startupImage: [],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#1E3A5F",
    "msapplication-config": "none",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..200&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${jetBrainsMono.variable}`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-primary focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Перейти к содержимому
        </a>
        <BackgroundAnimations />
        <Providers>{children}</Providers>
        <PWARegister />
        <Heartbeat />
      </body>
    </html>
  );
}
