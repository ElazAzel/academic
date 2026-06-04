import type { MetadataRoute } from "next";
import { getRuntimeBranding } from "@/server/modules/branding/service";

function getIconMimeType(url: string): string {
  const lower = url.toLowerCase().trim();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".ico")) return "image/x-icon";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/svg+xml";
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await getRuntimeBranding();
  const icon = branding.logoUrl || "/icon.svg";
  const iconType = getIconMimeType(icon);

  return {
    name: branding.name,
    short_name: branding.shortName,
    description: branding.metadataDescription,
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: branding.backgroundColor,
    theme_color: branding.primaryColor,
    lang: "ru",
    scope: "/",
    categories: ["education", "productivity"],
    prefer_related_applications: false,
    icons: [
      { src: icon, sizes: "any", type: iconType, purpose: "any" },
      {
        src: icon,
        sizes: "48x48 72x72 96x96 128x128 192x192 256x256 384x384 512x512",
        type: iconType,
        purpose: "maskable",
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: "Дашборд",
        short_name: "Главная",
        description: "Перейти на дашборд",
        url: "/",
        icons: [{ src: icon, sizes: "192x192" }],
      },
    ],
  };
}
