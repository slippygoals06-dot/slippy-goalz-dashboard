import { motion } from "framer-motion";
import { useTheme, RADIUS } from "../context/ThemeContext";
import { tween, duration as motionMs } from "../design-system/motion";

/** Quiet segmented control — Linear-style track + accent active pill */
export default function SegmentedControl({ options, value, onChange, layoutId = "activeTab" }) {
  const { theme: t, dark } = useTheme();
  const r = t.controlRadius ?? RADIUS.control;

  return (
    <div
      role="tablist"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        padding: 3,
        height: 40,
        borderRadius: r,
        background: dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)",
        border: `1px solid ${t.border}`,
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={active}
            className="ui-press"
            onClick={() => onChange(opt)}
            style={{
              position: "relative",
              padding: "0 14px",
              height: 32,
              borderRadius: Math.max(r - 2, 8),
              fontSize: 13,
              fontWeight: active ? 500 : 400,
              cursor: "pointer",
              background: "transparent",
              color: active ? "#FFFFFF" : t.textSecondary,
              border: "none",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
              zIndex: 1,
              transition: `color ${motionMs.tab}s cubic-bezier(0.2, 0, 0, 1)`,
            }}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: Math.max(r - 2, 8),
                  background: t.btnPrimaryBg || t.accentSolid || t.accent,
                  zIndex: -1,
                }}
                transition={tween(motionMs.tab)}
              />
            )}
            {opt}
          </button>
        );
      })}
    </div>
  );
}
