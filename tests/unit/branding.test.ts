import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

async function loadBranding() {
  vi.resetModules();
  return import("@/lib/branding");
}

const RUNTIME_BRAND_ROOTS = ["app", "components", "lib", "server", "public"];
const RUNTIME_BRAND_EXTENSIONS = new Set([".js", ".json", ".ts", ".tsx"]);
const ALLOWED_BRAND_LITERAL_FILES = new Set([path.normalize("lib/branding.ts")]);
const LEGACY_BRAND_LITERAL_PATTERN =
  /AI Strategic Academy|AI Academy|закрытая академия|Закрытая образовательная платформа|admin@aistrategic\.kz|ai-academy/u;

function collectRuntimeFiles(root: string): string[] {
  const absoluteRoot = path.join(process.cwd(), root);
  const entries = readdirSync(absoluteRoot, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(absoluteRoot, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRuntimeFiles(path.relative(process.cwd(), absolutePath)));
      continue;
    }

    if (!entry.isFile()) continue;
    if (!RUNTIME_BRAND_EXTENSIONS.has(path.extname(entry.name))) continue;
    files.push(path.relative(process.cwd(), absolutePath));
  }

  return files;
}

function readRuntimeTextFile(relativePath: string) {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!statSync(absolutePath).isFile()) return "";
  return readFileSync(absolutePath, "utf-8");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/server/modules/admin/settings");
  vi.doUnmock("@/server/modules/branding/service");
  vi.resetModules();
});

describe("BRANDING", () => {
  it("keeps the current platform identity as defaults", async () => {
    const { BRANDING } = await loadBranding();

    expect(BRANDING).toEqual({
      name: "AI Strategic Academy",
      shortName: "AI Academy",
      subtitle: "закрытая академия",
      description: "Закрытая образовательная платформа",
      metadataDescription: "Закрытая LMS академии для AI-стратегии, потоков, кураторов и отчётности.",
      logoIcon: "school",
      logoUrl: "",
      supportEmail: "admin@aistrategic.kz",
      primaryColor: "#1a4494",
      primaryContainerColor: "#2952a3",
      accentColor: "#006b5e",
      accentContainerColor: "#00857a",
      backgroundColor: "#f8f9fc",
      surfaceColor: "#ffffff",
    });
  });

  it("uses public environment overrides for white-label deployments", async () => {
    vi.stubEnv("NEXT_PUBLIC_BRAND_NAME", "AlmaU Executive Academy");
    vi.stubEnv("NEXT_PUBLIC_BRAND_SHORT_NAME", "AlmaU Academy");
    vi.stubEnv("NEXT_PUBLIC_BRAND_SUBTITLE", "корпоративная академия");
    vi.stubEnv("NEXT_PUBLIC_BRAND_DESCRIPTION", "Закрытая платформа корпоративного обучения");
    vi.stubEnv("NEXT_PUBLIC_BRAND_METADATA_DESCRIPTION", "Корпоративная LMS для потоков и отчётности.");
    vi.stubEnv("NEXT_PUBLIC_BRAND_LOGO_ICON", "workspace_premium");
    vi.stubEnv("NEXT_PUBLIC_BRAND_LOGO_URL", "/brand/almau.svg");
    vi.stubEnv("NEXT_PUBLIC_BRAND_SUPPORT_EMAIL", "support@almau.example");
    vi.stubEnv("NEXT_PUBLIC_BRAND_PRIMARY_COLOR", "#123abc");
    vi.stubEnv("NEXT_PUBLIC_BRAND_PRIMARY_CONTAINER_COLOR", "#234bcd");
    vi.stubEnv("NEXT_PUBLIC_BRAND_ACCENT_COLOR", "#0f766e");
    vi.stubEnv("NEXT_PUBLIC_BRAND_ACCENT_CONTAINER_COLOR", "#115e59");
    vi.stubEnv("NEXT_PUBLIC_BRAND_BACKGROUND_COLOR", "#f8fafc");
    vi.stubEnv("NEXT_PUBLIC_BRAND_SURFACE_COLOR", "#ffffff");

    const { BRANDING } = await loadBranding();

    expect(BRANDING).toEqual({
      name: "AlmaU Executive Academy",
      shortName: "AlmaU Academy",
      subtitle: "корпоративная академия",
      description: "Закрытая платформа корпоративного обучения",
      metadataDescription: "Корпоративная LMS для потоков и отчётности.",
      logoIcon: "workspace_premium",
      logoUrl: "/brand/almau.svg",
      supportEmail: "support@almau.example",
      primaryColor: "#123abc",
      primaryContainerColor: "#234bcd",
      accentColor: "#0f766e",
      accentContainerColor: "#115e59",
      backgroundColor: "#f8fafc",
      surfaceColor: "#ffffff",
    });
  });

  it("falls back to defaults for blank public environment values", async () => {
    vi.stubEnv("NEXT_PUBLIC_BRAND_NAME", "   ");
    vi.stubEnv("NEXT_PUBLIC_BRAND_LOGO_ICON", "");
    vi.stubEnv("NEXT_PUBLIC_BRAND_SUPPORT_EMAIL", " ");

    const { BRANDING } = await loadBranding();

    expect(BRANDING.name).toBe("AI Strategic Academy");
    expect(BRANDING.logoIcon).toBe("school");
    expect(BRANDING.supportEmail).toBe("admin@aistrategic.kz");
    expect(BRANDING.primaryColor).toBe("#1a4494");
  });

  it("exposes white-label values through the PWA manifest", async () => {
    vi.resetModules();
    vi.doMock("@/server/modules/branding/service", () => ({
      getRuntimeBranding: async () => ({
        name: "AlmaU Executive Academy",
        shortName: "AlmaU Academy",
        subtitle: "корпоративная академия",
        description: "Закрытая платформа корпоративного обучения",
        metadataDescription: "Корпоративная LMS для потоков.",
        logoIcon: "workspace_premium",
        logoUrl: "/brand/almau.svg",
        supportEmail: "support@almau.example",
        primaryColor: "#123abc",
        primaryContainerColor: "#234bcd",
        accentColor: "#0f766e",
        accentContainerColor: "#115e59",
        backgroundColor: "#f8fafc",
        surfaceColor: "#ffffff",
      }),
    }));

    const { default: manifest } = await import("@/app/manifest");

    await expect(manifest()).resolves.toMatchObject({
      name: "AlmaU Executive Academy",
      short_name: "AlmaU Academy",
      description: "Корпоративная LMS для потоков.",
      background_color: "#f8fafc",
      theme_color: "#123abc",
      lang: "ru",
      start_url: "/",
    });
  });

  it("resolves admin-managed runtime branding from app settings", async () => {
    vi.resetModules();
    vi.doMock("@/server/modules/admin/settings", () => ({
      getAllAppSettings: async () => ({
        BRAND_NAME: "Академия клиента",
        BRAND_SHORT_NAME: "Клиент LMS",
        BRAND_SUBTITLE: "закрытая программа",
        BRAND_DESCRIPTION: "Платформа обучения клиента",
        BRAND_METADATA_DESCRIPTION: "LMS клиента.",
        BRAND_LOGO_ICON: "workspace_premium",
        BRAND_LOGO_URL: "/brand/client.svg",
        BRAND_SUPPORT_EMAIL: "support@example.com",
        BRAND_PRIMARY_COLOR: "#abc",
        BRAND_PRIMARY_CONTAINER_COLOR: "#234bcd",
        BRAND_ACCENT_COLOR: "#0f766e",
        BRAND_ACCENT_CONTAINER_COLOR: "#115e59",
        BRAND_BACKGROUND_COLOR: "#f8fafc",
        BRAND_SURFACE_COLOR: "#ffffff",
      }),
    }));

    const { createBrandingCssVariables, getRuntimeBranding } = await import("@/server/modules/branding/service");
    const branding = await getRuntimeBranding();

    expect(branding).toMatchObject({
      name: "Академия клиента",
      logoUrl: "/brand/client.svg",
      primaryColor: "#aabbcc",
    });
    expect(createBrandingCssVariables(branding)).toMatchObject({
      "--m3-primary": "#aabbcc",
      "--m3-tertiary": "#0f766e",
      "--m3-background": "#f8fafc",
    });
  });

  it("uses the white-label brand as the TOTP issuer", async () => {
    vi.stubEnv("NEXT_PUBLIC_BRAND_NAME", "AlmaU Executive Academy");
    vi.resetModules();

    const { generateTotpSecret } = await import("@/server/modules/2fa/service");
    const { otpauthUrl } = generateTotpSecret("student@example.com");

    expect(decodeURIComponent(otpauthUrl)).toContain("issuer=AlmaU Executive Academy");
  });

  it("does not leave legacy brand literals in runtime surfaces", () => {
    const offenders = RUNTIME_BRAND_ROOTS.flatMap(collectRuntimeFiles)
      .filter((relativePath) => !ALLOWED_BRAND_LITERAL_FILES.has(path.normalize(relativePath)))
      .filter((relativePath) => LEGACY_BRAND_LITERAL_PATTERN.test(readRuntimeTextFile(relativePath)));

    expect(offenders).toEqual([]);
  });
});

describe("t", () => {
  it("returns the white-label app name for app.name", async () => {
    vi.stubEnv("NEXT_PUBLIC_BRAND_NAME", "AlmaU Executive Academy");
    vi.resetModules();

    const { t } = await import("@/lib/i18n");

    expect(t("app.name")).toBe("AlmaU Executive Academy");
    expect(t("nav.login")).toBe("Войти");
  });
});
