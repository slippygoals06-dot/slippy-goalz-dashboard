/**
 * Motion presets — calm, premium, never decorative.
 *
 * Opacity · translateY(4–8px) · translateX(16–24px drawers) · scale(0.98–1.01)
 * Never rotate · bounce · elastic · overshoot · flash · large zoom.
 *
 * Durations mirror tokens.js `duration` (seconds for Framer).
 */

import { ease as easeCss, duration as durationCss } from "./tokens";

/** Framer-compatible cubic-bezier — Linear / Stripe standard */
export const EASE = [0.2, 0, 0, 1];

/** Parse "150ms" → 0.15 */
function ms(value) {
  if (typeof value === "number") return value;
  const n = parseFloat(value);
  if (Number.isNaN(n)) return 0.18;
  return String(value).includes("ms") ? n / 1000 : n;
}

/** Semantic durations in seconds (Framer) */
export const duration = {
  hover: ms(durationCss.hover),
  press: ms(durationCss.press),
  button: ms(durationCss.button),
  card: ms(durationCss.card),
  input: ms(durationCss.input),
  tab: ms(durationCss.tab),
  dropdown: ms(durationCss.dropdown),
  drawer: ms(durationCss.drawer),
  modal: ms(durationCss.modal),
  tooltip: ms(durationCss.tooltip),
  table: ms(durationCss.table),
  chart: ms(durationCss.chart),
  notification: ms(durationCss.notification),
  page: ms(durationCss.page),
  nav: ms(durationCss.nav),
  ai: ms(durationCss.ai),
  skeleton: ms(durationCss.skeleton),
  fast: ms(durationCss.fast),
  normal: ms(durationCss.normal),
  slow: ms(durationCss.slow),
};

export const durationCssValues = durationCss;
export const easeCssValue = easeCss.standard;

/** Shared tween — always type:tween, never spring */
export function tween(seconds, delay = 0) {
  return { type: "tween", duration: seconds, ease: EASE, delay };
}

/**
 * Interaction recipes — import these; do not invent one-off timings.
 */
export const motionPresets = {
  /** Hover chrome (buttons, nav, rows) */
  hover: tween(duration.hover),

  /** Active / press — scale 0.98 */
  press: tween(duration.press),

  /** Primary / secondary buttons */
  button: tween(duration.button),

  /** Cards / panels enter + hover lift */
  card: {
    enter: {
      initial: { opacity: 0, y: 6 },
      animate: { opacity: 1, y: 0 },
      transition: tween(duration.card),
    },
    hoverLift: -2,
  },

  /** Tab / segmented pill */
  tab: tween(duration.tab),

  /** Navigation item color/fill */
  nav: tween(duration.nav),

  /** Dropdown / menu */
  dropdown: {
    initial: { opacity: 0, y: -4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -2 },
    transition: tween(duration.dropdown),
  },

  /**
   * Drawer / sheet — opacity + soft X (16–24px), not a dramatic wipe.
   */
  drawer: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: tween(duration.normal),
    },
    panel: {
      initial: { opacity: 0, x: 24 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 16 },
      transition: tween(duration.drawer),
    },
  },

  /** Dialog / modal — opacity + scale 0.98 + y 4 */
  modal: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: tween(duration.normal),
    },
    panel: {
      initial: { opacity: 0, scale: 0.98, y: 4 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.98, y: 4 },
      transition: tween(duration.modal),
    },
  },

  /** Tooltip — opacity only */
  tooltip: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: tween(duration.tooltip),
  },

  /**
   * Page content only (sidebar + topbar stay fixed).
   * Fade + slight upward · 220ms
   */
  page: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: tween(duration.page),
  },

  /** Toast / notification */
  notification: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 4 },
    transition: tween(duration.notification),
  },

  /** Table / list row enter */
  table: {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: tween(duration.table),
  },

  /** Chart container enter */
  chart: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: tween(duration.chart),
  },

  /** Empty state */
  empty: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: tween(duration.card),
  },

  /** AI response / briefing expand */
  ai: {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: tween(duration.ai),
  },

  /** Skeleton → content crossfade */
  contentReveal: {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: tween(duration.skeleton),
  },

  /** Soft fade only */
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: tween(duration.page),
  },
};

export default motionPresets;
