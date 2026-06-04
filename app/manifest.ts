import type { MetadataRoute } from "next";
import { getRuntimeBranding } from "@/server/modules/branding/service";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await getRuntimeBranding();
  const icon = branding.logoUrl || "/icon.svg";

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
      { src: icon, sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: icon,
        sizes: "48x48 72x72 96x96 128x128 192x192 256x256 384x384 512x512",
        type: "image/svg+xml",
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
