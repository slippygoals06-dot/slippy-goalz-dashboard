import { STATUS_COLORS } from "../constants";
import { getInitials } from "../utils/format";

const CHANNEL_ICON = {
  website: "W",
  whatsapp: "💬",
  instagram: "IG",
  messenger: "M",
  facebook: "f",
};

const CHANNEL_STATUS = {
  website: "Website",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
  facebook: "Facebook",
};

/**
 * Circular avatar: real-name initials, or a device icon / "?" fallback.
 * Never feed device model strings into initials (avoids "I1" from "iPhone 13").
 */
export default function ConversationAvatar({
  name,
  fallbackIcon = null,
  channel = "website",
  size = 44,
  showChannel = true,
}) {
  const trimmed = (name || "").toString().trim();
  const initials = trimmed ? getInitials(trimmed) : null;
  const useFallback = Boolean(fallbackIcon) && (!initials || initials === "?");
  const content = useFallback ? fallbackIcon : initials || "?";
  const statusKey = CHANNEL_STATUS[channel] || "Website";
  const cfg = STATUS_COLORS[statusKey] || STATUS_COLORS.default;
  const badge = Math.max(16, Math.round(size * 0.38));
  const icon = CHANNEL_ICON[channel] || "W";

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: useFallback ? size * 0.42 : size * 0.34,
          fontWeight: 700,
          letterSpacing: 0.3,
          color: "var(--text)",
          background:
            "linear-gradient(145deg, var(--accent-glow), transparent)",
          border: "1px solid var(--border)",
          boxShadow: "none",
        }}
        aria-hidden
      >
        {content}
      </div>
      {showChannel && (
        <span
          title={statusKey}
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: badge,
            height: badge,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: badge * (icon.length > 1 && icon !== "💬" ? 0.38 : 0.55),
            fontWeight: 800,
            lineHeight: 1,
            background: cfg.bg,
            color: cfg.color,
            border: `1.5px solid ${cfg.border}`,
            boxShadow: cfg.shadow || "0 2px 8px rgba(0,0,0,0.4)",
            boxSizing: "border-box",
          }}
        >
          {icon}
        </span>
      )}
    </div>
  );
}
