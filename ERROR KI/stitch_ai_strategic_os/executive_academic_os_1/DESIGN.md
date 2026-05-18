---
name: Executive Academic OS
colors:
  surface: '#f6faff'
  surface-dim: '#d3dbe3'
  surface-bright: '#f6faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4fd'
  surface-container: '#e7eff7'
  surface-container-high: '#e1e9f1'
  surface-container-highest: '#dbe3ec'
  on-surface: '#151c22'
  on-surface-variant: '#444651'
  inverse-surface: '#293138'
  inverse-on-surface: '#eaf2fa'
  outline: '#757683'
  outline-variant: '#c5c5d3'
  surface-tint: '#4159ab'
  primary: '#0c2d7e'
  on-primary: '#ffffff'
  primary-container: '#2b4596'
  on-primary-container: '#a6b8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#6339db'
  on-secondary: '#ffffff'
  secondary-container: '#7d56f5'
  on-secondary-container: '#fffbff'
  tertiary: '#003a43'
  on-tertiary: '#ffffff'
  tertiary-container: '#00535e'
  on-tertiary-container: '#4dcbe0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164f'
  on-primary-fixed-variant: '#264192'
  secondary-fixed: '#e7deff'
  secondary-fixed-dim: '#ccbdff'
  on-secondary-fixed: '#1f005f'
  on-secondary-fixed-variant: '#4d17c5'
  tertiary-fixed: '#a0efff'
  tertiary-fixed-dim: '#5bd7ec'
  on-tertiary-fixed: '#001f25'
  on-tertiary-fixed-variant: '#004e59'
  background: '#f6faff'
  on-background: '#151c22'
  surface-variant: '#dbe3ec'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style

The design system is engineered for a premium academic SaaS environment, specifically tailored for an educational operating system. The brand personality is **authoritative, structured, and sophisticated**, evoking the atmosphere of an elite modern university or an executive leadership program.

The visual style follows a **Modern Corporate** aesthetic with a strong emphasis on **Minimalism**. It prioritizes extreme clarity, utilizing high whitespace and a rigorous grid to manage complex information without cognitive overload. The interface should feel like a high-performance tool—utilitarian yet refined—avoiding any "edutainment" tropes or childish elements. 

The target audience consists of high-level learners and strategists who require a calm, distraction-free environment for deep work and analytical progress.

## Colors

This design system utilizes a sophisticated, light-first palette to maintain a scholarly and airy feel. 

- **Primary & Secondary:** Deep Indigo serves as the foundation for institutional trust, while Violet and Cyan provide subtle accents for interactive elements and data visualization.
- **Surface Strategy:** Use `#FFFFFF` for primary content cards and `#F8F9FA` for page backgrounds to create a clear "layering" effect without heavy shadows.
- **Status Indicators:** Colors are calibrated for high legibility against white backgrounds. "Completed" tasks use a calm green, while "Locked" content is strictly neutral to signify inactivity. 
- **Borders:** A consistent `#E9ECEF` border is used for structural definition, ensuring the UI feels grounded.

## Typography

The typography system uses **Inter** to ensure maximum readability and a clean, systematic appearance across all Russian and English labels.

- **Scale:** A tight, professional scale is used to prevent the interface from appearing overly "loud."
- **Hierarchy:** Headlines use a semi-bold weight (`600`) to stand out against white backgrounds. Labels utilize a slightly tighter tracking and medium weight for quick scanning.
- **Language Optimization:** Given the Russian-first focus, line-heights are slightly more generous than standard English defaults to accommodate the average character width and height of Cyrillic glyphs.
- **Specialty:** `JetBrains Mono` is permitted for secondary technical metadata or system-status strings to reinforce the "Operating System" feel.

## Layout & Spacing

The design system employs a **Fixed-Fluid Hybrid** grid. 
- **Desktop:** A 12-column grid with a max-width of 1280px for the main content area, centered. This keeps line lengths optimal for reading scholarly content.
- **Spacing Rhythm:** Based on a 4px baseline. Most components should use `16px` (md) or `24px` (lg) for internal padding.
- **Margins:** Large outer margins are essential to evoke a premium "editorial" feel. 
- **Mobile Adaption:** At 768px and below, the grid collapses to 1 column with 16px side margins. Cards lose their horizontal padding to maximize screen real estate.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Subtle Ambient Shadows**.

- **Surface Levels:** 
  - `Level 0`: #F8F9FA (Page Background)
  - `Level 1`: #FFFFFF (Content Cards/Containers)
  - `Level 2`: #FFFFFF + Shadow (Floating Elements/Dropdowns)
- **Shadow Character:** Use a highly diffused, low-opacity shadow to indicate depth without adding visual "weight." 
  - *Token:* `0 4px 20px rgba(0, 0, 0, 0.05)`
- **Interaction:** Upon hover, cards may transition to a slightly deeper shadow (`0 8px 30px rgba(0, 0, 0, 0.08)`) to indicate interactivity.
- **Borders:** All Level 1 surfaces must feature a refined 1px border in `#E9ECEF` to maintain crispness even on low-contrast displays.

## Shapes

The shape language is **Rounded**, reflecting a modern and approachable academic atmosphere.

- **Primary Radius:** `8px` for inputs, buttons, and small UI elements.
- **Large Radius:** `16px` to `24px` for main content cards and containers.
- **Consistency:** Use the `rounded-lg` (16px) or `rounded-xl` (24px) sparingly for primary containers to create a soft, high-end feel that distinguishes the SaaS from generic enterprise software.

## Components

- **Buttons:** Primary buttons use the Deep Blue (#2B4596) with white text. Ghost buttons use a 1px border of `#E9ECEF` with the primary color for text.
- **Academic Cards:** Cards are the primary vessel for information. They must include a subtle 1px border and a 16px-24px corner radius. Header sections within cards should be separated by a light horizontal rule.
- **Progress Bars:** Thin (4px - 6px), utilizing the status colors (e.g., Green for completion). The track should be the light gray background (#F1F3F5).
- **Chips/Badges:** Small, subtle backgrounds (e.g., 10% opacity of the status color) with high-contrast text. Used for "In Progress" or "Needs Revision" status.
- **Input Fields:** Minimalist style with a 1px border. On focus, the border transitions to the Primary Deep Blue with a 2px soft glow.
- **Curriculum Lists:** Lists should feature generous vertical padding (16px) and subtle hover states to indicate drill-down capabilities.
- **Module Navigation:** A vertical sidebar with clear iconography and semi-bold Russian labels, highlighting the active state with a primary-colored "indicator" bar on the left edge.