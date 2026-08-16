import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { useTheme, cardStyle } from "../context/ThemeContext";
import { PAYMENT_COLORS } from "../constants";
import { PAYMENT_STATUSES, PAYMENT_STATUS_LABELS, normalizePaymentStatus } from "../utils/bookingFields";

function paymentStyle(status) {
  return PAYMENT_COLORS[status] || PAYMENT_COLORS.Unpaid;
}

function labelFor(status) {
  return PAYMENT_STATUS_LABELS[status] || status || "Unpaid";
}

export function PaymentBadge({ status }) {
  const current = normalizePaymentStatus(status);
  const cfg = paymentStyle(current);
  const paid = current === "Full Payment";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        boxShadow: "none",
      }}
    >
      {paid ? (
        <Check size={12} strokeWidth={2.5} color={cfg.dot} aria-hidden />
      ) : (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: cfg.dot,
            display: "inline-block",
          }}
        />
      )}
      {labelFor(current)}
    </span>
  );
}

export function PaymentStatusCycler({ status, bookingId, onChange, loading }) {
  const { theme: t } = useTheme();
  const current = normalizePaymentStatus(status);
  const cfg = paymentStyle(current);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 8 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const placeMenu = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const menuH = PAYMENT_STATUSES.length * 40 + 16;
    const openUp = window.innerHeight - r.bottom < menuH + 12 && r.top > menuH;
    setPos({
      top: openUp ? Math.max(8, r.top - menuH - 8) : r.bottom + 8,
      right: Math.max(8, window.innerWidth - r.right),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    placeMenu();
  }, [open, placeMenu]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, placeMenu]);

  return (
    <div style={{ display: "inline-flex" }}>
      <button
        ref={btnRef}
        type="button"
        className="ui-interactive"
        disabled={loading}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Set payment status"
        onClick={(e) => {
          e.stopPropagation();
          if (!loading) setOpen((v) => !v);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 28,
          padding: "0 10px 0 8px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 500,
          background: cfg.bg,
          color: cfg.color,
          border: `1px solid ${cfg.border}`,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.6 : 1,
          fontFamily: "inherit",
        }}
      >
        {current === "Full Payment" ? (
          <Check size={12} strokeWidth={2.5} color={cfg.dot} aria-hidden />
        ) : (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: cfg.dot,
              display: "inline-block",
            }}
          />
        )}
        {labelFor(current)}
        <ChevronDown size={12} strokeWidth={2.25} aria-hidden />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: pos.top,
              right: pos.right,
              zIndex: 4000,
              width: 168,
              padding: 6,
              borderRadius: 12,
              background: t.cardBg,
              border: `1px solid ${t.border}`,
              boxShadow: t.cardShadowHover || t.cardShadow,
            }}
          >
            {PAYMENT_STATUSES.map((item) => {
              const itemCfg = paymentStyle(item);
              const active = item === current;
              return (
                <button
                  key={item}
                  type="button"
                  role="menuitem"
                  className="ui-press"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    if (item !== current) onChange?.(bookingId, item);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    height: 38,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: "none",
                    background: active ? t.rowHover : "transparent",
                    color: t.textPrimary,
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = t.rowHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = active ? t.rowHover : "transparent";
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: itemCfg.dot,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1 }}>{labelFor(item)}</span>
                  {active && <Check size={14} strokeWidth={2.25} color={t.textMuted} />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

export function PaymentStatCards({ bookings = [] }) {
  const { theme: t } = useTheme();
  const full = bookings.filter((b) => {
    const s = normalizePaymentStatus(b["Payment Status"]);
    return s === "Full Payment";
  }).length;
  const half = bookings.filter((b) => normalizePaymentStatus(b["Payment Status"]) === "Half Payment").length;
  const unpaid = bookings.filter((b) => normalizePaymentStatus(b["Payment Status"]) === "Unpaid").length;
  const onsite = bookings.filter((b) => normalizePaymentStatus(b["Payment Status"]) === "Onsite").length;

  const stats = [
    { label: "Paid", count: full, ...PAYMENT_COLORS["Full Payment"] },
    { label: "Half", count: half, ...PAYMENT_COLORS["Half Payment"] },
    { label: "Unpaid", count: unpaid, ...PAYMENT_COLORS.Unpaid },
    { label: "Onsite", count: onsite, ...PAYMENT_COLORS.Onsite },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            ...cardStyle(t),
            padding: "20px 22px",
          }}
        >
          <div
            style={{
              fontSize: 27,
              fontWeight: 700,
              color: t.textPrimary,
              letterSpacing: -1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {s.count}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
            <div style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500 }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
