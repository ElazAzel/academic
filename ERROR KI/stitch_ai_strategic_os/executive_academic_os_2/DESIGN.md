---
name: Executive Academic OS
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464554'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#777586'
  outline-variant: '#c7c4d7'
  surface-tint: '#5148d7'
  primary: '#2a14b4'
  on-primary: '#ffffff'
  primary-container: '#4338ca'
  on-primary-container: '#c1beff'
  inverse-primary: '#c3c0ff'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#323a4f'
  on-tertiary: '#ffffff'
  tertiary-container: '#495167'
  on-tertiary-container: '#bcc4de'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#100069'
  on-primary-fixed-variant: '#372abf'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Source Serif 4
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Source Serif 4
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin: 32px
---

## Brand & Style

The design system is engineered for high-level academic oversight, blending the authoritative prestige of traditional institutions with the high-velocity efficiency of modern operational software. The target audience—Super Curators—requires a UI that facilitates rapid pattern recognition and proactive risk mitigation without inducing cognitive fatigue.

The style is **Corporate / Modern** with a strong leaning toward **Minimalism**. It prioritizes high-density information display through clear structural hierarchy and expansive whitespace. The aesthetic response should be one of "commanding calm"—where the complexity of academic administration is distilled into elegant, actionable insights.

## Colors

This design system utilizes a sophisticated Indigo-centric palette to convey trust and operational focus. 

- **Primary & Secondary:** A range of Indigos are used for interactive elements, primary actions, and brand identification.
- **Surface Strategy:** The system uses a "Paper & Ink" approach. Backgrounds are ultra-light grays (#F8FAFC) to reduce eye strain, while text uses high-contrast slates (#0F172A) for maximum legibility.
- **Operational States:** Risk management is handled via a semantic layer. **Amber** is reserved for SLA warnings (impending breaches), while **Crimson** is strictly for active risks or expired SLAs. **Emerald** denotes healthy workload distribution and completed cohorts.

## Typography

The typographic strategy balances academic heritage with modern utility. 

**Source Serif 4** is used for headlines to establish a sense of editorial authority and institutional permanence. It should be used for page titles, cohort names, and high-level metric labels.

**Hanken Grotesk** serves as the functional workhorse for all UI elements, data tables, and body copy. Its sharp, contemporary geometry ensures that dense workload visualizations remain legible at smaller sizes. Labels utilize a tracking increase (+5%) and uppercase styling to differentiate metadata from primary content.

## Layout & Spacing

The design system employs a **Fixed Grid** model for desktop dashboards to ensure that complex data visualizations maintain their structural integrity. 

- **Grid:** A 12-column grid with a 24px gutter. 
- **Rhythm:** An 8px linear scale governs all padding and margin decisions. 
- **Regional Layout:** Dashboards are divided into a "Global Navigation" sidebar (280px fixed), a "Contextual Oversight" header, and a fluid "Main Operational Canvas."
- **Adaptive Rules:** On mobile, columns collapse to a single stack, margins reduce to 16px, and high-density tables transition into "Risk Cards" to maintain visibility of critical SLA data.

## Elevation & Depth

Visual hierarchy is managed through **Tonal Layers** and **Ambient Shadows**. 

1.  **Canvas (Level 0):** The base background layer in #F8FAFC.
2.  **Card Surface (Level 1):** Primary content containers use white (#FFFFFF) with a very soft, diffused shadow (0px 4px 20px rgba(15, 23, 42, 0.05)) to separate them from the canvas.
3.  **Floating Oversight (Level 2):** Modals and pop-overs for deep-dive risk analysis use a more pronounced shadow (0px 10px 30px rgba(15, 23, 42, 0.12)) and a 1px border in #E2E8F0.

Avoid heavy dark borders; use subtle shifts in background saturation to define nested containers within a cohort view.

## Shapes

The shape language is defined by **Rounded (Level 2)** geometry. 

- **Core Components:** Buttons, inputs, and small widgets use a 0.5rem (8px) radius.
- **Containers:** Large dashboard cards and cohort summaries use 1rem (16px) to soften the data-heavy interface.
- **Indicators:** Workload bars and SLA badges use a fully pill-shaped (999px) radius to distinguish "status" elements from "container" elements.

## Components

### Workload Distribution Bars
Horizontal stacked bars representing curator capacity. Use a "ghost" background track in Slate-100. The fill color is Primary Indigo, transitioning to Warning Amber if capacity exceeds 85%.

### SLA Warning States
Badges for "Time to Resolution." 
- **Normal:** Subtle Indigo background with Dark Indigo text.
- **Impending Breach:** Soft Amber background with Dark Amber text + pulsing dot icon.
- **Breached:** Soft Red background with White text for high visibility.

### Cohort-Level Risk Summaries
Rounded cards that aggregate data. These must feature a "Risk Score" in the top right (Source Serif 4) and a sparkline indicating the trend of student engagement over 7 days.

### Buttons & Inputs
Buttons should have a slight 1px inset shadow to provide a subtle tactile feel. Inputs use a 1px border that shifts to a 2px Indigo ring on focus.

### Lists & Data Grids
Rows use a hover state in #F1F5F9. Vertical dividers are avoided in favor of generous horizontal spacing (Gutter-md) to keep the "Academic OS" feeling open and modern.