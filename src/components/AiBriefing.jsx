import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme, primaryBtnStyle, primaryBtnHoverProps, secondaryBtnStyle } from "../context/ThemeContext";
import { duration as motionMs, tween } from "../design-system/motion";
import { useStore } from "../store/useStore";
import { inRange, formatDate } from "../utils/format";
import { bookingRevenue } from "../utils/bookingRevenue";
import { isStalePending } from "../utils/sla";

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  let d = new Date(dateStr);
  if (isNaN(d)) {
    const parts = String(dateStr).split(/[-/.\s]/);
    if (parts.length === 3) {
      d = new Date(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`);
    }
  }
  return isNaN(d) ? null : d;
}

export default function AiBriefing({ range = "This Week" }) {
  const { theme: t, dark } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const bookings = useStore((s) => s.bookings);
  const invoices = useStore((s) => s.invoices);
  const slots = useStore((s) => s.slots);

  const insights = useMemo(() => {
    const week = bookings.filter((b) => inRange(b.Date, "This Week"));
    const prev = bookings.filter((b) => {
      if (!b.Date) return false;
      const d = new Date(b.Date);
      if (isNaN(d)) return false;
      const start = new Date();
      start.setDate(start.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      const mid = new Date();
      mid.setDate(mid.getDate() - 7);
      mid.setHours(0, 0, 0, 0);
      return d >= start && d < mid;
    });
    const delta =
      prev.length === 0
        ? week.length > 0
          ? 100
          : 0
        : Math.round(((week.length - prev.length) / prev.length) * 100);

    const { start: todayStart, end: todayEnd } = todayBounds();
    const todayBookings = bookings.filter((b) => {
      const d = parseDate(b.Date);
      return d && d >= todayStart && d <= todayEnd;
    });

    const byHour = {};
    todayBookings.forEach((b) => {
      const time = String(b.Time || "");
      const hourMatch = time.match(/(\d{1,2})/);
      if (hourMatch) {
        const h = Number(hourMatch[1]);
        byHour[h] = (byHour[h] || 0) + 1;
      }
    });
    const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];
    let peakLabel = "Demand is evenly spread today";
    if (peakHour) {
      const h = Number(peakHour[0]);
      const suffix = h >= 12 ? "PM" : "AM";
      const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
      peakLabel = `Peak demand starts at ${display} ${suffix}`;
    } else {
      const bySlot = {};
      week.forEach((b) => {
        const key = `${b.Date || ""}|${b.Time || ""}`;
        bySlot[key] = (bySlot[key] || 0) + 1;
      });
      const peak = Object.entries(bySlot).sort((a, b) => b[1] - a[1])[0];
      if (peak) {
        const [, time] = peak[0].split("|");
        peakLabel = time ? `Peak slot demand around ${time}` : "Peak slot demand this week";
      }
    }

    const unpaid = (invoices || []).filter((i) => i.status === "unpaid").length;
    const stale = bookings.filter(isStalePending).length;
    const pendingToday = todayBookings.filter((b) => b.Status === "Pending").length;
    const available = (slots || []).filter((s) => s.Status === "Available").length;
    const capacityTight = available > 0 && available <= 3;

    const priorities = [];
    if (stale > 0) {
      priorities.push({
        text: `${stale} customer${stale === 1 ? "" : "s"} require confirmation`,
        tone: "warn",
        path: "/bookings",
      });
    } else if (pendingToday > 0) {
      priorities.push({
        text: `${pendingToday} booking${pendingToday === 1 ? "" : "s"} awaiting confirmation today`,
        tone: "warn",
        path: "/bookings",
      });
    }
    if (unpaid > 0) {
      priorities.push({
        text: `${unpaid} unpaid invoice${unpaid === 1 ? "" : "s"} waiting on reminders`,
        tone: "warn",
        path: "/invoices",
      });
    }
    if (capacityTight) {
      priorities.push({
        text: `Only ${available} slot${available === 1 ? "" : "s"} left — capacity is tight`,
        tone: "warn",
        path: "/slots",
      });
    }

    const suggestions = [];
    suggestions.push({ text: peakLabel, tone: "info" });
    if (available > 3) {
      suggestions.push({ text: "Inventory healthy — slots available to fill", tone: "ok" });
    } else if (available === 0 && (slots || []).length > 0) {
      suggestions.push({ text: "No open slots — consider adding capacity", tone: "warn" });
    }
    if (delta !== 0) {
      suggestions.push({
        text: `Booking volume is ${delta > 0 ? "up" : "down"} ${Math.abs(delta)}% this week`,
        tone: delta > 0 ? "ok" : "info",
      });
    } else if (bookings.length) {
      suggestions.push({ text: "Booking volume is steady vs last week", tone: "ok" });
    }

    const upcoming = todayBookings
      .filter((b) => b.Status !== "Rejected")
      .slice(0, 3)
      .map((b) => ({
        name: b.Name || "Customer",
        time: b.Time || "—",
        service: b.Service || "Pitch booking",
        date: formatDate(b.Date),
        status: b.Status,
      }));

    const revenue = week
      .filter((b) => b.Status === "Confirmed" || b.Status === "Completed")
      .reduce((s, b) => s + bookingRevenue(b), 0);

    const rescheduleCount = bookings.filter((b) => b.Status === "Reschedule").length;
    if (rescheduleCount > 0) {
      priorities.unshift({
        text: `${rescheduleCount} booking${rescheduleCount === 1 ? "" : "s"} marked Reschedule`,
        tone: "warn",
        path: "/bookings?filter=Reschedule",
      });
    }

    const headline =
      priorities.length > 0
        ? priorities[0].text
        : suggestions[0]?.text || "Arena is running smoothly";

    return {
      priorities,
      suggestions: suggestions.slice(0, 3),
      upcoming,
      unpaid,
      available,
      revenue,
      range,
      headline,
      count: priorities.length + suggestions.length,
    };
  }, [bookings, invoices, slots, range]);

  const primaryAction =
    insights.unpaid > 0
      ? { label: "Send reminders", path: "/invoices", icon: <Send size={14} strokeWidth={2} /> }
      : { label: "View details", path: "/analytics", icon: <ArrowRight size={14} strokeWidth={2} /> };

  const toneDot = (tone) => {
    if (tone === "warn") return t.warning || "#F59E0B";
    if (tone === "ok") return "#059669";
    return t.accent;
  };

  return (
    <div
      className="ai-island"
      style={{
        marginBottom: 32,
        position: "relative",
        borderRadius: 18,
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        boxShadow: t.cardShadow,
        overflow: "hidden",
        transition: `border-color ${motionMs.card}s cubic-bezier(0.2, 0, 0, 1), box-shadow ${motionMs.card}s cubic-bezier(0.2, 0, 0, 1), transform ${motionMs.card}s cubic-bezier(0.2, 0, 0, 1)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = t.borderHover;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = t.cardShadowHover || t.cardShadow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = t.border;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = t.cardShadow;
      }}
    >
      <button
        type="button"
        className="ui-press"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "18px 24px",
          fontFamily: "inherit",
          textAlign: "left",
          color: t.textPrimary,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: insights.priorities.length ? (t.warning || "#F59E0B") : "#059669",
            flexShrink: 0,
            boxShadow: insights.priorities.length
              ? `0 0 0 4px ${dark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.12)"}`
              : `0 0 0 4px ${dark ? "rgba(5,150,105,0.15)" : "rgba(5,150,105,0.10)"}`,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: t.textMuted,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Today&apos;s AI Briefing
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: t.textPrimary,
              letterSpacing: -0.2,
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {insights.headline}
          </div>
        </div>
        <span
          style={{
            display: "flex",
            flexShrink: 0,
            opacity: open ? 0.7 : 1,
            transform: open ? "translateY(1px)" : "translateY(0)",
            transition: `opacity ${motionMs.ai}s cubic-bezier(0.2, 0, 0, 1), transform ${motionMs.ai}s cubic-bezier(0.2, 0, 0, 1)`,
          }}
        >
          <ChevronDown size={18} color={t.textMuted} strokeWidth={1.75} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={tween(motionMs.ai)}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "0 24px 24px",
                borderTop: `1px solid ${t.borderSub || t.border}`,
                paddingTop: 20,
              }}
            >
              {insights.priorities.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: t.textMuted,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    Priorities
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {insights.priorities.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        className="ui-press"
                        onClick={() => p.path && navigate(p.path)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 0",
                          background: "none",
                          border: "none",
                          borderBottom:
                            i < insights.priorities.length - 1
                              ? `1px solid ${t.borderSub || t.border}`
                              : "none",
                          cursor: p.path ? "pointer" : "default",
                          fontFamily: "inherit",
                          textAlign: "left",
                          color: t.textPrimary,
                          width: "100%",
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: toneDot(p.tone),
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 400, lineHeight: 1.45, color: t.textSecondary }}>
                          {p.text}
                        </span>
                        {p.path && <ArrowRight size={14} color={t.textMuted} strokeWidth={1.75} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: insights.upcoming.length ? 20 : 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: t.textMuted,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Insights
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {insights.suggestions.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 14,
                        color: t.textSecondary,
                        padding: "10px 0",
                        borderBottom:
                          i < insights.suggestions.length - 1
                            ? `1px solid ${t.borderSub || t.border}`
                            : "none",
                        lineHeight: 1.45,
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: toneDot(s.tone),
                          marginTop: 7,
                          flexShrink: 0,
                          opacity: 0.85,
                        }}
                      />
                      {s.text}
                    </li>
                  ))}
                </ul>
              </div>

              {insights.upcoming.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: t.textMuted,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    Upcoming today
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {insights.upcoming.map((u, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 0",
                          borderBottom:
                            i < insights.upcoming.length - 1
                              ? `1px solid ${t.borderSub || t.border}`
                              : "none",
                        }}
                      >
                        <span
                          className="font-mono-data"
                          style={{
                            fontSize: 12,
                            color: t.textMuted,
                            minWidth: 56,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {u.time}
                        </span>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: t.textPrimary, minWidth: 0 }}>
                          {u.name}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: t.textMuted,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 140,
                          }}
                        >
                          {u.service}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <button
                  type="button"
                  className="ui-press"
                  {...primaryBtnHoverProps(t)}
                  onClick={() => navigate(primaryAction.path)}
                  style={{
                    ...primaryBtnStyle(t),
                    padding: "0 16px",
                    height: 36,
                    fontSize: 13,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "inherit",
                  }}
                >
                  {primaryAction.icon}
                  {primaryAction.label}
                </button>
                <button
                  type="button"
                  className="ui-press"
                  onClick={() => navigate("/slots")}
                  style={{
                    ...secondaryBtnStyle(t),
                    padding: "0 16px",
                    height: 36,
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: "inherit",
                  }}
                >
                  Manage slots
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
