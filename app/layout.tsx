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
  appleWebApp: {
    capable: true,
    title: "AI Academy",
    statusBarStyle: "black-translucent",
    startupImage: [],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-touch-fullscreen": "yes",
    "theme-color": "#1E3A5F",
    "theme-color-media-dark": "#0F172A",
    "msapplication-TileColor": "#1E3A5F",
    "msapplication-config": "none",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Viewport for proper mobile rendering */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        {/* PWA theme-color with media query for dark mode */}
        <meta name="theme-color" content="#F8FAFC" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0F172A" media="(prefers-color-scheme: dark)" />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-primary focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Перейти к содержимому
        </a>
        <Providers>{children}</Providers>
        <PWARegister />
      </body>
    </html>
  );
}
