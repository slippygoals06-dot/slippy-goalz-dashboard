import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  Upload,
  Phone,
  MessageCircle,
  CalendarPlus,
  BadgeCheck,
  Archive,
  Trash2,
  Sparkles,
  ArrowRight,
  MoreHorizontal,
  Mail,
  Smartphone,
  Clock,
  User,
  CheckCircle2,
  Circle,
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
import ConfirmModal from "../components/ConfirmModal";
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
import { deleteLead } from "../api";
import { spacing, radius, duration, ease } from "../design-system/tokens";

const FILTERS = ["All", "New", "Contacted", "Qualified", "Booked", "Lost", "VIP"];
const EASE = [0.2, 0, 0, 1];
const NOTES_KEY = "slippy.leads.notes";
const TASKS_KEY = "slippy.leads.tasks";
const STATUS_KEY = "slippy.leads.statusOverrides";

const SOURCE_STYLE = {
  WhatsApp: { bg: "rgba(37,211,102,0.10)", color: "#1B7A3D", ring: "rgba(37,211,102,0.22)" },
  Website: { bg: "rgba(15,17,21,0.04)", color: "#5C6370", ring: "rgba(15,17,21,0.10)" },
  Instagram: { bg: "#FDF2F8", color: "#DB2777", ring: "#FBCFE8" },
  Facebook: { bg: "#EFF6FF", color: "#1877F2", ring: "#BFDBFE" },
  Google: { bg: "rgba(234,67,53,0.08)", color: "#C5221F", ring: "rgba(234,67,53,0.18)" },
  "Walk-in": { bg: "rgba(5,150,105,0.08)", color: "#047857", ring: "rgba(5,150,105,0.18)" },
  "AI Assistant": { bg: "rgba(244,63,94,0.08)", color: "#BE123C", ring: "rgba(244,63,94,0.18)" },
};

const SOURCE_STYLE_DARK = {
  WhatsApp: { bg: "rgba(37,211,102,0.14)", color: "#4ADE80", ring: "rgba(37,211,102,0.28)" },
  Website: { bg: "rgba(255,255,255,0.06)", color: "#A1A8B3", ring: "rgba(255,255,255,0.10)" },
  Instagram: { bg: "rgba(225,48,108,0.16)", color: "#F472B6", ring: "rgba(225,48,108,0.30)" },
  Facebook: { bg: "rgba(24,119,242,0.14)", color: "#60A5FA", ring: "rgba(24,119,242,0.30)" },
  Google: { bg: "rgba(234,67,53,0.16)", color: "#F87171", ring: "rgba(234,67,53,0.28)" },
  "Walk-in": { bg: "rgba(16,185,129,0.14)", color: "#34D399", ring: "rgba(16,185,129,0.28)" },
  "AI Assistant": { bg: "#FFF1F2", color: "#E11D48", ring: "#FECDD3" },
};

const STATUS_STYLE = {
  New: { bg: "rgba(59,130,246,0.10)", color: "#1D4ED8", ring: "rgba(59,130,246,0.20)" },
  Contacted: { bg: "rgba(245,158,11,0.10)", color: "#B45309", ring: "rgba(245,158,11,0.22)" },
  Qualified: { bg: "rgba(139,92,246,0.10)", color: "#6D28D9", ring: "rgba(139,92,246,0.22)" },
  Booked: { bg: "rgba(5,150,105,0.10)", color: "#047857", ring: "rgba(5,150,105,0.22)" },
  Lost: { bg: "rgba(15,17,21,0.04)", color: "#5C6370", ring: "rgba(15,17,21,0.10)" },
  VIP: { bg: "rgba(244,63,94,0.10)", color: "#BE123C", ring: "rgba(244,63,94,0.22)" },
};

const STATUS_STYLE_DARK = {
  New: { bg: "rgba(59,130,246,0.16)", color: "#93C5FD", ring: "rgba(59,130,246,0.28)" },
  Contacted: { bg: "rgba(245,158,11,0.14)", color: "#FBBF24", ring: "rgba(245,158,11,0.28)" },
  Qualified: { bg: "rgba(139,92,246,0.16)", color: "#C4B5FD", ring: "rgba(139,92,246,0.28)" },
  Booked: { bg: "rgba(16,185,129,0.14)", color: "#34D399", ring: "rgba(16,185,129,0.28)" },
  Lost: { bg: "rgba(255,255,255,0.06)", color: "#A1A8B3", ring: "rgba(255,255,255,0.10)" },
  VIP: { bg: "#FFF1F2", color: "#E11D48", ring: "#FECDD3" },
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
    /* ignore quota */
  }
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

function daysAgo(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return 999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function isToday(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return false;
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function normalizeSource(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "AI Assistant";
  if (s.includes("whatsapp") || s === "wa") return "WhatsApp";
  if (s.includes("instagram") || s === "ig") return "Instagram";
  if (s.includes("facebook") || s === "fb") return "Facebook";
  if (s.includes("google")) return "Google";
  if (s.includes("walk")) return "Walk-in";
  if (s.includes("website") || s.includes("web") || s.includes("booking")) return "Website";
  if (s.includes("ai") || s.includes("bot") || s.includes("assistant")) return "AI Assistant";
  return raw.length < 24 ? raw : "AI Assistant";
}

function scoreBand(score) {
  if (score >= 80) return { label: "Hot", tone: "hot" };
  if (score >= 55) return { label: "Warm", tone: "warm" };
  return { label: "Cold", tone: "cold" };
}

function computeLeadScore(lead, relatedBookings, chatHit) {
  let score = 38;
  if (lead.Device) score += 14;
  if (lead.Issue) score += 14;
  if ((lead.Name || "").trim().split(/\s+/).length >= 2) score += 8;
  if (lead.Phone) score += 6;
  if (lead.Email || lead.email) score += 4;

  const age = daysAgo(lead.created_at);
  if (age <= 0) score += 22;
  else if (age <= 2) score += 16;
  else if (age <= 7) score += 8;
  else if (age <= 14) score += 2;
  else if (age > 30) score -= 12;

  if (chatHit) score += 10;
  if (relatedBookings.some((b) => b.Status === "Pending")) score += 12;
  if (relatedBookings.some((b) => b.Status === "Confirmed" || b.Status === "Completed")) score += 18;

  return Math.max(8, Math.min(99, Math.round(score)));
}

function deriveStatus(lead, relatedBookings, chatHit, tier, override) {
  if (override) return override;
  if (tier === "VIP") return "VIP";
  const active = relatedBookings.filter((b) => b.Status !== "Rejected" && b.Status !== "Cancelled");
  if (active.some((b) => b.Status === "Confirmed" || b.Status === "Completed")) return "Booked";
  if (active.some((b) => b.Status === "Pending")) return "Qualified";
  if (chatHit) return "Contacted";
  if (daysAgo(lead.created_at) <= 2) return "New";
  if (daysAgo(lead.created_at) > 21 && active.length === 0) return "Lost";
  return "New";
}

function sparkSeries(leads, days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const v = leads.filter((l) => {
      const ld = parseDate(l.created_at);
      return ld && ld.toDateString() === key;
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

function SourceBadge({ source, dark }) {
  const map = dark ? SOURCE_STYLE_DARK : SOURCE_STYLE;
  const cfg = map[source] || map.Website;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 500,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.ring}`,
        whiteSpace: "nowrap",
      }}
    >
      {source}
    </span>
  );
}

function LeadAvatar({ name, size = 40, t, dark }) {
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

function KpiCard({ label, value, trend, spark, sparkColor, onClick, t }) {
  const hover = cardHoverProps(t);
  const flat = trend == null || trend === 0;
  const up = typeof trend === "number" && trend > 0;
  const trendText =
    trend == null
      ? null
      : flat
        ? "Steady"
        : `${up ? "+" : ""}${trend}%`;

  return (
    <button
      type="button"
      className="ui-press leads-kpi"
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
              color: !flat && up ? "#059669" : t.textMuted,
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

function LeadsSkeleton() {
  const { theme: t } = useTheme();
  return (
    <PageShell
      title="Leads"
      subtitle="Potential customers collected by your AI assistant."
    >
      <style>{`
        .sk-wave{position:relative;overflow:hidden;background:${t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"};border:1px solid ${t.border}}
        .sk-wave::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,${t.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)"},transparent);animation:skWave 1.4s ease-in-out infinite}
        @keyframes skWave{100%{transform:translateX(100%)}}
        @media (prefers-reduced-motion: reduce){.sk-wave::after{animation:none}}
      `}</style>
      <div
        className="leads-kpi-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 32 }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} height={140} radius={18} style={{ animationDelay: `${i * 50}ms` }} />
        ))}
      </div>
      <SkeletonBlock height={96} radius={18} style={{ marginBottom: 32 }} />
      <SkeletonBlock height={48} radius={12} style={{ marginBottom: 16 }} />
      <SkeletonBlock height={36} radius={10} style={{ marginBottom: 24, width: 420, maxWidth: "100%" }} />
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

function LeadsEmpty({ onImport, onTest, t }) {
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
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden style={{ marginBottom: 24, color: t.textMuted }}>
        <rect x="12" y="20" width="72" height="56" rx="16" fill="currentColor" opacity="0.06" />
        <circle cx="36" cy="44" r="10" fill="currentColor" opacity="0.14" />
        <path
          d="M24 64c3-8 8.5-12 12-12s9 4 12 12"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.28"
          strokeLinecap="round"
        />
        <rect x="54" y="38" width="22" height="3.5" rx="1.75" fill="currentColor" opacity="0.18" />
        <rect x="54" y="48" width="16" height="3.5" rx="1.75" fill="currentColor" opacity="0.12" />
        <circle cx="68" cy="66" r="14" fill="var(--olive, #F43F5E)" opacity="0.92" />
        <path d="M68 59v14M61 66h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="78" cy="28" r="6" fill="currentColor" opacity="0.08" />
        <circle cx="22" cy="28" r="4" fill="currentColor" opacity="0.06" />
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
        Your AI hasn&apos;t captured any leads yet.
      </div>
      <p
        style={{
          fontSize: 14,
          color: t.textMuted,
          lineHeight: 1.55,
          maxWidth: 420,
          margin: "0 0 28px",
        }}
      >
        Once customers interact with your AI assistant, they&apos;ll automatically appear here with lead
        scoring and follow-up suggestions.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          className="ui-press"
          onClick={onTest}
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
          <Sparkles size={16} strokeWidth={2} />
          Test AI Assistant
        </button>
        <button
          type="button"
          className="ui-press"
          onClick={onImport}
          style={{
            ...secondaryBtnStyle(t),
            padding: "0 20px",
            height: 44,
            fontSize: 14,
            fontFamily: "inherit",
          }}
        >
          Import Leads
        </button>
      </div>
    </div>
  );
}

function RowActions({ lead, onOpen, onWhatsApp, onQualify, onArchive, onDelete, t }) {
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
    { label: "Open", onClick: () => onOpen(lead) },
    { label: "WhatsApp", onClick: () => onWhatsApp(lead) },
    lead.status !== "Qualified" && lead.status !== "Booked" && {
      label: "Mark Qualified",
      onClick: () => onQualify(lead),
    },
    lead.status !== "Lost" && { label: "Archive", onClick: () => onArchive(lead) },
    lead.id && { label: "Delete", onClick: () => onDelete(lead), danger: true },
  ].filter(Boolean);

  return (
    <div ref={ref} style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="ui-press leads-icon-btn"
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
              minWidth: 168,
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

export default function Leads() {
  const navigate = useNavigate();
  const leads = useStore((s) => s.leads);
  const bookings = useStore((s) => s.bookings);
  const invoices = useStore((s) => s.invoices);
  const chats = useStore((s) => s.chats);
  const loading = useStore((s) => s.loading);
  const { theme: t, dark } = useTheme();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [statusOverrides, setStatusOverrides] = useState(() => loadMap(STATUS_KEY));
  const [notesMap, setNotesMap] = useState(() => loadMap(NOTES_KEY));
  const [tasksMap, setTasksMap] = useState(() => loadMap(TASKS_KEY));
  const [noteDraft, setNoteDraft] = useState("");
  const [taskDraft, setTaskDraft] = useState("");
  const searchRef = useRef(null);

  const enriched = useMemo(() => {
    return (leads || []).map((lead) => {
      const relatedBookings = (bookings || []).filter((b) => phonesMatch(b.Phone, lead.Phone));
      const chatHit = (chats || []).find((c) => {
        const collected = c.collected || c.Collected || {};
        const phone = collected.phone || c.phone || c.Phone;
        return phonesMatch(phone, lead.Phone);
      });
      const tier = getCustomerTier(lead.Phone, bookings, invoices);
      const override = statusOverrides[lead.id];
      const score = computeLeadScore(lead, relatedBookings, chatHit);
      const status = deriveStatus(lead, relatedBookings, chatHit, tier, override);
      const source = normalizeSource(
        lead.Source || lead.source || chatHit?.channel || chatHit?.Channel || "AI Assistant"
      );
      const email =
        lead.Email || lead.email || relatedBookings.find((b) => b.Email)?.Email || null;
      const lastContact =
        chatHit?.updated_at ||
        chatHit?.updatedAt ||
        relatedBookings[0]?.["Date Updated"] ||
        relatedBookings[0]?.updated_at ||
        lead.created_at;
      const band = scoreBand(score);
      const history = Array.isArray(chatHit?.history)
        ? chatHit.history
        : Array.isArray(chatHit?.messages)
          ? chatHit.messages
          : [];

      return {
        ...lead,
        score,
        band,
        status,
        source,
        email,
        lastContact,
        tier,
        relatedBookings,
        chatHistory: history,
        chatHit,
      };
    });
  }, [leads, bookings, invoices, chats, statusOverrides]);

  const metrics = useMemo(() => {
    const total = enriched.length;
    const hot = enriched.filter((l) => l.band.label === "Hot").length;
    const converted = enriched.filter((l) => l.status === "Booked").length;
    const rate = total ? Math.round((converted / total) * 100) : 0;
    const today = enriched.filter((l) => isToday(l.created_at)).length;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const prevWeekAgo = new Date();
    prevWeekAgo.setDate(prevWeekAgo.getDate() - 14);

    const thisWeek = enriched.filter((l) => {
      const d = parseDate(l.created_at);
      return d && d >= weekAgo;
    }).length;
    const lastWeek = enriched.filter((l) => {
      const d = parseDate(l.created_at);
      return d && d >= prevWeekAgo && d < weekAgo;
    }).length;

    const pct = (cur, prev) => {
      if (prev === 0 && cur === 0) return 0;
      if (prev === 0) return 100;
      return Math.round(((cur - prev) / prev) * 100);
    };

    const hotThis = enriched.filter((l) => {
      const d = parseDate(l.created_at);
      return l.band.label === "Hot" && d && d >= weekAgo;
    }).length;
    const hotLast = enriched.filter((l) => {
      const d = parseDate(l.created_at);
      return l.band.label === "Hot" && d && d >= prevWeekAgo && d < weekAgo;
    }).length;

    return {
      total,
      hot,
      converted,
      rate,
      today,
      trends: {
        total: pct(thisWeek, lastWeek),
        hot: pct(hotThis, hotLast),
        converted: pct(
          enriched.filter((l) => l.status === "Booked" && parseDate(l.created_at) >= weekAgo).length,
          enriched.filter((l) => {
            const d = parseDate(l.created_at);
            return l.status === "Booked" && d && d >= prevWeekAgo && d < weekAgo;
          }).length
        ),
        rate: pct(rate, lastWeek ? Math.round((converted / Math.max(total, 1)) * 100) : rate),
        today: today > 0 ? 100 : 0,
      },
      sparks: {
        total: sparkSeries(enriched, 7),
        hot: sparkSeries(
          enriched.filter((l) => l.band.label === "Hot"),
          7
        ),
        converted: sparkSeries(
          enriched.filter((l) => l.status === "Booked"),
          7
        ),
        rate: sparkSeries(enriched, 7).map((p, i, arr) => ({
          v: Math.round((arr.slice(0, i + 1).reduce((s, x) => s + x.v, 0) / Math.max(i + 1, 1)) * 10) / 10,
        })),
        today: sparkSeries(enriched, 7),
      },
    };
  }, [enriched]);

  const insights = useMemo(() => {
    const uncontacted = enriched.filter((l) => l.status === "New").length;
    const sourceCounts = {};
    enriched.forEach((l) => {
      sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
    });
    const bookedBySource = {};
    enriched
      .filter((l) => l.status === "Booked")
      .forEach((l) => {
        bookedBySource[l.source] = (bookedBySource[l.source] || 0) + 1;
      });
    let bestSource = null;
    let bestRate = -1;
    Object.keys(sourceCounts).forEach((src) => {
      const rate = (bookedBySource[src] || 0) / sourceCounts[src];
      if (rate > bestRate || (rate === bestRate && sourceCounts[src] > (sourceCounts[bestSource] || 0))) {
        bestRate = rate;
        bestSource = src;
      }
    });

    const stale = enriched
      .filter((l) => l.status === "New" || l.status === "Contacted")
      .sort((a, b) => b.score - a.score);
    const top = stale[0];

    const lines = [];
    if (uncontacted > 0) {
      lines.push({
        tone: "warn",
        plain: `${uncontacted} lead${uncontacted === 1 ? "" : "s"} haven't been contacted.`,
      });
    }
    if (bestSource && enriched.length > 0) {
      lines.push({
        tone: "ok",
        plain: `Highest conversion source is ${bestSource}.`,
      });
    }
    const avgAge =
      enriched.length === 0
        ? 0
        : Math.round(enriched.reduce((s, l) => s + daysAgo(l.created_at), 0) / enriched.length);
    if (avgAge > 5 && uncontacted > 0) {
      lines.push({
        tone: "warn",
        plain: "Average response time increased — follow up sooner.",
      });
    } else if (metrics.hot > 0) {
      lines.push({
        tone: "info",
        plain: `${metrics.hot} hot lead${metrics.hot === 1 ? "" : "s"} ready for outreach.`,
      });
    }
    if (top) {
      lines.push({
        tone: "info",
        plain: `Recommend following up with ${top.Name || "this lead"}.`,
        lead: top,
      });
    }
    if (lines.length === 0) {
      lines.push({
        tone: "ok",
        plain: "Pipeline looks healthy — keep capturing leads via your AI.",
      });
    }

    return {
      headline: lines[0]?.plain || "AI insights for your pipeline",
      lines: lines.slice(0, 4),
      recommend: top,
    };
  }, [enriched, metrics.hot]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched
      .filter((l) => {
        if (filter === "All") return true;
        return l.status === filter;
      })
      .filter((l) => {
        if (!q) return true;
        return (
          l.Name?.toLowerCase().includes(q) ||
          l.Phone?.includes(search.trim()) ||
          l.Device?.toLowerCase().includes(q) ||
          l.Issue?.toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q) ||
          l.source?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.score - a.score || daysAgo(a.created_at) - daysAgo(b.created_at));
  }, [enriched, filter, search]);

  function setOverride(leadId, status) {
    setStatusOverrides((prev) => {
      const next = { ...prev, [leadId]: status };
      saveMap(STATUS_KEY, next);
      return next;
    });
  }

  function saveNote(leadId, text) {
    if (!text.trim()) return;
    setNotesMap((prev) => {
      const list = [...(prev[leadId] || [])];
      list.unshift({ id: Date.now(), text: text.trim(), at: new Date().toISOString() });
      const next = { ...prev, [leadId]: list };
      saveMap(NOTES_KEY, next);
      return next;
    });
    setNoteDraft("");
    showToast("Note saved");
  }

  function addTask(leadId, text) {
    if (!text.trim()) return;
    setTasksMap((prev) => {
      const list = [...(prev[leadId] || [])];
      list.push({ id: Date.now(), text: text.trim(), done: false, at: new Date().toISOString() });
      const next = { ...prev, [leadId]: list };
      saveMap(TASKS_KEY, next);
      return next;
    });
    setTaskDraft("");
    showToast("Task added");
  }

  function toggleTask(leadId, taskId) {
    setTasksMap((prev) => {
      const list = (prev[leadId] || []).map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      );
      const next = { ...prev, [leadId]: list };
      saveMap(TASKS_KEY, next);
      return next;
    });
  }

  async function confirmDelete() {
    if (!deleteTarget?.id) return;
    setDeleteBusy(true);
    try {
      await deleteLead(deleteTarget.id);
      useStore.setState((state) => ({
        leads: state.leads.filter((l) => l.id !== deleteTarget.id),
      }));
      if (selected?.id === deleteTarget.id) setSelected(null);
      showToast("Lead deleted");
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to delete lead", "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  function openLead(lead) {
    setSelected(lead);
    setNoteDraft("");
    setTaskDraft("");
  }

  if (loading) return <LeadsSkeleton />;

  const statusMap = {
    light: STATUS_STYLE,
    dark: STATUS_STYLE_DARK,
  };

  const toneDot = (tone) => {
    if (tone === "warn") return t.warning || "#F59E0B";
    if (tone === "ok") return "#059669";
    return t.accent || "#F43F5E";
  };

  const selectedLive = selected
    ? enriched.find((l) => (l.id && l.id === selected.id) || (l.Phone === selected.Phone && l.Name === selected.Name)) ||
      selected
    : null;

  const timeline = selectedLive
    ? [
        {
          label: "Lead captured",
          at: selectedLive.created_at,
          detail: `Via ${selectedLive.source}`,
        },
        ...(selectedLive.chatHit
          ? [
              {
                label: "Conversation started",
                at: selectedLive.chatHit.created_at || selectedLive.chatHit.updated_at || selectedLive.created_at,
                detail: "AI assistant engaged",
              },
            ]
          : []),
        ...selectedLive.relatedBookings.slice(0, 4).map((b) => ({
          label: `Booking ${b.Status || "created"}`,
          at: b.Date || b.created_at,
          detail: [b.Service, b.Time].filter(Boolean).join(" · ") || "Repair booking",
        })),
        ...(notesMap[selectedLive.id] || []).slice(0, 3).map((n) => ({
          label: "Note added",
          at: n.at,
          detail: n.text,
        })),
      ].sort((a, b) => (parseDate(b.at)?.getTime() || 0) - (parseDate(a.at)?.getTime() || 0))
    : [];

  const aiSummary = selectedLive
    ? [
        `${selectedLive.Name || "This lead"} scored ${selectedLive.score}% (${selectedLive.band.label}).`,
        selectedLive.Device || selectedLive.Issue
          ? `Interested in ${[selectedLive.Device, selectedLive.Issue].filter(Boolean).join(" — ")}.`
          : "Device and issue details are incomplete.",
        selectedLive.status === "Booked"
          ? "Already converted into a booking — nurture for repeat work."
          : selectedLive.status === "New"
            ? "No outreach yet — a quick WhatsApp reply can lift conversion."
            : `Current stage: ${selectedLive.status}.`,
        selectedLive.source ? `Source: ${selectedLive.source}.` : null,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <PageShell
      title="Leads"
      subtitle="Potential customers collected by your AI assistant."
      wide
      actions={
        <>
          <button
            type="button"
            className="ui-press"
            onClick={() => exportToCSV(filtered, "leads.csv")}
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
            Export CSV
          </button>
          <button
            type="button"
            className="ui-press"
            onClick={() => showToast("Import coming soon")}
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
            <Upload size={15} strokeWidth={2} />
            Import
          </button>
        </>
      }
    >
      <style>{`
        .leads-kpi-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
        .leads-list-head, .leads-row {
          display: grid;
          grid-template-columns: minmax(180px, 1.4fr) minmax(100px, 0.9fr) minmax(120px, 1.1fr) 100px 110px 100px 110px 48px;
          gap: 12px;
          align-items: center;
        }
        .leads-row {
          min-height: 72px;
          padding: 14px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: background 160ms cubic-bezier(0.2, 0, 0, 1);
        }
        .leads-row:hover { background: ${dark ? "rgba(255,255,255,0.035)" : "rgba(15,17,21,0.03)"}; }
        .leads-icon-btn { transition: color 150ms ease, background 150ms ease, border-color 150ms ease; }
        .leads-icon-btn:hover { color: ${t.textPrimary}; border-color: ${t.borderHover}; background: ${dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"}; }
        @media (max-width: 1100px) {
          .leads-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .leads-list-head, .leads-row {
            grid-template-columns: minmax(160px, 1.3fr) minmax(90px, 0.8fr) 90px 100px 48px;
          }
          .leads-col-issue, .leads-col-contact, .leads-col-source { display: none; }
        }
        @media (max-width: 720px) {
          .leads-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .leads-list-head { display: none; }
          .leads-row {
            grid-template-columns: 1fr auto;
            gap: 10px;
          }
          .leads-col-device, .leads-col-score, .leads-col-status { display: none; }
        }
      `}</style>

      {/* Pipeline summary */}
      <div className="leads-kpi-grid" style={{ marginBottom: 32 }}>
        <KpiCard
          label="Total Leads"
          value={metrics.total.toLocaleString()}
          trend={metrics.trends.total}
          spark={metrics.sparks.total}
          sparkColor={t.accent}
          t={t}
          onClick={() => setFilter("All")}
        />
        <KpiCard
          label="Hot Leads"
          value={metrics.hot.toLocaleString()}
          trend={metrics.trends.hot}
          spark={metrics.sparks.hot}
          sparkColor="#E11D48"
          t={t}
          onClick={() => {
            setFilter("All");
            setSearch("");
          }}
        />
        <KpiCard
          label="Converted"
          value={metrics.converted.toLocaleString()}
          trend={metrics.trends.converted}
          spark={metrics.sparks.converted}
          sparkColor="#059669"
          t={t}
          onClick={() => setFilter("Booked")}
        />
        <KpiCard
          label="Conversion Rate"
          value={`${metrics.rate}%`}
          trend={metrics.trends.rate}
          spark={metrics.sparks.rate}
          sparkColor={t.accent}
          t={t}
        />
        <KpiCard
          label="Today's Leads"
          value={metrics.today.toLocaleString()}
          trend={metrics.today > 0 ? metrics.trends.today : 0}
          spark={metrics.sparks.today}
          sparkColor="#3B82F6"
          t={t}
        />
      </div>

      {/* AI Insights */}
      {enriched.length > 0 && (
        <div
          className="leads-ai"
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
                AI Insights
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
                onClick={() => openLead(insights.recommend)}
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
                Follow up
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
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer, phone, device, email, or issue…"
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
            layoutId="leadsStatusFilter"
          />
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>
          {filtered.length} of {enriched.length}
        </div>
      </div>

      {/* List / Empty */}
      {enriched.length === 0 ? (
        <LeadsEmpty
          t={t}
          onImport={() => showToast("Import coming soon")}
          onTest={() => navigate("/demo")}
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
          No leads match this search or filter.
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
            className="leads-list-head"
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
            <span className="leads-col-device">Device</span>
            <span className="leads-col-issue">Issue</span>
            <span className="leads-col-source">Source</span>
            <span className="leads-col-score">Lead Score</span>
            <span className="leads-col-contact">Last Contact</span>
            <span className="leads-col-status">Status</span>
            <span />
          </div>
          <div style={{ padding: 8 }}>
            {filtered.map((lead, i) => (
              <motion.div
                key={lead.id || `${lead.Phone}-${i}`}
                className="leads-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2), ease: EASE }}
                onClick={() => openLead(lead)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openLead(lead);
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <LeadAvatar name={lead.Name} t={t} dark={dark} />
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
                      {lead.Name || "Unknown"}
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
                      {formatPhone(lead.Phone)}
                    </div>
                  </div>
                </div>
                <div
                  className="leads-col-device"
                  style={{
                    fontSize: 13,
                    color: t.textSecondary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {lead.Device || "—"}
                </div>
                <div
                  className="leads-col-issue"
                  style={{
                    fontSize: 13,
                    color: t.textMuted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {lead.Issue || "—"}
                </div>
                <div className="leads-col-source">
                  <SourceBadge source={lead.source} dark={dark} />
                </div>
                <div className="leads-col-score">
                  <ScorePill score={lead.score} dark={dark} />
                </div>
                <div
                  className="leads-col-contact"
                  style={{ fontSize: 13, color: t.textMuted, fontVariantNumeric: "tabular-nums" }}
                >
                  {timeAgo(lead.lastContact)}
                </div>
                <div className="leads-col-status">
                  <SoftPill label={lead.status} map={statusMap} dark={dark} />
                </div>
                <RowActions
                  lead={lead}
                  t={t}
                  onOpen={openLead}
                  onWhatsApp={(l) => window.open(whatsappLink(l.Phone), "_blank", "noopener,noreferrer")}
                  onQualify={(l) => {
                    if (l.id) setOverride(l.id, "Qualified");
                    showToast("Marked as qualified");
                  }}
                  onArchive={(l) => {
                    if (l.id) setOverride(l.id, "Lost");
                    showToast("Lead archived");
                  }}
                  onDelete={(l) => setDeleteTarget({ id: l.id, name: l.Name })}
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
        title={selectedLive?.Name || "Lead"}
        subtitle={selectedLive ? `${selectedLive.score}% · ${selectedLive.band.label}` : ""}
        width={460}
        footer={
          selectedLive ? (
            <>
              <a
                href={whatsappLink(selectedLive.Phone)}
                target="_blank"
                rel="noreferrer"
                className="ui-press"
                style={{
                  ...primaryBtnStyle(t),
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
                onClick={() => navigate("/bookings")}
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
                Book Repair
              </button>
            </>
          ) : null
        }
      >
        {selectedLive && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              <SoftPill label={selectedLive.status} map={statusMap} dark={dark} />
              <ScorePill score={selectedLive.score} dark={dark} />
              <SourceBadge source={selectedLive.source} dark={dark} />
              {selectedLive.tier === "VIP" && (
                <SoftPill label="VIP" map={statusMap} dark={dark} />
              )}
            </div>

            <DrawerSection title="Customer" t={t}>
              <MetaRow icon={User} label="Name" value={selectedLive.Name} t={t} />
              <MetaRow icon={Phone} label="Phone" value={formatPhone(selectedLive.Phone)} t={t} />
              <MetaRow icon={Mail} label="Email" value={selectedLive.email} t={t} />
              <MetaRow icon={Smartphone} label="Device" value={selectedLive.Device} t={t} />
              <MetaRow icon={Sparkles} label="Issue" value={selectedLive.Issue} t={t} />
              <MetaRow icon={Clock} label="First contact" value={formatDate(selectedLive.created_at)} t={t} />
            </DrawerSection>

            <DrawerSection title="AI Summary" t={t}>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: t.textSecondary,
                }}
              >
                {aiSummary}
              </p>
            </DrawerSection>

            <DrawerSection title="Conversation History" t={t}>
              {selectedLive.chatHistory?.length > 0 ? (
                <ConversationHistory messages={selectedLive.chatHistory} />
              ) : (
                <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
                  No conversation history linked yet. Chats with matching phone numbers will appear here.
                </div>
              )}
            </DrawerSection>

            <DrawerSection title="Booking History" t={t}>
              {selectedLive.relatedBookings.length === 0 ? (
                <div style={{ fontSize: 13, color: t.textMuted }}>No bookings yet for this lead.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {selectedLive.relatedBookings.map((b, i) => (
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
                  ))}
                </div>
              )}
            </DrawerSection>

            <DrawerSection title="Notes" t={t}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add a note…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveNote(selectedLive.id, noteDraft);
                  }}
                  style={{
                    flex: 1,
                    height: 40,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: `1px solid ${t.border}`,
                    background: t.inputBg,
                    color: t.textPrimary,
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  className="ui-press"
                  onClick={() => saveNote(selectedLive.id, noteDraft)}
                  style={{
                    ...secondaryBtnStyle(t),
                    height: 40,
                    padding: "0 14px",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                >
                  Save
                </button>
              </div>
              {(notesMap[selectedLive.id] || []).length === 0 ? (
                <div style={{ fontSize: 13, color: t.textMuted }}>No notes yet.</div>
              ) : (
                (notesMap[selectedLive.id] || []).map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "10px 0",
                      borderBottom: `1px solid ${t.borderSub || t.border}`,
                    }}
                  >
                    <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.45 }}>{n.text}</div>
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{timeAgo(n.at)}</div>
                  </div>
                ))
              )}
            </DrawerSection>

            <DrawerSection title="Follow-up Tasks" t={t}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  value={taskDraft}
                  onChange={(e) => setTaskDraft(e.target.value)}
                  placeholder="Add a follow-up…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTask(selectedLive.id, taskDraft);
                  }}
                  style={{
                    flex: 1,
                    height: 40,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: `1px solid ${t.border}`,
                    background: t.inputBg,
                    color: t.textPrimary,
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  className="ui-press"
                  onClick={() => addTask(selectedLive.id, taskDraft)}
                  style={{
                    ...secondaryBtnStyle(t),
                    height: 40,
                    padding: "0 14px",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                >
                  Add
                </button>
              </div>
              {(tasksMap[selectedLive.id] || []).length === 0 ? (
                <div style={{ fontSize: 13, color: t.textMuted }}>No follow-ups yet.</div>
              ) : (
                (tasksMap[selectedLive.id] || []).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="ui-press"
                    onClick={() => toggleTask(selectedLive.id, task.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      border: "none",
                      borderBottom: `1px solid ${t.borderSub || t.border}`,
                      background: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                    }}
                  >
                    {task.done ? (
                      <CheckCircle2 size={16} color="#059669" strokeWidth={2} />
                    ) : (
                      <Circle size={16} color={t.textMuted} strokeWidth={1.75} />
                    )}
                    <span
                      style={{
                        fontSize: 13,
                        color: task.done ? t.textMuted : t.textPrimary,
                        textDecoration: task.done ? "line-through" : "none",
                      }}
                    >
                      {task.text}
                    </span>
                  </button>
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
                <button
                  type="button"
                  className="ui-press"
                  onClick={() => navigate("/chats")}
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
                  <MessageCircle size={14} />
                  Contact
                </button>
                <button
                  type="button"
                  className="ui-press"
                  onClick={() => {
                    if (selectedLive.id) setOverride(selectedLive.id, "Qualified");
                    showToast("Marked as qualified");
                  }}
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
                  <BadgeCheck size={14} />
                  Mark Qualified
                </button>
                <button
                  type="button"
                  className="ui-press"
                  onClick={() => {
                    if (selectedLive.id) setOverride(selectedLive.id, "Lost");
                    showToast("Lead archived");
                    setSelected(null);
                  }}
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
                  <Archive size={14} />
                  Archive
                </button>
                {selectedLive.id && (
                  <button
                    type="button"
                    className="ui-press"
                    onClick={() =>
                      setDeleteTarget({ id: selectedLive.id, name: selectedLive.Name })
                    }
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
                    Delete
                  </button>
                )}
              </div>
            </DrawerSection>
          </>
        )}
      </Sheet>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => !deleteBusy && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
        title="Delete this lead?"
        message={
          deleteTarget?.name
            ? `Remove ${deleteTarget.name} from leads? This can't be undone.`
            : "Are you sure? This can't be undone."
        }
        confirmLabel="Delete lead"
      />
    </PageShell>
  );
}
