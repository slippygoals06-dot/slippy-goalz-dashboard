import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTheme, RADIUS } from "../context/ThemeContext";
import { motionPresets } from "../design-system/motion";
import { iconButtonStyle, SHELL } from "./shell/shellTokens";

/**
 * Right slide-over sheet / drawer.
 * Opacity + soft translateX (16–24px) · 220ms — never a dramatic wipe.
 */
export default function Sheet({ open, onClose, title, subtitle, children, width = 420, footer }) {
  const { theme: t, dark } = useTheme();

  useEffect(() => {
    if (!open) return;
    const onEsc = () => onClose?.();
    window.addEventListener("slippy:escape", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("slippy:escape", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const { backdrop, panel } = motionPresets.drawer;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="modal-backdrop"
            initial={backdrop.initial}
            animate={backdrop.animate}
            exit={backdrop.exit}
            transition={backdrop.transition}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9000,
              background: dark ? "rgba(0,0,0,0.55)" : "rgba(15,17,21,0.28)",
            }}
          />
          <motion.aside
            role="dialog"
            aria-modal
            aria-label={title}
            initial={panel.initial}
            animate={panel.animate}
            exit={panel.exit}
            transition={panel.transition}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: `min(${width}px, 100vw)`,
              zIndex: 9001,
              background: t.cardBg,
              borderLeft: `1px solid ${t.border}`,
              boxShadow: dark ? " -8px 0 24px rgba(0,0,0,0.28)" : " -8px 0 24px rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: SHELL.gap.md,
                padding: `${SHELL.gap.xl}px ${SHELL.gap.xl}px ${SHELL.gap.lg}px`,
                borderBottom: `1px solid ${t.borderSub || t.border}`,
              }}
            >
              <div style={{ minWidth: 0, paddingTop: 2 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 550,
                    letterSpacing: -0.3,
                    color: t.textPrimary,
                    lineHeight: 1.3,
                  }}
                >
                  {title}
                </div>
                {subtitle && (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: t.textMuted,
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {subtitle}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="ui-press"
                onClick={onClose}
                aria-label="Close"
                style={{
                  ...iconButtonStyle(t),
                  border: `1px solid ${t.border}`,
                  background: dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.03)",
                  color: t.textSecondary,
                  borderRadius: RADIUS.control,
                }}
              >
                <X size={SHELL.iconSm} strokeWidth={SHELL.iconStroke} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: SHELL.gap.xl }}>{children}</div>
            {footer && (
              <div
                style={{
                  padding: `${SHELL.gap.lg}px ${SHELL.gap.xl}px`,
                  borderTop: `1px solid ${t.borderSub || t.border}`,
                  display: "flex",
                  gap: SHELL.gap.sm,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {footer}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
