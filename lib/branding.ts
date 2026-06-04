export const DEFAULT_BRAND_NAME = "AI Strategic Academy";
export const DEFAULT_BRAND_SHORT_NAME = "AI Academy";
export const DEFAULT_BRAND_SUBTITLE = "закрытая академия";
export const DEFAULT_BRAND_DESCRIPTION = "Закрытая образовательная платформа";
export const DEFAULT_BRAND_METADATA_DESCRIPTION =
  "Закрытая LMS академии для AI-стратегии, потоков, кураторов и отчётности.";
export const DEFAULT_BRAND_LOGO_ICON = "school";
export const DEFAULT_BRAND_LOGO_URL = "";
export const DEFAULT_BRAND_SUPPORT_EMAIL = "admin@aistrategic.kz";
export const DEFAULT_BRAND_PRIMARY_COLOR = "#1a4494";
export const DEFAULT_BRAND_PRIMARY_CONTAINER_COLOR = "#2952a3";
export const DEFAULT_BRAND_ACCENT_COLOR = "#006b5e";
export const DEFAULT_BRAND_ACCENT_CONTAINER_COLOR = "#00857a";
export const DEFAULT_BRAND_BACKGROUND_COLOR = "#f8f9fc";
export const DEFAULT_BRAND_SURFACE_COLOR = "#ffffff";

export interface BrandingConfig {
  name: string;
  shortName: string;
  subtitle: string;
  description: string;
  metadataDescription: string;
  logoIcon: string;
  logoUrl: string;
  supportEmail: string;
  primaryColor: string;
  primaryContainerColor: string;
  accentColor: string;
  accentContainerColor: string;
  backgroundColor: string;
  surfaceColor: string;
}

function readPublicEnv(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

export const BRANDING: Readonly<BrandingConfig> = Object.freeze({
  name: readPublicEnv(process.env.NEXT_PUBLIC_BRAND_NAME, DEFAULT_BRAND_NAME),
  shortName: readPublicEnv(process.env.NEXT_PUBLIC_BRAND_SHORT_NAME, DEFAULT_BRAND_SHORT_NAME),
  subtitle: readPublicEnv(process.env.NEXT_PUBLIC_BRAND_SUBTITLE, DEFAULT_BRAND_SUBTITLE),
  description: readPublicEnv(process.env.NEXT_PUBLIC_BRAND_DESCRIPTION, DEFAULT_BRAND_DESCRIPTION),
  metadataDescription: readPublicEnv(
    process.env.NEXT_PUBLIC_BRAND_METADATA_DESCRIPTION,
    DEFAULT_BRAND_METADATA_DESCRIPTION,
  ),
  logoIcon: readPublicEnv(process.env.NEXT_PUBLIC_BRAND_LOGO_ICON, DEFAULT_BRAND_LOGO_ICON),
  logoUrl: readPublicEnv(process.env.NEXT_PUBLIC_BRAND_LOGO_URL, DEFAULT_BRAND_LOGO_URL),
  supportEmail: readPublicEnv(process.env.NEXT_PUBLIC_BRAND_SUPPORT_EMAIL, DEFAULT_BRAND_SUPPORT_EMAIL),
  primaryColor: readPublicEnv(process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR, DEFAULT_BRAND_PRIMARY_COLOR),
  primaryContainerColor: readPublicEnv(
    process.env.NEXT_PUBLIC_BRAND_PRIMARY_CONTAINER_COLOR,
    DEFAULT_BRAND_PRIMARY_CONTAINER_COLOR,
  ),
  accentColor: readPublicEnv(process.env.NEXT_PUBLIC_BRAND_ACCENT_COLOR, DEFAULT_BRAND_ACCENT_COLOR),
  accentContainerColor: readPublicEnv(
    process.env.NEXT_PUBLIC_BRAND_ACCENT_CONTAINER_COLOR,
    DEFAULT_BRAND_ACCENT_CONTAINER_COLOR,
  ),
  backgroundColor: readPublicEnv(process.env.NEXT_PUBLIC_BRAND_BACKGROUND_COLOR, DEFAULT_BRAND_BACKGROUND_COLOR),
  surfaceColor: readPublicEnv(process.env.NEXT_PUBLIC_BRAND_SURFACE_COLOR, DEFAULT_BRAND_SURFACE_COLOR),
});
