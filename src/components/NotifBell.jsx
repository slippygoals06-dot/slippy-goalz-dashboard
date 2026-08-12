import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNotifStore } from "../store/useNotifStore";
import { useTheme } from "../context/ThemeContext";
import { BRAND_ACCENT } from "../constants/brand";
import { SHELL, hoverFill, iconButtonStyle } from "./shell/shellTokens";

const TYPE_LABEL = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  error: "Error",
  booking: "Booking",
};

/**
 * Shell notification control — Lucide bell, quiet panel
 */
export default function NotifBell() {
  const { theme: t, dark } = useTheme();
  const notifications = useNotifStore((s) => s.notifications);
  const unread = useNotifStore((s) => s.unread);
  const markAllRead = useNotifStore((s) => s.markAllRead);
  const markRead = useNotifStore((s) => s.markRead);
  const clear = useNotifStore((s) => s.clear);

  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const hoverBg = hoverFill(dark);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const timeStr = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="shell-icon-btn"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open) markAllRead();
        }}
        style={{
          ...iconButtonStyle(t),
          position: "relative",
          background: open ? hoverBg : "transparent",
        }}
      >
        <Bell size={SHELL.icon} strokeWidth={SHELL.iconStroke} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: BRAND_ACCENT,
              display: "block",
              border: `2px solid ${t.pageBg}`,
              boxSizing: "content-box",
            }}
          />
        )}
      </button>

      {open && (
        <div
          className="ds-dropdown"
          role="dialog"
          aria-label="Notifications"
          style={{
            position: "absolute",
            top: `calc(100% + ${SHELL.gap.sm}px)`,
            right: 0,
            width: 360,
            padding: 0,
            zIndex: 90,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: `${SHELL.gap.md}px ${SHELL.gap.lg}px`,
              borderBottom: `1px solid ${t.borderSub || t.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: SHELL.gap.sm,
              height: 48,
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: SHELL.font.nav.size,
                color: t.textPrimary,
                lineHeight: 1,
              }}
            >
              Notifications
            </span>
            <div style={{ display: "flex", gap: SHELL.gap.xs }}>
              <button
                type="button"
                onClick={markAllRead}
                title="Mark all read"
                style={panelActionStyle(t)}
              >
                <CheckCheck size={SHELL.iconSm} strokeWidth={SHELL.iconStroke} />
                Read
              </button>
              <button type="button" onClick={clear} title="Clear all" style={panelActionStyle(t, true)}>
                <Trash2 size={SHELL.iconSm} strokeWidth={SHELL.iconStroke} />
                Clear
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: `${SHELL.gap["2xl"]}px ${SHELL.gap.lg}px`,
                  textAlign: "center",
                  color: t.textMuted,
                  fontSize: SHELL.font.body.size,
                }}
              >
                <Bell
                  size={SHELL.icon}
                  strokeWidth={SHELL.iconStroke}
                  style={{ opacity: 0.35, marginBottom: SHELL.gap.sm }}
                />
                <div>No notifications yet</div>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: `${SHELL.gap.md}px ${SHELL.gap.lg}px`,
                    border: "none",
                    borderBottom: `1px solid ${t.borderSub || "rgba(255,255,255,0.05)"}`,
                    cursor: "pointer",
                    background: n.read ? "transparent" : hoverBg,
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: `background ${SHELL.duration} ${SHELL.ease}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = t.rowHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.read ? "transparent" : hoverBg;
                  }}
                >
                  <div style={{ display: "flex", gap: SHELL.gap.md, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: SHELL.font.body.size,
                          fontWeight: n.read ? 500 : 600,
                          color: t.textPrimary,
                          lineHeight: 1.35,
                        }}
                      >
                        {n.title}
                      </div>
                      <div
                        style={{
                          fontSize: SHELL.font.caption.size,
                          color: t.textSecondary,
                          marginTop: SHELL.gap.xs,
                          lineHeight: 1.4,
                        }}
                      >
                        {n.body}
                      </div>
                      <div
                        style={{
                          fontSize: SHELL.font.micro.size,
                          color: t.textMuted,
                          marginTop: SHELL.gap.sm,
                          lineHeight: 1.2,
                        }}
                      >
                        {TYPE_LABEL[n.type] || "Update"} · {timeStr(n.time)}
                      </div>
                    </div>
                    {!n.read && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: BRAND_ACCENT,
                          flexShrink: 0,
                          marginTop: SHELL.gap.sm,
                        }}
                      />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function panelActionStyle(t, muted = false) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: SHELL.gap.xs,
    fontSize: SHELL.font.caption.size,
    color: muted ? t.textMuted : t.textSecondary,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontWeight: 500,
    padding: `${SHELL.gap.xs}px ${SHELL.gap.sm}px`,
    borderRadius: SHELL.radiusChip,
    fontFamily: "inherit",
    height: 28,
    transition: `background ${SHELL.duration} ${SHELL.ease}`,
  };
}
