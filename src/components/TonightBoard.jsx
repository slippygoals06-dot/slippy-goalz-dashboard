import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import { getCustomerTier, customerIdentityKey } from "../utils/customerTier";
import { premiumCardStyle } from "./StatCard";

function todayKeyLocal() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function isUnpaid(b) {
  const p = String(b["Payment Status"] || "").trim().toLowerCase();
  return !p || p === "unpaid" || p === "half payment" || p === "half";
}

function timeSort(a, b) {
  return String(a.Time || "").localeCompare(String(b.Time || ""));
}

/**
 * Tonight board — who plays today, unpaid, VIP, reschedule.
 * One glance for peak-hour ops.
 */
export default function TonightBoard({ bookings = [], invoices = [], t }) {
  const navigate = useNavigate();
  const today = todayKeyLocal();

  const board = useMemo(() => {
    const todays = (bookings || [])
      .filter((b) => String(b.Date || "").slice(0, 10) === today)
      .filter((b) => !["Cancelled", "Rejected"].includes(b.Status))
      .slice()
      .sort(timeSort);

    const vipKeys = new Set();
    for (const b of bookings || []) {
      const key = customerIdentityKey(b);
      if (!key || vipKeys.has(key)) continue;
      const tier = getCustomerTier(
        { phone: b.Phone, customer_id: b.customer_id },
        bookings,
        invoices
      );
      if (tier === "VIP") vipKeys.add(key);
    }

    const withMeta = todays.map((b) => {
      const tier = getCustomerTier(
        { phone: b.Phone, customer_id: b.customer_id },
        bookings,
        invoices
      );
      return {
        ...b,
        tier,
        isVip: tier === "VIP",
        unpaid: isUnpaid(b),
        needsReschedule: b.Status === "Reschedule",
      };
    });

    return {
      rows: withMeta,
      unpaid: withMeta.filter((b) => b.unpaid).length,
      vip: withMeta.filter((b) => b.isVip).length,
      pending: withMeta.filter((b) => b.Status === "Pending").length,
      reschedule: withMeta.filter((b) => b.needsReschedule).length,
    };
  }, [bookings, invoices, today]);

  const openBooking = (b) => {
    const id = b["Booking ID"];
    if (!id) {
      navigate("/bookings");
      return;
    }
    navigate(`/bookings?open=${encodeURIComponent(id)}`);
  };

  return (
    <div style={{ ...premiumCardStyle(t), padding: 0, overflow: "hidden" }}>
      <div
        style={{
          padding: "18px 20px 14px",
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, letterSpacing: -0.2 }}>
            Tonight
          </div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
            Pitch sessions for {today} — unpaid, VIP, and reschedule first.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "Sessions", value: board.rows.length },
            { label: "Pending", value: board.pending },
            { label: "Unpaid", value: board.unpaid },
            { label: "VIP", value: board.vip },
            { label: "Reschedule", value: board.reschedule },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: t.cardBg2 || t.pageBg,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                padding: "8px 12px",
                minWidth: 72,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {board.rows.length === 0 ? (
        <div style={{ padding: "28px 20px", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
          No sessions scheduled for today.
        </div>
      ) : (
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          {board.rows.map((b) => {
            const id = b["Booking ID"] || `${b.Phone}-${b.Time}`;
            return (
              <button
                key={id}
                type="button"
                onClick={() => openBooking(b)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  border: "none",
                  borderBottom: `1px solid ${t.border}`,
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "inherit",
                  fontFamily: "inherit",
                }}
              >
                <div
                  style={{
                    width: 56,
                    flexShrink: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    color: t.textPrimary,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {b.Time || "—"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
                      {b.Name || "Guest"}
                    </span>
                    {b.isVip && <StatusBadge status="VIP" />}
                    {b.needsReschedule && <StatusBadge status="Reschedule" />}
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                    {b.Phone || "—"}
                    {b.unpaid ? " · Unpaid" : ""}
                  </div>
                </div>
                <StatusBadge status={b.Status || "Pending"} />
              </button>
            );
          })}
        </div>
      )}

      <div style={{ padding: "12px 20px", borderTop: `1px solid ${t.border}` }}>
        <button
          type="button"
          onClick={() => navigate("/bookings?filter=Pending")}
          style={{
            background: "none",
            border: "none",
            color: t.textSecondary,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          Open all bookings →
        </button>
      </div>
    </div>
  );
}
