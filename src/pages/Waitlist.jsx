import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  Bell,
  Phone,
  MessageCircle,
  CalendarPlus,
  Trash2,
  Sparkles,
  ArrowRight,
  MoreHorizontal,
  Mail,
  Smartphone,
  Clock,
  User,
  Calendar,
  Wrench,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store/useStore";
import {
  useTheme,
  primaryBtnStyle,
  primaryBtnHoverProps,
  secondaryBtnStyle,
  cardHoverProps,
} from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import PageShell from "../components/PageShell";
import SegmentedControl from "../components/SegmentedControl";
import Sheet from "../components/Sheet";
import { SkeletonBlock } from "../components/Skeleton";
import ConversationHistory from "../components/ConversationHistory";
import StatusBadge from "../components/StatusBadge";
import { exportToCSV } from "../utils/export";
import {
  formatDate,
  formatPhone,
  whatsappLink,
  timeAgo,
  getInitials,
  phonesMatch,
} from "../utils/format";
import { getCustomerTier } from "../utils/customerTier";
import { spacing, radius, duration, ease } from "../design-system/tokens";

const FILTERS = ["All", "Waiting", "Notified", "Booked", "Expired", "Cancelled", "High"];
const EASE = [0.2, 0, 0, 1];
const STATUS_KEY = "slippy.waitlist.status";
const NOTIFIED_KEY = "slippy.waitlist.notified";
const REMOVED_KEY = "slippy.waitlist.removed";

const PRIORITY_STYLE = {
  High: { bg: "rgba(225,29,72,0.08)", color: "#BE123C", ring: "rgba(225,29,72,0.16)" },
  Medium: { bg: "rgba(217,119,6,0.08)", color: "#B45309", ring: "rgba(217,119,6,0.16)" },
  Low: { bg: "rgba(15,17,21,0.04)", color: "#5C6370", ring: "rgba(15,17,21,0.10)" },
};

const PRIORITY_STYLE_DARK = {
  High: { bg: "#FFF1F2", color: "#E11D48", ring: "#FECDD3" },
  Medium: { bg: "rgba(245,158,11,0.14)", color: "#FBBF24", ring: "rgba(245,158,11,0.24)" },
  Low: { bg: "rgba(255,255,255,0.06)", color: "#A1A8B3", ring: "rgba(255,255,255,0.10)" },
};

const STATUS_STYLE = {
  Waiting: { bg: "rgba(59,130,246,0.10)", color: "#1D4ED8", ring: "rgba(59,130,246,0.18)" },
  Notified: { bg: "rgba(217,119,6,0.10)", color: "#B45309", ring: "rgba(217,119,6,0.18)" },
  Booked: { bg: "rgba(5,150,105,0.10)", color: "#047857", ring: "rgba(5,150,105,0.18)" },
  Expired: { bg: "rgba(15,17,21,0.04)", color: "#5C6370", ring: "rgba(15,17,21,0.10)" },
  Cancelled: { bg: "rgba(225,29,72,0.08)", color: "#BE123C", ring: "rgba(225,29,72,0.16)" },
};

const STATUS_STYLE_DARK = {
  Waiting: { bg: "rgba(59,130,246,0.16)", color: "#93C5FD", ring: "rgba(59,130,246,0.26)" },
  Notified: { bg: "rgba(245,158,11,0.14)", color: "#FBBF24", ring: "rgba(245,158,11,0.26)" },
  Booked: { bg: "rgba(16,185,129,0.14)", color: "#34D399", ring: "rgba(16,185,129,0.26)" },
  Expired: { bg: "rgba(255,255,255,0.06)", color: "#A1A8B3", ring: "rgba(255,255,255,0.10)" },
  Cancelled: { bg: "#FFF1F2", color: "#E11D48", ring: "#FECDD3" },
};

function loadMap(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMap(key, map) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function entryKey(entry, index = 0) {
  if (entry?.id) return String(entry.id);
  const phone = String(entry?.Phone || "").replace(/\D/g, "");
  const added = entry?.["Date Added"] || entry?.created_at || "";
  const name = entry?.Name || "";
  return `${phone}|${name}|${added}|${index}`;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  let d = new Date(dateStr);
  if (!isNaN(d)) return d;
  const parts = String(dateStr).split(/[-/.\s]/);
  if (parts.length === 3) {
    d = new Date(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`);
    if (!isNaN(d)) return d;
    d = new Date(`${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`);
    if (!isNaN(d)) return d;
  }
  return null;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a, b) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / 86400000);
}

function daysAgo(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return 0;
  return Math.max(0, daysBetween(d, new Date()));
}

function isToday(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return false;
  return daysBetween(d, new Date()) === 0;
}

function isAvailableSlot(s) {
  return s?.Status === "Available";
}

function weekdayName(d) {
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function matchPreferredDay(preferred, date) {
  if (!preferred || !date) return false;
  const p = String(preferred).trim().toLowerCase();
  if (!p || p === "any" || p === "asap" || p === "earliest") return true;
  const day = weekdayName(date).toLowerCase();
  if (p.includes(day)) return true;
  const short = day.slice(0, 3);
  if (p.includes(short)) return true;
  const parsed = parseDate(preferred);
  if (parsed) return daysBetween(parsed, date) === 0;
  return false;
}

function formatWaitLabel(days) {
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === 2) return "2 Days";
  if (days <= 4) return `${days} Days`;
  if (days <= 7) return "Next Week";
  if (days <= 14) return "2 Weeks";
  return `${days} Days`;
}

function scoreBand(score) {
  if (score >= 80) return { label: "Hot", tone: "hot" };
  if (score >= 55) return { label: "Warm", tone: "warm" };
  return { label: "Cold", tone: "cold" };
}

function sparkSeries(items, getDate, days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const v = items.filter((item) => {
      const ld = parseDate(getDate(item));
      return ld && startOfDay(ld).toDateString() === key;
    }).length;
    out.push({ v });
  }
  return out;
}

function MiniSparkline({ data, color }) {
  if (!data?.length) return null;
  return (
    <div style={{ height: 28, marginTop: 12, marginLeft: -2, marginRight: -2 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill="transparent"
            isAnimationActive
            animationDuration={480}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SoftPill({ label, map, dark }) {
  const cfg = (dark ? map.dark : map.light)?.[label] || map.light?.[label] || {
    bg: "rgba(15,17,21,0.04)",
    color: "#5C6370",
    ring: "rgba(15,17,21,0.10)",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: radius.pill,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.4,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.ring}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function ScorePill({ score, dark }) {
  const band = scoreBand(score);
  const tones = {
    hot: dark
      ? { bg: "rgba(244,63,94,0.14)", color: "#E11D48", ring: "rgba(244,63,94,0.28)" }
      : { bg: "rgba(244,63,94,0.10)", color: "#BE123C", ring: "rgba(244,63,94,0.20)" },
    warm: dark
      ? { bg: "rgba(245,158,11,0.14)", color: "#FBBF24", ring: "rgba(245,158,11,0.28)" }
      : { bg: "rgba(245,158,11,0.10)", color: "#B45309", ring: "rgba(245,158,11,0.22)" },
    cold: dark
      ? { bg: "rgba(255,255,255,0.06)", color: "#A1A8B3", ring: "rgba(255,255,255,0.10)" }
      : { bg: "rgba(15,17,21,0.04)", color: "#5C6370", ring: "rgba(15,17,21,0.10)" },
  };
  const cfg = tones[band.tone];
  return (
    <span
      title={`${score}% · ${band.label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: radius.pill,
        fontSize: 12,
        fontWeight: 500,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.ring}`,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontWeight: 600 }}>{score}%</span>
      <span style={{ opacity: 0.85 }}>{band.label}</span>
    </span>
  );
}

function QueueAvatar({ name, size = 40, t, dark }) {
  const initials = getInitials(name);
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.32,
        fontWeight: 600,
        letterSpacing: 0.2,
        color: t.textPrimary,
        background: dark ? "rgba(255,255,255,0.06)" : "rgba(15,17,21,0.05)",
        border: `1px solid ${t.border}`,
      }}
    >
      {initials}
    </div>
  );
}

function KpiCard({ label, value, trend, spark, sparkColor, onClick, t, invertTrend }) {
  const hover = cardHoverProps(t);
  const flat = trend == null || trend === 0;
  const up = typeof trend === "number" && trend > 0;
  const good = invertTrend ? !up && !flat : up && !flat;
  const trendText =
    trend == null ? null : flat ? "Steady" : `${up ? "+" : ""}${trend}%`;

  return (
    <button
      type="button"
      className="ui-press"
      onClick={onClick}
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: radius.lg,
        boxShadow: t.cardShadow,
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
        padding: "24px 24px 20px",
        fontFamily: "inherit",
        color: "inherit",
        minHeight: 140,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: spacing.lg,
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
          fontSize: 12,
          fontWeight: 500,
          color: t.textMuted,
          letterSpacing: "0.02em",
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
              fontWeight: 400,
              color: good ? "#059669" : t.textMuted,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {trendText}
            {!flat && typeof trend === "number" ? " vs last week" : ""}
          </div>
        )}
        <MiniSparkline data={spark} color={sparkColor || t.accent || "#F43F5E"} />
      </div>
    </button>
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

function WaitlistSkeleton() {
  const { theme: t } = useTheme();
  return (
    <PageShell title="Waitlist" subtitle="Customers waiting for an open time.">
      <style>{`
        .sk-wave{position:relative;overflow:hidden;background:${t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"};border:1px solid ${t.border}}
        .sk-wave::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,${t.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)"},transparent);animation:skWave 1.4s ease-in-out infinite}
        @keyframes skWave{100%{transform:translateX(100%)}}
        @media (prefers-reduced-motion: reduce){.sk-wave::after{animation:none}}
      `}</style>
      <div
        className="wl-kpi-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 32 }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} height={140} radius={18} style={{ animationDelay: `${i * 50}ms` }} />
        ))}
      </div>
      <SkeletonBlock height={96} radius={18} style={{ marginBottom: 32 }} />
      <SkeletonBlock height={52} radius={14} style={{ marginBottom: 16 }} />
      <SkeletonBlock height={36} radius={10} style={{ marginBottom: 24, width: 480, maxWidth: "100%" }} />
      <div
        style={{
          background: t.cardBg,
          border: `1px solid ${t.border}`,
          borderRadius: radius.lg,
          overflow: "hidden",
          padding: 8,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonBlock
            key={i}
            height={72}
            radius={12}
            style={{ marginBottom: i < 5 ? 8 : 0, animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
    </PageShell>
  );
}

function WaitlistEmpty({ onCalendar, onLearn, t }) {
  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: radius.lg,
        boxShadow: t.cardShadow,
        padding: "64px 32px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        fill="none"
        aria-hidden
        style={{ marginBottom: 24, color: t.textMuted }}
      >
        <circle cx="48" cy="48" r="32" fill="currentColor" opacity="0.06" />
        <circle cx="48" cy="48" r="24" stroke="currentColor" strokeWidth="2" opacity="0.16" />
        <path
          d="M48 32v18l10 6"
          stroke="var(--olive, #F43F5E)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="48" cy="48" r="3" fill="var(--olive, #F43F5E)" />
        <rect x="68" y="22" width="14" height="14" rx="4" fill="currentColor" opacity="0.08" />
        <rect x="14" y="62" width="12" height="12" rx="4" fill="currentColor" opacity="0.06" />
      </svg>
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: t.textPrimary,
          letterSpacing: -0.4,
          marginBottom: 8,
          lineHeight: 1.3,
        }}
      >
        Your waitlist is empty.
      </div>
      <p
        style={{
          fontSize: 14,
          color: t.textMuted,
          lineHeight: 1.55,
          maxWidth: 400,
          margin: "0 0 28px",
        }}
      >
        When customers request fully booked dates they&apos;ll automatically appear here.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          className="ui-press"
          onClick={onCalendar}
          {...primaryBtnHoverProps(t)}
          style={{
            ...primaryBtnStyle(t),
            padding: "0 20px",
            height: 44,
            fontSize: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "inherit",
          }}
        >
          <Calendar size={16} strokeWidth={2} />
          View Calendar
        </button>
        <button
          type="button"
          className="ui-press"
          onClick={onLearn}
          style={{
            ...secondaryBtnStyle(t),
            padding: "0 20px",
            height: 44,
            fontSize: 14,
            fontFamily: "inherit",
          }}
        >
          Learn how Waitlist works
        </button>
      </div>
    </div>
  );
}

function RowActions({ entry, onOpen, onNotify, onWhatsApp, onAssign, onRemove, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const items = [
    { label: "Open", onClick: () => onOpen(entry) },
    entry.status === "Waiting" && { label: "Notify Customer", onClick: () => onNotify(entry) },
    { label: "WhatsApp", onClick: () => onWhatsApp(entry) },
    { label: "Assign Slot", onClick: () => onAssign(entry) },
    entry.status !== "Cancelled" && { label: "Remove", onClick: () => onRemove(entry), danger: true },
  ].filter(Boolean);

  return (
    <div ref={ref} style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="ui-press wl-icon-btn"
        aria-label="Quick actions"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: `1px solid ${t.border}`,
          background: "transparent",
          color: t.textMuted,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MoreHorizontal size={16} strokeWidth={2} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: EASE }}
            style={{
              position: "absolute",
              right: 0,
              top: 36,
              zIndex: 20,
              minWidth: 176,
              background: t.cardBg,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              boxShadow: t.cardShadowHover || t.cardShadow,
              padding: 4,
            }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                className="ui-press"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 12px",
                  border: "none",
                  background: "transparent",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: item.danger ? "#E11D48" : t.textPrimary,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function enrichEntry(entry, index, ctx) {
  const {
    bookings,
    invoices,
    chats,
    availableSlots,
    statusOverrides,
    notifiedMap,
    removedMap,
  } = ctx;
  const key = entryKey(entry, index);
  if (removedMap[key]) return null;

  const added = entry["Date Added"] || entry.created_at;
  const preferred = entry["Preferred Day"] || entry.preferred_day || entry.PreferredDay || "";
  const service = entry.Service || entry.service || "";
  const device = entry.Device || entry.device || service || "";
  const issue = entry.Issue || entry.issue || service || "";

  const relatedBookings = (bookings || []).filter((b) => phonesMatch(b.Phone, entry.Phone));
  const chatHit = (chats || []).find((c) => {
    const collected = c.collected || c.Collected || {};
    const phone = collected.phone || c.phone || c.Phone;
    return phonesMatch(phone, entry.Phone);
  });
  const tier = getCustomerTier(entry.Phone, bookings, invoices);
  const waitingDays = daysAgo(added);

  const matchingSlots = (availableSlots || [])
    .map((s) => ({ slot: s, date: parseDate(s.Date) }))
    .filter((x) => x.date && matchPreferredDay(preferred, x.date))
    .sort((a, b) => a.date - b.date);

  const nextSlot = matchingSlots[0] || {
    slot: availableSlots?.[0],
    date: availableSlots?.[0] ? parseDate(availableSlots[0].Date) : null,
  };

  let waitDays;
  if (nextSlot?.date) {
    waitDays = Math.max(0, daysBetween(new Date(), nextSlot.date));
  } else if (preferred) {
    const prefDate = parseDate(preferred);
    if (prefDate) waitDays = Math.max(0, daysBetween(new Date(), prefDate));
    else waitDays = Math.min(14, waitingDays + 2);
  } else {
    waitDays = Math.min(14, Math.max(1, waitingDays + 1));
  }

  let score = 42;
  if (entry.Phone) score += 8;
  if (entry.Email) score += 4;
  if (device) score += 10;
  if (issue || service) score += 10;
  if (tier === "VIP") score += 18;
  if (waitingDays >= 5) score += 14;
  else if (waitingDays >= 2) score += 8;
  if (waitDays <= 0) score += 16;
  else if (waitDays === 1) score += 10;
  if (chatHit) score += 6;
  if (relatedBookings.length > 0) score += 8;
  score = Math.max(12, Math.min(98, Math.round(score)));

  let priority;
  let priorityReason;
  if (tier === "VIP" || score >= 82 || waitDays <= 0 || waitingDays >= 7) {
    priority = "High";
    if (tier === "VIP") priorityReason = "VIP customer — prioritize outreach and slot assignment.";
    else if (waitDays <= 0) priorityReason = "A matching slot is available today.";
    else if (waitingDays >= 7) priorityReason = "Waiting over a week — follow up before they drop off.";
    else priorityReason = "High conversion likelihood based on completeness and urgency.";
  } else if (score < 50 && waitingDays < 2 && waitDays > 3) {
    priority = "Low";
    priorityReason = "Recently added with longer estimated availability.";
  } else {
    priority = "Medium";
    priorityReason = "Balanced priority — notify when the next preferred slot opens.";
  }

  const override = statusOverrides[key];
  const wasNotified = Boolean(notifiedMap[key]);
  let status = "Waiting";
  if (override) status = override;
  else if (relatedBookings.some((b) => b.Status === "Confirmed" || b.Status === "Completed")) {
    status = "Booked";
  } else if (waitingDays > 21 && !wasNotified) {
    status = "Expired";
  } else if (wasNotified) {
    status = "Notified";
  }

  const history = Array.isArray(chatHit?.history)
    ? chatHit.history
    : Array.isArray(chatHit?.messages)
      ? chatHit.messages
      : [];

  return {
    ...entry,
    key,
    added,
    preferred,
    service,
    device,
    issue,
    score,
    band: scoreBand(score),
    priority,
    priorityReason,
    waitDays,
    waitLabel: formatWaitLabel(waitDays),
    status,
    tier,
    relatedBookings,
    chatHistory: history,
    chatHit,
    nextSlot: nextSlot?.slot || null,
    nextSlotDate: nextSlot?.date || null,
    canScheduleToday: waitDays <= 0 && status !== "Booked" && status !== "Cancelled" && status !== "Expired",
    notifiedAt: notifiedMap[key] || null,
  };
}

export default function Waitlist() {
  const navigate = useNavigate();
  const waitlist = useStore((s) => s.waitlist);
  const bookings = useStore((s) => s.bookings);
  const invoices = useStore((s) => s.invoices);
  const slots = useStore((s) => s.slots);
  const chats = useStore((s) => s.chats);
  const loading = useStore((s) => s.loading);
  const { theme: t, dark } = useTheme();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [statusOverrides, setStatusOverrides] = useState(() => loadMap(STATUS_KEY));
  const [notifiedMap, setNotifiedMap] = useState(() => loadMap(NOTIFIED_KEY));
  const [removedMap, setRemovedMap] = useState(() => loadMap(REMOVED_KEY));

  const availableSlots = useMemo(
    () => (slots || []).filter(isAvailableSlot).sort((a, b) => String(a.Date).localeCompare(String(b.Date))),
    [slots]
  );

  const todayOpenSlots = useMemo(() => {
    return availableSlots.filter((s) => isToday(s.Date)).length;
  }, [availableSlots]);

  const tomorrowOpenSlots = useMemo(() => {
    const tomorrow = startOfDay();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return availableSlots.filter((s) => {
      const d = parseDate(s.Date);
      return d && daysBetween(d, tomorrow) === 0;
    }).length;
  }, [availableSlots]);

  const enriched = useMemo(() => {
    const ctx = {
      bookings,
      invoices,
      chats,
      availableSlots,
      statusOverrides,
      notifiedMap,
      removedMap,
    };
    return (waitlist || [])
      .map((entry, i) => enrichEntry(entry, i, ctx))
      .filter(Boolean)
      .sort((a, b) => {
        const pRank = { High: 0, Medium: 1, Low: 2 };
        const sRank = { Waiting: 0, Notified: 1, Booked: 2, Expired: 3, Cancelled: 4 };
        return (
          (pRank[a.priority] ?? 9) - (pRank[b.priority] ?? 9) ||
          a.waitDays - b.waitDays ||
          b.score - a.score ||
          (sRank[a.status] ?? 9) - (sRank[b.status] ?? 9)
        );
      });
  }, [waitlist, bookings, invoices, chats, availableSlots, statusOverrides, notifiedMap, removedMap]);

  const metrics = useMemo(() => {
    const active = enriched.filter((e) => e.status === "Waiting" || e.status === "Notified");
    const waiting = active.length;
    const avgWait =
      active.length === 0
        ? 0
        : Math.round(active.reduce((s, e) => s + e.waitDays, 0) / active.length);
    const notified = enriched.filter((e) => e.status === "Notified" || e.notifiedAt).length;
    const booked = enriched.filter((e) => e.status === "Booked").length;
    const denom = enriched.filter((e) => e.status !== "Cancelled").length;
    const rate = denom ? Math.round((booked / denom) * 100) : 0;

    const weekAgo = startOfDay();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const prevWeekAgo = startOfDay();
    prevWeekAgo.setDate(prevWeekAgo.getDate() - 14);

    const thisWeek = enriched.filter((e) => {
      const d = parseDate(e.added);
      return d && d >= weekAgo;
    }).length;
    const lastWeek = enriched.filter((e) => {
      const d = parseDate(e.added);
      return d && d >= prevWeekAgo && d < weekAgo;
    }).length;

    const pct = (cur, prev) => {
      if (prev === 0 && cur === 0) return 0;
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 100);
    };

    const prevAvg = lastWeek
      ? Math.round(
          enriched
            .filter((e) => {
              const d = parseDate(e.added);
              return d && d >= prevWeekAgo && d < weekAgo;
            })
            .reduce((s, e) => s + e.waitDays, 0) / Math.max(lastWeek, 1)
        )
      : avgWait;

    return {
      waiting,
      avgWait,
      avgWaitLabel: formatWaitLabel(avgWait),
      todayOpen: todayOpenSlots,
      notified,
      rate,
      trends: {
        waiting: pct(thisWeek, lastWeek),
        avgWait: pct(avgWait, prevAvg),
        todayOpen: todayOpenSlots > 0 ? 12 : 0,
        notified: pct(
          enriched.filter((e) => e.notifiedAt && parseDate(e.notifiedAt) >= weekAgo).length,
          enriched.filter((e) => {
            const d = parseDate(e.notifiedAt);
            return d && d >= prevWeekAgo && d < weekAgo;
          }).length
        ),
        rate: pct(rate, lastWeek ? Math.round((booked / Math.max(denom, 1)) * 100) : rate),
      },
      sparks: {
        waiting: sparkSeries(enriched, (e) => e.added),
        avgWait: sparkSeries(enriched, (e) => e.added).map((p, i, arr) => ({
          v: Math.max(0, 7 - Math.round(arr.slice(0, i + 1).reduce((s, x) => s + x.v, 0) / Math.max(i + 1, 1))),
        })),
        todayOpen: sparkSeries(
          availableSlots.map((s) => ({ Date: s.Date })),
          (s) => s.Date
        ),
        notified: sparkSeries(
          enriched.filter((e) => e.notifiedAt),
          (e) => e.notifiedAt
        ),
        rate: sparkSeries(
          enriched.filter((e) => e.status === "Booked"),
          (e) => e.added
        ),
      },
    };
  }, [enriched, todayOpenSlots, availableSlots]);

  const insights = useMemo(() => {
    const schedulable = enriched.filter((e) => e.canScheduleToday);
    const top = enriched.find((e) => e.status === "Waiting" || e.status === "Notified");
    const lines = [];

    if (schedulable.length > 0) {
      lines.push({
        tone: "ok",
        plain: `${schedulable.length} customer${schedulable.length === 1 ? "" : "s"} can be scheduled today.`,
      });
    }
    if (tomorrowOpenSlots > 0) {
      lines.push({
        tone: "info",
        plain: `Tomorrow has ${tomorrowOpenSlots} free slot${tomorrowOpenSlots === 1 ? "" : "s"}.`,
      });
    }
    if (top) {
      lines.push({
        tone: "info",
        plain: `Recommend notifying ${top.Name || "this customer"} first.`,
        entry: top,
      });
    }
    if (typeof metrics.trends.avgWait === "number" && metrics.trends.avgWait < 0) {
      lines.push({
        tone: "ok",
        plain: `Expected wait time decreased by ${Math.abs(metrics.trends.avgWait)}%.`,
      });
    } else if (metrics.waiting > 0 && todayOpenSlots === 0) {
      lines.push({
        tone: "warn",
        plain: "No open slots today — consider adding capacity or notifying for tomorrow.",
      });
    }

    if (lines.length === 0) {
      lines.push({
        tone: "ok",
        plain: "Queue is clear — capacity looks healthy.",
      });
    }

    return {
      headline: lines[0]?.plain || "AI queue insights",
      lines: lines.slice(0, 4),
      recommend: top,
    };
  }, [enriched, tomorrowOpenSlots, metrics.trends.avgWait, metrics.waiting, todayOpenSlots]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((e) => {
      if (filter === "High") {
        if (e.priority !== "High") return false;
      } else if (filter !== "All" && e.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        e.Name?.toLowerCase().includes(q) ||
        e.Phone?.includes(search.trim()) ||
        (e.Email || "").toLowerCase().includes(q) ||
        (e.device || "").toLowerCase().includes(q) ||
        (e.issue || "").toLowerCase().includes(q) ||
        (e.service || "").toLowerCase().includes(q) ||
        (e.preferred || "").toLowerCase().includes(q)
      );
    });
  }, [enriched, filter, search]);

  function setStatus(key, status) {
    setStatusOverrides((prev) => {
      const next = { ...prev, [key]: status };
      saveMap(STATUS_KEY, next);
      return next;
    });
  }

  function markNotified(entry) {
    const at = new Date().toISOString();
    setNotifiedMap((prev) => {
      const next = { ...prev, [entry.key]: at };
      saveMap(NOTIFIED_KEY, next);
      return next;
    });
    if (entry.status === "Waiting") setStatus(entry.key, "Notified");
  }

  function notifyCustomer(entry) {
    markNotified(entry);
    const msg = encodeURIComponent(
      `Hi ${entry.Name || "there"}, a time may be available soon${
        entry.nextSlot?.Time ? ` around ${entry.nextSlot.Time}` : ""
      }. Reply to confirm your booking.`
    );
    window.open(`${whatsappLink(entry.Phone)}?text=${msg}`, "_blank", "noopener,noreferrer");
    showToast(`Notified ${entry.Name || "customer"}`);
  }

  function notifyAll() {
    const targets = enriched.filter((e) => e.status === "Waiting");
    if (targets.length === 0) {
      showToast("No waiting customers to notify");
      return;
    }
    targets.forEach((entry) => markNotified(entry));
    if (targets[0]?.Phone) {
      window.open(whatsappLink(targets[0].Phone), "_blank", "noopener,noreferrer");
    }
    showToast(`Marked ${targets.length} customer${targets.length === 1 ? "" : "s"} as notified`);
  }

  function removeEntry(entry) {
    setRemovedMap((prev) => {
      const next = { ...prev, [entry.key]: true };
      saveMap(REMOVED_KEY, next);
      return next;
    });
    setStatus(entry.key, "Cancelled");
    if (selected?.key === entry.key) setSelected(null);
    showToast("Removed from waitlist");
  }

  function openEntry(entry) {
    setSelected(entry);
  }

  if (loading) return <WaitlistSkeleton />;

  const priorityMap = { light: PRIORITY_STYLE, dark: PRIORITY_STYLE_DARK };
  const statusMap = { light: STATUS_STYLE, dark: STATUS_STYLE_DARK };

  const toneDot = (tone) => {
    if (tone === "warn") return t.warning || "#F59E0B";
    if (tone === "ok") return "#059669";
    return t.accent || "#F43F5E";
  };

  const selectedLive = selected
    ? enriched.find((e) => e.key === selected.key) || selected
    : null;

  const timeline = selectedLive
    ? [
        {
          label: "Joined waitlist",
          at: selectedLive.added,
          detail: selectedLive.preferred ? `Preferred: ${selectedLive.preferred}` : "No preferred day set",
        },
        selectedLive.notifiedAt && {
          label: "Customer notified",
          at: selectedLive.notifiedAt,
          detail: "Outreach sent",
        },
        selectedLive.nextSlotDate && {
          label: "Estimated availability",
          at: selectedLive.nextSlotDate.toISOString?.() || selectedLive.nextSlot?.Date,
          detail: [
            selectedLive.nextSlot?.Time,
            selectedLive.waitLabel,
          ]
            .filter(Boolean)
            .join(" · "),
        },
        ...selectedLive.relatedBookings.slice(0, 3).map((b) => ({
          label: `Booking ${b.Status || "created"}`,
          at: b.Date || b.created_at,
          detail: [b.Service, b.Time].filter(Boolean).join(" · ") || "Repair booking",
        })),
      ]
        .filter(Boolean)
        .sort((a, b) => (parseDate(b.at)?.getTime() || 0) - (parseDate(a.at)?.getTime() || 0))
    : [];

  const aiSummary = selectedLive
    ? [
        `${selectedLive.Name || "This customer"} is ${selectedLive.priority.toLowerCase()} priority (${selectedLive.score}% score).`,
        selectedLive.priorityReason,
        selectedLive.waitLabel === "Today"
          ? "A slot may be available today — notify now."
          : `Estimated wait: ${selectedLive.waitLabel}.`,
        selectedLive.service || selectedLive.issue
          ? `Requested: ${selectedLive.service || selectedLive.issue}.`
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <PageShell
      title="Waitlist"
      subtitle="Customers waiting for an open time."
      wide
      actions={
        <>
          <button
            type="button"
            className="ui-press"
            onClick={() => exportToCSV(filtered, "waitlist.csv")}
            style={{
              ...secondaryBtnStyle(t),
              padding: "0 16px",
              height: 40,
              fontSize: 13,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            <Download size={15} strokeWidth={2} />
            Export
          </button>
          <button
            type="button"
            className="ui-press"
            onClick={notifyAll}
            {...primaryBtnHoverProps(t)}
            style={{
              ...primaryBtnStyle(t),
              padding: "0 16px",
              height: 40,
              fontSize: 13,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            <Bell size={15} strokeWidth={2} />
            Notify All
          </button>
        </>
      }
    >
      <style>{`
        .wl-kpi-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
        .wl-list-head, .wl-row {
          display: grid;
          grid-template-columns: minmax(180px, 1.35fr) minmax(90px, 0.85fr) minmax(110px, 1fr) 88px 110px 96px 100px 108px 48px;
          gap: 12px;
          align-items: center;
        }
        .wl-row {
          min-height: 72px;
          padding: 14px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: background 160ms cubic-bezier(0.2, 0, 0, 1);
        }
        .wl-row:hover { background: ${dark ? "rgba(255,255,255,0.035)" : "rgba(15,17,21,0.03)"}; }
        .wl-icon-btn { transition: color 150ms ease, background 150ms ease, border-color 150ms ease; }
        .wl-icon-btn:hover { color: ${t.textPrimary}; border-color: ${t.borderHover}; background: ${dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"}; }
        @media (max-width: 1180px) {
          .wl-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .wl-list-head, .wl-row {
            grid-template-columns: minmax(160px, 1.3fr) minmax(90px, 0.8fr) 88px 96px 108px 48px;
          }
          .wl-col-issue, .wl-col-requested, .wl-col-score { display: none; }
        }
        @media (max-width: 720px) {
          .wl-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .wl-list-head { display: none; }
          .wl-row { grid-template-columns: 1fr auto; gap: 10px; }
          .wl-col-device, .wl-col-priority, .wl-col-wait, .wl-col-status { display: none; }
        }
      `}</style>

      {/* Queue summary */}
      <div className="wl-kpi-grid" style={{ marginBottom: 32 }}>
        <KpiCard
          label="Waiting Customers"
          value={metrics.waiting.toLocaleString()}
          trend={metrics.trends.waiting}
          spark={metrics.sparks.waiting}
          sparkColor={t.accent}
          t={t}
          onClick={() => setFilter("Waiting")}
        />
        <KpiCard
          label="Average Wait Time"
          value={metrics.avgWaitLabel}
          trend={metrics.trends.avgWait}
          spark={metrics.sparks.avgWait}
          sparkColor="#D97706"
          t={t}
          invertTrend
        />
        <KpiCard
          label="Today's Open Slots"
          value={metrics.todayOpen.toLocaleString()}
          trend={metrics.trends.todayOpen}
          spark={metrics.sparks.todayOpen}
          sparkColor="#059669"
          t={t}
          onClick={() => navigate("/slots")}
        />
        <KpiCard
          label="Customers Notified"
          value={metrics.notified.toLocaleString()}
          trend={metrics.trends.notified}
          spark={metrics.sparks.notified}
          sparkColor="#3B82F6"
          t={t}
          onClick={() => setFilter("Notified")}
        />
        <KpiCard
          label="Conversion Rate"
          value={`${metrics.rate}%`}
          trend={metrics.trends.rate}
          spark={metrics.sparks.rate}
          sparkColor={t.accent}
          t={t}
          onClick={() => setFilter("Booked")}
        />
      </div>

      {/* AI Insights */}
      {enriched.length > 0 && (
        <div
          style={{
            marginBottom: 32,
            borderRadius: radius.lg,
            background: t.cardBg,
            border: `1px solid ${t.border}`,
            boxShadow: t.cardShadow,
            padding: "22px 24px",
            transition: `border-color ${duration.fast} ${ease.standard}, box-shadow ${duration.fast} ${ease.standard}, transform ${duration.fast} ${ease.standard}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = t.borderHover;
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = t.cardShadowHover || t.cardShadow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = t.border;
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = t.cardShadow;
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: dark ? "rgba(244,63,94,0.12)" : "rgba(244,63,94,0.08)",
                color: dark ? "#F43F5E" : "#E11D48",
                flexShrink: 0,
              }}
            >
              <Sparkles size={16} strokeWidth={2} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: t.textMuted,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                AI Queue Insights
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: t.textPrimary,
                  letterSpacing: -0.2,
                  lineHeight: 1.4,
                }}
              >
                {insights.headline}
              </div>
            </div>
            {insights.recommend && (
              <button
                type="button"
                className="ui-press"
                onClick={() => notifyCustomer(insights.recommend)}
                style={{
                  ...secondaryBtnStyle(t),
                  height: 36,
                  padding: "0 14px",
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                  fontFamily: "inherit",
                }}
              >
                Notify
                <ArrowRight size={14} strokeWidth={2} />
              </button>
            )}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {insights.lines.map((line, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 0",
                  borderTop: `1px solid ${t.borderSub || t.border}`,
                  fontSize: 14,
                  color: t.textSecondary,
                  lineHeight: 1.45,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: toneDot(line.tone),
                    marginTop: 7,
                    flexShrink: 0,
                  }}
                />
                <span>{line.plain}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search
          size={18}
          strokeWidth={1.75}
          color={t.textMuted}
          style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or preferred day…"
          style={{
            width: "100%",
            height: 52,
            padding: "0 16px 0 48px",
            borderRadius: 14,
            background: t.inputBg,
            border: `1px solid ${t.border}`,
            fontSize: 15,
            color: t.textPrimary,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
            transition: `border-color ${duration.fast} ${ease.standard}, box-shadow ${duration.fast} ${ease.standard}`,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = t.accent;
            e.target.style.boxShadow = `0 0 0 3px ${dark ? "rgba(244,63,94,0.18)" : "rgba(244,63,94,0.12)"}`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = t.border;
            e.target.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ overflowX: "auto", maxWidth: "100%", paddingBottom: 2 }}>
          <SegmentedControl
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            layoutId="waitlistStatusFilter"
          />
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>
          {filtered.length} of {enriched.length}
        </div>
      </div>

      {/* Queue / Empty */}
      {enriched.length === 0 ? (
        <WaitlistEmpty
          t={t}
          onCalendar={() => navigate("/slots")}
          onLearn={() =>
            showToast("When slots fill up, customers who request those dates join this queue automatically.")
          }
        />
      ) : filtered.length === 0 ? (
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.border}`,
            borderRadius: radius.lg,
            padding: "48px 24px",
            textAlign: "center",
            color: t.textMuted,
            fontSize: 14,
          }}
        >
          No customers match this search or filter.
        </div>
      ) : (
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.border}`,
            borderRadius: radius.lg,
            boxShadow: t.cardShadow,
            overflow: "hidden",
          }}
        >
          <div
            className="wl-list-head"
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${t.borderSub || t.border}`,
              fontSize: 11,
              fontWeight: 500,
              color: t.textMuted,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <span>Customer</span>
            <span className="wl-col-device">Device</span>
            <span className="wl-col-issue">Issue</span>
            <span className="wl-col-priority">Priority</span>
            <span className="wl-col-requested">Requested</span>
            <span className="wl-col-wait">Est. Wait</span>
            <span className="wl-col-score">Lead Score</span>
            <span className="wl-col-status">Status</span>
            <span />
          </div>
          <div style={{ padding: 8 }}>
            {filtered.map((entry, i) => (
              <motion.div
                key={entry.key}
                className="wl-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2), ease: EASE }}
                onClick={() => openEntry(entry)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEntry(entry);
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <QueueAvatar name={entry.Name} t={t} dark={dark} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: t.textPrimary,
                        letterSpacing: -0.1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.Name || "Unknown"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: t.textMuted,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatPhone(entry.Phone)}
                    </div>
                  </div>
                </div>
                <div
                  className="wl-col-device"
                  style={{
                    fontSize: 13,
                    color: t.textSecondary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.device || "—"}
                </div>
                <div
                  className="wl-col-issue"
                  style={{
                    fontSize: 13,
                    color: t.textMuted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.issue || "—"}
                </div>
                <div className="wl-col-priority">
                  <SoftPill label={entry.priority} map={priorityMap} dark={dark} />
                </div>
                <div
                  className="wl-col-requested"
                  style={{ fontSize: 13, color: t.textSecondary }}
                >
                  {entry.preferred || formatDate(entry.added)}
                </div>
                <div
                  className="wl-col-wait"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: entry.waitDays <= 0 ? "#047857" : t.textPrimary,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {entry.waitLabel}
                </div>
                <div className="wl-col-score">
                  <ScorePill score={entry.score} dark={dark} />
                </div>
                <div className="wl-col-status">
                  <SoftPill label={entry.status} map={statusMap} dark={dark} />
                </div>
                <RowActions
                  entry={entry}
                  t={t}
                  onOpen={openEntry}
                  onNotify={notifyCustomer}
                  onWhatsApp={(e) => window.open(whatsappLink(e.Phone), "_blank", "noopener,noreferrer")}
                  onAssign={() => navigate("/slots")}
                  onRemove={removeEntry}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Detail drawer */}
      <Sheet
        open={Boolean(selectedLive)}
        onClose={() => setSelected(null)}
        title={selectedLive?.Name || "Customer"}
        subtitle={
          selectedLive
            ? `${selectedLive.priority} priority · ${selectedLive.waitLabel}`
            : ""
        }
        width={460}
        footer={
          selectedLive ? (
            <>
              {selectedLive.status === "Waiting" && (
                <button
                  type="button"
                  className="ui-press"
                  onClick={() => notifyCustomer(selectedLive)}
                  {...primaryBtnHoverProps(t)}
                  style={{
                    ...primaryBtnStyle(t),
                    padding: "0 14px",
                    height: 40,
                    fontSize: 13,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "inherit",
                  }}
                >
                  <Bell size={14} strokeWidth={2} />
                  Notify Customer
                </button>
              )}
              <a
                href={whatsappLink(selectedLive.Phone)}
                target="_blank"
                rel="noreferrer"
                className="ui-press"
                style={{
                  ...(selectedLive.status === "Waiting" ? secondaryBtnStyle(t) : primaryBtnStyle(t)),
                  padding: "0 14px",
                  height: 40,
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                  fontFamily: "inherit",
                }}
              >
                <MessageCircle size={14} strokeWidth={2} />
                WhatsApp
              </a>
              <a
                href={`tel:${String(selectedLive.Phone || "").replace(/\D/g, "")}`}
                className="ui-press"
                style={{
                  ...secondaryBtnStyle(t),
                  padding: "0 14px",
                  height: 40,
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                  fontFamily: "inherit",
                }}
              >
                <Phone size={14} strokeWidth={2} />
                Call
              </a>
              <button
                type="button"
                className="ui-press"
                onClick={() => navigate("/slots")}
                style={{
                  ...secondaryBtnStyle(t),
                  padding: "0 14px",
                  height: 40,
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "inherit",
                }}
              >
                <CalendarPlus size={14} strokeWidth={2} />
                Assign Slot
              </button>
            </>
          ) : null
        }
      >
        {selectedLive && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              <SoftPill label={selectedLive.status} map={statusMap} dark={dark} />
              <SoftPill label={selectedLive.priority} map={priorityMap} dark={dark} />
              <ScorePill score={selectedLive.score} dark={dark} />
              {selectedLive.tier === "VIP" && (
                <SoftPill
                  label="VIP"
                  map={{
                    light: { VIP: STATUS_STYLE.Booked },
                    dark: { VIP: STATUS_STYLE_DARK.Booked },
                  }}
                  dark={dark}
                />
              )}
            </div>

            <DrawerSection title="Customer" t={t}>
              <MetaRow icon={User} label="Name" value={selectedLive.Name} t={t} />
              <MetaRow icon={Phone} label="Phone" value={formatPhone(selectedLive.Phone)} t={t} />
              <MetaRow icon={Mail} label="Email" value={selectedLive.Email} t={t} />
              <MetaRow icon={Smartphone} label="Device" value={selectedLive.device} t={t} />
              <MetaRow icon={Wrench} label="Issue / Service" value={selectedLive.issue || selectedLive.service} t={t} />
              <MetaRow icon={Calendar} label="Preferred day" value={selectedLive.preferred} t={t} />
              <MetaRow icon={Clock} label="Joined" value={formatDate(selectedLive.added)} t={t} />
            </DrawerSection>

            <DrawerSection title="AI Summary" t={t}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: t.textSecondary }}>
                {aiSummary}
              </p>
            </DrawerSection>

            <DrawerSection title="Priority Reason" t={t}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: t.textSecondary }}>
                {selectedLive.priorityReason}
              </p>
            </DrawerSection>

            <DrawerSection title="Estimated Availability" t={t}>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `1px solid ${t.border}`,
                  background: dark ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.02)",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    color: selectedLive.waitDays <= 0 ? "#047857" : t.textPrimary,
                    letterSpacing: -0.4,
                    marginBottom: 4,
                  }}
                >
                  {selectedLive.waitLabel}
                </div>
                <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.45 }}>
                  {selectedLive.nextSlot
                    ? `${formatDate(selectedLive.nextSlot.Date)}${
                        selectedLive.nextSlot.Time ? ` · ${selectedLive.nextSlot.Time}` : ""
                      }`
                    : "No matching open slot yet — we'll estimate from preferred day and capacity."}
                </div>
              </div>
            </DrawerSection>

            <DrawerSection title="Conversation" t={t}>
              {selectedLive.chatHistory?.length > 0 ? (
                <ConversationHistory messages={selectedLive.chatHistory} />
              ) : (
                <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
                  No conversation linked yet. Matching chat threads will appear here.
                </div>
              )}
            </DrawerSection>

            <DrawerSection title="Booking History" t={t}>
              {selectedLive.relatedBookings.length === 0 ? (
                <div style={{ fontSize: 13, color: t.textMuted }}>No bookings yet for this customer.</div>
              ) : (
                selectedLive.relatedBookings.map((b, i) => (
                  <div
                    key={b["Booking ID"] || i}
                    style={{
                      padding: "12px 0",
                      borderBottom:
                        i < selectedLive.relatedBookings.length - 1
                          ? `1px solid ${t.borderSub || t.border}`
                          : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>
                        {b.Service || "Repair"}
                      </span>
                      <StatusBadge status={b.Status || "Pending"} />
                    </div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                      {[formatDate(b.Date), b.Time].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                ))
              )}
            </DrawerSection>

            <DrawerSection title="Timeline" t={t}>
              {timeline.length === 0 ? (
                <div style={{ fontSize: 13, color: t.textMuted }}>No timeline events yet.</div>
              ) : (
                timeline.map((ev, i) => (
                  <div
                    key={`${ev.label}-${i}`}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom:
                        i < timeline.length - 1 ? `1px solid ${t.borderSub || t.border}` : "none",
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: t.accent,
                        marginTop: 7,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary }}>{ev.label}</div>
                      <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                        {ev.detail}
                        {ev.at ? ` · ${timeAgo(ev.at)}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </DrawerSection>

            <DrawerSection title="Quick Actions" t={t}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selectedLive.status === "Waiting" && (
                  <button
                    type="button"
                    className="ui-press"
                    onClick={() => notifyCustomer(selectedLive)}
                    style={{
                      ...secondaryBtnStyle(t),
                      height: 36,
                      padding: "0 12px",
                      fontSize: 13,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "inherit",
                    }}
                  >
                    <Bell size={14} />
                    Notify Customer
                  </button>
                )}
                <button
                  type="button"
                  className="ui-press"
                  onClick={() => navigate("/slots")}
                  style={{
                    ...secondaryBtnStyle(t),
                    height: 36,
                    padding: "0 12px",
                    fontSize: 13,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "inherit",
                  }}
                >
                  <CalendarPlus size={14} />
                  Assign Slot
                </button>
                <button
                  type="button"
                  className="ui-press"
                  onClick={() => removeEntry(selectedLive)}
                  style={{
                    ...secondaryBtnStyle(t),
                    height: 36,
                    padding: "0 12px",
                    fontSize: 13,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#E11D48",
                    borderColor: "rgba(225,29,72,0.28)",
                    fontFamily: "inherit",
                  }}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            </DrawerSection>
          </>
        )}
      </Sheet>
    </PageShell>
  );
}
