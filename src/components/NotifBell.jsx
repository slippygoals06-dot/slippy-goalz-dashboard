import {
  Bell,
  Calendar,
  CheckCheck,
  CreditCard,
  FileText,
  Info,
  Shield,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifStore } from "../store/useNotifStore";
import { useTheme } from "../context/ThemeContext";
import { BRAND_ACCENT } from "../constants/brand";
import { SHELL, hoverFill, iconButtonStyle } from "./shell/shellTokens";

const TYPE_META = {
  booking: { label: "Booking", Icon: Calendar, color: "#F59E0B" },
  payment: { label: "Payment", Icon: CreditCard, color: "#3B82F6" },
  invoice: { label: "Invoice", Icon: FileText, color: "#10B981" },
  security: { label: "Security", Icon: Shield, color: "#E11D48" },
  success: { label: "Success", Icon: CheckCheck, color: "#059669" },
  warning: { label: "Warning", Icon: AlertTriangle, color: "#F59E0B" },
  error: { label: "Error", Icon: AlertTriangle, color: "#E11D48" },
  info: { label: "Update", Icon: Info, color: "#71717A" },
};

function resolveType(type) {
  return TYPE_META[type] || TYPE_META.info;
}

/**
 * Shell notification control — clickable items navigate to bookings / deep links.
 */
export default function NotifBell() {
  const navigate = useNavigate();
  const { theme: t, dark } = useTheme();
  const notifications = useNotifStore((s) => s.notifications);
  const unread = useNotifStore((s) => s.unread);
  const markAllRead = useNotifStore((s) => s.markAllRead);
  const markRead = useNotifStore((s) => s.markRead);
  const remove = useNotifStore((s) => s.remove);
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
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  function openNotification(n) {
    markRead(n.id);
    setOpen(false);

    if (n.link) {
      navigate(n.link);
      return;
    }

    const bookingId = n.meta?.bookingId;
    if (bookingId) {
      navigate(`/bookings?open=${encodeURIComponent(bookingId)}`);
      return;
    }

    if (n.type === "booking") {
      navigate("/bookings?filter=Pending");
      return;
    }

    if (n.type === "invoice" || n.type === "payment") {
      navigate("/invoices");
    }
  }

  const badgeLabel = unread > 9 ? "9+" : String(unread);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="shell-icon-btn"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
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
              top: 6,
              right: 6,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 999,
              background: BRAND_ACCENT,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              lineHeight: "16px",
              textAlign: "center",
              border: `2px solid ${t.pageBg}`,
              boxSizing: "border-box",
            }}
          >
            {badgeLabel}
          </span>
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
            width: 380,
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
              minHeight: 48,
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
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
              {unread > 0 && (
                <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 500 }}>
                  {unread} new
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: SHELL.gap.xs }}>
              <button
                type="button"
                onClick={markAllRead}
                disabled={unread === 0}
                title="Mark all read"
                style={{
                  ...panelActionStyle(t),
                  opacity: unread === 0 ? 0.4 : 1,
                  cursor: unread === 0 ? "default" : "pointer",
                }}
              >
                <CheckCheck size={SHELL.iconSm} strokeWidth={SHELL.iconStroke} />
                Read
              </button>
              <button
                type="button"
                onClick={() => {
                  clear();
                }}
                disabled={notifications.length === 0}
                title="Clear all"
                style={{
                  ...panelActionStyle(t, true),
                  opacity: notifications.length === 0 ? 0.4 : 1,
                  cursor: notifications.length === 0 ? "default" : "pointer",
                }}
              >
                <Trash2 size={SHELL.iconSm} strokeWidth={SHELL.iconStroke} />
                Clear
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 420, overflowY: "auto" }}>
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
                  size={22}
                  strokeWidth={SHELL.iconStroke}
                  style={{ opacity: 0.35, marginBottom: SHELL.gap.sm }}
                />
                <div style={{ fontWeight: 500, color: t.textSecondary }}>You're all caught up</div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.4 }}>
                  New bookings and payment updates will show up here.
                </div>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = resolveType(n.type);
                const Icon = meta.Icon;
                const canOpen = Boolean(n.link || n.meta?.bookingId || n.type === "booking" || n.type === "invoice" || n.type === "payment");
                return (
                  <div
                    key={n.id}
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      borderBottom: `1px solid ${t.borderSub || "rgba(255,255,255,0.05)"}`,
                      background: n.read ? "transparent" : hoverBg,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      style={{
                        flex: 1,
                        display: "block",
                        width: "100%",
                        padding: `${SHELL.gap.md}px ${SHELL.gap.sm}px ${SHELL.gap.md}px ${SHELL.gap.lg}px`,
                        border: "none",
                        cursor: "pointer",
                        background: "transparent",
                        textAlign: "left",
                        fontFamily: "inherit",
                        transition: `background ${SHELL.duration} ${SHELL.ease}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.parentElement.style.background = t.rowHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.parentElement.style.background = n.read ? "transparent" : hoverBg;
                      }}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <span
                          aria-hidden
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            background: dark ? "rgba(255,255,255,0.06)" : "rgba(15,17,21,0.05)",
                            color: meta.color,
                          }}
                        >
                          <Icon size={15} strokeWidth={2} />
                        </span>
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
                              marginTop: 4,
                              lineHeight: 1.4,
                            }}
                          >
                            {n.body}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginTop: 8,
                              fontSize: SHELL.font.micro.size,
                              color: t.textMuted,
                              lineHeight: 1.2,
                            }}
                          >
                            <span>{meta.label}</span>
                            <span aria-hidden>·</span>
                            <span>{timeStr(n.time)}</span>
                            {canOpen && (
                              <>
                                <span aria-hidden>·</span>
                                <span style={{ color: BRAND_ACCENT, fontWeight: 600 }}>Open</span>
                              </>
                            )}
                          </div>
                        </div>
                        {!n.read && (
                          <div
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: BRAND_ACCENT,
                              flexShrink: 0,
                              marginTop: 8,
                            }}
                          />
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      title="Dismiss"
                      aria-label="Dismiss notification"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(n.id);
                      }}
                      style={{
                        width: 36,
                        border: "none",
                        background: "transparent",
                        color: t.textMuted,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        paddingRight: 8,
                      }}
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                );
              })
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
