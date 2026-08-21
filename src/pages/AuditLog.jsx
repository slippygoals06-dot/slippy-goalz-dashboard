import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  CalendarPlus,
  CalendarCheck,
  CalendarX,
  FileText,
  CreditCard,
  UserPlus,
  Clock,
  Bot,
  LogIn,
  LogOut,
  KeyRound,
  Settings,
  Shield,
  Trash2,
  AlertCircle,
  ArrowRight,
  User,
  Globe,
  Monitor,
  MapPin,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import {
  useTheme,
  cardStyle,
  cardHoverProps,
  primaryBtnStyle,
  primaryBtnHoverProps,
  secondaryBtnStyle,
} from "../context/ThemeContext";
import EmptyState from "../components/EmptyState";
import PageShell from "../components/PageShell";
import SegmentedControl from "../components/SegmentedControl";
import Sheet from "../components/Sheet";
import { SkeletonBlock } from "../components/Skeleton";
import { exportToCSV } from "../utils/export";
import { getAuditEvents } from "../api";
import { spacing, radius, duration, ease, color } from "../design-system/tokens";

/* ── Action catalogue ────────────────────────────────────────────────────── */

const ACTION_META = {
  confirmed: {
    label: "Booking Confirmed",
    category: "Bookings",
    status: "Success",
    icon: CalendarCheck,
  },
  rejected: {
    label: "Booking Rejected",
    category: "Bookings",
    status: "Warning",
    icon: CalendarX,
  },
  no_show: {
    label: "Marked No-show",
    category: "Bookings",
    status: "Warning",
    icon: CalendarX,
  },
  deleted: {
    label: "Record Deleted",
    category: "Bookings",
    status: "Failed",
    icon: Trash2,
  },
  payment_changed: {
    label: "Payment Updated",
    category: "Payments",
    status: "Success",
    icon: CreditCard,
  },
  completed_invoiced: {
    label: "Invoice Created",
    category: "Invoices",
    status: "Success",
    icon: FileText,
  },
  invoice_status_changed: {
    label: "Invoice Updated",
    category: "Invoices",
    status: "Success",
    icon: FileText,
  },
  booking_created: {
    label: "Booking Created",
    category: "Bookings",
    status: "Success",
    icon: CalendarPlus,
  },
  booking_updated: {
    label: "Booking Updated",
    category: "Bookings",
    status: "Success",
    icon: CalendarCheck,
  },
  customer_added: {
    label: "Customer Added",
    category: "Customers",
    status: "Success",
    icon: UserPlus,
  },
  slot_changed: {
    label: "Slot Changed",
    category: "Bookings",
    status: "Success",
    icon: Clock,
  },
  ai_booking: {
    label: "AI Booking",
    category: "AI",
    status: "System",
    icon: Bot,
  },
  login: {
    label: "Login",
    category: "Security",
    status: "Success",
    icon: LogIn,
  },
  logout: {
    label: "Logout",
    category: "Security",
    status: "System",
    icon: LogOut,
  },
  password_changed: {
    label: "Password Changed",
    category: "Security",
    status: "Warning",
    icon: KeyRound,
  },
  settings_updated: {
    label: "Settings Updated",
    category: "Settings",
    status: "Success",
    icon: Settings,
  },
  role_changed: {
    label: "Role Changed",
    category: "Users",
    status: "Warning",
    icon: Shield,
  },
  exported_data: {
    label: "Data Exported",
    category: "Security",
    status: "System",
    icon: Download,
  },
};

const ENTITY_FILTERS = [
  "All",
  "Bookings",
  "Invoices",
  "Payments",
  "Customers",
  "Users",
  "Security",
  "AI",
  "Settings",
];

const STATUS_FILTERS = ["All Status", "Success", "Warning", "Failed", "Pending", "System"];

const STATUS_PILL = {
  Success: { bg: "#ECFDF5", color: "#047857", ring: "#A7F3D0" },
  Warning: { bg: "#FFFBEB", color: "#B45309", ring: "#FDE68A" },
  Failed: { bg: "#FFF1F2", color: "#BE123C", ring: "#FECDD3" },
  Pending: { bg: "#F8FAFC", color: "#475569", ring: "#E2E8F0" },
  System: { bg: "#F1F5F9", color: "#475569", ring: "#E2E8F0" },
};

const STATUS_PILL_DARK = {
  Success: { bg: "rgba(34,197,94,0.12)", color: "#22C55E", ring: "rgba(34,197,94,0.24)" },
  Warning: { bg: "rgba(245,158,11,0.12)", color: "#F59E0B", ring: "rgba(245,158,11,0.24)" },
  Failed: { bg: "rgba(244,63,94,0.12)", color: "#F43F5E", ring: "rgba(244,63,94,0.24)" },
  Pending: { bg: "rgba(255,255,255,0.04)", color: "#94A3B8", ring: "rgba(255,255,255,0.08)" },
  System: { bg: "rgba(255,255,255,0.04)", color: "#94A3B8", ring: "rgba(255,255,255,0.08)" },
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function resolveMeta(action) {
  if (ACTION_META[action]) return ACTION_META[action];
  const raw = String(action || "unknown").replace(/_/g, " ");
  const label = raw.charAt(0).toUpperCase() + raw.slice(1);
  return {
    label,
    category: "All",
    status: /fail|error|delete|reject/i.test(action || "")
      ? "Failed"
      : /warn|password|role/i.test(action || "")
        ? "Warning"
        : "Success",
    icon: Shield,
  };
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatFullDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatFullTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupLabel(iso, now = new Date()) {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d)) return "Older";
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const day = startOfDay(d);
  if (day.getTime() === today.getTime()) return "Today";
  if (day.getTime() === yesterday.getTime()) return "Yesterday";
  if (day >= weekAgo) return "This Week";
  return "Older";
}

function customerLabel(event) {
  const details = event.details || {};
  if (details.name) return details.name;
  if (details.invoice_number) return details.invoice_number;
  return null;
}

function entityId(event) {
  return event.booking_id || event.invoice_id || null;
}

function entityType(event) {
  if (event.booking_id) return "Booking";
  if (event.invoice_id) return "Invoice";
  return "System";
}

const AUDIT_SETUP_SQL = `-- Server-side audit trail for staff booking/invoice actions
-- Run once in Supabase SQL Editor, then click Retry on Audit Log

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL
    CHECK (action IN (
      'confirmed',
      'rejected',
      'deleted',
      'payment_changed',
      'completed_invoiced',
      'invoice_status_changed',
      'no_show'
    )),
  booking_id TEXT,
  invoice_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_booking_id ON audit_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.audit_events FROM anon;
REVOKE ALL ON TABLE public.audit_events FROM authenticated;

NOTIFY pgrst, 'reload schema';
`;

function friendlyError(raw) {
  const msg = String(raw || "");
  if (/PGRST205|relation.*does not exist|Could not find the table|schema cache/i.test(msg)) {
    return {
      title: "Audit log needs a one-time setup",
      summary:
        "The audit_events table is missing in Supabase. Copy the SQL below, run it in the Supabase SQL Editor, then retry.",
      setup: true,
    };
  }
  if (/Failed to fetch|NetworkError|network/i.test(msg)) {
    return {
      title: "Connection interrupted",
      summary: "We couldn’t reach the server. Check your connection and try again.",
      setup: false,
    };
  }
  return {
    title: "Couldn’t load audit log",
    summary: "Something went wrong while loading the activity trail.",
    setup: false,
  };
}

function sparkFromCounts(counts) {
  if (!counts.length) return [0, 0, 0, 0, 0, 0, 0];
  return counts;
}

function MiniSparkline({ data = [], color: stroke, height = 28, width = 88 }) {
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
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} opacity={0.85} />
    </svg>
  );
}

/* ── UI atoms ────────────────────────────────────────────────────────────── */

function ExecKpi({ label, value, trend, spark, sparkColor, t }) {
  const hover = cardHoverProps(t);
  const flat = trend == null || trend === 0;
  const up = typeof trend === "number" && trend > 0;
  const trendText = trend == null ? null : flat ? "Steady" : `${up ? "+" : ""}${trend}%`;

  return (
    <div
      className="ds-card-enter"
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: radius.lg,
        boxShadow: t.cardShadow,
        padding: "28px 24px 24px",
        minHeight: 140,
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
        {trendText != null && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: !flat && up ? "#059669" : t.textMuted,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {trendText}
          </div>
        )}
        <MiniSparkline data={spark} color={sparkColor || t.chart || "#64748B"} />
      </div>
    </div>
  );
}

function StatusPill({ status, dark }) {
  const map = dark ? STATUS_PILL_DARK : STATUS_PILL;
  const cfg = map[status] || map.System;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 500,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.ring}`,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      {status}
    </span>
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

function MetaRow({ icon: Icon, label, value, t }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 0",
        borderBottom: `1px solid ${t.borderSub || t.border}`,
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)",
          color: t.textMuted,
          flexShrink: 0,
        }}
      >
        <Icon size={14} strokeWidth={1.75} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, wordBreak: "break-word" }}>
          {value || "—"}
        </div>
      </div>
    </div>
  );
}

function ChangeCompare({ from, to, t }) {
  if (from == null && to == null) return null;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          padding: 16,
          borderRadius: radius.md,
          border: `1px solid ${t.border}`,
          background: t.name === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.03)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: t.textMuted,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Before
        </div>
        <div className="font-mono-data" style={{ fontSize: 15, fontWeight: 500, color: t.textSecondary }}>
          {from == null || from === "" ? "—" : String(from)}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", color: t.textMuted }}>
        <ArrowRight size={16} strokeWidth={1.75} />
      </div>
      <div
        style={{
          padding: 16,
          borderRadius: radius.md,
          border: `1px solid ${t.accentSoftBorder || color.brand.softBorder}`,
          background: t.name === "dark" ? color.brand.softAlpha : color.brand.soft,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: t.textMuted,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          After
        </div>
        <div className="font-mono-data" style={{ fontSize: 15, fontWeight: 500, color: t.accentSolid || t.accent }}>
          {to == null || to === "" ? "—" : String(to)}
        </div>
      </div>
    </div>
  );
}

function AuditSkeleton({ t }) {
  return (
    <PageShell title="Audit Log" subtitle="See important actions taken in your account.">
      <style>{`
        .sk-wave{position:relative;overflow:hidden;background:${t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"};border:1px solid ${t.border}}
        .sk-wave::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,${t.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)"},transparent);animation:skWave 1.4s ease-in-out infinite}
        @keyframes skWave{100%{transform:translateX(100%)}}
        @media(prefers-reduced-motion:reduce){.sk-wave::after{animation:none}}
      `}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 40 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} height={140} radius={18} style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
      <SkeletonBlock height={160} radius={18} style={{ marginBottom: 32 }} />
      <SkeletonBlock height={48} radius={12} style={{ marginBottom: 16 }} />
      <SkeletonBlock height={40} radius={10} style={{ marginBottom: 32 }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <SkeletonBlock key={i} height={88} radius={14} style={{ marginBottom: 12, animationDelay: `${i * 50}ms` }} />
      ))}
    </PageShell>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function AuditLog() {
  const { theme: t, dark } = useTheme();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTech, setShowTech] = useState(false);
  const [query, setQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [selected, setSelected] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      localStorage.removeItem("slippy_audit");
    } catch {
      /* ignore */
    }
    try {
      const data = await getAuditEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setEvents([]);
      setError(err.message || "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const enriched = useMemo(() => {
    return events.map((e) => {
      const meta = resolveMeta(e.action);
      return { ...e, meta, details: e.details || {} };
    });
  }, [events]);

  const metrics = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const today = enriched.filter((e) => e.created_at && new Date(e.created_at) >= todayStart);
    const yesterday = enriched.filter((e) => {
      if (!e.created_at) return false;
      const d = new Date(e.created_at);
      return d >= yesterdayStart && d < todayStart;
    });

    const isFail = (e) => e.meta.status === "Failed";
    const isSuccess = (e) => e.meta.status === "Success";
    const isAdmin = (e) => {
      const a = String(e.actor || "").toLowerCase();
      return a.includes("admin") || a.includes("owner") || a === "system";
    };
    const isCritical = (e) =>
      e.meta.status === "Failed" || /delete|password|role|reject/i.test(e.action || "");

    const todayFail = today.filter(isFail).length;
    const todaySuccess = today.filter(isSuccess).length;
    const todayAdmin = today.filter(isAdmin).length;
    const todayCritical = today.filter(isCritical).length;

    const yFail = yesterday.filter(isFail).length;
    const ySuccess = yesterday.filter(isSuccess).length;
    const yAdmin = yesterday.filter(isAdmin).length;
    const yCritical = yesterday.filter(isCritical).length;

    const pct = (c, p) => {
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 100);
    };

    const hourBuckets = Array(7).fill(0);
    today.forEach((e) => {
      const h = new Date(e.created_at).getHours();
      const idx = Math.min(6, Math.floor(h / 3.5));
      hourBuckets[idx] += 1;
    });

    return {
      todayCount: today.length,
      todayDelta: pct(today.length, yesterday.length),
      failed: todayFail,
      failDelta: pct(todayFail, yFail),
      success: todaySuccess,
      successDelta: pct(todaySuccess, ySuccess),
      admin: todayAdmin,
      adminDelta: pct(todayAdmin, yAdmin),
      critical: todayCritical,
      criticalDelta: pct(todayCritical, yCritical),
      spark: sparkFromCounts(hourBuckets),
      invoicesEdited: today.filter((e) => /invoice/i.test(e.action || "")).length,
      bookingsCancelled: today.filter((e) => /reject|cancel|delete/i.test(e.action || "")).length,
      failedLogins: today.filter((e) => /login.*fail|failed_login/i.test(e.action || "")).length,
    };
  }, [enriched]);

  const insights = useMemo(() => {
    const lines = [];
    if (metrics.critical === 0 && metrics.failed === 0) {
      lines.push({ text: "No suspicious activity detected.", tone: "ok" });
    } else if (metrics.critical > 0) {
      lines.push({
        text: `${metrics.critical} critical event${metrics.critical === 1 ? "" : "s"} require review today.`,
        tone: "warn",
      });
    }
    if (metrics.invoicesEdited > 0) {
      lines.push({
        text: `${metrics.invoicesEdited} invoice${metrics.invoicesEdited === 1 ? " was" : "s were"} edited today.`,
        tone: "info",
      });
    }
    if (metrics.bookingsCancelled > 0) {
      lines.push({
        text: `${metrics.bookingsCancelled} booking${metrics.bookingsCancelled === 1 ? " was" : "s were"} cancelled or rejected.`,
        tone: "warn",
      });
    }
    if (metrics.failedLogins === 0) {
      lines.push({ text: "No failed login attempts in the last 24 hours.", tone: "ok" });
    }
    if (metrics.todayCount === 0) {
      lines.push({ text: "Shop is quiet — no actions recorded today yet.", tone: "info" });
    }
    if (lines.length === 0) {
      lines.push({ text: "Activity looks normal.", tone: "ok" });
    }
    return lines.slice(0, 5);
  }, [metrics]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter((e) => {
      if (entityFilter !== "All") {
        const matchesCategory = e.meta.category === entityFilter;
        const matchesBooking =
          entityFilter === "Bookings" && !!e.booking_id;
        const matchesInvoice =
          entityFilter === "Invoices" && (!!e.invoice_id || /invoice/i.test(e.action || ""));
        if (!matchesCategory && !matchesBooking && !matchesInvoice) return false;
      }
      if (statusFilter !== "All Status" && e.meta.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        e.actor,
        e.action,
        e.meta.label,
        e.booking_id,
        e.invoice_id,
        customerLabel(e),
        JSON.stringify(e.details || {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [enriched, query, entityFilter, statusFilter]);

  const grouped = useMemo(() => {
    const order = ["Today", "Yesterday", "This Week", "Older"];
    const map = { Today: [], Yesterday: [], "This Week": [], Older: [] };
    filtered.forEach((e) => {
      map[groupLabel(e.created_at)].push(e);
    });
    return order
      .filter((k) => map[k].length > 0)
      .map((k) => ({ label: k, items: map[k] }));
  }, [filtered]);

  function copySetupSql() {
    const done = () => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(AUDIT_SETUP_SQL).then(done).catch(() => {
        /* fallback below */
      });
      return;
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = AUDIT_SETUP_SQL;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch {
      /* ignore */
    }
  }

  const friendly = error ? friendlyError(error) : null;

  function handleExport() {
    const rows = filtered.map((e) => ({
      When: e.created_at,
      Action: e.meta.label,
      Actor: e.actor || "",
      Status: e.meta.status,
      Entity: entityId(e) || "",
      Customer: customerLabel(e) || "",
      From: e.details?.from ?? "",
      To: e.details?.to ?? "",
      Details: JSON.stringify(e.details || {}),
    }));
    exportToCSV(rows, "audit-log.csv");
  }

  const headerActions = (
    <>
      <button
        type="button"
        className="ui-press"
        onClick={handleExport}
        disabled={!filtered.length}
        style={{
          ...secondaryBtnStyle(t),
          padding: "0 14px",
          height: 36,
          fontSize: 13,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "inherit",
          opacity: filtered.length ? 1 : 0.5,
        }}
      >
        <Download size={14} strokeWidth={1.75} />
        Export
      </button>
      <button
        type="button"
        className="ui-press"
        onClick={handleExport}
        disabled={!filtered.length}
        style={{
          ...secondaryBtnStyle(t),
          padding: "0 14px",
          height: 36,
          fontSize: 13,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "inherit",
          opacity: filtered.length ? 1 : 0.5,
        }}
      >
        <Download size={14} strokeWidth={1.75} />
        Download CSV
      </button>
    </>
  );

  if (loading) return <AuditSkeleton t={t} />;

  if (error) {
    return (
      <PageShell title="Audit Log" subtitle="See important actions taken in your account." actions={headerActions}>
        <div
          style={{
            ...cardStyle(t),
            padding: "24px 28px",
            border: `1px solid ${t.riskBorder}`,
            background: t.riskBg,
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: dark ? "rgba(239,68,68,0.14)" : "rgba(239,68,68,0.10)",
                color: t.risk,
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.3 }}>
                {friendly.title}
              </div>
              <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 4, lineHeight: 1.5 }}>
                {friendly.summary}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
                {friendly.setup && (
                  <button
                    type="button"
                    className="ui-press"
                    onClick={copySetupSql}
                    {...primaryBtnHoverProps(t)}
                    style={{
                      ...primaryBtnStyle(t),
                      padding: "0 16px",
                      height: 36,
                      fontSize: 13,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      fontFamily: "inherit",
                    }}
                  >
                    {copiedSql ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
                    {copiedSql ? "Copied" : "Copy setup SQL"}
                  </button>
                )}
                <button
                  type="button"
                  className="ui-press"
                  onClick={load}
                  {...(friendly.setup ? {} : primaryBtnHoverProps(t))}
                  style={{
                    ...(friendly.setup ? secondaryBtnStyle(t) : primaryBtnStyle(t)),
                    padding: "0 16px",
                    height: 36,
                    fontSize: 13,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    fontFamily: "inherit",
                  }}
                >
                  <RefreshCw size={14} strokeWidth={2} />
                  Retry Connection
                </button>
                <button
                  type="button"
                  className="ui-press"
                  onClick={() => setShowTech((v) => !v)}
                  style={{
                    ...secondaryBtnStyle(t),
                    padding: "0 14px",
                    height: 36,
                    fontSize: 12,
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {showTech ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Technical details
                </button>
              </div>
              {friendly.setup && (
                <ol
                  style={{
                    margin: "16px 0 0",
                    paddingLeft: 18,
                    fontSize: 13,
                    color: t.textSecondary,
                    lineHeight: 1.6,
                  }}
                >
                  <li>Open Supabase → SQL Editor</li>
                  <li>Paste the setup SQL and run it</li>
                  <li>Return here and click Retry Connection</li>
                </ol>
              )}
              {friendly.setup && (
                <pre
                  className="font-mono-data"
                  style={{
                    marginTop: 14,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: t.cardBg,
                    border: `1px solid ${t.border}`,
                    fontSize: 11,
                    color: t.textMuted,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: 280,
                  }}
                >
                  {AUDIT_SETUP_SQL}
                </pre>
              )}
              {showTech && (
                <pre
                  className="font-mono-data"
                  style={{
                    marginTop: 10,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: t.cardBg,
                    border: `1px solid ${t.border}`,
                    fontSize: 11,
                    color: t.textMuted,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {error}
                </pre>
              )}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (events.length === 0) {
    return (
      <PageShell title="Audit Log" subtitle="See important actions taken in your account." actions={headerActions}>
        <EmptyState
          illustration="audit"
          title="No activity yet."
          subtitle="Important actions will show up here automatically."
          action="View Dashboard"
          onAction={() => navigate("/")}
        />
      </PageShell>
    );
  }

  const selectedMeta = selected ? resolveMeta(selected.action) : null;
  const SelectedIcon = selectedMeta?.icon || Shield;
  const details = selected?.details || {};

  return (
    <PageShell title="Audit Log" subtitle="See important actions taken in your account." actions={headerActions}>
      <style>{`
        .audit-kpi { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
        .audit-card {
          transition: border-color ${duration.fast} ${ease.standard}, box-shadow ${duration.fast} ${ease.standard}, transform ${duration.fast} ${ease.standard};
        }
        .audit-card:hover { transform: translateY(-1px); }
        @media (max-width: 1100px) {
          .audit-kpi { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 720px) {
          .audit-kpi { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>

      {/* Security Summary */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 550, letterSpacing: -0.35, color: t.textPrimary }}>
            Security Summary
          </h2>
          <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: 13, color: t.textMuted, lineHeight: 1.45 }}>
            Today&apos;s activity at a glance.
          </p>
        </div>
        <div className="audit-kpi ds-stagger">
          <ExecKpi label="Total Events Today" value={metrics.todayCount} trend={metrics.todayDelta} spark={metrics.spark} t={t} />
          <ExecKpi label="Failed Actions" value={metrics.failed} trend={metrics.failDelta} spark={metrics.spark} t={t} />
          <ExecKpi label="Successful Actions" value={metrics.success} trend={metrics.successDelta} spark={metrics.spark} t={t} />
          <ExecKpi label="Admin Actions" value={metrics.admin} trend={metrics.adminDelta} spark={metrics.spark} t={t} />
          <ExecKpi label="Critical Events" value={metrics.critical} trend={metrics.criticalDelta} spark={metrics.spark} t={t} />
        </div>
      </section>

      {/* AI Security Insights */}
      <section style={{ marginBottom: 48 }}>
        <div
          style={{
            ...cardStyle(t, { interactive: false }),
            padding: 0,
            overflow: "hidden",
            borderRadius: radius.lg,
          }}
        >
          <div style={{ padding: "28px 32px", borderBottom: `1px solid ${t.borderSub || t.border}` }}>
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
              AI Security Insights
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: -0.5,
                color: t.textPrimary,
                lineHeight: 1.35,
                maxWidth: 640,
              }}
            >
              {insights[0]?.text || "Activity looks healthy."}
            </p>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: "8px 32px 24px" }}>
            {insights.slice(0, 5).map((item, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  padding: "12px 0",
                  borderBottom: i < Math.min(insights.length, 5) - 1 ? `1px solid ${t.borderSub || t.border}` : "none",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    marginTop: 7,
                    flexShrink: 0,
                    background:
                      item.tone === "ok"
                        ? "#059669"
                        : item.tone === "warn"
                          ? t.warning || "#F59E0B"
                          : t.accentSolid || t.accent,
                  }}
                />
                <span style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.5 }}>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Search */}
      <section style={{ marginBottom: 24 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            height: 52,
            padding: "0 18px",
            borderRadius: radius.md,
            border: `1px solid ${t.border}`,
            background: t.cardBg,
            boxShadow: t.cardShadow,
          }}
        >
          <Search size={18} color={t.textMuted} strokeWidth={1.75} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search user, customer, booking, invoice, action, device, IP…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 15,
              color: t.textPrimary,
              fontFamily: "inherit",
              height: "100%",
            }}
          />
        </label>
      </section>

      {/* Filters */}
      <section style={{ marginBottom: 40, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
          <SegmentedControl options={ENTITY_FILTERS} value={entityFilter} onChange={setEntityFilter} layoutId="auditEntity" />
        </div>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
          <SegmentedControl options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} layoutId="auditStatus" />
        </div>
      </section>

      {/* Timeline */}
      <section style={{ marginBottom: 32 }}>
        {grouped.length === 0 ? (
          <div
            style={{
              ...cardStyle(t, { interactive: false }),
              padding: "48px 28px",
              textAlign: "center",
              borderRadius: radius.lg,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 500, color: t.textPrimary, marginBottom: 6 }}>No matching activity</div>
            <div style={{ fontSize: 13, color: t.textMuted }}>Try a different filter or search term.</div>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label} style={{ marginBottom: 40 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: t.textMuted,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                {group.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {group.items.map((e) => {
                  const Icon = e.meta.icon || Shield;
                  const title = customerLabel(e);
                  const id = entityId(e);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      className="ui-press audit-card"
                      onClick={() => setSelected(e)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 16,
                        width: "100%",
                        textAlign: "left",
                        padding: "18px 20px",
                        borderRadius: radius.md,
                        border: `1px solid ${t.border}`,
                        background: t.cardBg,
                        boxShadow: t.cardShadow,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        color: "inherit",
                      }}
                      onMouseEnter={(el) => {
                        el.currentTarget.style.borderColor = t.borderHover;
                        el.currentTarget.style.boxShadow = t.cardShadowHover || t.cardShadow;
                      }}
                      onMouseLeave={(el) => {
                        el.currentTarget.style.borderColor = t.border;
                        el.currentTarget.style.boxShadow = t.cardShadow;
                      }}
                    >
                      <span
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)",
                          color: t.textSecondary,
                          flexShrink: 0,
                          border: `1px solid ${t.border}`,
                        }}
                      >
                        <Icon size={18} strokeWidth={1.75} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, letterSpacing: -0.2 }}>
                            {e.meta.label}
                          </span>
                          <StatusPill status={e.meta.status} dark={dark} />
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 13, color: t.textSecondary }}>
                          <span>
                            <span style={{ color: t.textMuted }}>by </span>
                            {e.actor || "Unknown"}
                          </span>
                          {title && (
                            <span>
                              <span style={{ color: t.textMuted }}>{entityType(e)} · </span>
                              {title}
                            </span>
                          )}
                          {id && (
                            <span className="font-mono-data" style={{ fontSize: 12, color: t.textMuted }}>
                              {id}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="font-mono-data"
                        style={{
                          fontSize: 12,
                          color: t.textMuted,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          paddingTop: 2,
                        }}
                      >
                        {formatWhen(e.created_at)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Detail drawer */}
      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selectedMeta?.label || "Activity"}
        subtitle={selected ? formatWhen(selected.created_at) : undefined}
        width={460}
        footer={
          <>
            <button
              type="button"
              className="ui-press"
              onClick={() => setSelected(null)}
              style={{ ...secondaryBtnStyle(t), padding: "10px 14px", fontSize: 13, fontFamily: "inherit" }}
            >
              Close
            </button>
            {selected?.booking_id && (
              <button
                type="button"
                className="ui-press"
                {...primaryBtnHoverProps(t)}
                onClick={() => {
                  setSelected(null);
                  navigate("/bookings");
                }}
                style={{
                  ...primaryBtnStyle(t),
                  padding: "10px 14px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  marginLeft: "auto",
                }}
              >
                View Bookings
              </button>
            )}
          </>
        }
      >
        {selected && selectedMeta && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)",
                  border: `1px solid ${t.border}`,
                  color: t.textSecondary,
                }}
              >
                <SelectedIcon size={20} strokeWidth={1.75} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 550, color: t.textPrimary, letterSpacing: -0.3 }}>
                  {selectedMeta.label}
                </div>
                <div style={{ marginTop: 6 }}>
                  <StatusPill status={selectedMeta.status} dark={dark} />
                </div>
              </div>
            </div>

            <DrawerSection title="Description" t={t}>
              <p style={{ margin: 0, fontSize: 14, color: t.textSecondary, lineHeight: 1.55 }}>
                {customerLabel(selected)
                  ? `${selectedMeta.label} for ${customerLabel(selected)}.`
                  : `${selectedMeta.label} was recorded in the activity trail.`}
                {details.from != null || details.to != null
                  ? ` Status moved from ${details.from ?? "—"} to ${details.to ?? "—"}.`
                  : ""}
              </p>
            </DrawerSection>

            {(details.from != null || details.to != null) && (
              <DrawerSection title="What changed" t={t}>
                <ChangeCompare from={details.from} to={details.to} t={t} />
              </DrawerSection>
            )}

            <DrawerSection title="Who & when" t={t}>
              <MetaRow icon={User} label="Performed by" value={selected.actor || "Unknown"} t={t} />
              <MetaRow icon={Clock} label="Date" value={formatFullDate(selected.created_at)} t={t} />
              <MetaRow icon={Clock} label="Time" value={formatFullTime(selected.created_at)} t={t} />
            </DrawerSection>

            <DrawerSection title="Related" t={t}>
              <MetaRow icon={Link2} label="Booking" value={selected.booking_id || "—"} t={t} />
              <MetaRow icon={FileText} label="Invoice" value={selected.invoice_id || details.invoice_number || "—"} t={t} />
              <MetaRow icon={User} label="Customer" value={customerLabel(selected) || "—"} t={t} />
              {details.amount != null && (
                <MetaRow icon={CreditCard} label="Amount" value={`Rs ${Number(details.amount).toLocaleString()}`} t={t} />
              )}
              {details.reason && <MetaRow icon={AlertCircle} label="Reason" value={details.reason} t={t} />}
            </DrawerSection>

            <DrawerSection title="Context" t={t}>
              <MetaRow icon={Globe} label="IP Address" value={details.ip || details.ip_address || "—"} t={t} />
              <MetaRow
                icon={Monitor}
                label="Browser / Device"
                value={details.user_agent || details.device || details.browser || "—"}
                t={t}
              />
              <MetaRow icon={MapPin} label="Location" value={details.location || "—"} t={t} />
            </DrawerSection>

            {Object.keys(details).length > 0 && (
              <DrawerSection title="Raw details" t={t}>
                <pre
                  className="font-mono-data"
                  style={{
                    margin: 0,
                    padding: 14,
                    borderRadius: 12,
                    background: dark ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.03)",
                    border: `1px solid ${t.border}`,
                    fontSize: 11,
                    color: t.textMuted,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {JSON.stringify(details, null, 2)}
                </pre>
              </DrawerSection>
            )}
          </div>
        )}
      </Sheet>
    </PageShell>
  );
}
