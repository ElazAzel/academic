import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PWARegister } from "@/components/lms/pwa-register";

export const metadata: Metadata = {
  title: "AI Strategic Academy",
  description: "Закрытая LMS академии для AI-стратегии, потоков, кураторов и отчётности.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  icons: {
    icon: "/favicon.ico",
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "AI Academy",
    statusBarStyle: "default",
  },
  other: {
    "theme-color": "#1E3A5F",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        <Providers>{children}</Providers>
        <PWARegister />
      </body>
    </html>
  );
}

