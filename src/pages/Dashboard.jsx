import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useTheme, primaryBtnStyle, primaryBtnHoverProps, secondaryBtnStyle, cardHoverProps } from "../context/ThemeContext";
import { useCommand } from "../context/CommandContext";
import { useToast } from "../context/ToastContext";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  CartesianGrid,
} from "recharts";
import { premiumCardStyle } from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import SegmentedControl from "../components/SegmentedControl";
import AiBriefing from "../components/AiBriefing";
import TonightBoard from "../components/TonightBoard";
import Sheet from "../components/Sheet";
import { DashboardSkeleton, ContentReveal } from "../components/Skeleton";
import { exportToCSV } from "../utils/export";
import { formatDate, inRange } from "../utils/format";
import { isStalePending } from "../utils/sla";
import { DATE_RANGES } from "../constants";
import { bookingRevenue } from "../utils/bookingRevenue";
import { getInvoices } from "../api";
import {
  Copy,
  CheckCircle2,
  Printer,
  Plus,
  Download,
  Calendar,
  Receipt,
  Wallet,
} from "lucide-react";

const CHART_STATUS = {
  Confirmed: "#059669",
  Pending: "#F59E0B",
  Rejected: "#E11D48",
};
const PLACEHOLDER = "rgba(100,116,139,0.12)";
const GRID = "rgba(15,17,21,0.04)";
const GRID_DARK = "rgba(255,255,255,0.04)";

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

function countInWindow(items, getDate, start, end) {
  return items.filter((item) => {
    const d = parseDate(getDate(item));
    if (!d) return false;
    return d >= start && d <= end;
  }).length;
}

function periodBounds(range) {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  if (range === "Today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 1);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    return { start, end: now, prevStart, prevEnd, deltaLabel: "vs yesterday" };
  }
  if (range === "This Week") {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 7);
    prevStart.setHours(0, 0, 0, 0);
    return { start, end: now, prevStart, prevEnd, deltaLabel: "vs last week" };
  }
  if (range === "This Month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { start, end: now, prevStart, prevEnd, deltaLabel: "vs last month" };
  }
  return null;
}

function pctChange(current, previous) {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function WalletKpi({ label, value, prefix, trend, onClick, t, icon: Icon }) {
  const hover = cardHoverProps(t);
  const flat = trend == null || trend === 0 || typeof trend === "string";
  const up = typeof trend === "number" && trend > 0;
  const trendText =
    typeof trend === "string"
      ? trend
      : trend == null
        ? null
        : flat
          ? "—"
          : `${up ? "+" : ""}${trend}%`;

  return (
    <button
      type="button"
      className="ui-press dash-kpi"
      onClick={onClick}
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: 18,
        boxShadow: t.cardShadow,
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
        padding: "28px 28px 24px",
        fontFamily: "inherit",
        color: "inherit",
        minHeight: 148,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 24,
        transition:
          "background 150ms cubic-bezier(0.2, 0, 0, 1), border-color 150ms cubic-bezier(0.2, 0, 0, 1), box-shadow 150ms cubic-bezier(0.2, 0, 0, 1), transform 150ms cubic-bezier(0.2, 0, 0, 1)",
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        hover.onMouseEnter(e);
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        hover.onMouseLeave(e);
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: t.textMuted,
            letterSpacing: 0,
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
        {Icon && (
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)",
              color: t.textMuted,
              flexShrink: 0,
            }}
          >
            <Icon size={15} strokeWidth={1.75} />
          </span>
        )}
      </div>
      <div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: t.textPrimary,
            letterSpacing: -1.6,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            fontFamily: "var(--font-mono)",
            display: "flex",
            alignItems: "baseline",
            gap: 8,
          }}
        >
          {prefix != null && (
            <span
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: t.textMuted,
                letterSpacing: 0,
              }}
            >
              {prefix}
            </span>
          )}
          {value}
        </div>
        {trendText != null && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              fontWeight: 400,
              color: typeof trend === "number" && !flat ? (up ? "#059669" : t.textMuted) : t.textMuted,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: 0,
              lineHeight: 1.3,
            }}
          >
            {typeof trend === "number"
              ? flat
                ? "Steady"
                : `${trendText} vs prior`
              : trendText}
          </div>
        )}
      </div>
    </button>
  );
}

function BookingsEmptyGraphic() {
  return (
    <svg width="96" height="72" viewBox="0 0 120 96" fill="none" aria-hidden style={{ opacity: 0.4, marginBottom: 12 }}>
      <rect x="22" y="18" width="76" height="62" rx="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M22 36h76" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <rect x="34" y="48" width="22" height="6" rx="3" fill="currentColor" opacity="0.25" />
      <rect x="62" y="48" width="28" height="6" rx="3" fill="currentColor" opacity="0.15" />
      <rect x="34" y="62" width="40" height="6" rx="3" fill="currentColor" opacity="0.12" />
    </svg>
  );
}

function TrendTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: t.cardShadowHover || t.cardShadow,
        fontSize: 12,
      }}
    >
      <div className="font-mono-data" style={{ color: t.textMuted, marginBottom: 4 }}>
        {label}
      </div>
      <div className="font-mono-data" style={{ fontWeight: 500, color: t.textPrimary }}>
        {payload[0].value} booking{payload[0].value === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function TrendEmptyGraphic() {
  return (
    <svg width="140" height="56" viewBox="0 0 160 72" fill="none" aria-hidden style={{ opacity: 0.18, marginBottom: 8 }}>
      <path
        d="M4 56 C28 54, 36 48, 48 40 C64 28, 72 36, 88 30 C104 24, 112 14, 128 12 C140 10, 148 8, 156 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function SectionLabel({ title, subtitle, action, t }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 20,
      }}
    >
      <div>
        <div
          style={{
            fontWeight: 500,
            fontSize: 17,
            color: t.textPrimary,
            letterSpacing: -0.3,
            lineHeight: 1.25,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 6, fontWeight: 400, lineHeight: 1.4 }}>
            {subtitle}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

export default function Dashboard() {
  const bookings = useStore((s) => s.bookings);
  const leads = useStore((s) => s.leads);
  const cashLedger = useStore((s) => s.cashLedger);
  const storeInvoices = useStore((s) => s.invoices);
  const loading = useStore((s) => s.loading);
  const updateBookingStatus = useStore((s) => s.updateBookingStatus);
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { pendingRange, consumeRange, pendingNewBooking, consumeNewBooking } = useCommand();

  const [range, setRange] = useState("All Time");
  const [invoices, setInvoices] = useState([]);
  const [animKey, setAnimKey] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    getInvoices()
      .then((data) => setInvoices(Array.isArray(data) ? data : []))
      .catch(() => setInvoices([]));
  }, []);

  useEffect(() => {
    const r = consumeRange();
    if (r) {
      setRange(r);
      setAnimKey((k) => k + 1);
    }
  }, [pendingRange, consumeRange]);

  useEffect(() => {
    if (consumeNewBooking()) navigate("/bookings");
  }, [pendingNewBooking, consumeNewBooking, navigate]);

  const handleRange = (r) => {
    setRange(r);
    setAnimKey((k) => k + 1);
  };

  const copyBookingId = async (b, e) => {
    e?.stopPropagation?.();
    const id = b?.["Booking ID"] || "";
    if (!id) {
      showToast("No booking ID", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(id);
      showToast("Booking ID copied");
    } catch {
      showToast("Could not copy ID", "error");
    }
  };

  const markCompleted = async (b, e) => {
    e?.stopPropagation?.();
    const id = b?.["Booking ID"];
    if (!id) return;
    try {
      await updateBookingStatus(id, "Confirmed");
      showToast("Marked completed — open Bookings to invoice");
      setSelectedBooking(null);
      navigate("/bookings");
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const printInvoice = (e) => {
    e?.stopPropagation?.();
    setSelectedBooking(null);
    navigate("/invoices");
  };

  const filtered = useMemo(() => bookings.filter((b) => inRange(b.Date, range)), [bookings, range]);

  const { todayBookings, todayPending } = useMemo(() => {
    const { start, end } = todayBounds();
    const todays = bookings.filter((b) => {
      const d = parseDate(b.Date);
      return d && d >= start && d <= end;
    });
    return {
      todayBookings: todays.length,
      todayPending: todays.filter((b) => b.Status === "Pending").length,
    };
  }, [bookings]);

  const recentActivity = useMemo(() => {
    const items = [];
    filtered.slice(0, 5).forEach((b) => {
      items.push({
        id: `b-${b["Booking ID"]}`,
        title: b.Name || "Booking",
        meta: `${b.Service || "Repair"} · ${formatDate(b.Date)}${b.Time ? ` · ${b.Time}` : ""}`,
        status: b.Status === "Confirmed" ? "Completed" : b.Status,
        booking: b,
        kind: "booking",
      });
    });
    leads
      .filter((l) => inRange(l.created_at, range))
      .slice(0, 3)
      .forEach((l, i) => {
        items.push({
          id: `l-${l.id || i}`,
          title: l.name || l.Name || "New lead",
          meta: `Lead · ${formatDate(l.created_at) || "Recently"}`,
          status: null,
          booking: null,
          kind: "lead",
        });
      });
    return items.slice(0, 6);
  }, [filtered, leads, range]);

  if (loading) return <DashboardSkeleton />;

  const confirmed = filtered.filter((b) => b.Status === "Confirmed").length;
  const pending = filtered.filter((b) => b.Status === "Pending").length;
  const rejected = filtered.filter((b) => b.Status === "Rejected").length;

  const summaryBookings = filtered.length;
  const unpaidInvoices = invoices.filter(
    (i) => i.status === "unpaid" && inRange(i.created_at, range)
  ).length;
  const unpaidAll = invoices.filter((i) => i.status === "unpaid").length;
  const summaryLeads = leads.filter((l) => inRange(l.created_at, range)).length;

  const needsAttention = bookings.filter(isStalePending).length;

  const invForCash = (storeInvoices?.length ? storeInvoices : invoices) || [];
  const cashOnHand =
    (cashLedger || []).reduce((s, e) => s + Number(e.amount || 0), 0) +
    invForCash.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0);

  const bounds = periodBounds(range);

  let prevBookings = 0;
  if (bounds) {
    prevBookings = countInWindow(bookings, (b) => b.Date, bounds.prevStart, bounds.prevEnd);
  }

  const byDate = {};
  filtered.forEach((b) => {
    byDate[b.Date] = (byDate[b.Date] || 0) + 1;
  });
  const sortedDates = Object.entries(byDate).sort(([a], [b]) => String(a).localeCompare(String(b)));
  const lineData = sortedDates.slice(-14).map(([date, count]) => {
    const d = parseDate(date);
    const label = d
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : String(date).slice(-5);
    return { date: label, full: date, count };
  });

  const statusCounts = [
    { name: "Confirmed", value: confirmed, color: CHART_STATUS.Confirmed },
    { name: "Pending", value: pending, color: CHART_STATUS.Pending },
    { name: "Rejected", value: rejected, color: CHART_STATUS.Rejected },
  ].filter((d) => d.value > 0);

  let pieData = statusCounts;
  if (statusCounts.length === 1) {
    const only = statusCounts[0];
    pieData = [
      only,
      { name: "", value: Math.max(Math.round(only.value * 0.28), 1), color: PLACEHOLDER, placeholder: true },
    ];
  }

  const trendReady = filtered.length >= 3 && lineData.length >= 2;
  const singlePoint = lineData.length === 1;
  const statusTotal = statusCounts.reduce((s, d) => s + d.value, 0);
  const dominant = statusCounts.slice().sort((a, b) => b.value - a.value)[0];

  const panel = {
    ...premiumCardStyle(t, { interactive: false }),
    border: `1px solid ${t.border}`,
    boxShadow: t.cardShadow,
    borderRadius: 18,
  };

  const TH = {
    padding: "14px 20px",
    fontSize: 12,
    fontWeight: 400,
    color: t.thColor,
    textTransform: "none",
    letterSpacing: 0,
    textAlign: "left",
    background: "transparent",
    borderBottom: `1px solid ${t.borderSub}`,
  };
  const TD = {
    padding: "18px 20px",
    fontSize: 14,
    color: t.tdColor,
    borderBottom: `1px solid ${t.borderSub}`,
    fontWeight: 400,
  };

  const tipStyle = {
    contentStyle: {
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      background: t.cardBg,
      color: t.textPrimary,
      boxShadow: t.cardShadow,
      fontSize: 12,
      fontVariantNumeric: "tabular-nums",
    },
  };

  const bookingDelta = bounds ? pctChange(summaryBookings, prevBookings) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const estRevenue = filtered
    .filter((b) => b.Status === "Confirmed" || b.Status === "Completed")
    .reduce((s, b) => s + bookingRevenue(b), 0);
  const gridStroke = t.name === "dark" ? GRID_DARK : GRID;

  const shopStatus =
    needsAttention > 0
      ? `${needsAttention} booking${needsAttention === 1 ? "" : "s"} need your attention.`
      : todayPending > 0
        ? `${todayPending} customer${todayPending === 1 ? "" : "s"} awaiting confirmation today.`
        : "Everything looks good today.";

  return (
    <ContentReveal>
    <div className="glow-ambient dash-page" style={{ padding: "40px 32px 64px", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`
        @media(max-width:768px){
          .dash-page{padding:24px 16px 48px!important}
          .dash-header{flex-direction:column!important;gap:20px!important;align-items:stretch!important}
          .dash-hero-pulse{flex-direction:column!important;gap:16px!important;align-items:flex-start!important}
          .dash-hero-pulse-item{padding-right:0!important;border-right:none!important;padding-bottom:16px;border-bottom:1px solid ${t.borderSub};width:100%}
          .dash-hero-pulse-item:last-child{border-bottom:none;padding-bottom:0}
          .dash-kpi-grid{grid-template-columns:1fr!important}
          .dash-secondary{grid-template-columns:1fr!important}
          .dash-chartgrid{grid-template-columns:1fr!important}
          .dash-job-status{flex-direction:column!important;align-items:center!important}
          .dash-table th:nth-child(4),.dash-table td:nth-child(4),
          .dash-table th:nth-child(5),.dash-table td:nth-child(5){display:none}
          .dash-lower{grid-template-columns:1fr!important}
        }
        @media(min-width:769px){
          .dash-kpi-grid{grid-template-columns:repeat(3,1fr)!important}
          .dash-secondary{grid-template-columns:repeat(3,1fr)!important}
          .dash-chartgrid{grid-template-columns:1.45fr 1fr!important}
          .dash-lower{grid-template-columns:1.4fr 1fr!important}
        }
        .dash-table tbody tr.dash-row {
          transition: background 150ms cubic-bezier(0.2, 0, 0, 1);
          cursor: pointer;
        }
        .dash-table tbody tr.dash-row:hover {
          background: ${t.rowHover};
        }
        .dash-table tbody tr.dash-row:last-child td {
          border-bottom: none;
        }
        .dash-table .tabular-cell {
          font-variant-numeric: tabular-nums;
          font-family: var(--font-mono), "Google Sans Code", ui-monospace, monospace;
          font-size: 12px;
        }
        .bk-row-actions {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 150ms cubic-bezier(0.2, 0, 0, 1);
        }
        .dash-table tbody tr.dash-row:hover .bk-row-actions {
          opacity: 1;
          pointer-events: auto;
        }
        .bk-row-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          border: none;
          background: ${t.cardBg2 || t.pageBg};
          color: ${t.textSecondary};
          cursor: pointer;
          padding: 0;
          transition: color 150ms cubic-bezier(0.2, 0, 0, 1), background 150ms cubic-bezier(0.2, 0, 0, 1);
        }
        .bk-row-action-btn:hover {
          color: ${t.accent};
          background: ${t.activeTint};
        }
        @keyframes dashChartIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-chart-enter {
          animation: dashChartIn 250ms cubic-bezier(0.2, 0, 0, 1) both;
        }
        .dash-activity-row {
          transition: background 150ms cubic-bezier(0.2, 0, 0, 1);
          cursor: pointer;
          border-radius: 12px;
        }
        .dash-activity-row:hover {
          background: ${t.rowHover};
        }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="dash-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40, gap: 24 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: t.textPrimary,
              letterSpacing: -0.8,
              margin: 0,
              lineHeight: 1.15,
              fontFamily: "var(--font-display)",
            }}
          >
            {greeting}, Owner
          </h1>
          <p
            style={{
              color: t.textSecondary,
              fontSize: 15,
              marginTop: 10,
              lineHeight: 1.5,
              maxWidth: 480,
              fontWeight: 400,
            }}
          >
            {shopStatus}
          </p>

          <div
            className="dash-hero-pulse"
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 0,
              marginTop: 28,
              flexWrap: "wrap",
            }}
          >
            {[
              {
                label: "Bookings today",
                value: todayBookings.toLocaleString(),
                onClick: () => navigate("/bookings"),
              },
              {
                label: "Cash on hand",
                value: `Rs ${cashOnHand.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                onClick: () => navigate("/cash"),
              },
              {
                label: "Unpaid invoices",
                value: unpaidAll.toLocaleString(),
                onClick: () => navigate("/invoices"),
              },
            ].map((m, i, arr) => (
              <button
                key={m.label}
                type="button"
                className="ui-press dash-hero-pulse-item"
                onClick={m.onClick}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "0 28px 0 0",
                  marginRight: i < arr.length - 1 ? 28 : 0,
                  borderRight: i < arr.length - 1 ? `1px solid ${t.border}` : "none",
                  fontFamily: "inherit",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    color: t.textPrimary,
                    letterSpacing: -0.6,
                    fontVariantNumeric: "tabular-nums",
                    fontFamily: "var(--font-mono)",
                    lineHeight: 1.1,
                  }}
                >
                  {m.value}
                </div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6, fontWeight: 400 }}>
                  {m.label}
                </div>
              </button>
            ))}
          </div>
        </div>
        <SegmentedControl options={DATE_RANGES} value={range} onChange={handleRange} layoutId="dashActiveTab" />
      </div>

      {needsAttention > 0 && (
        <button
          type="button"
          className="ui-interactive"
          onClick={() => navigate("/bookings")}
          style={{
            width: "100%",
            textAlign: "left",
            marginBottom: 24,
            padding: "16px 24px",
            cursor: "pointer",
            background: t.riskBg,
            border: `1px solid ${t.riskBorder}`,
            borderRadius: 16,
            color: t.textPrimary,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            fontFamily: "inherit",
            transition: "transform 150ms cubic-bezier(0.2, 0, 0, 1)",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, fontVariantNumeric: "tabular-nums" }}>
              {needsAttention} booking{needsAttention === 1 ? "" : "s"} need attention
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>Pending for 4+ hours</div>
          </div>
          <span style={{ color: t.risk, fontWeight: 500, fontSize: 13, whiteSpace: "nowrap" }}>Review →</span>
        </button>
      )}

      {/* ── AI Briefing ──────────────────────────────────────────────────── */}
      <AiBriefing range={range} />

      {/* ── Tonight board (ops at a glance) ─────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <TonightBoard bookings={bookings} invoices={invoices} t={t} />
      </div>

      {/* ── Primary KPIs ─────────────────────────────────────────────────── */}
      <div
        key={`kpi-${animKey}`}
        className="dash-kpi-grid dash-chart-enter"
        style={{ display: "grid", gap: 16, marginBottom: 16 }}
      >
        <WalletKpi
          label="Bookings"
          value={summaryBookings.toLocaleString()}
          trend={bounds ? bookingDelta : "All time"}
          onClick={() => navigate("/bookings")}
          t={t}
          icon={Calendar}
        />
        <WalletKpi
          label="Unpaid invoices"
          value={unpaidInvoices.toLocaleString()}
          trend="Awaiting payment"
          onClick={() => navigate("/invoices")}
          t={t}
          icon={Receipt}
        />
        <WalletKpi
          label="Cash on hand"
          value={cashOnHand.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          prefix="Rs"
          trend="Ledger + paid invoices"
          onClick={() => navigate("/cash")}
          t={t}
          icon={Wallet}
        />
      </div>

      <div
        className="dash-secondary"
        style={{ display: "grid", gap: 12, marginBottom: 40 }}
      >
        {[
          { label: "Leads", value: summaryLeads.toLocaleString(), onClick: () => navigate("/leads") },
          {
            label: "Est. revenue",
            value: `Rs ${estRevenue.toLocaleString()}`,
            onClick: () => navigate("/analytics"),
          },
          {
            label: "Period",
            value: range,
            onClick: null,
          },
        ].map((row) => (
          <button
            key={row.label}
            type="button"
            className="ui-press"
            onClick={row.onClick || undefined}
            style={{
              background: t.cardBg,
              border: `1px solid ${t.border}`,
              borderRadius: 14,
              cursor: row.onClick ? "pointer" : "default",
              padding: "16px 20px",
              textAlign: "left",
              fontFamily: "inherit",
              boxShadow: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              transition:
                "border-color 150ms cubic-bezier(0.2, 0, 0, 1), background 150ms cubic-bezier(0.2, 0, 0, 1), transform 150ms cubic-bezier(0.2, 0, 0, 1)",
            }}
            onMouseEnter={(e) => {
              if (!row.onClick) return;
              e.currentTarget.style.borderColor = t.borderHover;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = t.border;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 400, color: t.textMuted }}>{row.label}</span>
            <span
              className="font-mono-data"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: t.textPrimary,
                letterSpacing: -0.2,
              }}
            >
              {row.value}
            </span>
          </button>
        ))}
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div key={`charts-${animKey}`} className="dash-chartgrid dash-chart-enter" style={{ display: "grid", gap: 20, marginBottom: 40 }}>
        <div style={{ ...panel, padding: "28px 28px 24px" }}>
          <SectionLabel title="Booking trend" subtitle="Last 14 days in range" t={t} />
          {!trendReady ? (
            <div
              style={{
                height: 240,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: t.textMuted,
                fontSize: 13,
              }}
            >
              <TrendEmptyGraphic />
              <div style={{ fontSize: 14, fontWeight: 500, color: t.textSecondary }}>Not enough data yet</div>
              {singlePoint && filtered.length > 0 ? (
                <div style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                  {lineData[0].count} booking{lineData[0].count === 1 ? "" : "s"} on {lineData[0].date}
                </div>
              ) : (
                <div style={{ fontSize: 12 }}>Need at least 3 bookings across 2+ days</div>
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={lineData} margin={{ top: 12, right: 8, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="0" stroke={gridStroke} vertical={false} horizontal />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: t.textMuted, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={32}
                  dy={8}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, (max) => Math.max(max, 2)]}
                  tick={{ fontSize: 11, fill: t.textMuted, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  tickCount={4}
                />
                <Tooltip
                  content={<TrendTooltip t={t} />}
                  cursor={{ stroke: t.border, strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={t.chart || "#64748B"}
                  strokeWidth={1.75}
                  dot={false}
                  activeDot={{ r: 3.5, strokeWidth: 2, stroke: t.cardBg, fill: t.chart || "#64748B" }}
                  isAnimationActive
                  animationDuration={250}
                  animationEasing="ease-out"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ ...panel, padding: "28px 28px 24px", display: "flex", flexDirection: "column" }}>
          <SectionLabel title="Booking status" subtitle="Distribution in range" t={t} />
          {statusCounts.length > 0 ? (
            <div className="dash-job-status" style={{ display: "flex", alignItems: "center", gap: 28, flex: 1, minHeight: 240 }}>
              <div style={{ position: "relative", width: 168, height: 168, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius="72%"
                      outerRadius="90%"
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={8}
                      isAnimationActive
                      animationDuration={250}
                    >
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={d.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      {...tipStyle}
                      formatter={(v, n, item) => (item?.payload?.placeholder || !n ? [null, null] : [`${v}`, n])}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                    textAlign: "center",
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 500,
                      color: t.textPrimary,
                      letterSpacing: -1,
                      lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {dominant?.value ?? statusTotal}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: t.textMuted,
                      marginTop: 6,
                    }}
                  >
                    {dominant?.name || "Total"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, minWidth: 0 }}>
                {[
                  ["Confirmed", confirmed, CHART_STATUS.Confirmed],
                  ["Pending", pending, CHART_STATUS.Pending],
                  ["Rejected", rejected, CHART_STATUS.Rejected],
                ].map(([name, count, color]) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 400, color: t.textSecondary }}>{name}</span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: t.textPrimary,
                        fontVariantNumeric: "tabular-nums",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Recent bookings + activity ───────────────────────────────────── */}
      <div className="dash-lower" style={{ display: "grid", gap: 20, alignItems: "start" }}>
        <div style={{ ...panel, overflow: "hidden", padding: 0 }}>
          <div
            style={{
              padding: "24px 28px 0",
            }}
          >
            <SectionLabel
              title="Recent bookings"
              subtitle="Latest 8 in this range"
              t={t}
              action={
                <button
                  className="ui-press"
                  onClick={() => exportToCSV(filtered, "bookings.csv")}
                  style={{
                    padding: "0 14px",
                    height: 36,
                    borderRadius: 10,
                    border: `1px solid ${t.border}`,
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    color: t.textSecondary,
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "border-color 150ms cubic-bezier(0.2, 0, 0, 1), color 150ms cubic-bezier(0.2, 0, 0, 1)",
                  }}
                >
                  <Download size={14} strokeWidth={2} />
                  Export
                </button>
              }
            />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="dash-table data-table" style={{ width: "100%", minWidth: 520, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Ticket", "Name", "Service", "Date", "Time", "Status", ""].map((h) => (
                    <th key={h || "actions"} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "56px 24px", textAlign: "center", color: t.textMuted }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <BookingsEmptyGraphic />
                        <div style={{ fontSize: 15, fontWeight: 500, color: t.textPrimary }}>No bookings in this range</div>
                        <div style={{ fontSize: 13, color: t.textMuted, maxWidth: 280, lineHeight: 1.5 }}>
                          Create one from Bookings, or press{" "}
                          <span
                            className="font-mono-data"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 7px",
                              borderRadius: 6,
                              border: `1px solid ${t.border}`,
                              background: t.cardBg2 || t.pageBg,
                              fontSize: 11,
                              fontWeight: 500,
                              color: t.textSecondary,
                            }}
                          >
                            ⌘K / C
                          </span>
                        </div>
                        <button
                          type="button"
                          className="ui-press"
                          {...primaryBtnHoverProps(t)}
                          onClick={() => navigate("/bookings")}
                          style={{
                            ...primaryBtnStyle(t),
                            marginTop: 12,
                            padding: "9px 14px",
                            fontSize: 13,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontFamily: "inherit",
                          }}
                        >
                          <Plus size={15} strokeWidth={2.25} />
                          Create booking
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, 8).map((b, i) => {
                    const ticket = b["Booking ID"] || `—`;
                    const shortTicket =
                      String(ticket).length > 10 ? `…${String(ticket).slice(-8)}` : ticket;
                    const isLast = i === Math.min(filtered.length, 8) - 1;
                    return (
                      <tr
                        key={b["Booking ID"] || i}
                        className="dash-row"
                        onClick={() => setSelectedBooking(b)}
                      >
                        <td className="tabular-cell" style={{ ...TD, color: t.textMuted, fontWeight: 400, borderBottom: isLast ? "none" : TD.borderBottom }}>
                          {shortTicket}
                        </td>
                        <td style={{ ...TD, fontWeight: 500, color: t.textPrimary, borderBottom: isLast ? "none" : TD.borderBottom }}>{b.Name}</td>
                        <td style={{ ...TD, borderBottom: isLast ? "none" : TD.borderBottom }}>{b.Service}</td>
                        <td className="tabular-cell" style={{ ...TD, borderBottom: isLast ? "none" : TD.borderBottom }}>{formatDate(b.Date)}</td>
                        <td className="tabular-cell" style={{ ...TD, borderBottom: isLast ? "none" : TD.borderBottom }}>{b.Time}</td>
                        <td style={{ ...TD, borderBottom: isLast ? "none" : TD.borderBottom }}>
                          <StatusBadge status={b.Status === "Confirmed" ? "Completed" : b.Status} pulse={b.Status === "Pending"} />
                        </td>
                        <td style={{ ...TD, width: 1, whiteSpace: "nowrap", borderBottom: isLast ? "none" : TD.borderBottom }} onClick={(e) => e.stopPropagation()}>
                          <div className="bk-row-actions">
                            <button
                              type="button"
                              className="bk-row-action-btn ui-press"
                              title="Copy ID"
                              aria-label="Copy ID"
                              onClick={(e) => copyBookingId(b, e)}
                            >
                              <Copy size={13} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              className="bk-row-action-btn ui-press"
                              title="Mark Completed"
                              aria-label="Mark Completed"
                              onClick={(e) => markCompleted(b, e)}
                            >
                              <CheckCircle2 size={13} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              className="bk-row-action-btn ui-press"
                              title="Print Invoice"
                              aria-label="Print Invoice"
                              onClick={printInvoice}
                            >
                              <Printer size={13} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...panel, padding: "28px 24px 20px" }}>
          <SectionLabel title="Recent activity" subtitle="Bookings and leads" t={t} />
          {recentActivity.length === 0 ? (
            <div
              style={{
                padding: "40px 12px",
                textAlign: "center",
                color: t.textMuted,
                fontSize: 13,
              }}
            >
              No activity in this range yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {recentActivity.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ui-press dash-activity-row"
                  onClick={() => {
                    if (item.kind === "lead") navigate("/leads");
                    else if (item.booking) setSelectedBooking(item.booking);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 12px",
                    background: "none",
                    border: "none",
                    width: "100%",
                    textAlign: "left",
                    fontFamily: "inherit",
                    color: "inherit",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: item.kind === "lead" ? t.accent : CHART_STATUS[item.status === "Completed" ? "Confirmed" : item.status] || t.textMuted,
                      flexShrink: 0,
                      opacity: 0.85,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: t.textPrimary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: t.textMuted,
                        marginTop: 3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.meta}
                    </div>
                  </div>
                  {item.status && <StatusBadge status={item.status} pulse={item.status === "Pending"} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking?.Name || "Booking"}
        subtitle={selectedBooking?.["Booking ID"] || undefined}
        footer={
          <>
            <button
              type="button"
              className="ui-press"
              onClick={() => setSelectedBooking(null)}
              style={{ ...secondaryBtnStyle(t), padding: "10px 14px", fontSize: 13, fontFamily: "inherit" }}
            >
              Close
            </button>
            <button
              type="button"
              className="ui-press"
              {...primaryBtnHoverProps(t)}
              onClick={() => {
                setSelectedBooking(null);
                navigate("/bookings");
              }}
              style={{ ...primaryBtnStyle(t), padding: "10px 14px", fontSize: 13, fontFamily: "inherit", marginLeft: "auto" }}
            >
              Go to Bookings
            </button>
          </>
        }
      >
        {selectedBooking && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Name", selectedBooking.Name],
                ["Phone", selectedBooking.Phone],
                ["Service", selectedBooking.Service],
                ["Date", formatDate(selectedBooking.Date)],
                ["Time", selectedBooking.Time],
                ["Status", null],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                    {label}
                  </div>
                  {label === "Status" ? (
                    <StatusBadge status={selectedBooking.Status} pulse={selectedBooking.Status === "Pending"} />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>{value || "—"}</div>
                  )}
                </div>
              ))}
            </div>

            {(selectedBooking.Device || selectedBooking.device) && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  Players
                </div>
                <div style={{ fontSize: 14, color: t.textPrimary }}>{selectedBooking.Device || selectedBooking.device}</div>
              </div>
            )}

            {(selectedBooking.Notes || selectedBooking.notes) && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  Notes
                </div>
                <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>{selectedBooking.Notes || selectedBooking.notes}</div>
              </div>
            )}

            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                Status log
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingLeft: 4 }}>
                {[
                  { label: "Created", done: true },
                  { label: selectedBooking.Status || "Current", done: true, current: true },
                ].map((step, i, arr) => (
                  <div key={step.label + i} style={{ display: "flex", gap: 12, minHeight: i < arr.length - 1 ? 36 : 20 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 12 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: step.current ? t.accent : t.accentMuted || t.accent,
                          boxShadow: step.current ? `0 0 0 3px ${t.accentGlow || "rgba(225,29,72,0.2)"}` : "none",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      />
                      {i < arr.length - 1 && (
                        <span style={{ flex: 1, width: 2, background: t.border, marginTop: 4, borderRadius: 1 }} />
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: step.current ? 500 : 400, color: t.textPrimary, paddingBottom: 8 }}>
                      {step.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <button
                type="button"
                className="ui-press"
                onClick={(e) => copyBookingId(selectedBooking, e)}
                style={{ ...secondaryBtnStyle(t), padding: "8px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
              >
                <Copy size={13} /> Copy ID
              </button>
              <button
                type="button"
                className="ui-press"
                onClick={(e) => markCompleted(selectedBooking, e)}
                style={{ ...secondaryBtnStyle(t), padding: "8px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
              >
                <CheckCircle2 size={13} /> Mark Completed
              </button>
              <button
                type="button"
                className="ui-press"
                onClick={printInvoice}
                style={{ ...secondaryBtnStyle(t), padding: "8px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
              >
                <Printer size={13} /> Print Invoice
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
    </ContentReveal>
  );
}
