import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  color,
  font,
  radius,
  shadow,
  ease,
  duration as dsDuration,
  layout,
  cssVars,
} from "../design-system/tokens";
import {
  BRAND_ACCENT,
  BRAND_ACCENT_HOVER,
  BRAND_ACCENT_PRESS,
  BRAND_SOFT_BG,
  BRAND_SOFT_BORDER,
  BRAND_TINT,
  BRAND_RING,
} from "../constants/brand";

export const EASE = ease.standard;

export const DURATION = {
  micro: dsDuration.button,
  hover: dsDuration.hover,
  button: dsDuration.button,
  card: dsDuration.card,
  input: dsDuration.input,
  tab: dsDuration.tab,
  dropdown: dsDuration.dropdown,
  drawer: dsDuration.drawer,
  modal: dsDuration.modal,
  tooltip: dsDuration.tooltip,
  table: dsDuration.table,
  chart: dsDuration.chart,
  notification: dsDuration.notification,
  page: dsDuration.page,
  nav: dsDuration.nav,
  ai: dsDuration.ai,
  skeleton: dsDuration.skeleton,
  press: dsDuration.press,
  backdrop: dsDuration.normal,
};

export const RADIUS = {
  card: radius.lg,
  control: radius.sm,
  chip: radius.chip,
  input: radius.sm,
  modal: radius.modal,
  pill: radius.pill,
};

/**
 * Theme tokens mapped from the Design System.
 * Existing helpers (cardStyle, primaryBtnStyle, …) stay compatible.
 */
export const TOKENS = {
  accent: BRAND_ACCENT,
  accentAlt: BRAND_ACCENT_HOVER,
  accentHi: BRAND_ACCENT,
  accentDeep: BRAND_ACCENT_PRESS,
  activeTintLight: BRAND_TINT,
  activeTintDark: color.brand.softAlpha,
  activeTintDarkAlt: color.bg.elevated,

  lightBg: color.light.bg.primary,
  lightSurface: color.light.bg.card,
  lightSurface2: color.light.bg.secondary,
  lightText: color.light.text.primary,
  lightTextSecondary: color.light.text.secondary,
  lightBorder: color.light.border.default,

  darkBg: color.bg.primary,
  darkSurface: color.bg.card,
  darkSurface2: color.bg.elevated,
  darkText: color.text.primary,
  darkTextSecondary: color.text.secondary,
  darkBorder: color.border.default,

  olive: BRAND_ACCENT,
  oliveHi: BRAND_ACCENT,
  oliveDeep: BRAND_ACCENT_PRESS,
  oliveLight: BRAND_SOFT_BORDER,
  oliveMid: BRAND_ACCENT,
  oliveBorder: "rgba(244,63,94,0.22)",
  oliveBorderHover: "rgba(244,63,94,0.36)",
  oliveGlow: color.brand.softAlpha,
  gold: color.text.secondary,
  goldHi: color.text.secondary,
  goldDeep: color.text.muted,
  goldTint: BRAND_TINT,
  goldMuted: "rgba(165,172,184,0.12)",
  goldBorder: "rgba(165,172,184,0.24)",
  emerald: BRAND_ACCENT,
  emeraldHi: BRAND_ACCENT,
  emeraldDeep: BRAND_ACCENT_PRESS,
  emeraldMuted: color.brand.softAlpha,
  emeraldBorder: "rgba(244,63,94,0.22)",
  emeraldBorderHover: "rgba(244,63,94,0.36)",
  risk: color.semantic.danger,
};

const FONT_SANS = font.sans;
const FONT_DISPLAY = font.sans;
const FONT_MONO = font.mono;

export const LIGHT = {
  name: "light",
  pageBg: color.light.bg.primary,
  cardBg: color.light.bg.card,
  cardBgSolid: color.light.bg.card,
  cardBg2: color.light.bg.secondary,
  cardHover: color.light.bg.secondary,
  sidebarBg: color.light.bg.secondary,
  sidebarBorder: color.light.border.divider,
  topbarBg: color.light.bg.primary,
  inputBg: color.light.bg.elevated,
  border: color.light.border.default,
  borderSub: color.light.border.divider,
  borderHover: color.light.border.hover,
  borderTopHighlight: "transparent",
  textPrimary: color.light.text.primary,
  textSecondary: color.light.text.secondary,
  textMuted: color.light.text.muted,
  textDisabled: color.light.text.disabled,
  thBg: color.light.bg.secondary,
  thColor: color.light.text.muted,
  tdColor: color.light.text.primary,
  rowHover: "rgba(17,24,39,0.03)",
  cardShadow: shadow.sm,
  cardShadowHover: shadow.md,
  cardRadius: radius.lg,
  controlRadius: radius.sm,
  accent: BRAND_ACCENT,
  accentSolid: BRAND_ACCENT,
  accentGlow: BRAND_TINT,
  accentHover: BRAND_ACCENT_HOVER,
  accentDeep: BRAND_ACCENT_PRESS,
  accentHi: BRAND_ACCENT,
  accentSoft: BRAND_SOFT_BG,
  accentSoftBorder: BRAND_SOFT_BORDER,
  activeTint: BRAND_TINT,
  chart: color.chart.primary,
  chartSecondary: color.chart.secondary,
  chartGrid: color.chart.grid,
  gold: color.light.text.secondary,
  goldHi: color.light.text.secondary,
  goldDeep: color.light.text.muted,
  goldMuted: "rgba(75,85,99,0.10)",
  risk: color.semantic.danger,
  riskBg: color.semantic.dangerSoft,
  riskBorder: "rgba(239,68,68,0.22)",
  btnPrimaryBg: BRAND_ACCENT,
  btnPrimaryColor: "#FFFFFF",
  btnPrimaryBorder: "transparent",
  btnPrimaryShadow: "none",
  btnPrimaryHover: BRAND_ACCENT_HOVER,
  btnPrimaryPress: BRAND_ACCENT_PRESS,
  success: color.semantic.success,
  successMuted: color.semantic.successSoft,
  warning: color.semantic.warning,
  warningMuted: color.semantic.warningSoft,
  info: color.semantic.info,
  infoMuted: color.semantic.infoSoft,
  fontSans: "var(--font-sans)",
  fontDisplay: "var(--font-display)",
  fontMono: "var(--font-mono)",
};

export const DARK = {
  name: "dark",
  pageBg: color.bg.primary,
  cardBg: color.bg.card,
  cardBgSolid: color.bg.card,
  cardBg2: color.bg.elevated,
  cardHover: color.bg.elevated,
  sidebarBg: color.bg.secondary,
  sidebarBorder: color.border.divider,
  topbarBg: color.bg.primary,
  inputBg: color.bg.elevated,
  border: color.border.default,
  borderSub: color.border.divider,
  borderHover: color.border.hover,
  borderTopHighlight: "transparent",
  textPrimary: color.text.primary,
  textSecondary: color.text.secondary,
  textMuted: color.text.muted,
  textDisabled: color.text.disabled,
  thBg: color.bg.secondary,
  thColor: color.text.muted,
  tdColor: color.text.primary,
  rowHover: "rgba(255,255,255,0.03)",
  cardShadow: "0 1px 2px rgba(0,0,0,0.25)",
  cardShadowHover: "0 8px 24px rgba(0,0,0,0.32)",
  cardRadius: radius.lg,
  controlRadius: radius.sm,
  accent: BRAND_ACCENT,
  accentSolid: BRAND_ACCENT,
  accentGlow: color.brand.softAlpha,
  accentHover: BRAND_ACCENT_HOVER,
  accentDeep: BRAND_ACCENT_PRESS,
  accentHi: BRAND_ACCENT,
  accentSoft: color.brand.softAlpha,
  accentSoftBorder: "rgba(244,63,94,0.28)",
  activeTint: color.brand.softAlpha,
  chart: color.chart.secondary,
  chartSecondary: color.chart.tertiary,
  chartGrid: color.chart.gridDark,
  gold: color.text.secondary,
  goldHi: color.text.primary,
  goldDeep: color.text.muted,
  goldMuted: "rgba(165,172,184,0.12)",
  risk: color.semantic.danger,
  riskBg: color.semantic.dangerSoft,
  riskBorder: "rgba(239,68,68,0.28)",
  btnPrimaryBg: BRAND_ACCENT,
  btnPrimaryColor: "#FFFFFF",
  btnPrimaryBorder: "transparent",
  btnPrimaryShadow: "none",
  btnPrimaryHover: BRAND_ACCENT_HOVER,
  btnPrimaryPress: BRAND_ACCENT_PRESS,
  success: color.semantic.success,
  successMuted: color.semantic.successSoft,
  warning: color.semantic.warning,
  warningMuted: color.semantic.warningSoft,
  info: color.semantic.info,
  infoMuted: color.semantic.infoSoft,
  fontSans: "var(--font-sans)",
  fontDisplay: "var(--font-display)",
  fontMono: "var(--font-mono)",
};

function applyCssVars(theme) {
  const root = document.documentElement;
  const dark = theme.name === "dark";
  const ds = cssVars(dark ? "dark" : "light");

  Object.entries(ds).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  /* Legacy aliases used by existing pages */
  const legacy = {
    "--accent": theme.accentSolid || theme.accent,
    "--accent-hover": theme.accentHover,
    "--accent-glow": theme.accentGlow,
    "--accent-alt": TOKENS.accentAlt,
    "--active-tint": theme.activeTint,
    "--olive": theme.accentSolid || theme.accent,
    "--olive-hi": TOKENS.accent,
    "--olive-deep": TOKENS.accentDeep,
    "--olive-light": BRAND_SOFT_BORDER,
    "--olive-mid": theme.accentSolid || theme.accent,
    "--olive-border": "rgba(244,63,94,0.22)",
    "--olive-border-hover": "rgba(244,63,94,0.36)",
    "--olive-glow": theme.accentGlow,
    "--gold": theme.gold,
    "--gold-hi": theme.goldHi,
    "--gold-deep": theme.goldDeep,
    "--gold-tint": TOKENS.goldTint,
    "--emerald": theme.accentSolid || theme.accent,
    "--emerald-hi": TOKENS.accent,
    "--emerald-deep": TOKENS.accentDeep,
    "--bg": theme.pageBg,
    "--panel": theme.cardBg,
    "--panel-hover": theme.cardHover,
    "--border": theme.border,
    "--border-soft": theme.borderSub,
    "--text": theme.textPrimary,
    "--text-dim": theme.textSecondary,
    "--text-faint": theme.textMuted,
    "--risk": theme.risk,
    "--shadow-sm": theme.cardShadow,
    "--shadow-md": theme.cardShadowHover,
    "--risk-bg": theme.riskBg,
    "--risk-border": theme.riskBorder,
    "--bg-page": theme.pageBg,
    "--bg-page-full": theme.pageBg,
    "--bg-sidebar": theme.sidebarBg,
    "--bg-card": theme.cardBg,
    "--bg-card-hover": theme.cardHover,
    "--bg-th": theme.thBg,
    "--border-subtle": theme.borderSub,
    "--border-hover": theme.borderHover,
    "--border-top-highlight": theme.borderTopHighlight,
    "--text-primary": theme.textPrimary,
    "--text-secondary": theme.textSecondary,
    "--text-muted": theme.textMuted,
    "--card-shadow": theme.cardShadow,
    "--topbar-bg": theme.topbarBg,
    "--ease-premium": EASE,
    "--duration-micro": DURATION.micro,
    "--duration-card": DURATION.card,
    "--duration-page": DURATION.page,
    "--font-sans": FONT_SANS,
    "--font-display": FONT_DISPLAY,
    "--font-mono": FONT_MONO,
    "--glow-accent": "none",
    "--glow-accent-soft": "none",
    "--glow-ring": `0 0 0 3px ${BRAND_RING}`,
    "--radius-card": `${radius.lg}px`,
    "--radius-control": `${radius.sm}px`,
    "--radius-pill": `${radius.pill}px`,
    "--radius-chip": `${radius.chip}px`,
    "--space-1": "4px",
    "--space-2": "8px",
    "--space-3": "12px",
    "--space-4": "16px",
    "--space-5": "24px",
    "--space-6": "32px",
    "--space-7": "40px",
    "--space-8": "48px",
    "--color-scheme": dark ? "dark" : "light",
    "--ds-sidebar-width": `${layout.sidebarWidth}px`,
    "--ds-topbar-height": `${layout.topbarHeight}px`,
  };

  Object.entries(legacy).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.style.colorScheme = theme.name;
  root.setAttribute("data-theme", theme.name);
}

const ThemeContext = createContext();

function readPreference() {
  try {
    const stored = localStorage.getItem("slippy_theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
    const legacy = localStorage.getItem("slippy_dark");
    if (legacy === "1") return "dark";
    if (legacy === "0") return "light";
  } catch {
    /* ignore */
  }
  return "system";
}

function systemDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveDark(pref) {
  if (pref === "system") return systemDark();
  return pref === "dark";
}

if (typeof document !== "undefined") {
  applyCssVars(resolveDark(readPreference()) ? DARK : LIGHT);
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPreference);
  const [systemIsDark, setSystemIsDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemIsDark(mq.matches);
    mq.addEventListener?.("change", onChange);
    mq.addListener?.(onChange);
    return () => {
      mq.removeEventListener?.("change", onChange);
      mq.removeListener?.(onChange);
    };
  }, []);

  const dark = preference === "system" ? systemIsDark : preference === "dark";

  useEffect(() => {
    applyCssVars(dark ? DARK : LIGHT);
    try {
      localStorage.setItem("slippy_theme", preference);
      localStorage.setItem("slippy_dark", dark ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [dark, preference]);

  const toggle = useCallback(() => {
    setPreference((p) => {
      const currentlyDark = p === "system" ? systemDark() : p === "dark";
      return currentlyDark ? "light" : "dark";
    });
  }, []);

  const value = useMemo(
    () => ({
      theme: dark ? DARK : LIGHT,
      dark,
      preference,
      setPreference,
      toggle,
      setDark: (v) => setPreference(v ? "dark" : "light"),
    }),
    [dark, preference, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export function cardStyle(t, { interactive = true } = {}) {
  return {
    background: t.cardBg,
    border: `1px solid ${t.border}`,
    borderRadius: t.cardRadius ?? RADIUS.card,
    boxShadow: t.cardShadow,
    transition: interactive
      ? `background ${DURATION.card} ${EASE}, border-color ${DURATION.card} ${EASE}, box-shadow ${DURATION.card} ${EASE}, transform ${DURATION.card} ${EASE}`
      : undefined,
  };
}

export function cardHoverProps(t) {
  return {
    onMouseEnter: (e) => {
      e.currentTarget.style.borderColor = t.borderHover;
      e.currentTarget.style.boxShadow = t.cardShadowHover || t.cardShadow;
      e.currentTarget.style.transform = "translateY(-2px)";
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.borderColor = t.border;
      e.currentTarget.style.boxShadow = t.cardShadow || "none";
      e.currentTarget.style.transform = "translateY(0)";
    },
  };
}

export function primaryBtnStyle(t) {
  return {
    background: t.btnPrimaryBg,
    color: t.btnPrimaryColor,
    boxShadow: "none",
    border: `1px solid ${t.btnPrimaryBorder || "transparent"}`,
    borderRadius: t.controlRadius ?? RADIUS.control,
    fontWeight: 500,
    fontSize: 14,
    height: layout.buttonHeight,
    padding: "0 16px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    transition: `transform ${DURATION.press} ${EASE}, background ${DURATION.micro} ${EASE}, opacity ${DURATION.micro} ${EASE}`,
  };
}

export function primaryBtnHoverProps(t) {
  return {
    onMouseEnter: (e) => {
      e.currentTarget.style.background = t.btnPrimaryHover;
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.background = t.btnPrimaryBg;
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseDown: (e) => {
      e.currentTarget.style.background = t.btnPrimaryPress || t.btnPrimaryHover;
      e.currentTarget.style.transform = "scale(0.98)";
    },
    onMouseUp: (e) => {
      e.currentTarget.style.background = t.btnPrimaryHover;
      e.currentTarget.style.transform = "scale(1)";
    },
  };
}

export function secondaryBtnStyle(t) {
  return {
    background: "transparent",
    border: `1px solid ${t.border}`,
    color: t.textPrimary,
    borderRadius: t.controlRadius ?? RADIUS.control,
    fontWeight: 500,
    fontSize: 14,
    height: layout.buttonHeight,
    padding: "0 16px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    boxShadow: "none",
    transition: `transform ${DURATION.press} ${EASE}, background ${DURATION.micro} ${EASE}, border-color ${DURATION.micro} ${EASE}, color ${DURATION.micro} ${EASE}`,
  };
}

export function secondaryBtnHoverProps(t) {
  return {
    onMouseEnter: (e) => {
      e.currentTarget.style.background = t.activeTint;
      e.currentTarget.style.borderColor = t.borderHover;
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.borderColor = t.border;
    },
  };
}

export function pageShellStyle({ narrow = false, wide = false } = {}) {
  return {
    padding: `${layout.pagePadding.y}px ${layout.pagePadding.x}px ${layout.pagePadding.bottom}px`,
    maxWidth: narrow ? layout.maxWidth.narrow : wide ? layout.maxWidth.wide : layout.maxWidth.default,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  };
}

export function inputStyle(t) {
  return {
    width: "100%",
    padding: "0 16px",
    minHeight: layout.inputHeight,
    height: layout.inputHeight,
    borderRadius: t.controlRadius ?? RADIUS.input,
    background: t.inputBg,
    border: `1px solid ${t.border}`,
    fontSize: 15,
    color: t.textPrimary,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: `border-color ${DURATION.micro} ${EASE}, box-shadow ${DURATION.micro} ${EASE}`,
  };
}

export function pageTitleStyle(t) {
  return {
    margin: 0,
    fontSize: 24,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
    color: t.textPrimary,
    fontFamily: 'var(--font-sans), "Inter", system-ui, sans-serif',
  };
}
