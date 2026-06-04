"use client";

import { useState } from "react";
import type { BrandingConfig } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BrandMark } from "@/components/layout/brand-mark";

const SANS_FONTS = ["Inter", "Outfit", "Montserrat", "Roboto", "Rubik", "Manrope"];
const HEADING_FONTS = [...SANS_FONTS, "Playfair Display", "Merriweather", "Cormorant Garamond"];
const MONO_FONTS = ["JetBrains Mono", "Fira Code", "Roboto Mono"];

interface ThemePreset {
  name: string;
  primaryColor: string;
  primaryContainerColor: string;
  accentColor: string;
  accentContainerColor: string;
  backgroundColor: string;
  surfaceColor: string;
  darkPrimaryColor: string;
  darkPrimaryContainerColor: string;
  darkAccentColor: string;
  darkAccentContainerColor: string;
  darkBackgroundColor: string;
  darkSurfaceColor: string;
  fontSans: string;
  fontHeading: string;
  fontMono: string;
}

const PRESETS: Record<string, ThemePreset> = {
  default: {
    name: "Классический синий (AI Strategic)",
    primaryColor: "#1a4494",
    primaryContainerColor: "#2952a3",
    accentColor: "#006b5e",
    accentContainerColor: "#00857a",
    backgroundColor: "#f8f9fc",
    surfaceColor: "#ffffff",
    darkPrimaryColor: "#b8caff",
    darkPrimaryContainerColor: "#2b4da0",
    darkAccentColor: "#5eead4",
    darkAccentContainerColor: "#134e4a",
    darkBackgroundColor: "#121418",
    darkSurfaceColor: "#08090b",
    fontSans: "Inter",
    fontHeading: "Inter",
    fontMono: "JetBrains Mono",
  },
  emerald: {
    name: "Изумрудный люкс (Emerald)",
    primaryColor: "#0f5132",
    primaryContainerColor: "#198754",
    accentColor: "#007c58",
    accentContainerColor: "#00aa74",
    backgroundColor: "#f3fbf7",
    surfaceColor: "#ffffff",
    darkPrimaryColor: "#72f2b3",
    darkPrimaryContainerColor: "#0a3c24",
    darkAccentColor: "#4be3b0",
    darkAccentContainerColor: "#024a35",
    darkBackgroundColor: "#0b120d",
    darkSurfaceColor: "#111b15",
    fontSans: "Outfit",
    fontHeading: "Playfair Display",
    fontMono: "Fira Code",
  },
  purple: {
    name: "Фиолетовый космос (Cosmic)",
    primaryColor: "#4c1d95",
    primaryContainerColor: "#6d28d9",
    accentColor: "#701a75",
    accentContainerColor: "#86198f",
    backgroundColor: "#faf5ff",
    surfaceColor: "#ffffff",
    darkPrimaryColor: "#d8b4fe",
    darkPrimaryContainerColor: "#4c1d95",
    darkAccentColor: "#f0abfc",
    darkAccentContainerColor: "#701a75",
    darkBackgroundColor: "#0f0b18",
    darkSurfaceColor: "#171224",
    fontSans: "Rubik",
    fontHeading: "Rubik",
    fontMono: "Roboto Mono",
  },
  sunset: {
    name: "Закат / Терракота (Sunset)",
    primaryColor: "#9a3412",
    primaryContainerColor: "#c2410c",
    accentColor: "#9d174d",
    accentContainerColor: "#be185d",
    backgroundColor: "#fff7ed",
    surfaceColor: "#ffffff",
    darkPrimaryColor: "#ff9a76",
    darkPrimaryContainerColor: "#651a00",
    darkAccentColor: "#fda4af",
    darkAccentContainerColor: "#630b30",
    darkBackgroundColor: "#140e0c",
    darkSurfaceColor: "#201410",
    fontSans: "Manrope",
    fontHeading: "Cormorant Garamond",
    fontMono: "JetBrains Mono",
  },
  midnight: {
    name: "Графитовый темный (Midnight)",
    primaryColor: "#1e293b",
    primaryContainerColor: "#334155",
    accentColor: "#fd7e14",
    accentContainerColor: "#f76707",
    backgroundColor: "#f8fafc",
    surfaceColor: "#ffffff",
    darkPrimaryColor: "#cbd5e1",
    darkPrimaryContainerColor: "#1e293b",
    darkAccentColor: "#ff922b",
    darkAccentContainerColor: "#d9480f",
    darkBackgroundColor: "#0b0f19",
    darkSurfaceColor: "#111827",
    fontSans: "Montserrat",
    fontHeading: "Montserrat",
    fontMono: "Roboto Mono",
  },
};

export function BrandSettingsForm({
  initialBranding,
  action,
}: {
  initialBranding: BrandingConfig;
  action: (formData: FormData) => Promise<void>;
}) {
  const [name, setName] = useState(initialBranding.name);
  const [subtitle, setSubtitle] = useState(initialBranding.subtitle);
  const [description, setDescription] = useState(initialBranding.description);
  const [logoIcon, setLogoIcon] = useState(initialBranding.logoIcon);
  const [logoUrl, setLogoUrl] = useState(initialBranding.logoUrl);

  const [primaryColor, setPrimaryColor] = useState(initialBranding.primaryColor);
  const [primaryContainerColor, setPrimaryContainerColor] = useState(initialBranding.primaryContainerColor);
  const [accentColor, setAccentColor] = useState(initialBranding.accentColor);
  const [accentContainerColor, setAccentContainerColor] = useState(initialBranding.accentContainerColor);
  const [backgroundColor, setBackgroundColor] = useState(initialBranding.backgroundColor);
  const [surfaceColor, setSurfaceColor] = useState(initialBranding.surfaceColor);

  const [darkPrimaryColor, setDarkPrimaryColor] = useState(initialBranding.darkPrimaryColor);
  const [darkPrimaryContainerColor, setDarkPrimaryContainerColor] = useState(initialBranding.darkPrimaryContainerColor);
  const [darkAccentColor, setDarkAccentColor] = useState(initialBranding.darkAccentColor);
  const [darkAccentContainerColor, setDarkAccentContainerColor] = useState(initialBranding.darkAccentContainerColor);
  const [darkBackgroundColor, setDarkBackgroundColor] = useState(initialBranding.darkBackgroundColor);
  const [darkSurfaceColor, setDarkSurfaceColor] = useState(initialBranding.darkSurfaceColor);

  const [fontSans, setFontSans] = useState(initialBranding.fontSans);
  const [fontHeading, setFontHeading] = useState(initialBranding.fontHeading);
  const [fontMono, setFontMono] = useState(initialBranding.fontMono);
  const [customCss, setCustomCss] = useState(initialBranding.customCss);

  const [previewDark, setPreviewDark] = useState(false);

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    setPrimaryColor(preset.primaryColor);
    setPrimaryContainerColor(preset.primaryContainerColor);
    setAccentColor(preset.accentColor);
    setAccentContainerColor(preset.accentContainerColor);
    setBackgroundColor(preset.backgroundColor);
    setSurfaceColor(preset.surfaceColor);

    setDarkPrimaryColor(preset.darkPrimaryColor);
    setDarkPrimaryContainerColor(preset.darkPrimaryContainerColor);
    setDarkAccentColor(preset.darkAccentColor);
    setDarkAccentContainerColor(preset.darkAccentContainerColor);
    setDarkBackgroundColor(preset.darkBackgroundColor);
    setDarkSurfaceColor(preset.darkSurfaceColor);

    setFontSans(preset.fontSans);
    setFontHeading(preset.fontHeading);
    setFontMono(preset.fontMono);
  };

  const previewTheme = {
    primary: previewDark ? darkPrimaryColor : primaryColor,
    accent: previewDark ? darkAccentColor : accentColor,
    bg: previewDark ? darkBackgroundColor : backgroundColor,
    card: previewDark ? darkSurfaceColor : surfaceColor,
    text: previewDark ? "#ffffff" : "#0f172a",
    mutedText: previewDark ? "#94a3b8" : "#475569",
    border: previewDark ? "#1e293b" : "#e2e8f0",
  };

  const dynamicStyle = {
    fontFamily: `var(--font-preview-sans), sans-serif`,
  };

  const dynamicHeadingStyle = {
    fontFamily: `var(--font-preview-heading), serif`,
  };

  return (
    <>
      <link
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontSans)}:wght@400;500;600;700&family=${encodeURIComponent(fontHeading)}:wght@400;600;700&display=swap`}
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{
        __html: `
          :root {
            --font-preview-sans: "${fontSans}";
            --font-preview-heading: "${fontHeading}";
          }
        `
      }} />

      <form action={action} className="space-y-6">
        {/* Hidden inputs to make sure server actions receive the data */}
        <input type="hidden" name="brand_primaryColor" value={primaryColor} />
        <input type="hidden" name="brand_primaryContainerColor" value={primaryContainerColor} />
        <input type="hidden" name="brand_accentColor" value={accentColor} />
        <input type="hidden" name="brand_accentContainerColor" value={accentContainerColor} />
        <input type="hidden" name="brand_backgroundColor" value={backgroundColor} />
        <input type="hidden" name="brand_surfaceColor" value={surfaceColor} />

        <input type="hidden" name="brand_darkPrimaryColor" value={darkPrimaryColor} />
        <input type="hidden" name="brand_darkPrimaryContainerColor" value={darkPrimaryContainerColor} />
        <input type="hidden" name="brand_darkAccentColor" value={darkAccentColor} />
        <input type="hidden" name="brand_darkAccentContainerColor" value={darkAccentContainerColor} />
        <input type="hidden" name="brand_darkBackgroundColor" value={darkBackgroundColor} />
        <input type="hidden" name="brand_darkSurfaceColor" value={darkSurfaceColor} />

        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icon name="palette" className="text-m3-primary" size={20} />
              <CardTitle className="text-headline-sm">Брендинг академии</CardTitle>
            </div>
            <CardDescription>
              Настройка готовых тем, цветов светлой и темной темы, шрифтов и кастомных CSS-стилей в реальном времени.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Theme Presets */}
            <div className="space-y-2">
              <span className="text-sm font-medium block">Готовые темы-пресеты</span>
              <div className="grid gap-2 grid-cols-2 md:grid-cols-5">
                {Object.entries(PRESETS).map(([key, p]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    className="flex flex-col items-center justify-between rounded-lg border border-m3-outline-variant p-3 text-center transition-all hover:bg-m3-surface-container-low focus:ring-2 focus:ring-m3-primary text-xs font-medium"
                  >
                    <span className="mb-2 line-clamp-1">{p.name.split(" ")[0]}</span>
                    <div className="flex gap-1">
                      <span className="h-4 w-4 rounded-full border border-m3-outline-variant" style={{ backgroundColor: p.primaryColor }} />
                      <span className="h-4 w-4 rounded-full border border-m3-outline-variant" style={{ backgroundColor: p.accentColor }} />
                      <span className="h-4 w-4 rounded-full border border-m3-outline-variant" style={{ backgroundColor: p.backgroundColor }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Preview Container */}
            <div className="rounded-xl border border-m3-outline-variant bg-m3-surface-container p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">Интерактивный предпросмотр (Mini-Mockup)</span>
                <button
                  type="button"
                  onClick={() => setPreviewDark(!previewDark)}
                  className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs font-medium text-card-foreground shadow-sm hover:bg-muted"
                >
                  <Icon name={previewDark ? "light_mode" : "dark_mode"} size={14} />
                  {previewDark ? "Светлая тема" : "Темная тема"}
                </button>
              </div>

              {/* Mockup Frame */}
              <div
                className="rounded-lg border p-6 transition-all duration-300 shadow-sm"
                style={{
                  backgroundColor: previewTheme.bg,
                  borderColor: previewTheme.border,
                  color: previewTheme.text,
                  ...dynamicStyle,
                }}
              >
                {/* Mock Header */}
                <div className="flex items-center justify-between border-b pb-4 mb-4" style={{ borderColor: previewTheme.border }}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${previewTheme.primary}, ${previewTheme.accent})`,
                      }}
                    >
                      {name ? name.slice(0, 2).toUpperCase() : "AA"}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ ...dynamicHeadingStyle }}>{name || "Академия"}</h4>
                      <p className="text-[10px]" style={{ color: previewTheme.mutedText }}>{subtitle || "онлайн-платформа"}</p>
                    </div>
                  </div>
                  <span className="text-[11px]" style={{ color: previewTheme.primary }}>{initialBranding.supportEmail}</span>
                </div>

                {/* Mock Course Card */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4 shadow-sm" style={{ backgroundColor: previewTheme.card, borderColor: previewTheme.border }}>
                    <div className="h-28 w-full rounded-md mb-3 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${previewTheme.primary}44, ${previewTheme.accent}22)`,
                      }}
                    >
                      <Icon name={logoIcon || "school"} size={32} style={{ color: previewTheme.primary }} />
                    </div>
                    <h5 className="text-md font-bold mb-1" style={{ ...dynamicHeadingStyle }}>Основы AI-Стратегии</h5>
                    <p className="text-xs mb-3" style={{ color: previewTheme.mutedText }}>{description || "Описание учебного курса для слушателей"}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: previewTheme.accent }}>+50 XP</span>
                      <button
                        type="button"
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: previewTheme.primary }}
                      >
                        Продолжить
                      </button>
                    </div>
                  </div>

                  {/* Mock Stats Panel */}
                  <div className="space-y-3">
                    <div className="rounded-lg border p-4 shadow-sm flex items-center justify-between" style={{ backgroundColor: previewTheme.card, borderColor: previewTheme.border }}>
                      <div>
                        <p className="text-[11px]" style={{ color: previewTheme.mutedText }}>Мой прогресс</p>
                        <p className="text-lg font-bold" style={{ ...dynamicHeadingStyle }}>68%</p>
                      </div>
                      <div className="h-10 w-10 rounded-full border-4 flex items-center justify-center text-[10px] font-bold"
                        style={{
                          borderColor: `${previewTheme.accent}22`,
                          borderTopColor: previewTheme.accent,
                        }}
                      >
                        68%
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 shadow-sm" style={{ backgroundColor: previewTheme.card, borderColor: previewTheme.border }}>
                      <p className="text-[11px] mb-2" style={{ color: previewTheme.mutedText }}>Активный поток</p>
                      <div className="flex items-center gap-2 text-xs">
                        <Icon name="groups" size={16} style={{ color: previewTheme.accent }} />
                        <span className="font-semibold">Поток Весна-2026</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* General Texts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label htmlFor="brand_name" className="text-sm font-medium">Название платформы</label>
                <Input id="brand_name" name="brand_name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
              </div>
              <div>
                <label htmlFor="brand_shortName" className="text-sm font-medium">Короткое название</label>
                <Input id="brand_shortName" name="brand_shortName" className="mt-1" defaultValue={initialBranding.shortName} maxLength={32} required />
              </div>
              <div>
                <label htmlFor="brand_subtitle" className="text-sm font-medium">Подзаголовок в шапке</label>
                <Input id="brand_subtitle" name="brand_subtitle" className="mt-1" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={80} required />
              </div>
              <div>
                <label htmlFor="brand_supportEmail" className="text-sm font-medium">Email поддержки</label>
                <Input id="brand_supportEmail" name="brand_supportEmail" type="email" className="mt-1" defaultValue={initialBranding.supportEmail} maxLength={120} required />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="brand_description" className="text-sm font-medium">Описание на экране входа</label>
                <Input id="brand_description" name="brand_description" className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={180} required />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="brand_metadataDescription" className="text-sm font-medium">Описание для браузера и PWA</label>
                <Input id="brand_metadataDescription" name="brand_metadataDescription" className="mt-1" defaultValue={initialBranding.metadataDescription} maxLength={240} required />
              </div>
              <div>
                <label htmlFor="brand_logoIcon" className="text-sm font-medium">Название иконки (Material Symbols)</label>
                <Input id="brand_logoIcon" name="brand_logoIcon" className="mt-1" value={logoIcon} onChange={(e) => setLogoIcon(e.target.value)} maxLength={48} required />
              </div>
              <div>
                <label htmlFor="brand_logoUrl" className="text-sm font-medium">Адрес файла логотипа</label>
                <Input id="brand_logoUrl" name="brand_logoUrl" className="mt-1" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="/brand/logo.svg" maxLength={500} />
                <p className="mt-1 text-xs text-muted-foreground">Если поле пустое, используется указанная иконка.</p>
              </div>
            </div>

            {/* Custom Fonts */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-semibold">Кастомизация шрифтов</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="brand_fontSans" className="text-xs font-medium text-muted-foreground">Основной шрифт (Sans)</label>
                  <select
                    id="brand_fontSans"
                    name="brand_fontSans"
                    value={fontSans}
                    onChange={(e) => setFontSans(e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {SANS_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="brand_fontHeading" className="text-xs font-medium text-muted-foreground">Шрифт заголовков (Heading)</label>
                  <select
                    id="brand_fontHeading"
                    name="brand_fontHeading"
                    value={fontHeading}
                    onChange={(e) => setFontHeading(e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {HEADING_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="brand_fontMono" className="text-xs font-medium text-muted-foreground">Моноширинный шрифт (Mono)</label>
                  <select
                    id="brand_fontMono"
                    name="brand_fontMono"
                    value={fontMono}
                    onChange={(e) => setFontMono(e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {MONO_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Colors - Light Theme */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-semibold text-primary">Светлая тема — Цветовая схема</h4>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ["brand_primaryColor", "Основной цвет (Primary)", primaryColor, setPrimaryColor],
                  ["brand_primaryContainerColor", "Контейнер основного (Primary Container)", primaryContainerColor, setPrimaryContainerColor],
                  ["brand_accentColor", "Акцентный цвет (Accent/Tertiary)", accentColor, setAccentColor],
                  ["brand_accentContainerColor", "Контейнер акцентного (Accent Container)", accentContainerColor, setAccentContainerColor],
                  ["brand_backgroundColor", "Фон приложения (Background)", backgroundColor, setBackgroundColor],
                  ["brand_surfaceColor", "Поверхности (Surface / Card)", surfaceColor, setSurfaceColor],
                ].map(([id, label, value, setter]) => (
                  <div key={id as string}>
                    <label htmlFor={id as string} className="text-xs font-medium text-muted-foreground">{label as string}</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        id={id as string}
                        type="color"
                        className="h-10 w-14 shrink-0 p-1 cursor-pointer"
                        value={value as string}
                        onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                        required
                      />
                      <code className="rounded-md border bg-muted px-2 py-1 font-mono text-xs uppercase text-muted-foreground">{value as string}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Colors - Dark Theme */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-semibold text-m3-primary">Темная тема — Цветовая схема</h4>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ["brand_darkPrimaryColor", "Основной темный (Dark Primary)", darkPrimaryColor, setDarkPrimaryColor],
                  ["brand_darkPrimaryContainerColor", "Темный контейнер основного", darkPrimaryContainerColor, setDarkPrimaryContainerColor],
                  ["brand_darkAccentColor", "Темный акцентный (Dark Accent)", darkAccentColor, setDarkAccentColor],
                  ["brand_darkAccentContainerColor", "Темный контейнер акцентного", darkAccentContainerColor, setDarkAccentContainerColor],
                  ["brand_darkBackgroundColor", "Темный фон приложения", darkBackgroundColor, setDarkBackgroundColor],
                  ["brand_darkSurfaceColor", "Темные поверхности (Surface / Card)", darkSurfaceColor, setDarkSurfaceColor],
                ].map(([id, label, value, setter]) => (
                  <div key={id as string}>
                    <label htmlFor={id as string} className="text-xs font-medium text-muted-foreground">{label as string}</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        id={id as string}
                        type="color"
                        className="h-10 w-14 shrink-0 p-1 cursor-pointer"
                        value={value as string}
                        onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                        required
                      />
                      <code className="rounded-md border bg-muted px-2 py-1 font-mono text-xs uppercase text-muted-foreground">{value as string}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom CSS Code Box */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="brand_customCss" className="text-sm font-semibold">Пользовательские стили CSS (Custom CSS)</label>
                <span className="text-xs text-muted-foreground">Применится глобально</span>
              </div>
              <textarea
                id="brand_customCss"
                name="brand_customCss"
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                placeholder="/* Пример: скруглить все кнопки сильнее */&#10;.rounded-lg { border-radius: 20px !important; }"
                rows={5}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                maxLength={10000}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit">
                <Icon name="save" size={16} className="mr-1.5" />
                Сохранить настройки бренда
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </>
  );
}
