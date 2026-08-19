import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { motionPresets } from "../design-system/motion";

/** Tooltip — opacity only, 120ms. Never scale. */
export default function Tooltip({ content, children, side = "right" }) {
  const { theme: t, dark } = useTheme();
  const [show, setShow] = useState(false);

  const pos =
    side === "right"
      ? { left: "100%", top: "50%", marginLeft: 10, transformOrigin: "left center" }
      : side === "bottom"
        ? { top: "100%", left: "50%", marginTop: 8, transformOrigin: "top center" }
        : { bottom: "100%", left: "50%", marginBottom: 8, transformOrigin: "bottom center" };

  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && content && (
          <motion.span
            role="tooltip"
            initial={motionPresets.tooltip.initial}
            animate={motionPresets.tooltip.animate}
            exit={motionPresets.tooltip.exit}
            transition={motionPresets.tooltip.transition}
            style={{
              position: "absolute",
              zIndex: 80,
              ...pos,
              ...(side !== "right"
                ? { transform: "translateX(-50%)", left: "50%" }
                : { transform: "translateY(-50%)" }),
              whiteSpace: "nowrap",
              padding: "6px 10px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              background: dark ? "#0B0D10" : "#111827",
              color: "#FFFFFF",
              border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "transparent"}`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
              pointerEvents: "none",
            }}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
