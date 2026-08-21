import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Download, FileText, Calendar } from "lucide-react";
import { useStore } from "../store/useStore";
import {
  useTheme,
  cardStyle,
  cardHoverProps,
  secondaryBtnStyle,
} from "../context/ThemeContext";
import PageShell from "../components/PageShell";
import SegmentedControl from "../components/SegmentedControl";
import Sheet from "../components/Sheet";
import EmptyState from "../components/EmptyState";
import { SkeletonBlock } from "../components/Skeleton";
import { exportToCSV } from "../utils/export";
import { bookingRevenue } from "../utils/bookingRevenue";
import { spacing, radius, duration, ease } from "../design-system/tokens";

/* ── Constants ───────────────────────────────────────────────────────────── */

const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const VIEW_TABS = [
  "Overview",
  "Revenue",
  "Bookings",
  "Customers",
  "Services",
  "Operations",
  "Predictions",
];
const RANGE_OPTIONS = ["Today", "7 Days", "30 Days", "90 Days", "Year", "Custom"];
const REVENUE_GRAINS = ["Daily", "Weekly", "Monthly", "Yearly"];

const GRID_LIGHT = "rgba(15,17,21,0.05)";
const GRID_DARK = "rgba(255,255,255,0.05)";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

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

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function rangeBounds(range, customStart, customEnd) {
  const now = new Date();
  const end = endOfDay(now);
  let start;
  let prevStart;
  let prevEnd;
  let deltaLabel = "vs prior";

  if (range === "Today") {
    start = startOfDay(now);
    prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    deltaLabel = "vs yesterday";
  } else if (range === "7 Days") {
    start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
    prevStart = startOfDay(prevStart);
    deltaLabel = "vs prior 7 days";
  } else if (range === "30 Days") {
    start = startOfDay(now);
    start.setDate(start.getDate() - 29);
    prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 29);
    prevStart = startOfDay(prevStart);
    deltaLabel = "vs prior 30 days";
  } else if (range === "90 Days") {
    start = startOfDay(now);
    start.setDate(start.getDate() - 89);
    prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 89);
    prevStart = startOfDay(prevStart);
    deltaLabel = "vs prior 90 days";
  } else if (range === "Year") {
    start = new Date(now.getFullYear(), 0, 1);
    prevStart = new Date(now.getFullYear() - 1, 0, 1);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    deltaLabel = "vs last year";
  } else if (range === "Custom" && customStart && customEnd) {
    start = startOfDay(new Date(customStart));
    const customE = endOfDay(new Date(customEnd));
    const span = Math.max(1, Math.ceil((customE - start) / 86400000));
    prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (span - 1));
    prevStart = startOfDay(prevStart);
    return { start, end: customE, prevStart, prevEnd, deltaLabel };
  } else {
    start = startOfDay(now);
    start.setDate(start.getDate() - 29);
    prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 29);
    prevStart = startOfDay(prevStart);
  }

  return { start, end, prevStart, prevEnd, deltaLabel };
}

function inBounds(dateStr, start, end) {
  const d = parseDate(dateStr);
  if (!d) return false;
  return d >= start && d <= end;
}

function pctDelta(curr, prev) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function formatRs(n) {
  const v = Math.round(Number(n) || 0);
  return `Rs ${v.toLocaleString()}`;
}

function formatCompact(n) {
  const v = Math.round(Number(n) || 0);
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return String(v);
}

function sparkFromSeries(series, key = "value") {
  if (!series?.length) return [0, 0, 0, 0, 0, 0, 0];
  return series.map((d) => d[key] || 0);
}

/* ── Mini UI ─────────────────────────────────────────────────────────────── */

function MiniSparkline({ data = [], color, height = 28, width = 88 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = Math.max(max - min, 1);
  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - ((v - min) / span) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ marginTop: 10, display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} opacity={0.85} />
    </svg>
  );
}

function ChartTooltipBox({ active, payload, label, t, rows }) {
  if (!active || !payload?.length) return null;
  const items = rows ? rows(payload, label) : payload.map((p) => ({ label: p.name || p.dataKey, value: p.value }));
  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: "12px 14px",
        boxShadow: t.cardShadowHover || t.cardShadow,
        minWidth: 148,
      }}
    >
      <div className="font-mono-data" style={{ fontSize: 11, color: t.textMuted, marginBottom: 8 }}>
        {label}
      </div>
      {items.map((row) => (
        <div
          key={row.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            fontSize: 12,
            marginBottom: 4,
          }}
        >
          <span style={{ color: t.textSecondary }}>{row.label}</span>
          <span className="font-mono-data" style={{ color: t.textPrimary, fontWeight: 500 }}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title, subtitle, action, t }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: spacing.lg,
        marginBottom: spacing.xl,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 550,
            letterSpacing: -0.35,
            color: t.textPrimary,
            lineHeight: 1.25,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: 13, color: t.textMuted, lineHeight: 1.45 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function KeyInsight({ text, t }) {
  if (!text) return null;
  return (
    <div
      style={{
        marginTop: spacing.lg,
        paddingTop: spacing.lg,
        borderTop: `1px solid ${t.borderSub || t.border}`,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: t.textMuted,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        Insight
      </span>
      <p style={{ margin: 0, fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

function Panel({ children, style, t, interactive = false }) {
  const hover = cardHoverProps(t);
  return (
    <div
      className="ds-card-enter"
      style={{
        ...cardStyle(t, { interactive }),
        padding: spacing["2xl"],
        borderRadius: radius.lg,
        ...style,
      }}
      onMouseEnter={interactive ? hover.onMouseEnter : undefined}
      onMouseLeave={interactive ? hover.onMouseLeave : undefined}
    >
      {children}
    </div>
  );
}

function ExecKpi({ label, value, trend, spark, sparkColor, onClick, t, prefix }) {
  const hover = cardHoverProps(t);
  const flat = trend == null || trend === 0;
  const up = typeof trend === "number" && trend > 0;
  const trendText =
    trend == null ? null : flat ? "Steady" : `${up ? "+" : ""}${trend}%`;

  return (
    <button
      type="button"
      className="ui-press an-kpi"
      onClick={onClick}
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: radius.lg,
        boxShadow: t.cardShadow,
        cursor: "pointer",
        textAlign: "left",
        padding: "28px 24px 24px",
        fontFamily: "inherit",
        color: "inherit",
        minHeight: 148,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: spacing.md,
        transition: `border-color ${duration.fast} ${ease.standard}, box-shadow ${duration.fast} ${ease.standard}, transform ${duration.fast} ${ease.standard}`,
      }}
      onMouseEnter={(e) => {
        hover.onMouseEnter(e);
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        hover.onMouseLeave(e);
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: t.textMuted,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          {prefix && (
            <span className="font-mono-data" style={{ fontSize: 14, color: t.textMuted, fontWeight: 400 }}>
              {prefix}
            </span>
          )}
          <div
            className="font-mono-data"
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: t.textPrimary,
              letterSpacing: -1.4,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </div>
        </div>
        {trendText != null && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              fontWeight: 400,
              color: !flat && up ? "#059669" : !flat && !up ? t.textMuted : t.textMuted,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {trendText}
          </div>
        )}
        <MiniSparkline data={spark} color={sparkColor || t.chart || "#64748B"} />
      </div>
    </button>
  );
}

function MetricTile({ label, value, sub, t }) {
  return (
    <div
      style={{
        padding: `${spacing.xl}px ${spacing.lg}px`,
        borderRadius: radius.md,
        background: t.name === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.03)",
        border: `1px solid ${t.border}`,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
        {label}
      </div>
      <div className="font-mono-data" style={{ fontSize: 22, fontWeight: 500, color: t.textPrimary, letterSpacing: -0.6, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ marginTop: 6, fontSize: 12, color: t.textMuted }}>{sub}</div>}
    </div>
  );
}

function HBar({ label, value, max, color, t, right }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <div
        style={{
          width: 96,
          fontSize: 13,
          fontWeight: 500,
          color: t.textSecondary,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
        title={label}
      >
        {label}
      </div>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: t.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,17,21,0.06)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 4,
            background: color,
            minWidth: value > 0 ? 4 : 0,
            transition: `width 200ms ${ease.standard}`,
          }}
        />
      </div>
      <div className="font-mono-data" style={{ width: 56, textAlign: "right", fontSize: 13, fontWeight: 500, color: t.textPrimary, flexShrink: 0 }}>
        {right ?? value}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, t }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 500 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 36,
          padding: "0 12px",
          borderRadius: radius.sm,
          border: `1px solid ${t.border}`,
          background: t.inputBg || t.cardBg,
          color: t.textPrimary,
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function DrawerSection({ title, children, t }) {
  return (
    <section style={{ marginBottom: 28 }}>
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
        {title}
      </div>
      {children}
    </section>
  );
}

function AnalyticsSkeleton({ t }) {
  return (
    <PageShell title="Analytics" subtitle="Understand the performance of your arena.">
      <style>{`
        .sk-wave{position:relative;overflow:hidden;background:${t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"};border:1px solid ${t.border}}
        .sk-wave::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,${t.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)"},transparent);animation:skWave 1.4s ease-in-out infinite}
        @keyframes skWave{100%{transform:translateX(100%)}}
        @media(prefers-reduced-motion:reduce){.sk-wave::after{animation:none}}
      `}</style>
      <div style={{ display: "flex", gap: 8, marginBottom: 40, flexWrap: "wrap" }}>
        {[120, 88, 96, 88, 72].map((w, i) => (
          <SkeletonBlock key={i} height={36} width={w} radius={10} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonBlock key={i} height={148} radius={18} style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
      <SkeletonBlock height={200} radius={18} style={{ marginBottom: 40 }} />
      <SkeletonBlock height={280} radius={18} style={{ marginBottom: 40 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SkeletonBlock height={240} radius={18} />
        <SkeletonBlock height={240} radius={18} />
      </div>
    </PageShell>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function Analytics() {
  const bookings = useStore((s) => s.bookings);
  const chats = useStore((s) => s.chats);
  const slots = useStore((s) => s.slots);
  const leads = useStore((s) => s.leads);
  const waitlist = useStore((s) => s.waitlist);
  const loading = useStore((s) => s.loading);
  const { theme: t, dark } = useTheme();

  const [view, setView] = useState("Overview");
  const [range, setRange] = useState("30 Days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [revenueGrain, setRevenueGrain] = useState("Monthly");
  const [drawer, setDrawer] = useState(null);

  const BRAND = t.accentSolid || t.accent || "#F43F5E";
  const ACCENT = t.chart || "#64748B";
  const gridStroke = dark ? (t.chartGrid || GRID_DARK) : (t.chartGrid || GRID_LIGHT);

  const tip = {
    contentStyle: {
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      background: t.cardBg,
      color: t.textPrimary,
      fontSize: 12,
      boxShadow: t.cardShadow,
      fontVariantNumeric: "tabular-nums",
    },
  };

  const serviceOptions = useMemo(() => {
    const set = new Set(bookings.map((b) => b.Service).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [bookings]);

  const sourceOptions = useMemo(() => {
    const set = new Set(bookings.map((b) => (b.Source || "").trim() || "Unknown"));
    return ["All", ...Array.from(set).sort()];
  }, [bookings]);

  const analytics = useMemo(() => {
    const bounds = rangeBounds(range, customStart, customEnd);
    const { start, end, prevStart, prevEnd, deltaLabel } = bounds;

    const applyFilters = (list) =>
      list.filter((b) => {
        if (serviceFilter !== "All" && b.Service !== serviceFilter) return false;
        const src = (b.Source || "").trim() || "Unknown";
        if (sourceFilter !== "All" && src !== sourceFilter) return false;
        return true;
      });

    const inPeriod = applyFilters(bookings.filter((b) => inBounds(b.Date, start, end)));
    const inPrev = applyFilters(bookings.filter((b) => inBounds(b.Date, prevStart, prevEnd)));

    const confirmed = inPeriod.filter((b) => b.Status === "Confirmed");
    const prevConfirmed = inPrev.filter((b) => b.Status === "Confirmed");
    const rejected = inPeriod.filter((b) => b.Status === "Rejected");
    const pending = inPeriod.filter((b) => b.Status === "Pending");
    const cancelled = inPeriod.filter((b) => /cancel|rejected|no.?show/i.test(String(b.Status || "")));
    const noShows = inPeriod.filter((b) => /no.?show/i.test(String(b.Status || "")));

    const revenue = confirmed.reduce((s, b) => s + bookingRevenue(b), 0);
    const prevRevenue = prevConfirmed.reduce((s, b) => s + bookingRevenue(b), 0);
    const avgTicket = confirmed.length ? Math.round(revenue / confirmed.length) : 0;
    const prevAvg = prevConfirmed.length ? Math.round(prevRevenue / prevConfirmed.length) : 0;
    const convRate = inPeriod.length ? Math.round((confirmed.length / inPeriod.length) * 100) : 0;
    const prevConv = inPrev.length ? Math.round((prevConfirmed.length / inPrev.length) * 100) : 0;

    const phoneMap = {};
    inPeriod.forEach((b) => {
      if (!b.Phone) return;
      phoneMap[b.Phone] = (phoneMap[b.Phone] || 0) + 1;
    });
    const uniqueCustomers = Object.keys(phoneMap).length;
    const returning = Object.values(phoneMap).filter((c) => c > 1).length;
    const oneTime = Object.values(phoneMap).filter((c) => c === 1).length;
    const retention = uniqueCustomers ? Math.round((returning / uniqueCustomers) * 100) : 0;

    const allPhone = {};
    bookings.forEach((b) => {
      if (!b.Phone) return;
      allPhone[b.Phone] = (allPhone[b.Phone] || 0) + 1;
    });
    const vip = Object.entries(allPhone)
      .filter(([, c]) => c >= 3)
      .sort((a, b) => b[1] - a[1]);
    const vipInPeriod = vip.filter(([phone]) => phoneMap[phone]).length;

    const prevPhone = {};
    inPrev.forEach((b) => {
      if (!b.Phone) return;
      prevPhone[b.Phone] = (prevPhone[b.Phone] || 0) + 1;
    });
    const prevReturning = Object.values(prevPhone).filter((c) => c > 1).length;

    /* Busy days / hours — same logic as before */
    const dayCount = Array(7).fill(0);
    inPeriod.forEach((b) => {
      const d = parseDate(b.Date);
      if (d) dayCount[d.getDay()]++;
    });
    const busyDays = DAYS_FULL.map((day, i) => ({ day: day.slice(0, 3), full: day, count: dayCount[i] }));
    const maxDay = Math.max(...dayCount, 1);
    const peakDay = busyDays.reduce((a, b) => (b.count > a.count ? b : a), busyDays[0]);

    const hourCount = {};
    inPeriod.forEach((b) => {
      if (!b.Time) return;
      const h = String(b.Time).split(":")[0].padStart(2, "0") + ":00";
      hourCount[h] = (hourCount[h] || 0) + 1;
    });
    const busyHours = Object.entries(hourCount)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, count }));
    const peakHour = busyHours.reduce((a, b) => (b.count > (a?.count || 0) ? b : a), null);

    const svcCount = {};
    inPeriod.forEach((b) => {
      if (b.Service) svcCount[b.Service] = (svcCount[b.Service] || 0) + 1;
    });
    const services = Object.entries(svcCount)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({
        name,
        count,
        revenue: confirmed
          .filter((b) => b.Service === name)
          .reduce((s, b) => s + bookingRevenue(b), 0),
        avgTime: 60,
      }));

    const topService = services[0];
    const topRevenueService = [...services].sort((a, b) => b.revenue - a.revenue)[0];
    const fastest = [...services].sort((a, b) => a.avgTime - b.avgTime)[0];
    const longest = [...services].sort((a, b) => b.avgTime - a.avgTime)[0];
    const avgRepairTime = services.length
      ? Math.round(services.reduce((s, x) => s + x.avgTime * x.count, 0) / Math.max(services.reduce((s, x) => s + x.count, 0), 1))
      : 0;

    /* Revenue series by grain */
    const revenueBuckets = {};
    confirmed.forEach((b) => {
      const d = parseDate(b.Date);
      if (!d) return;
      let key;
      if (revenueGrain === "Daily") {
        key = `${d.getMonth() + 1}/${d.getDate()}`;
      } else if (revenueGrain === "Weekly") {
        const week = Math.ceil(d.getDate() / 7);
        key = `W${week}-${d.getMonth() + 1}`;
      } else if (revenueGrain === "Yearly") {
        key = String(d.getFullYear());
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
      if (!revenueBuckets[key]) revenueBuckets[key] = { label: key, rev: 0, bookings: 0, ticketSum: 0 };
      revenueBuckets[key].rev += bookingRevenue(b);
      revenueBuckets[key].bookings += 1;
      revenueBuckets[key].ticketSum += bookingRevenue(b);
    });
    const revenueSeries = Object.values(revenueBuckets)
      .map((r) => ({
        ...r,
        avg: r.bookings ? Math.round(r.ticketSum / r.bookings) : 0,
      }))
      .slice(
        -(
          revenueGrain === "Daily"
            ? 14
            : revenueGrain === "Weekly"
              ? 8
              : revenueGrain === "Yearly"
                ? 5
                : 12
        )
      );

    /* Daily bookings spark */
    const dailyMap = {};
    inPeriod.forEach((b) => {
      const d = parseDate(b.Date);
      if (!d) return;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    });
    const dailyBookings = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([k, count]) => ({ day: k.split("-").slice(1).join("/"), count }));

    const weeklyMap = {};
    inPeriod.forEach((b) => {
      const d = parseDate(b.Date);
      if (!d) return;
      const week = `W${Math.ceil(d.getDate() / 7)}-${d.getMonth() + 1}`;
      weeklyMap[week] = (weeklyMap[week] || 0) + 1;
    });
    const weekly = Object.entries(weeklyMap)
      .sort()
      .slice(-8)
      .map(([week, count]) => ({ week, count }));

    const sourceCount = {};
    inPeriod.forEach((b) => {
      const src = (b.Source || "").trim() || "Unknown";
      sourceCount[src] = (sourceCount[src] || 0) + 1;
    });
    const bySource = Object.entries(sourceCount)
      .sort(([, a], [, b]) => b - a)
      .map(([source, count]) => {
        const srcConfirmed = confirmed.filter((b) => ((b.Source || "").trim() || "Unknown") === source);
        const srcRev = srcConfirmed.reduce((s, b) => s + bookingRevenue(b), 0);
        return { source, count, revenue: srcRev, avg: srcConfirmed.length ? Math.round(srcRev / srcConfirmed.length) : 0 };
      });
    const maxSource = Math.max(...bySource.map((s) => s.count), 1);
    const bestSource = bySource[0];
    const highestSpendSource = [...bySource].sort((a, b) => b.avg - a.avg)[0];

    /* Keywords from chats (preserved) */
    const keywords = {};
    const stopWords = new Set(["i", "the", "a", "is", "my", "to", "it", "and", "of", "in", "for", "what", "how", "can", "do", "you", "me", "we"]);
    chats.forEach((c) => {
      const msg = (c["Customer Message"] || "").toLowerCase();
      msg
        .split(/[^a-z]+/)
        .filter((w) => w.length > 3 && !stopWords.has(w))
        .forEach((w) => {
          keywords[w] = (keywords[w] || 0) + 1;
        });
    });
    const topKeywords = Object.entries(keywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    /* Ops */
    const availableSlots = (slots || []).filter((s) => s.Status === "Available").length;
    const totalSlots = (slots || []).length;
    const utilised = totalSlots ? Math.round(((totalSlots - availableSlots) / totalSlots) * 100) : 0;
    const waitlistCount = (waitlist || []).length;
    const waitlistConv = waitlistCount
      ? Math.round(
          ((waitlist || []).filter((w) => {
            const phone = w.Phone || w.phone;
            return phone && bookings.some((b) => b.Phone === phone && b.Status === "Confirmed");
          }).length /
            waitlistCount) *
            100
        )
      : 0;

    const leadCount = (leads || []).length;
    const leadConv = leadCount
      ? Math.round(
          ((leads || []).filter((l) => {
            const phone = l.Phone || l.phone;
            return phone && bookings.some((b) => b.Phone === phone);
          }).length /
            leadCount) *
            100
        )
      : 0;

    /* Satisfaction proxy: retention + conversion blend */
    const satisfaction = Math.min(98, Math.round(retention * 0.55 + convRate * 0.35 + (returning > 0 ? 8 : 0)));

    /* Sparklines */
    const revSpark = sparkFromSeries(revenueSeries, "rev");
    const bookSpark = sparkFromSeries(dailyBookings.length ? dailyBookings : weekly, dailyBookings.length ? "count" : "count");

    /* AI briefing */
    const briefing = [];
    const revDelta = pctDelta(revenue, prevRevenue);
    if (revDelta !== 0) {
      briefing.push({
        text: `Revenue ${revDelta > 0 ? "increased" : "decreased"} ${Math.abs(revDelta)}% vs the prior period.`,
        tone: revDelta > 0 ? "ok" : "warn",
      });
    }
    if (topRevenueService?.revenue) {
      briefing.push({
        text: `${topRevenueService.name} generated the highest profit at ${formatRs(topRevenueService.revenue)}.`,
        tone: "ok",
      });
    }
    if (peakDay?.count > 0) {
      briefing.push({
        text: `${peakDay.full}s are consistently your busiest day (${peakDay.count} bookings).`,
        tone: "info",
      });
    }
    if (peakHour) {
      briefing.push({
        text: `Peak demand clusters around ${peakHour.hour}.`,
        tone: "info",
      });
    }
    if (availableSlots <= 3 && totalSlots > 0) {
      briefing.push({
        text: `Recommend adding Saturday slots — only ${availableSlots} open.`,
        tone: "warn",
      });
    } else if (utilised > 75) {
      briefing.push({
        text: "Capacity is tight. Consider extending evening hours.",
        tone: "warn",
      });
    }
    if (highestSpendSource && highestSpendSource.avg > avgTicket && highestSpendSource.source !== "Unknown") {
      briefing.push({
        text: `Customers from ${highestSpendSource.source} spend ${pctDelta(highestSpendSource.avg, avgTicket)}% more on average.`,
        tone: "ok",
      });
    }

    const monthlyEstimate = Math.round(revenue * (range === "30 Days" ? 1 : range === "7 Days" ? 4.3 : range === "Today" ? 30 : 1));

    /* Predictions (lightweight heuristics from current patterns) */
    const avgDaily = dailyBookings.length
      ? dailyBookings.reduce((s, d) => s + d.count, 0) / dailyBookings.length
      : inPeriod.length / 7;
    const tomorrowBookings = Math.max(1, Math.round(avgDaily * (peakDay?.count > maxDay * 0.8 ? 1.15 : 1)));
    const predictedRevenue = Math.round(tomorrowBookings * (avgTicket || 3500));
    const busyHourLabel = peakHour?.hour || "14:00";
    const staffing = utilised > 70 ? "2 technicians recommended" : utilised > 40 ? "1–2 technicians" : "1 technician sufficient";
    const marketingOpp =
      bestSource && bestSource.source !== "Unknown"
        ? `Double down on ${bestSource.source} — your top booking channel.`
        : "Promote your busiest session window this week.";
    const churnRisk =
      retention < 25 && uniqueCustomers > 5
        ? "Elevated — follow up with one-time customers."
        : retention < 40
          ? "Moderate — nurture returning guests."
          : "Low — loyalty looks healthy.";

    /* Insights per section */
    const insights = {
      revenue:
        revDelta !== 0
          ? `Revenue is ${revDelta > 0 ? "up" : "down"} ${Math.abs(revDelta)}% versus the prior period.`
          : "Revenue is holding steady versus the prior period.",
      bookings:
        peakDay?.count > 0
          ? `Bookings are ${maxDay > 0 ? Math.round(((peakDay.count - avgDaily) / Math.max(avgDaily, 1)) * 100) : 0}% higher on ${peakDay.full}s.`
          : "Booking volume will appear as appointments grow.",
      sources:
        highestSpendSource && avgTicket
          ? `Customers booking through ${highestSpendSource.source} spend ${formatRs(highestSpendSource.avg)} on average.`
          : "Source performance unlocks once attribution is captured.",
      services:
        topRevenueService
          ? `${topRevenueService.name} leads revenue with ${formatRs(topRevenueService.revenue)}.`
          : "Service mix insights appear after confirmed bookings.",
      customers:
        retention > 0
          ? `${retention}% of customers returned for another booking.`
          : "Repeat patterns emerge as the same phones book again.",
      ops:
        utilised > 0
          ? `Slot utilisation is at ${utilised}% with ${availableSlots} open.`
          : "Operational metrics appear once slots are published.",
    };

    return {
      deltaLabel,
      total: inPeriod.length,
      confirmed: confirmed.length,
      rejected: rejected.length,
      pending: pending.length,
      cancelled: cancelled.length,
      noShows: noShows.length,
      revenue,
      prevRevenue,
      revDelta: pctDelta(revenue, prevRevenue),
      bookDelta: pctDelta(inPeriod.length, inPrev.length),
      convRate,
      convDelta: pctDelta(convRate, prevConv),
      avgTicket,
      avgDelta: pctDelta(avgTicket, prevAvg),
      uniqueCustomers,
      returning,
      oneTime,
      retention,
      retDelta: pctDelta(returning, prevReturning),
      vipCount: vipInPeriod,
      satisfaction,
      satDelta: pctDelta(satisfaction, Math.min(98, Math.round((prevReturning / Math.max(Object.keys(prevPhone).length, 1)) * 100))),
      busyDays,
      maxDay,
      peakDay,
      busyHours,
      peakHour,
      services,
      topService,
      topRevenueService,
      fastest,
      longest,
      avgRepairTime,
      revenueSeries,
      dailyBookings,
      weekly,
      bySource,
      maxSource,
      bestSource,
      highestSpendSource,
      topKeywords,
      availableSlots,
      totalSlots,
      utilised,
      waitlistCount,
      waitlistConv,
      leadCount,
      leadConv,
      briefing,
      monthlyEstimate,
      predictions: {
        tomorrowBookings,
        predictedRevenue,
        busyHourLabel,
        staffing,
        marketingOpp,
        churnRisk,
      },
      insights,
      revSpark,
      bookSpark,
      warrantyClaims: Math.round(confirmed.length * 0.04),
    };
  }, [
    bookings,
    chats,
    slots,
    leads,
    waitlist,
    range,
    customStart,
    customEnd,
    serviceFilter,
    sourceFilter,
    revenueGrain,
  ]);

  const empty = !loading && bookings.length === 0;

  function openDrawer(id) {
    const map = {
      revenue: {
        title: "Revenue",
        subtitle: analytics.deltaLabel,
        value: formatRs(analytics.revenue),
        trend: analytics.revDelta,
        breakdown: analytics.services.filter((s) => s.revenue > 0).map((s) => ({ label: s.name, value: formatRs(s.revenue) })),
        series: analytics.revenueSeries.map((r) => ({ label: r.label, value: r.rev })),
        ai: analytics.insights.revenue,
        recommendations: [
          analytics.topRevenueService ? `Protect capacity for ${analytics.topRevenueService.name}.` : "Confirm pending high-value bookings first.",
          "Follow up unpaid invoices to accelerate cash.",
        ],
        related: [
          { label: "Avg. ticket", value: formatRs(analytics.avgTicket) },
          { label: "Confirmed", value: analytics.confirmed },
          { label: "Conversion", value: `${analytics.convRate}%` },
        ],
      },
      bookings: {
        title: "Bookings",
        subtitle: analytics.deltaLabel,
        value: String(analytics.total),
        trend: analytics.bookDelta,
        breakdown: [
          { label: "Confirmed", value: analytics.confirmed },
          { label: "Pending", value: analytics.pending },
          { label: "Rejected", value: analytics.rejected },
        ],
        series: (analytics.dailyBookings.length ? analytics.dailyBookings : analytics.weekly).map((d) => ({
          label: d.day || d.week,
          value: d.count,
        })),
        ai: analytics.insights.bookings,
        recommendations: [
          analytics.peakDay ? `Staff heavier on ${analytics.peakDay.full}s.` : "Publish more slots on peak days.",
          "Clear pending bookings within SLA.",
        ],
        related: [
          { label: "Peak day", value: analytics.peakDay?.full || "—" },
          { label: "Peak hour", value: analytics.peakHour?.hour || "—" },
          { label: "Utilisation", value: `${analytics.utilised}%` },
        ],
      },
      conversion: {
        title: "Conversion Rate",
        subtitle: analytics.deltaLabel,
        value: `${analytics.convRate}%`,
        trend: analytics.convDelta,
        breakdown: [
          { label: "Received", value: analytics.total },
          { label: "Confirmed", value: analytics.confirmed },
          { label: "Rejected", value: analytics.rejected },
        ],
        series: [],
        ai: `You confirm ${analytics.convRate}% of incoming requests in this period.`,
        recommendations: ["Prioritise stale pending bookings.", "Offer alternate slots before rejecting."],
        related: [
          { label: "Pending", value: analytics.pending },
          { label: "Lead conversion", value: `${analytics.leadConv}%` },
          { label: "Waitlist conversion", value: `${analytics.waitlistConv}%` },
        ],
      },
      ticket: {
        title: "Average Booking Value",
        subtitle: analytics.deltaLabel,
        value: formatRs(analytics.avgTicket),
        trend: analytics.avgDelta,
        breakdown: analytics.services.slice(0, 5).map((s) => ({
          label: s.name,
          value: formatRs(s.count ? Math.round(s.revenue / s.count) : 0),
        })),
        series: analytics.revenueSeries.map((r) => ({ label: r.label, value: r.avg })),
        ai: analytics.highestSpendSource
          ? `${analytics.highestSpendSource.source} brings the highest average tickets.`
          : "Average ticket reflects your confirmed booking mix.",
        recommendations: ["Upsell weekly packages on high-demand slots.", "Offer deposit holds for peak evening games."],
        related: [
          { label: "Revenue", value: formatRs(analytics.revenue) },
          { label: "Top service", value: analytics.topRevenueService?.name || "—" },
        ],
      },
      repeat: {
        title: "Repeat Customers",
        subtitle: analytics.deltaLabel,
        value: String(analytics.returning),
        trend: analytics.retDelta,
        breakdown: [
          { label: "Returning", value: analytics.returning },
          { label: "One-time", value: analytics.oneTime },
          { label: "VIP (3+)", value: analytics.vipCount },
        ],
        series: [],
        ai: analytics.insights.customers,
        recommendations: ["Send a rebook nudge after no-shows clear.", "Offer priority slots to VIP captains."],
        related: [
          { label: "Retention", value: `${analytics.retention}%` },
          { label: "Unique", value: analytics.uniqueCustomers },
        ],
      },
      satisfaction: {
        title: "Customer Satisfaction",
        subtitle: "Derived from retention & confirmation quality",
        value: `${analytics.satisfaction}`,
        trend: analytics.satDelta,
        breakdown: [
          { label: "Retention", value: `${analytics.retention}%` },
          { label: "Conversion", value: `${analytics.convRate}%` },
          { label: "Chats", value: chats.length },
        ],
        series: [],
        ai: "Satisfaction is estimated from repeat rate and booking confirmation quality.",
        recommendations: ["Reply to open chats within the hour.", "Confirm bookings with a clear ETA."],
        related: [
          { label: "Top topic", value: analytics.topKeywords[0]?.word || "—" },
          { label: "No-shows", value: analytics.noShows },
        ],
      },
    };
    setDrawer(map[id] || null);
  }

  function handleExport() {
    const rows = [
      {
        Period: range,
        Revenue: analytics.revenue,
        Bookings: analytics.total,
        Confirmed: analytics.confirmed,
        Conversion: `${analytics.convRate}%`,
        AvgTicket: analytics.avgTicket,
        Retention: `${analytics.retention}%`,
        Satisfaction: analytics.satisfaction,
        Utilisation: `${analytics.utilised}%`,
      },
      ...analytics.services.map((s) => ({
        Period: range,
        Service: s.name,
        Bookings: s.count,
        Revenue: s.revenue,
      })),
    ];
    exportToCSV(rows, `analytics-${range.replace(/\s+/g, "-").toLowerCase()}.csv`);
  }

  function handlePdf() {
    window.print();
  }

  if (loading) return <AnalyticsSkeleton t={t} />;

  const headerActions = (
    <>
      <button
        type="button"
        className="ui-press"
        onClick={handleExport}
        style={{
          ...secondaryBtnStyle(t),
          padding: "0 14px",
          height: 36,
          fontSize: 13,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "inherit",
        }}
      >
        <Download size={14} strokeWidth={1.75} />
        Export Report
      </button>
      <button
        type="button"
        className="ui-press"
        onClick={handlePdf}
        style={{
          ...secondaryBtnStyle(t),
          padding: "0 14px",
          height: 36,
          fontSize: 13,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "inherit",
        }}
      >
        <FileText size={14} strokeWidth={1.75} />
        Download PDF
      </button>
    </>
  );

  if (empty) {
    return (
      <PageShell title="Analytics" subtitle="Understand the performance of your arena." actions={headerActions}>
        <EmptyState
          illustration="default"
          title="Reports will appear as you get more bookings."
          subtitle="Bookings, invoices and conversations automatically generate insights."
        />
      </PageShell>
    );
  }

  return (
    <PageShell title="Analytics" subtitle="Understand the performance of your arena." actions={headerActions} wide>
      <style>{`
        .an-exec { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .an-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .an-3col { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .an-section { margin-bottom: 56px; }
        .an-funnel { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .an-loyalty { display: grid; grid-template-columns: 160px 1fr; gap: 24px; align-items: center; }
        @media (max-width: 1100px) {
          .an-exec { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 768px) {
          .an-exec, .an-2col, .an-3col, .an-funnel { grid-template-columns: 1fr; }
          .an-loyalty { grid-template-columns: 1fr; }
        }
        @media print {
          .an-no-print { display: none !important; }
          .page-shell { padding: 0 !important; max-width: none !important; }
        }
      `}</style>

      {/* View tabs */}
      <div
        className="an-no-print"
        style={{ marginBottom: 32, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}
      >
        <SegmentedControl options={VIEW_TABS} value={view} onChange={setView} layoutId="analyticsView" />
      </div>

      {/* Filters */}
      <div className="an-no-print" style={{ marginBottom: 48, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
          <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} layoutId="analyticsRange" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <FilterSelect label="Service" value={serviceFilter} onChange={setServiceFilter} options={serviceOptions} t={t} />
            <FilterSelect label="Source" value={sourceFilter} onChange={setSourceFilter} options={sourceOptions} t={t} />
          </div>
        </div>
        {range === "Custom" && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Calendar size={14} color={t.textMuted} strokeWidth={1.75} />
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: radius.sm,
                border: `1px solid ${t.border}`,
                background: t.inputBg || t.cardBg,
                color: t.textPrimary,
                fontFamily: "inherit",
                fontSize: 13,
              }}
            />
            <span style={{ color: t.textMuted, fontSize: 13 }}>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: radius.sm,
                border: `1px solid ${t.border}`,
                background: t.inputBg || t.cardBg,
                color: t.textPrimary,
                fontFamily: "inherit",
                fontSize: 13,
              }}
            />
          </div>
        )}
      </div>

      {view === "Overview" && (
      <>
      {/* Executive Summary */}
      <section className="an-section">
        <SectionHeader title="Executive Summary" subtitle="Shop health at a glance." t={t} />
        <div className="an-exec ds-stagger">
          <ExecKpi
            label="Revenue"
            value={formatCompact(analytics.revenue)}
            prefix="Rs"
            trend={analytics.revDelta}
            spark={analytics.revSpark}
            sparkColor={ACCENT}
            onClick={() => openDrawer("revenue")}
            t={t}
          />
          <ExecKpi
            label="Bookings"
            value={analytics.total}
            trend={analytics.bookDelta}
            spark={analytics.bookSpark}
            sparkColor={ACCENT}
            onClick={() => openDrawer("bookings")}
            t={t}
          />
          <ExecKpi
            label="Conversion Rate"
            value={`${analytics.convRate}%`}
            trend={analytics.convDelta}
            spark={[analytics.convRate - 8, analytics.convRate - 3, analytics.convRate, analytics.convRate + 2, analytics.convRate]}
            onClick={() => openDrawer("conversion")}
            t={t}
          />
          <ExecKpi
            label="Average Repair Value"
            value={formatCompact(analytics.avgTicket)}
            prefix="Rs"
            trend={analytics.avgDelta}
            spark={sparkFromSeries(analytics.revenueSeries, "avg")}
            onClick={() => openDrawer("ticket")}
            t={t}
          />
          <ExecKpi
            label="Repeat Customers"
            value={analytics.returning}
            trend={analytics.retDelta}
            spark={[analytics.oneTime, analytics.returning, analytics.vipCount, analytics.returning]}
            onClick={() => openDrawer("repeat")}
            t={t}
          />
          <ExecKpi
            label="Customer Satisfaction"
            value={analytics.satisfaction}
            trend={analytics.satDelta}
            spark={[analytics.satisfaction - 4, analytics.satisfaction - 1, analytics.satisfaction, analytics.satisfaction + 1]}
            onClick={() => openDrawer("satisfaction")}
            t={t}
          />
        </div>
      </section>

      {/* AI Business Insights */}
      <section className="an-section">
        <SectionHeader title="AI Business Insights" subtitle="What matters right now." t={t} />
        <Panel t={t} style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "32px 32px 28px", borderBottom: `1px solid ${t.borderSub || t.border}` }}>
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
              Briefing
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: -0.5,
                color: t.textPrimary,
                lineHeight: 1.35,
                maxWidth: 720,
              }}
            >
              {analytics.briefing[0]?.text || "Everything looks good."}
            </p>
            <div style={{ marginTop: 24, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: t.textMuted }}>Estimated monthly revenue</span>
              <span className="font-mono-data" style={{ fontSize: 28, fontWeight: 500, letterSpacing: -1, color: t.textPrimary }}>
                {formatRs(analytics.monthlyEstimate)}
              </span>
            </div>
          </div>
          <div style={{ padding: "8px 32px 28px" }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {analytics.briefing.slice(0, 5).map((item, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    padding: "14px 0",
                    borderBottom: i < Math.min(analytics.briefing.length, 5) - 1 ? `1px solid ${t.borderSub || t.border}` : "none",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      marginTop: 7,
                      flexShrink: 0,
                      background: item.tone === "ok" ? "#059669" : item.tone === "warn" ? t.warning || "#F59E0B" : BRAND,
                    }}
                  />
                  <span style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.5 }}>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </section>
      </>
      )}

      {view === "Revenue" && (
      <>
      {/* Revenue Analytics */}
      <section className="an-section">
        <SectionHeader
          title="Revenue Analytics"
          subtitle="What money came in — and from where."
          t={t}
          action={
            <div className="an-no-print">
              <SegmentedControl options={REVENUE_GRAINS} value={revenueGrain} onChange={setRevenueGrain} layoutId="revGrain" />
            </div>
          }
        />
        <Panel t={t}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
                {revenueGrain} revenue
              </div>
              <div className="font-mono-data" style={{ fontSize: 36, fontWeight: 500, letterSpacing: -1.6, color: t.textPrimary, lineHeight: 1 }}>
                {formatRs(analytics.revenue)}
              </div>
            </div>
            <div style={{ fontSize: 13, color: t.textMuted }}>
              {analytics.confirmed} confirmed · avg {formatRs(analytics.avgTicket)}
            </div>
          </div>
          {analytics.revenueSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={analytics.revenueSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.textMuted }} axisLine={false} tickLine={false} dy={8} />
                <YAxis
                  tick={{ fontSize: 11, fill: t.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v) => formatCompact(v)}
                />
                <Tooltip
                  content={(props) => (
                    <ChartTooltipBox
                      {...props}
                      t={t}
                      rows={(payload) => {
                        const row = payload[0]?.payload;
                        return [
                          { label: "Revenue", value: formatRs(row?.rev) },
                          { label: "Bookings", value: row?.bookings ?? 0 },
                          { label: "Avg ticket", value: formatRs(row?.avg) },
                        ];
                      }}
                    />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="rev"
                  stroke={ACCENT}
                  strokeWidth={2}
                  fill={ACCENT}
                  fillOpacity={0.08}
                  animationDuration={200}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>
              No revenue in this period
            </div>
          )}
          <KeyInsight text={analytics.insights.revenue} t={t} />
        </Panel>

        <div className="an-2col" style={{ marginTop: 16 }}>
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 20, letterSpacing: -0.2 }}>
              Revenue by service
            </div>
            {analytics.services.filter((s) => s.revenue > 0).length > 0 ? (
              analytics.services
                .filter((s) => s.revenue > 0)
                .slice(0, 6)
                .map((s) => (
                  <div
                    key={s.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 0",
                      borderBottom: `1px solid ${t.borderSub || t.border}`,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{s.count} bookings</div>
                    </div>
                    <div className="font-mono-data" style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>
                      {formatRs(s.revenue)}
                    </div>
                  </div>
                ))
            ) : (
              <div style={{ color: t.textMuted, fontSize: 13, padding: "32px 0", textAlign: "center" }}>No confirmed revenue yet</div>
            )}
            <KeyInsight text={analytics.insights.services} t={t} />
          </Panel>
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 20, letterSpacing: -0.2 }}>
              Snapshot
            </div>
            {[
              { label: "Confirmed revenue", value: formatRs(analytics.revenue) },
              { label: "Conversion rate", value: `${analytics.convRate}%` },
              { label: "Average ticket", value: formatRs(analytics.avgTicket) },
              { label: "Highest earner", value: analytics.topRevenueService?.name || "—" },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 0",
                  borderBottom: `1px solid ${t.borderSub || t.border}`,
                }}
              >
                <span style={{ fontSize: 13, color: t.textSecondary }}>{row.label}</span>
                <span className="font-mono-data" style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>
                  {row.value}
                </span>
              </div>
            ))}
          </Panel>
        </div>
      </section>
      </>
      )}

      {view === "Bookings" && (
      <>
      {/* Bookings Analytics */}
      <section className="an-section">
        <SectionHeader title="Bookings Analytics" subtitle="When demand arrives — and how it converts." t={t} />
        <div className="an-2col" style={{ marginBottom: 16 }}>
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 20 }}>Bookings per day</div>
            {(analytics.dailyBookings.length ? analytics.dailyBookings : analytics.weekly).length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.dailyBookings.length ? analytics.dailyBookings : analytics.weekly} barSize={18}>
                  <CartesianGrid strokeDasharray="3 6" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey={analytics.dailyBookings.length ? "day" : "week"}
                    tick={{ fontSize: 10, fill: t.textMuted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: t.textMuted }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip {...tip} />
                  <Bar dataKey="count" fill={ACCENT} radius={[6, 6, 0, 0]} animationDuration={200} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>
                No bookings yet
              </div>
            )}
            <KeyInsight text={analytics.insights.bookings} t={t} />
          </Panel>
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 20 }}>Peak hours</div>
            {analytics.busyHours.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.busyHours} barSize={16}>
                  <CartesianGrid strokeDasharray="3 6" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: t.textMuted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: t.textMuted }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip {...tip} />
                  <Bar dataKey="count" fill={ACCENT} radius={[6, 6, 0, 0]} animationDuration={200} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>
                No time data yet
              </div>
            )}
            <KeyInsight
              text={
                analytics.peakHour
                  ? `Demand peaks around ${analytics.peakHour.hour} with ${analytics.peakHour.count} bookings.`
                  : null
              }
              t={t}
            />
          </Panel>
        </div>

        <div className="an-2col" style={{ marginBottom: 16 }}>
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 20 }}>Peak days</div>
            {analytics.busyDays.map((d) => (
              <HBar key={d.day} label={d.full} value={d.count} max={analytics.maxDay} color={ACCENT} t={t} />
            ))}
          </Panel>
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 20 }}>Service distribution</div>
            {analytics.services.length > 0 ? (
              analytics.services.slice(0, 6).map((s) => (
                <HBar
                  key={s.name}
                  label={s.name}
                  value={s.count}
                  max={analytics.services[0].count}
                  color={ACCENT}
                  t={t}
                />
              ))
            ) : (
              <div style={{ color: t.textMuted, fontSize: 13, padding: "40px 0", textAlign: "center" }}>No services yet</div>
            )}
          </Panel>
        </div>

        <div className="an-2col">
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 20 }}>Booking sources</div>
            {analytics.bySource.length > 0 ? (
              analytics.bySource.map((s) => (
                <HBar key={s.source} label={s.source} value={s.count} max={analytics.maxSource} color={ACCENT} t={t} />
              ))
            ) : (
              <div style={{ color: t.textMuted, fontSize: 13, padding: "40px 0", textAlign: "center" }}>No source data yet</div>
            )}
            <KeyInsight text={analytics.insights.sources} t={t} />
          </Panel>
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 20 }}>Conversion funnel</div>
            <div className="an-funnel">
              {[
                { label: "Received", value: analytics.total, pct: 100 },
                {
                  label: "Confirmed",
                  value: analytics.confirmed,
                  pct: analytics.total ? Math.round((analytics.confirmed / analytics.total) * 100) : 0,
                },
                {
                  label: "Rejected",
                  value: analytics.rejected,
                  pct: analytics.total ? Math.round((analytics.rejected / analytics.total) * 100) : 0,
                },
              ].map((f) => (
                <div
                  key={f.label}
                  style={{
                    padding: 20,
                    borderRadius: radius.md,
                    border: `1px solid ${t.border}`,
                    background: t.name === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.03)",
                  }}
                >
                  <div className="font-mono-data" style={{ fontSize: 28, fontWeight: 500, letterSpacing: -1, color: t.textPrimary }}>
                    {f.value}
                  </div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>{f.label}</div>
                  <div style={{ marginTop: 14, height: 4, borderRadius: 2, background: t.border }}>
                    <div style={{ height: "100%", width: `${f.pct}%`, borderRadius: 2, background: ACCENT }} />
                  </div>
                  <div className="font-mono-data" style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>
                    {f.pct}%
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
      </>
      )}

      {view === "Customers" && (
      <>
      {/* Customer Analytics */}
      <section className="an-section">
        <SectionHeader title="Customer Analytics" subtitle="Who returns — and who is most valuable." t={t} />
        <div className="an-3col" style={{ marginBottom: 16 }}>
          <MetricTile label="New customers" value={analytics.oneTime} sub="First-time in period" t={t} />
          <MetricTile label="Returning" value={analytics.returning} sub={`${analytics.retention}% repeat rate`} t={t} />
          <MetricTile label="VIP customers" value={analytics.vipCount} sub="3+ lifetime visits" t={t} />
        </div>
        <div className="an-2col">
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 8 }}>Loyalty mix</div>
            <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 20 }}>Returning vs one-time</div>
            <div className="an-loyalty">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Returning", value: analytics.returning || 0 },
                      { name: "One-time", value: analytics.oneTime || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={ACCENT} />
                    <Cell fill={dark ? "rgba(255,255,255,0.12)" : "rgba(15,17,21,0.10)"} />
                  </Pie>
                  <Tooltip {...tip} />
                </PieChart>
              </ResponsiveContainer>
              <div>
                {[
                  [ACCENT, "Returning", analytics.returning],
                  [dark ? "rgba(255,255,255,0.25)" : "rgba(15,17,21,0.2)", "One-time", analytics.oneTime],
                ].map(([c, l, v]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary }}>{l}</div>
                      <div style={{ fontSize: 12, color: t.textMuted }}>{v} customers</div>
                    </div>
                    <div className="font-mono-data" style={{ fontSize: 16, fontWeight: 500, color: t.textPrimary }}>
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <KeyInsight text={analytics.insights.customers} t={t} />
          </Panel>
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 20 }}>Acquisition</div>
            {[
              { label: "Lead conversion", value: `${analytics.leadConv}%`, sub: `${analytics.leadCount} leads` },
              { label: "Repeat rate", value: `${analytics.retention}%`, sub: `${analytics.returning} returning` },
              { label: "Top referral source", value: analytics.bestSource?.source || "—", sub: analytics.bestSource ? `${analytics.bestSource.count} bookings` : "—" },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  padding: "16px 0",
                  borderBottom: `1px solid ${t.borderSub || t.border}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontSize: 13, color: t.textSecondary }}>{row.label}</span>
                  <span className="font-mono-data" style={{ fontSize: 18, fontWeight: 500, color: t.textPrimary }}>
                    {row.value}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>{row.sub}</div>
              </div>
            ))}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, marginBottom: 12 }}>Referral sources</div>
              {analytics.bySource.slice(0, 4).map((s) => (
                <HBar key={s.source} label={s.source} value={s.count} max={analytics.maxSource} color={ACCENT} t={t} right={`${s.count}`} />
              ))}
            </div>
          </Panel>
        </div>
      </section>
      </>
      )}

      {view === "Services" && (
      <>
      {/* Service Analytics */}
      <section className="an-section">
        <SectionHeader title="Service Analytics" subtitle="Which sessions carry the business." t={t} />
        <div className="an-3col" style={{ marginBottom: 16 }}>
          <MetricTile label="Most popular" value={analytics.topService?.name || "—"} sub={analytics.topService ? `${analytics.topService.count} bookings` : undefined} t={t} />
          <MetricTile label="Highest revenue" value={analytics.topRevenueService?.name || "—"} sub={analytics.topRevenueService ? formatRs(analytics.topRevenueService.revenue) : undefined} t={t} />
          <MetricTile label="Avg. session time" value={analytics.avgRepairTime ? `${analytics.avgRepairTime}m` : "—"} sub="Typical pitch block" t={t} />
        </div>
        <div className="an-2col">
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 20 }}>Repair profile</div>
            {[
              { label: "Fastest session", value: analytics.fastest?.name || "—", sub: analytics.fastest ? `~${analytics.fastest.avgTime} min` : "" },
              { label: "Longest session", value: analytics.longest?.name || "—", sub: analytics.longest ? `~${analytics.longest.avgTime} min` : "" },
              { label: "Warranty claims", value: String(analytics.warrantyClaims), sub: "Estimated from confirmed volume" },
            ].map((row) => (
              <div key={row.label} style={{ padding: "14px 0", borderBottom: `1px solid ${t.borderSub || t.border}` }}>
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>{row.label}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: t.textPrimary }}>{row.value}</div>
                {row.sub && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>{row.sub}</div>}
              </div>
            ))}
            <KeyInsight
              text={
                analytics.topRevenueService
                  ? `${analytics.topRevenueService.name} carries the highest profit contribution.`
                  : null
              }
              t={t}
            />
          </Panel>
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 20 }}>Volume vs revenue</div>
            {analytics.services.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.services.slice(0, 6)} barSize={20} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: t.textMuted }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: t.textMuted }} axisLine={false} tickLine={false} />
                  <Tooltip {...tip} formatter={(v, name) => [name === "revenue" ? formatRs(v) : v, name === "revenue" ? "Revenue" : "Count"]} />
                  <Bar dataKey="count" fill={ACCENT} radius={[0, 6, 6, 0]} animationDuration={200} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>
                No service data
              </div>
            )}
          </Panel>
        </div>
      </section>
      </>
      )}

      {view === "Operations" && (
      <>
      {/* Operational Analytics */}
      <section className="an-section">
        <SectionHeader title="Operational Analytics" subtitle="Capacity, workload, and leakage." t={t} />
        <div className="an-3col" style={{ marginBottom: 16 }}>
          <MetricTile label="Available slots" value={analytics.availableSlots} sub={`of ${analytics.totalSlots} total`} t={t} />
          <MetricTile label="Utilisation" value={`${analytics.utilised}%`} sub="Booked vs published" t={t} />
          <MetricTile label="Technician workload" value={analytics.utilised > 70 ? "High" : analytics.utilised > 40 ? "Balanced" : "Light"} sub={analytics.predictions.staffing} t={t} />
        </div>
        <div className="an-3col">
          <MetricTile label="Cancelled" value={analytics.cancelled} sub="Rejected / cancelled" t={t} />
          <MetricTile label="No shows" value={analytics.noShows} sub="Missed appointments" t={t} />
          <MetricTile label="Waitlist conversion" value={`${analytics.waitlistConv}%`} sub={`${analytics.waitlistCount} on waitlist`} t={t} />
        </div>
        <Panel t={t} style={{ marginTop: 16 }}>
          <KeyInsight text={analytics.insights.ops} t={t} />
          {analytics.topKeywords.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, marginBottom: 12 }}>Conversation themes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {analytics.topKeywords.slice(0, 8).map((k) => (
                  <span
                    key={k.word}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${t.border}`,
                      color: t.textSecondary,
                      background: t.name === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.03)",
                      textTransform: "capitalize",
                    }}
                  >
                    {k.word}
                    <span className="font-mono-data" style={{ marginLeft: 6, color: t.textMuted }}>
                      {k.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </section>

      {/* Peak demand — operational */}
      <section className="an-section">
        <SectionHeader title="Peak Demand" subtitle="When the floor is busiest." t={t} />
        <div className="an-2col" style={{ marginBottom: 16 }}>
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 20 }}>Peak hours</div>
            {analytics.busyHours.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.busyHours} barSize={16}>
                  <CartesianGrid strokeDasharray="3 6" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: t.textMuted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: t.textMuted }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip {...tip} />
                  <Bar dataKey="count" fill={ACCENT} radius={[6, 6, 0, 0]} animationDuration={200} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>
                No time data yet
              </div>
            )}
            <KeyInsight
              text={
                analytics.peakHour
                  ? `Demand peaks around ${analytics.peakHour.hour} with ${analytics.peakHour.count} bookings.`
                  : null
              }
              t={t}
            />
          </Panel>
          <Panel t={t}>
            <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 20 }}>Peak days</div>
            {analytics.busyDays.map((d) => (
              <HBar key={d.day} label={d.full} value={d.count} max={analytics.maxDay} color={ACCENT} t={t} />
            ))}
            <KeyInsight text={analytics.insights.bookings} t={t} />
          </Panel>
        </div>
      </section>
      </>
      )}

      {view === "Predictions" && (
      <>
      {/* AI Predictions */}
      <section className="an-section" style={{ marginBottom: 24 }}>
        <SectionHeader title="Predictions" subtitle="What tomorrow likely looks like." t={t} />
        <Panel t={t} style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "28px 32px", borderBottom: `1px solid ${t.borderSub || t.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 16 }}>
              Outlook
            </div>
            <div className="an-2col">
              <div>
                <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 8 }}>Expected bookings tomorrow</div>
                <div className="font-mono-data" style={{ fontSize: 36, fontWeight: 500, letterSpacing: -1.4, color: t.textPrimary }}>
                  {analytics.predictions.tomorrowBookings}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 8 }}>Predicted revenue</div>
                <div className="font-mono-data" style={{ fontSize: 36, fontWeight: 500, letterSpacing: -1.4, color: t.textPrimary }}>
                  {formatRs(analytics.predictions.predictedRevenue)}
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: "8px 32px 28px" }}>
            {[
              { label: "Expected busy hours", value: analytics.predictions.busyHourLabel },
              { label: "Recommended staffing", value: analytics.predictions.staffing },
              { label: "Marketing opportunity", value: analytics.predictions.marketingOpp },
              { label: "Potential churn", value: analytics.predictions.churnRisk },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 24,
                  padding: "16px 0",
                  borderBottom: i < arr.length - 1 ? `1px solid ${t.borderSub || t.border}` : "none",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 13, color: t.textMuted, minWidth: 160 }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, textAlign: "right", flex: 1 }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </section>
      </>
      )}

      {/* Detail drawer */}
      <Sheet
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={drawer?.title || ""}
        subtitle={drawer?.subtitle}
        width={440}
        footer={
          <button
            type="button"
            className="ui-press"
            onClick={() => setDrawer(null)}
            style={{ ...secondaryBtnStyle(t), padding: "10px 14px", fontSize: 13, fontFamily: "inherit", marginLeft: "auto" }}
          >
            Close
          </button>
        }
      >
        {drawer && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div className="font-mono-data" style={{ fontSize: 40, fontWeight: 500, letterSpacing: -1.8, color: t.textPrimary, lineHeight: 1 }}>
                {drawer.value}
              </div>
              {drawer.trend != null && (
                <div style={{ marginTop: 8, fontSize: 13, color: drawer.trend > 0 ? "#059669" : t.textMuted }}>
                  {drawer.trend === 0 ? "Steady" : `${drawer.trend > 0 ? "+" : ""}${drawer.trend}%`} {drawer.subtitle}
                </div>
              )}
            </div>

            {drawer.series?.length > 0 && (
              <DrawerSection title="Historical trend" t={t}>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={drawer.series}>
                    <CartesianGrid strokeDasharray="3 6" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.textMuted }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip {...tip} />
                    <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} dot={false} animationDuration={200} />
                  </LineChart>
                </ResponsiveContainer>
              </DrawerSection>
            )}

            {drawer.breakdown?.length > 0 && (
              <DrawerSection title="Breakdown" t={t}>
                {drawer.breakdown.map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: `1px solid ${t.borderSub || t.border}`,
                    }}
                  >
                    <span style={{ fontSize: 13, color: t.textSecondary }}>{row.label}</span>
                    <span className="font-mono-data" style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </DrawerSection>
            )}

            <DrawerSection title="AI explanation" t={t}>
              <p style={{ margin: 0, fontSize: 14, color: t.textSecondary, lineHeight: 1.55 }}>{drawer.ai}</p>
            </DrawerSection>

            <DrawerSection title="Recommendations" t={t}>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {(drawer.recommendations || []).map((r, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 13,
                      color: t.textSecondary,
                      padding: "10px 0",
                      borderBottom: i < drawer.recommendations.length - 1 ? `1px solid ${t.borderSub || t.border}` : "none",
                      display: "flex",
                      gap: 10,
                    }}
                  >
                    <span style={{ color: BRAND, flexShrink: 0 }}>→</span>
                    {r}
                  </li>
                ))}
              </ul>
            </DrawerSection>

            {drawer.related?.length > 0 && (
              <DrawerSection title="Related metrics" t={t}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {drawer.related.map((r) => (
                    <div
                      key={r.label}
                      style={{
                        padding: 14,
                        borderRadius: radius.sm,
                        border: `1px solid ${t.border}`,
                        background: t.name === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.03)",
                      }}
                    >
                      <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 6 }}>{r.label}</div>
                      <div className="font-mono-data" style={{ fontSize: 16, fontWeight: 500, color: t.textPrimary }}>
                        {r.value}
                      </div>
                    </div>
                  ))}
                </div>
              </DrawerSection>
            )}
          </div>
        )}
      </Sheet>
    </PageShell>
  );
}
