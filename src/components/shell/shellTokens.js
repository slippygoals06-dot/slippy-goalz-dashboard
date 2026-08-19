/**
 * Shell chrome tokens — Linear-strict consistency layer.
 * All shell components import from here. 8pt grid only.
 */

import { ease, duration } from "../../design-system/tokens";

export const SHELL = {
  ease: ease.standard,
  duration: duration.nav,
  hover: duration.hover,
  press: duration.press,

  /** Control hit target — icons, sync, profile trigger */
  control: 40,
  /** Primary CTA / search field height */
  field: 40,

  icon: 20,
  iconStroke: 2,
  /** Dense menus only */
  iconSm: 16,

  radius: 10,
  radiusChip: 8,

  gap: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    "2xl": 32,
  },

  /** Horizontal inset for sidebar content (brand, nav, profile) */
  sidebarInset: 12,
  /** Topbar horizontal padding */
  topbarPadX: 32,
  topbarPadXMobile: 16,

  font: {
    brand: { size: 15, weight: 600, tracking: "-0.02em" },
    topbarTitle: { size: 14, weight: 600, tracking: "-0.01em" },
    nav: { size: 13, weight: 500 },
    body: { size: 13, weight: 400 },
    meta: { size: 12, weight: 500 },
    caption: { size: 12, weight: 400 },
    micro: { size: 11, weight: 500 },
  },

  pageTitle: { size: 24, weight: 600, tracking: "-0.02em" },
  pageSubtitle: { size: 14, weight: 400 },
};

export function hoverFill(dark) {
  return dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)";
}

export function divider(dark) {
  return dark ? "rgba(255,255,255,0.05)" : "rgba(15,17,21,0.06)";
}

export function sidebarSurface(dark) {
  return dark ? "#111318" : "#EEF0F3";
}

export function iconButtonStyle(t) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: SHELL.control,
    height: SHELL.control,
    borderRadius: SHELL.radius,
    border: "none",
    background: "transparent",
    color: t.textSecondary,
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
    transition: `background ${SHELL.duration} ${SHELL.ease}, color ${SHELL.duration} ${SHELL.ease}`,
  };
}
