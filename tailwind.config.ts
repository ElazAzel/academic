import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./server/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        /* shadcn/ui semantic tokens (via HSL variables) */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },

        /* M3 Surface tokens */
        "m3-surface": "var(--m3-surface)",
        "m3-surface-dim": "var(--m3-surface-dim)",
        "m3-surface-bright": "var(--m3-surface-bright)",
        "m3-surface-container-lowest": "var(--m3-surface-container-lowest)",
        "m3-surface-container-low": "var(--m3-surface-container-low)",
        "m3-surface-container": "var(--m3-surface-container)",
        "m3-surface-container-high": "var(--m3-surface-container-high)",
        "m3-surface-container-highest": "var(--m3-surface-container-highest)",
        "m3-surface-variant": "var(--m3-surface-variant)",
        "m3-on-surface": "var(--m3-on-surface)",
        "m3-on-surface-variant": "var(--m3-on-surface-variant)",
        "m3-outline": "var(--m3-outline)",
        "m3-outline-variant": "var(--m3-outline-variant)",
        "m3-primary": "var(--m3-primary)",
        "m3-primary-container": "var(--m3-primary-container)",
        "m3-on-primary": "var(--m3-on-primary)",
        "m3-on-primary-container": "var(--m3-on-primary-container)",
        "m3-secondary": "var(--m3-secondary)",
        "m3-secondary-container": "var(--m3-secondary-container)",
        "m3-on-secondary": "var(--m3-on-secondary)",
        "m3-error": "var(--m3-error)",
        "m3-error-container": "var(--m3-error-container)",
        "m3-primary-fixed": "var(--m3-primary-fixed)",
        "m3-primary-fixed-dim": "var(--m3-primary-fixed-dim)",
        "m3-secondary-fixed": "var(--m3-secondary-fixed)",
        "m3-secondary-fixed-dim": "var(--m3-secondary-fixed-dim)",
        "m3-tertiary": "var(--m3-tertiary)",
        "m3-tertiary-container": "var(--m3-tertiary-container)",
        "m3-tertiary-fixed": "var(--m3-tertiary-fixed)",
        "m3-tertiary-fixed-dim": "var(--m3-tertiary-fixed-dim)",
        "m3-error-fixed": "var(--m3-error-fixed)",
        "m3-error-fixed-dim": "var(--m3-error-fixed-dim)",
        "m3-background": "var(--m3-background)",
      },

      borderRadius: {
        /* M3-aware radii (shadcn uses --radius: 14px as base)
           rounded-sm = 6px, rounded-md = 10px, rounded-lg = 14px
           rounded-xl = 18px, rounded-2xl = 24px */
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },

      fontFamily: {
        /* M3 typography */
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      fontSize: {
        /* M3 type scale — typography craft rules applied:
           - Display 48px+ → -0.02em to -0.03em (letter-spacing: -0.02em)
           - Headings 32px+ → -0.01em to -0.02em
           - Small text 11-13px → 0.01em to 0.02em
           - UI labels & button text → 0.02em
           - ALL CAPS → handled via uppercase-tracking utility (≥0.06em)  */
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-sm": ["20px", { lineHeight: "28px", letterSpacing: "-0.005em", fontWeight: "600" }],
        "title-lg": ["18px", { lineHeight: "26px", letterSpacing: "0.01em", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", letterSpacing: "0", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", letterSpacing: "0", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "20px", letterSpacing: "0", fontWeight: "400" }],
        "body-xs": ["12px", { lineHeight: "16px", letterSpacing: "0.015em", fontWeight: "400" }],
        "label-lg": ["14px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "600" }],
        "label-md": ["12px", { lineHeight: "14px", letterSpacing: "0.02em", fontWeight: "500" }],
        "mono-sm": ["13px", { lineHeight: "18px", letterSpacing: "0", fontWeight: "400" }],
      },

      fontWeight: {
        /* 3-weight system (Open Design typography craft):
           400 = Read (body), 500/510 = Emphasize (UI/labels), 600 = Announce (headings) */
        "display-lg": "600",
        "headline-lg": "600",
        "headline-lg-mobile": "600",
        "headline-md": "600",
        "headline-sm": "600",
        "title-lg": "600",
        "body-lg": "400",
        "body-md": "400",
        "body-sm": "400",
        "body-xs": "400",
        "label-lg": "600",
        "label-md": "500",
      },

      boxShadow: {
        /* M3 elevation — luminous depth */
        "m3-soft": "0 1px 2px rgba(15, 23, 42, 0.03), 0 2px 8px rgba(15, 23, 42, 0.04)",
        "m3-soft-hover": "0 2px 8px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.08)",
        "m3-modal": "0 8px 32px rgba(15, 23, 42, 0.12), 0 24px 64px rgba(15, 23, 42, 0.16)",
        "m3-glow": "0 0 32px rgba(26, 68, 148, 0.08)",
        "m3-glow-lg": "0 0 48px rgba(26, 68, 148, 0.12)",
        /* Legacy compat */
        glass: "0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)",
        panel: "0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)",
        "bottom-nav": "0 -1px 2px rgba(15, 23, 42, 0.04), 0 -8px 24px rgba(15, 23, 42, 0.06)",
        "card-hover": "0 2px 8px rgba(15, 23, 42, 0.06), 0 12px 32px rgba(15, 23, 42, 0.10)",
        "mobile-top": "0 -1px 2px rgba(15, 23, 42, 0.03)",
      },

      spacing: {
        /* M3 spacing scale (4px base) */
        "unit": "4px",
        "xs": "4px",
        "sm": "8px",
        "md": "16px",
        "lg": "24px",
        "xl": "32px",
        "xxl": "48px",
        "3xl": "64px",
        "gutter": "24px",
        "margin-mobile": "16px",
        "container-max": "1280px",
        /* Safe areas */
        "safe-top": "env(safe-area-inset-top, 0px)",
        "safe-bottom": "env(safe-area-inset-bottom, 0px)",
        nav: "var(--nav-height, 64px)",
      },

      height: {
        nav: "var(--nav-height, 64px)",
      },

      minHeight: {
        "screen-dynamic": "100dvh",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up-fade": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },

      animation: {
        "fade-in": "fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up-fade": "slide-up-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
      },
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;
