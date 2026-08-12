import { Check, Circle, X } from "lucide-react";
import { STATUS_COLORS, PAYMENT_COLORS } from "../constants";
import { useTheme } from "../context/ThemeContext";

/** Premium SaaS status pills — emerald success, amber pending, rose danger */
const SOFT = {
  Pending: {
    bg: "#FFFBEB",
    color: "#B45309",
    ring: "#FDE68A",
    dot: "#F59E0B",
    icon: "dot",
  },
  Confirmed: {
    bg: "#F1F3F5",
    color: "#5C6370",
    ring: "rgba(15,17,21,0.10)",
    dot: "#5C6370",
    icon: "dot",
  },
  Completed: {
    bg: "#ECFDF5",
    color: "#047857",
    ring: "#A7F3D0",
    dot: "#059669",
    icon: "check",
  },
  Paid: {
    bg: "#ECFDF5",
    color: "#047857",
    ring: "#A7F3D0",
    dot: "#059669",
    icon: "check",
  },
  Rejected: {
    bg: "#FFF1F2",
    color: "#BE123C",
    ring: "#FECDD3",
    dot: "#E11D48",
    icon: "x",
  },
  Cancelled: {
    bg: "#FFF1F2",
    color: "#BE123C",
    ring: "#FECDD3",
    dot: "#E11D48",
    icon: "x",
  },
  Unpaid: {
    bg: "#FFFBEB",
    color: "#B45309",
    ring: "#FDE68A",
    dot: "#F59E0B",
    icon: "dot",
  },
  Available: {
    bg: "#ECFDF5",
    color: "#047857",
    ring: "#A7F3D0",
    dot: "#059669",
    icon: "dot",
  },
  Booked: {
    bg: "#FFF1F2",
    color: "#BE123C",
    ring: "#FECDD3",
    dot: "#E11D48",
    icon: "dot",
  },
  WhatsApp: {
    bg: "rgba(37,211,102,0.10)",
    color: "#1B7A3D",
    ring: "rgba(37,211,102,0.22)",
    dot: "#25d366",
    icon: "dot",
  },
  Instagram: {
    bg: "#FDF2F8",
    color: "#DB2777",
    ring: "#FBCFE8",
    dot: "#E1306C",
    icon: "dot",
  },
  Facebook: {
    bg: "#FFFFFF",
    color: "#1877F2",
    ring: "#BFDBFE",
    dot: "#1877F2",
    icon: "dot",
  },
  Messenger: {
    bg: "#EFF6FF",
    color: "#0866FF",
    ring: "#BFDBFE",
    dot: "#0084FF",
    icon: "dot",
  },
};

const DARK_SOFT = {
  Pending: {
    bg: "rgba(245,158,11,0.12)",
    color: "#FBBF24",
    ring: "rgba(245,158,11,0.28)",
    dot: "#FBBF24",
    icon: "dot",
  },
  Confirmed: {
    bg: "rgba(92,99,112,0.14)",
    color: "#A1A8B3",
    ring: "rgba(92,99,112,0.28)",
    dot: "#5C6370",
    icon: "dot",
  },
  Completed: {
    bg: "rgba(16,185,129,0.14)",
    color: "#34D399",
    ring: "rgba(16,185,129,0.28)",
    dot: "#34D399",
    icon: "check",
  },
  Paid: {
    bg: "rgba(16,185,129,0.14)",
    color: "#34D399",
    ring: "rgba(16,185,129,0.28)",
    dot: "#34D399",
    icon: "check",
  },
  Rejected: {
    bg: "rgba(244,63,94,0.12)",
    color: "#FDA4AF",
    ring: "rgba(244,63,94,0.28)",
    dot: "#F43F5E",
    icon: "x",
  },
  Cancelled: {
    bg: "rgba(244,63,94,0.12)",
    color: "#FDA4AF",
    ring: "rgba(244,63,94,0.28)",
    dot: "#F43F5E",
    icon: "x",
  },
  Unpaid: {
    bg: "rgba(245,158,11,0.12)",
    color: "#FBBF24",
    ring: "rgba(245,158,11,0.28)",
    dot: "#FBBF24",
    icon: "dot",
  },
  Available: {
    bg: "rgba(16,185,129,0.14)",
    color: "#34D399",
    ring: "rgba(16,185,129,0.28)",
    dot: "#059669",
    icon: "dot",
  },
  Booked: {
    bg: "rgba(244,63,94,0.12)",
    color: "#FDA4AF",
    ring: "rgba(244,63,94,0.28)",
    dot: "#F43F5E",
    icon: "dot",
  },
  WhatsApp: {
    bg: "rgba(37,211,102,0.14)",
    color: "#4ADE80",
    ring: "rgba(37,211,102,0.28)",
    dot: "#25d366",
    icon: "dot",
  },
  Instagram: {
    bg: "rgba(225,48,108,0.16)",
    color: "#F472B6",
    ring: "rgba(225,48,108,0.30)",
    dot: "#E1306C",
    icon: "dot",
  },
  Facebook: {
    bg: "rgba(24,119,242,0.14)",
    color: "#60A5FA",
    ring: "rgba(24,119,242,0.30)",
    dot: "#1877F2",
    icon: "dot",
  },
  Messenger: {
    bg: "rgba(0,132,255,0.14)",
    color: "#60A5FA",
    ring: "rgba(0,132,255,0.30)",
    dot: "#0084FF",
    icon: "dot",
  },
};

function resolveSoft(status, dark) {
  const key = String(status || "");
  const map = dark ? DARK_SOFT : SOFT;
  if (map[key]) return map[key];
  const lower = key.toLowerCase();
  if (lower === "unpaid") return map.Unpaid;
  if (lower === "paid") return map.Paid;
  if (lower === "completed") return map.Completed;
  if (lower === "pending") return map.Pending;
  if (lower === "confirmed") return map.Confirmed;
  if (lower === "rejected" || lower === "cancelled") return map.Rejected;
  const raw =
    STATUS_COLORS[status] ||
    PAYMENT_COLORS[status] ||
    (lower === "unpaid" ? PAYMENT_COLORS.Unpaid : null) ||
    STATUS_COLORS.default;
  return {
    bg: raw.bg,
    color: raw.color,
    ring: raw.border,
    dot: raw.dot,
    icon: "dot",
  };
}

function StatusIcon({ type, color, live }) {
  if (type === "check") {
    return <Check size={12} strokeWidth={2.5} color={color} aria-hidden />;
  }
  if (type === "x") {
    return <X size={12} strokeWidth={2.5} color={color} aria-hidden />;
  }
  return (
    <span style={{ position: "relative", width: 6, height: 6, flexShrink: 0, display: "inline-flex" }}>
      {live && (
        <span
          aria-hidden
          className="status-live"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: color,
          }}
        />
      )}
      <Circle size={6} fill={color} stroke="none" aria-hidden style={{ display: "block" }} />
    </span>
  );
}

export default function StatusBadge({ status, pulse }) {
  const { dark } = useTheme();
  const cfg = resolveSoft(status, dark);
  const live = pulse ?? status === "Pending";

  return (
    <span
      className="status-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 24,
        padding: "0 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1,
        letterSpacing: "0.01em",
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.ring}`,
        whiteSpace: "nowrap",
        boxShadow: "none",
      }}
    >
      <StatusIcon type={cfg.icon} color={cfg.dot || cfg.color} live={live} />
      {status}
      <style>{`
        @keyframes statusLive {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .status-live {
          animation: statusLive 2.4s cubic-bezier(0.2, 0, 0, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .status-live { animation: none !important; opacity: 1; }
        }
      `}</style>
    </span>
  );
}
