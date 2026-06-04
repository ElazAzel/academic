import type { CSSProperties } from "react";
import { BRANDING, type BrandingConfig } from "@/lib/branding";
import { getAllAppSettings, type AppSettings } from "@/server/modules/admin/settings";

export const BRANDING_SETTING_KEYS = {
  name: "BRAND_NAME",
  shortName: "BRAND_SHORT_NAME",
  subtitle: "BRAND_SUBTITLE",
  description: "BRAND_DESCRIPTION",
  metadataDescription: "BRAND_METADATA_DESCRIPTION",
  logoIcon: "BRAND_LOGO_ICON",
  logoUrl: "BRAND_LOGO_URL",
  supportEmail: "BRAND_SUPPORT_EMAIL",
  primaryColor: "BRAND_PRIMARY_COLOR",
  primaryContainerColor: "BRAND_PRIMARY_CONTAINER_COLOR",
  accentColor: "BRAND_ACCENT_COLOR",
  accentContainerColor: "BRAND_ACCENT_CONTAINER_COLOR",
  backgroundColor: "BRAND_BACKGROUND_COLOR",
  surfaceColor: "BRAND_SURFACE_COLOR",
  fontSans: "BRAND_FONT_SANS",
  fontHeading: "BRAND_FONT_HEADING",
  fontMono: "BRAND_FONT_MONO",
  customCss: "BRAND_CUSTOM_CSS",
  darkPrimaryColor: "BRAND_DARK_PRIMARY_COLOR",
  darkPrimaryContainerColor: "BRAND_DARK_PRIMARY_CONTAINER_COLOR",
  darkAccentColor: "BRAND_DARK_ACCENT_COLOR",
  darkAccentContainerColor: "BRAND_DARK_ACCENT_CONTAINER_COLOR",
  darkBackgroundColor: "BRAND_DARK_BACKGROUND_COLOR",
  darkSurfaceColor: "BRAND_DARK_SURFACE_COLOR",
} as const;

type BrandingSettingName = keyof typeof BRANDING_SETTING_KEYS;
type BrandingCssVariables = CSSProperties & Record<`--${string}`, string>;

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u;

function readStringSetting(settings: AppSettings, name: BrandingSettingName, fallback: string) {
  const raw = settings[BRANDING_SETTING_KEYS[name]];
  return typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
}

export function normalizeHexColor(value: string, fallback: string) {
  const normalized = value.trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) return fallback;

  if (normalized.length === 4) {
    const [, r, g, b] = normalized;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return normalized.toLowerCase();
}

export function hexToHslToken(hex: string) {
  const normalized = normalizeHexColor(hex, BRANDING.primaryColor).slice(1);
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return `0 0% ${Math.round(lightness * 100)}%`;
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;

  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  const normalizedHue = Math.round(hue * 60 + (hue < 0 ? 360 : 0));
  return `${normalizedHue} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function resolveBrandingFromSettings(settings: AppSettings): BrandingConfig {
  return {
    name: readStringSetting(settings, "name", BRANDING.name),
    shortName: readStringSetting(settings, "shortName", BRANDING.shortName),
    subtitle: readStringSetting(settings, "subtitle", BRANDING.subtitle),
    description: readStringSetting(settings, "description", BRANDING.description),
    metadataDescription: readStringSetting(settings, "metadataDescription", BRANDING.metadataDescription),
    logoIcon: readStringSetting(settings, "logoIcon", BRANDING.logoIcon),
    logoUrl: readStringSetting(settings, "logoUrl", BRANDING.logoUrl),
    supportEmail: readStringSetting(settings, "supportEmail", BRANDING.supportEmail),
    primaryColor: normalizeHexColor(readStringSetting(settings, "primaryColor", BRANDING.primaryColor), BRANDING.primaryColor),
    primaryContainerColor: normalizeHexColor(
      readStringSetting(settings, "primaryContainerColor", BRANDING.primaryContainerColor),
      BRANDING.primaryContainerColor,
    ),
    accentColor: normalizeHexColor(readStringSetting(settings, "accentColor", BRANDING.accentColor), BRANDING.accentColor),
    accentContainerColor: normalizeHexColor(
      readStringSetting(settings, "accentContainerColor", BRANDING.accentContainerColor),
      BRANDING.accentContainerColor,
    ),
    backgroundColor: normalizeHexColor(
      readStringSetting(settings, "backgroundColor", BRANDING.backgroundColor),
      BRANDING.backgroundColor,
    ),
    surfaceColor: normalizeHexColor(readStringSetting(settings, "surfaceColor", BRANDING.surfaceColor), BRANDING.surfaceColor),
    fontSans: readStringSetting(settings, "fontSans", BRANDING.fontSans),
    fontHeading: readStringSetting(settings, "fontHeading", BRANDING.fontHeading),
    fontMono: readStringSetting(settings, "fontMono", BRANDING.fontMono),
    customCss: readStringSetting(settings, "customCss", BRANDING.customCss),
    darkPrimaryColor: normalizeHexColor(
      readStringSetting(settings, "darkPrimaryColor", BRANDING.darkPrimaryColor),
      BRANDING.darkPrimaryColor,
    ),
    darkPrimaryContainerColor: normalizeHexColor(
      readStringSetting(settings, "darkPrimaryContainerColor", BRANDING.darkPrimaryContainerColor),
      BRANDING.darkPrimaryContainerColor,
    ),
    darkAccentColor: normalizeHexColor(
      readStringSetting(settings, "darkAccentColor", BRANDING.darkAccentColor),
      BRANDING.darkAccentColor,
    ),
    darkAccentContainerColor: normalizeHexColor(
      readStringSetting(settings, "darkAccentContainerColor", BRANDING.darkAccentContainerColor),
      BRANDING.darkAccentContainerColor,
    ),
    darkBackgroundColor: normalizeHexColor(
      readStringSetting(settings, "darkBackgroundColor", BRANDING.darkBackgroundColor),
      BRANDING.darkBackgroundColor,
    ),
    darkSurfaceColor: normalizeHexColor(
      readStringSetting(settings, "darkSurfaceColor", BRANDING.darkSurfaceColor),
      BRANDING.darkSurfaceColor,
    ),
  };
}

export async function getRuntimeBranding(): Promise<BrandingConfig> {
  try {
    return resolveBrandingFromSettings(await getAllAppSettings());
  } catch (error) {
    console.error("[Branding] Не удалось получить настройки бренда", {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return BRANDING;
  }
}

export function createBrandingCssVariables(branding: BrandingConfig): BrandingCssVariables {
  return {
    "--primary": hexToHslToken(branding.primaryColor),
    "--ring": hexToHslToken(branding.primaryColor),
    "--accent-foreground": hexToHslToken(branding.primaryColor),
    "--m3-primary": branding.primaryColor,
    "--m3-primary-container": branding.primaryContainerColor,
    "--m3-primary-fixed": `color-mix(in srgb, ${branding.primaryColor} 14%, white)`,
    "--m3-primary-fixed-dim": `color-mix(in srgb, ${branding.primaryColor} 26%, white)`,
    "--m3-tertiary": branding.accentColor,
    "--m3-tertiary-container": branding.accentContainerColor,
    "--academy-accent": branding.accentColor,
    "--academy-accent-container": `color-mix(in srgb, ${branding.accentColor} 18%, white)`,
    "--m3-background": branding.backgroundColor,
    "--m3-surface": branding.backgroundColor,
    "--m3-surface-container-lowest": branding.surfaceColor,
    "--m3-surface-container-low": `color-mix(in srgb, ${branding.surfaceColor} 92%, ${branding.primaryColor})`,
    "--m3-surface-container": `color-mix(in srgb, ${branding.surfaceColor} 88%, ${branding.primaryColor})`,
    "--m3-surface-container-high: animate": `color-mix(in srgb, ${branding.surfaceColor} 82%, ${branding.primaryColor})`,
  };
}

export function generateBrandingCss(branding: BrandingConfig): string {
  const lightPrimaryHsl = hexToHslToken(branding.primaryColor);
  const darkPrimaryHsl = hexToHslToken(branding.darkPrimaryColor);

  return `
    :root {
      --font-inter: "${branding.fontSans}", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --font-mono: "${branding.fontMono}", ui-monospace, SFMono-Regular, monospace;
      --font-heading: "${branding.fontHeading}", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --primary: ${lightPrimaryHsl};
      --ring: ${lightPrimaryHsl};
      --accent-foreground: ${lightPrimaryHsl};
      --m3-primary: ${branding.primaryColor};
      --m3-primary-container: ${branding.primaryContainerColor};
      --m3-primary-fixed: color-mix(in srgb, ${branding.primaryColor} 14%, white);
      --m3-primary-fixed-dim: color-mix(in srgb, ${branding.primaryColor} 26%, white);
      --m3-tertiary: ${branding.accentColor};
      --m3-tertiary-container: ${branding.accentContainerColor};
      --academy-accent: ${branding.accentColor};
      --academy-accent-container: color-mix(in srgb, ${branding.accentColor} 18%, white);
      --m3-background: ${branding.backgroundColor};
      --m3-surface: ${branding.backgroundColor};
      --m3-surface-container-lowest: ${branding.surfaceColor};
      --m3-surface-container-low: color-mix(in srgb, ${branding.surfaceColor} 92%, ${branding.primaryColor});
      --m3-surface-container: color-mix(in srgb, ${branding.surfaceColor} 88%, ${branding.primaryColor});
      --m3-surface-container-high: color-mix(in srgb, ${branding.surfaceColor} 82%, ${branding.primaryColor});
    }

    .dark {
      --primary: ${darkPrimaryHsl};
      --ring: ${darkPrimaryHsl};
      --accent-foreground: ${darkPrimaryHsl};
      --m3-primary: ${branding.darkPrimaryColor};
      --m3-primary-container: ${branding.darkPrimaryContainerColor};
      --m3-primary-fixed: color-mix(in srgb, ${branding.darkPrimaryColor} 14%, white);
      --m3-primary-fixed-dim: color-mix(in srgb, ${branding.darkPrimaryColor} 26%, white);
      --m3-tertiary: ${branding.darkAccentColor};
      --m3-tertiary-container: ${branding.darkAccentContainerColor};
      --academy-accent: ${branding.darkAccentColor};
      --academy-accent-container: color-mix(in srgb, ${branding.darkAccentColor} 18%, white);
      --m3-background: ${branding.darkBackgroundColor};
      --m3-surface: ${branding.darkBackgroundColor};
      --m3-surface-container-lowest: ${branding.darkSurfaceColor};
      --m3-surface-container-low: color-mix(in srgb, ${branding.darkSurfaceColor} 92%, ${branding.darkPrimaryColor});
      --m3-surface-container: color-mix(in srgb, ${branding.darkSurfaceColor} 88%, ${branding.darkPrimaryColor});
      --m3-surface-container-high: color-mix(in srgb, ${branding.darkSurfaceColor} 82%, ${branding.darkPrimaryColor});
    }

    ${branding.customCss}
  `;
}
