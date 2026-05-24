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
        /* M3-aware radii (shadcn uses --radius: 12px as base)
           rounded-sm = 4px, rounded-md = 8px, rounded-lg = 12px
           rounded-xl = 16px (tailwind default), rounded-2xl = 24px
           rounded-3xl = 32px (tailwind default) */
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
        /* M3 type scale */
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "0", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "0", fontWeight: "600" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "title-lg": ["18px", { lineHeight: "26px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-lg": ["14px", { lineHeight: "16px", letterSpacing: "0", fontWeight: "600" }],
        "label-md": ["12px", { lineHeight: "14px", letterSpacing: "0", fontWeight: "500" }],
        "mono-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
      },

      fontWeight: {
        "display-lg": "700",
        "headline-lg": "600",
        "headline-lg-mobile": "600",
        "headline-md": "600",
        "headline-sm": "600",
        "title-lg": "600",
        "body-lg": "400",
        "body-md": "400",
        "body-sm": "400",
        "label-lg": "600",
        "label-md": "500",
      },

      boxShadow: {
        /* M3 elevation */
        "m3-soft": "0 1px 2px rgba(15, 23, 42, 0.04)",
        "m3-soft-hover": "0 1px 3px rgba(15, 23, 42, 0.08)",
        "m3-modal": "0 16px 48px rgba(15, 23, 42, 0.16)",
        /* Legacy */
        glass: "0 1px 2px rgba(15, 23, 42, 0.04)",
        panel: "0 1px 2px rgba(15, 23, 42, 0.06)",
        "bottom-nav": "0 -1px 2px rgba(15, 23, 42, 0.05)",
        "card-hover": "0 1px 3px rgba(15, 23, 42, 0.08)",
        "mobile-top": "0 -1px 2px rgba(15, 23, 42, 0.04)",
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
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up-fade": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },

      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-up-fade": "slide-up-fade 0.4s ease-out",
      },
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;
