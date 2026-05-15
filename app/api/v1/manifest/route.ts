import { NextResponse } from "next/server";

const manifest = {
  name: "AI Strategic Academy",
  short_name: "AI Academy",
  description: "Закрытая LMS академии для AI-стратегии, потоков, кураторов и отчётности.",
  start_url: "/login",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#1E3A5F",
  orientation: "portrait-primary",
  lang: "ru",
  dir: "ltr",
  icons: [
    { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
  ],
};

export async function GET() {
  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
