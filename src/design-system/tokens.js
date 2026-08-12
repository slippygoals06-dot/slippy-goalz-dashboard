/**
 * Slippy Goalz Design System — single source of truth
 *
 * Premium · Quiet · Confident · Timeless
 * Apple simplicity · Linear precision · Stripe professionalism · Vercel minimalism
 *
 * Colour budget: ~90% neutral · ~8% semantic · ~2% brand accent
 * Brand only on: primary CTAs, active nav/tabs, focus, important badges, links, AI highlights.
 */

/* ── Colour ─────────────────────────────────────────────────────────────── */

export const color = {
  /** Dark theme surfaces — true black (Wemify-style) */
  bg: {
    primary: "#000000",
    secondary: "#0A0A0A",
    card: "#121212",
    elevated: "#181818",
  },
  border: {
    default: "rgba(255,255,255,0.09)",
    divider: "rgba(255,255,255,0.06)",
    hover: "rgba(255,255,255,0.14)",
    strong: "rgba(255,255,255,0.18)",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "#A0A0A0",
    muted: "#888888",
    disabled: "#5C6370",
    inverse: "#111827",
  },
  /**
   * Brand rose — refined, not neon.
   * Primary stays #F43F5E; hover/press deepen (never brighten).
   */
  brand: {
    DEFAULT: "#F43F5E",
    hover: "#E11D48",
    press: "#BE123C",
    soft: "#FFF1F2",
    softBorder: "#FECDD3",
    /** Overlay tint for dark surfaces / active rows */
    softAlpha: "rgba(244,63,94,0.10)",
    ring: "rgba(244,63,94,0.24)",
  },
  semantic: {
    success: "#22C55E",
    successSoft: "rgba(34,197,94,0.12)",
    warning: "#F59E0B",
    warningSoft: "rgba(245,158,11,0.12)",
    danger: "#EF4444",
    dangerSoft: "rgba(239,68,68,0.12)",
    info: "#3B82F6",
    infoSoft: "rgba(59,130,246,0.12)",
  },
  /** Charts & data viz — neutrals only (never brand) */
  chart: {
    primary: "#64748B",
    secondary: "#94A3B8",
    tertiary: "#CBD5E1",
    grid: "rgba(15,17,21,0.06)",
    gridDark: "rgba(255,255,255,0.06)",
  },
  /** Light theme — calm, paper-like neutrals */
  light: {
    bg: {
      primary: "#FAFAFB",
      secondary: "#F6F7F9",
      card: "#FFFFFF",
      elevated: "#FFFFFF",
    },
    border: {
      default: "#E5E7EB",
      divider: "#ECEEF2",
      hover: "#D1D5DB",
      strong: "#D1D5DB",
    },
    text: {
      primary: "#111827",
      secondary: "#4B5563",
      muted: "#6B7280",
      disabled: "#9CA3AF",
      inverse: "#FFFFFF",
    },
  },
};

/* ── Typography ─────────────────────────────────────────────────────────── */

export const font = {
  sans: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"Inter", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export const type = {
  display: { size: 48, weight: 600, lineHeight: 1.2, tracking: "-0.02em" },
  h1: { size: 36, weight: 600, lineHeight: 1.2, tracking: "-0.02em" },
  h2: { size: 30, weight: 600, lineHeight: 1.2, tracking: "-0.015em" },
  h3: { size: 24, weight: 600, lineHeight: 1.2, tracking: "-0.01em" },
  large: { size: 18, weight: 400, lineHeight: 1.5, tracking: "0" },
  body: { size: 16, weight: 400, lineHeight: 1.5, tracking: "0" },
  small: { size: 14, weight: 400, lineHeight: 1.5, tracking: "0" },
  caption: { size: 12, weight: 500, lineHeight: 1.5, tracking: "0.01em" },
};

/* ── Spacing (8-point grid) ─────────────────────────────────────────────── */

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 40,
  8: 48,
  9: 64,
  10: 80,
  11: 96,
};

/** Named aliases for readability */
export const spacing = {
  xs: space[1],
  sm: space[2],
  md: space[3],
  lg: space[4],
  xl: space[5],
  "2xl": space[6],
  "3xl": space[7],
  "4xl": space[8],
  "5xl": space[9],
  "6xl": space[10],
  "7xl": space[11],
};

/* ── Radius ─────────────────────────────────────────────────────────────── */

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  modal: 24,
  /** Micro chips, trend pills, kbd hints */
  chip: 8,
  pill: 9999,
};

/* ── Shadows (almost invisible — prefer borders) ────────────────────────── */

export const shadow = {
  sm: "0 1px 2px rgba(0,0,0,0.06)",
  md: "0 8px 24px rgba(0,0,0,0.08)",
  lg: "0 18px 48px rgba(0,0,0,0.12)",
  none: "none",
};

/* ── Motion ─────────────────────────────────────────────────────────────── */
/*
 * Calm · Natural · Responsive · Elegant
 * Opacity · translate · subtle scale only.
 * Never rotate · bounce · overshoot · decorative motion.
 */

export const ease = {
  /** Product UI — Linear / Stripe standard */
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  /** Rare: soft exits only — never for interactive chrome */
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
};

/**
 * Semantic durations — use these by interaction type.
 * Aliases (fast/normal/slow) kept for legacy callers.
 */
export const duration = {
  hover: "150ms",
  press: "100ms",
  button: "150ms",
  card: "180ms",
  input: "150ms",
  tab: "180ms",
  dropdown: "180ms",
  drawer: "220ms",
  modal: "220ms",
  tooltip: "120ms",
  table: "120ms",
  chart: "250ms",
  notification: "200ms",
  page: "220ms",
  nav: "150ms",
  ai: "200ms",
  skeleton: "180ms",
  /** Aliases */
  fast: "150ms",
  normal: "180ms",
  slow: "220ms",
};

/* ── Layout chrome ──────────────────────────────────────────────────────── */

export const layout = {
  sidebarWidth: 280,
  sidebarCollapsed: 72,
  topbarHeight: 72,
  tableRowHeight: 56,
  buttonHeight: 44,
  inputHeight: 48,
  iconSize: 20,
  iconStroke: 2,
  maxWidth: {
    narrow: 720,
    default: 1440,
    wide: 1440,
  },
  pagePadding: {
    x: 32,
    y: 40,
    bottom: 64,
  },
};

/* ── Focus ──────────────────────────────────────────────────────────────── */

export const focus = {
  ring: `0 0 0 2px ${color.light.bg.card}, 0 0 0 4px ${color.brand.ring}`,
  outline: `2px solid ${color.brand.DEFAULT}`,
  outlineOffset: "2px",
};

/**
 * Flat CSS custom property map for :root / [data-theme]
 */
export function cssVars(mode = "dark") {
  const dark = mode === "dark";
  const bg = dark ? color.bg : color.light.bg;
  const border = dark ? color.border : color.light.border;
  const text = dark ? color.text : color.light.text;

  return {
    /* Colour */
    "--ds-bg": bg.primary,
    "--ds-bg-secondary": bg.secondary,
    "--ds-card": bg.card,
    "--ds-elevated": bg.elevated,
    "--ds-border": border.default,
    "--ds-divider": border.divider,
    "--ds-border-hover": border.hover,
    "--ds-border-strong": border.strong,
    "--ds-text": text.primary,
    "--ds-text-secondary": text.secondary,
    "--ds-text-muted": text.muted,
    "--ds-text-disabled": text.disabled || color.light.text.disabled,
    "--ds-text-inverse": text.inverse,
    "--ds-brand": color.brand.DEFAULT,
    "--ds-brand-hover": color.brand.hover,
    "--ds-brand-press": color.brand.press,
    "--ds-brand-soft": dark ? color.brand.softAlpha : color.brand.soft,
    "--ds-brand-soft-border": dark ? "rgba(244,63,94,0.28)" : color.brand.softBorder,
    "--ds-brand-ring": color.brand.ring,
    "--ds-success": color.semantic.success,
    "--ds-success-soft": color.semantic.successSoft,
    "--ds-warning": color.semantic.warning,
    "--ds-warning-soft": color.semantic.warningSoft,
    "--ds-danger": color.semantic.danger,
    "--ds-danger-soft": color.semantic.dangerSoft,
    "--ds-info": color.semantic.info,
    "--ds-info-soft": color.semantic.infoSoft,
    "--ds-chart": color.chart.primary,
    "--ds-chart-secondary": color.chart.secondary,
    "--ds-chart-tertiary": color.chart.tertiary,
    "--ds-chart-grid": dark ? color.chart.gridDark : color.chart.grid,

    /* Typography */
    "--ds-font-sans": font.sans,
    "--ds-font-mono": font.mono,

    /* Radius */
    "--ds-radius-sm": `${radius.sm}px`,
    "--ds-radius-md": `${radius.md}px`,
    "--ds-radius-lg": `${radius.lg}px`,
    "--ds-radius-modal": `${radius.modal}px`,
    "--ds-radius-chip": `${radius.chip}px`,
    "--ds-radius-pill": `${radius.pill}px`,

    /* Shadow */
    "--ds-shadow-sm": dark ? "0 1px 2px rgba(0,0,0,0.25)" : shadow.sm,
    "--ds-shadow-md": dark ? "0 8px 24px rgba(0,0,0,0.32)" : shadow.md,
    "--ds-shadow-lg": dark ? "0 18px 48px rgba(0,0,0,0.40)" : shadow.lg,

    /* Motion */
    "--ds-ease": ease.standard,
    "--ds-ease-out": ease.out,
    "--ds-duration-fast": duration.fast,
    "--ds-duration-normal": duration.normal,
    "--ds-duration-slow": duration.slow,
    "--ds-duration-press": duration.press,
    "--ds-duration-hover": duration.hover,
    "--ds-duration-button": duration.button,
    "--ds-duration-card": duration.card,
    "--ds-duration-input": duration.input,
    "--ds-duration-tab": duration.tab,
    "--ds-duration-dropdown": duration.dropdown,
    "--ds-duration-drawer": duration.drawer,
    "--ds-duration-modal": duration.modal,
    "--ds-duration-tooltip": duration.tooltip,
    "--ds-duration-table": duration.table,
    "--ds-duration-chart": duration.chart,
    "--ds-duration-notification": duration.notification,
    "--ds-duration-page": duration.page,
    "--ds-duration-nav": duration.nav,
    "--ds-duration-ai": duration.ai,
    "--ds-duration-skeleton": duration.skeleton,

    /* Spacing */
    "--ds-space-1": `${space[1]}px`,
    "--ds-space-2": `${space[2]}px`,
    "--ds-space-3": `${space[3]}px`,
    "--ds-space-4": `${space[4]}px`,
    "--ds-space-5": `${space[5]}px`,
    "--ds-space-6": `${space[6]}px`,
    "--ds-space-7": `${space[7]}px`,
    "--ds-space-8": `${space[8]}px`,
    "--ds-space-9": `${space[9]}px`,
    "--ds-space-10": `${space[10]}px`,
    "--ds-space-11": `${space[11]}px`,

    /* Layout */
    "--ds-sidebar-width": `${layout.sidebarWidth}px`,
    "--ds-topbar-height": `${layout.topbarHeight}px`,
    "--ds-button-height": `${layout.buttonHeight}px`,
    "--ds-input-height": `${layout.inputHeight}px`,
    "--ds-table-row": `${layout.tableRowHeight}px`,
    "--ds-icon-size": `${layout.iconSize}px`,
  };
}

/** @deprecated Prefer named exports above */
const tokens = { color, font, type, space, spacing, radius, shadow, ease, duration, layout, focus, cssVars };
export default tokens;
