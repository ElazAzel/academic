/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { headers, cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PWARegister } from "@/components/lms/pwa-register";
import { Heartbeat } from "@/components/lms/heartbeat";
import { createBrandingCssVariables, getRuntimeBranding, generateBrandingCss } from "@/server/modules/branding/service";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
  display: "swap",
  variable: "--font-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getRuntimeBranding();
  return {
    title: branding.name,
    description: branding.metadataDescription,
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    manifest: "/manifest.webmanifest",
    icons: {
      icon: branding.logoUrl || "/favicon.ico",
      apple: branding.logoUrl || "/icon.svg",
    },
    appleWebApp: {
      capable: true,
      title: branding.shortName,
      statusBarStyle: "black-translucent",
      startupImage: [],
    },
    other: {
      "mobile-web-app-capable": "yes",
      "msapplication-TileColor": branding.primaryColor,
      "msapplication-config": "none",
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const branding = await getRuntimeBranding();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: branding.backgroundColor },
      { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
    ],
  };
}

// ── CSP policy builder (sync с proxy.ts) ──────────────────────────────
// Должен быть идентичен buildCspPolicy() в proxy.ts
function buildCspPolicy(nonce: string, isDev: boolean): string {
  const devExtra = isDev ? " 'unsafe-eval'" : "";
  const scriptHashes = [
    "'sha256-J9cZHZf5nVZbsm7Pqxc8RsURv1AIXkMgbhfrZvoOs/A='",
    "'sha256-UnthrFpGFotkvMOTp/ghVMSXoZZj9Y6epaMsaBAbUtg='",
  ].join(" ");
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self' ${scriptHashes}${devExtra}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https: wss:",
    "frame-src https://www.youtube.com https://player.vimeo.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "report-uri /api/v1/csp-report",
  ].join("; ");
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Nonce пробрасывается из middleware через x-nonce request header.
  // На Vercel Edge → Serverless Function заголовок может не дойти,
  // поэтому fallback на генерацию прямо в layout.
  const nonce = (await headers()).get("x-nonce")
    ?? (await cookies()).get("__academy_nonce")?.value
    ?? crypto.randomUUID();
  const branding = await getRuntimeBranding();
  
  const fontSansFamily = branding.fontSans;
  const fontHeadingFamily = branding.fontHeading;
  const fontMonoFamily = branding.fontMono;

  const families = [];
  families.push(`family=${encodeURIComponent(fontSansFamily)}:wght@300;400;500;600;700`);
  if (fontHeadingFamily !== fontSansFamily) {
    families.push(`family=${encodeURIComponent(fontHeadingFamily)}:wght@300;400;500;600;700`);
  }
  if (fontMonoFamily !== fontSansFamily && fontMonoFamily !== fontHeadingFamily) {
    families.push(`family=${encodeURIComponent(fontMonoFamily)}:wght@400;500`);
  }
  const googleFontsUrl = `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;

  return (
    <html lang="ru" nonce={nonce} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link href={googleFontsUrl} rel="stylesheet" nonce={nonce} />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..200&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..200&display=swap"
          rel="stylesheet"
          nonce={nonce}
        />
        <style
          id="academy-branding-css"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: generateBrandingCss(branding) }}
        />
        {/* CSP via meta tag (not middleware header) — гарантирует работу
            на Vercel, где Edge → Serverless Function header propagation
            ненадёжен. Дублирует политику из proxy.ts. */}
        <meta
          httpEquiv="Content-Security-Policy"
          nonce={nonce}
          content={buildCspPolicy(nonce, process.env.NODE_ENV === "development")}
        />
      </head>
      <body className={`${inter.variable} ${jetBrainsMono.variable}`}>
        <a
          href="#main-content"
          aria-label="Перейти к основному содержимому"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-m3-modal focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Перейти к содержимому
        </a>
        <Providers>
          <div id="main-content" role="main" tabIndex={-1} className="outline-none">
            {children}
          </div>
          <PWARegister brandName={branding.name} />
          <Heartbeat />
        </Providers>
      </body>
    </html>
  );
}
