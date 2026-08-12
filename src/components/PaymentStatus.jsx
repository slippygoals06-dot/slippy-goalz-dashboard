import { useTheme, cardStyle } from "../context/ThemeContext";
import { PAYMENT_COLORS } from "../constants";
import { Check } from "lucide-react";

const STATUSES = ["Unpaid", "Half Payment", "Full Payment"];

function paymentStyle(status) {
  return PAYMENT_COLORS[status] || PAYMENT_COLORS.Unpaid;
}

export function PaymentBadge({ status }) {
  const cfg = paymentStyle(status || "Unpaid");
  const paid = status === "Full Payment" || status === "Paid";
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
      {status || "Unpaid"}
    </span>
  );
}

export function PaymentStatusCycler({ status, bookingId, onChange, loading }) {
  const normalized =
    status === "Paid" ? "Full Payment" : status === "Onsite" ? "Unpaid" : status;
  const idx = STATUSES.findIndex((x) => x === normalized);
  const current = STATUSES[idx === -1 ? 0 : idx];
  const cfg = paymentStyle(current);

  function cycle() {
    if (loading) return;
    const next = STATUSES[(idx === -1 ? 0 : idx + 1) % STATUSES.length];
    onChange?.(bookingId, next);
  }

  return (
    <button
      className="ui-interactive"
      onClick={cycle}
      disabled={loading}
      title="Click to change payment status"
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
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.6 : 1,
        boxShadow: "none",
      }}
    >
      {current === "Full Payment" || current === "Paid" ? (
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
      {current}
    </button>
  );
}

export function PaymentStatCards({ bookings = [] }) {
  const { theme: t } = useTheme();
  const full = bookings.filter((b) => b["Payment Status"] === "Full Payment" || b["Payment Status"] === "Paid").length;
  const half = bookings.filter((b) => b["Payment Status"] === "Half Payment").length;
  const unpaid = bookings.filter((b) => !b["Payment Status"] || b["Payment Status"] === "Unpaid" || b["Payment Status"] === "Onsite").length;

  const stats = [
    { label: "Full Payment", count: full, ...PAYMENT_COLORS["Full Payment"] },
    { label: "Half Payment", count: half, ...PAYMENT_COLORS["Half Payment"] },
    { label: "Unpaid", count: unpaid, ...PAYMENT_COLORS.Unpaid },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
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
