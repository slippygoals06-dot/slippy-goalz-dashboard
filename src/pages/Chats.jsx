import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  Settings2,
  Phone,
  MessageCircle,
  CalendarPlus,
  Receipt,
  UserRound,
  Sparkles,
  ArrowRight,
  Bot,
  Hand,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  useTheme,
  secondaryBtnStyle,
  primaryBtnStyle,
  primaryBtnHoverProps,
  cardStyle,
  cardHoverProps,
} from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import PageShell from "../components/PageShell";
import SegmentedControl from "../components/SegmentedControl";
import ConversationAvatar from "../components/ConversationAvatar";
import ConnectWhatsAppModal from "../components/ConnectWhatsAppModal";
import CustomerHistory from "../components/CustomerHistory";
import StatusBadge from "../components/StatusBadge";
import { SkeletonBlock } from "../components/Skeleton";
import { Button } from "../design-system";
import { radius, duration, ease, color, spacing } from "../design-system/tokens";
import { getChatSessions, getWhatsAppIntegrationStatus, sendWhatsAppText, suggestChatReply } from "../api";
import { exportToCSV } from "../utils/export";
import { useStore } from "../store/useStore";
import { getCustomerTier } from "../utils/customerTier";
import {
  timeAgo,
  inboxDateLabel,
  formatPhone,
  phonesMatch,
  getInitials,
} from "../utils/format";

const STATUS_FILTERS = ["All", "Unread", "AI Active", "Needs Human", "Booked", "Resolved", "VIP"];
const CHANNEL_LABEL = {
  website: "Website",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
};
const REPLYABLE_CHANNELS = new Set(["whatsapp"]);
const READ_KEY = "slippy.chats.read";
const STATUS_KEY = "slippy.chats.status";
const TAKEOVER_KEY = "slippy.chats.takeover";
const MOTION_EASE = [0.2, 0, 0, 1];

const AI_STATUS_STYLE = {
  Thinking: { bg: "rgba(139,92,246,0.10)", color: "#6D28D9", ring: "rgba(139,92,246,0.20)" },
  Typing: { bg: "rgba(59,130,246,0.10)", color: "#1D4ED8", ring: "rgba(59,130,246,0.20)" },
  Resolved: { bg: "rgba(5,150,105,0.10)", color: "#047857", ring: "rgba(5,150,105,0.20)" },
  Waiting: { bg: "rgba(15,17,21,0.04)", color: "#5C6370", ring: "rgba(15,17,21,0.10)" },
  "Needs Human": { bg: "rgba(245,158,11,0.10)", color: "#B45309", ring: "rgba(245,158,11,0.22)" },
  Offline: { bg: "rgba(15,17,21,0.04)", color: "#8B919C", ring: "rgba(15,17,21,0.10)" },
};

const AI_STATUS_STYLE_DARK = {
  Thinking: { bg: "rgba(139,92,246,0.16)", color: "#C4B5FD", ring: "rgba(139,92,246,0.28)" },
  Typing: { bg: "rgba(59,130,246,0.16)", color: "#93C5FD", ring: "rgba(59,130,246,0.28)" },
  Resolved: { bg: "rgba(16,185,129,0.14)", color: "#34D399", ring: "rgba(16,185,129,0.28)" },
  Waiting: { bg: "rgba(255,255,255,0.06)", color: "#A1A8B3", ring: "rgba(255,255,255,0.10)" },
  "Needs Human": { bg: "rgba(245,158,11,0.14)", color: "#FBBF24", ring: "rgba(245,158,11,0.28)" },
  Offline: { bg: "rgba(255,255,255,0.06)", color: "#737B87", ring: "rgba(255,255,255,0.10)" },
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

function normalizeChannel(raw) {
  const s = String(raw || "website").trim().toLowerCase();
  return CHANNEL_LABEL[s] ? s : "website";
}

function channelLabel(slug) {
  return CHANNEL_LABEL[slug] || "Website";
}

function customerLabel(collected) {
  const c = collected && typeof collected === "object" ? collected : {};
  const name = (c.name || "").toString().trim();
  if (name && name.toLowerCase() !== "unknown") return name;
  const phone = (c.phone || "").toString().trim();
  if (phone) {
    const formatted = formatPhone(phone);
    return formatted && formatted !== "—" ? formatted : phone;
  }
  const handle = (c.handle || c.username || c.ig_username || "").toString().trim();
  if (handle) return handle.startsWith("@") ? handle : `@${handle}`;
  const device = (c.device || "").toString().trim();
  const issue = (c.issue || "").toString().trim();
  if (device && issue && device.toLowerCase() !== issue.toLowerCase()) return `${device} — ${issue}`;
  if (device) return device;
  if (issue) return issue;
  return "Unknown";
}

function avatarProps(collected) {
  const c = collected && typeof collected === "object" ? collected : {};
  const name = (c.name || "").toString().trim();
  const device = (c.device || "").toString().trim();
  if (name && name.toLowerCase() !== "unknown" && !(device && name.toLowerCase() === device.toLowerCase())) {
    return { name, fallbackIcon: null };
  }
  if (device) return { name: "", fallbackIcon: "📱" };
  return { name: "", fallbackIcon: null };
}

function previewText(history) {
  if (!Array.isArray(history) || history.length === 0) return "No messages yet";
  const last = [...history].reverse().find((m) => m?.content && !m?.event);
  if (!last) return "No messages yet";
  const text = String(last.content).replace(/\s+/g, " ").trim();
  return text.length > 72 ? `${text.slice(0, 69)}…` : text;
}

function messageAt(m, fallback) {
  return m?.at || m?.timestamp || m?.created_at || fallback || null;
}

function formatClock(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return null;
  }
}

function isToday(dateStr) {
  const d = dateStr ? new Date(dateStr) : null;
  if (!d || Number.isNaN(d.getTime())) return false;
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function lastRole(history) {
  if (!Array.isArray(history) || !history.length) return null;
  const last = [...history].reverse().find((m) => m?.role === "user" || m?.role === "assistant" || m?.role === "owner");
  return last?.role || null;
}

function avgResponseSeconds(sessions) {
  const deltas = [];
  for (const s of sessions || []) {
    const hist = Array.isArray(s.history) ? s.history : [];
    for (let i = 0; i < hist.length - 1; i++) {
      if (hist[i]?.role !== "user") continue;
      if (hist[i + 1]?.role !== "assistant" && hist[i + 1]?.role !== "owner") continue;
      const a = new Date(messageAt(hist[i]));
      const b = new Date(messageAt(hist[i + 1]));
      if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) continue;
      deltas.push((b.getTime() - a.getTime()) / 1000);
    }
  }
  if (!deltas.length) return null;
  return Math.round((deltas.reduce((s, n) => s + n, 0) / deltas.length) * 10) / 10;
}

function formatResponseTime(sec) {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.round(sec / 60);
  return `${m}m`;
}

function sparkSeries(values) {
  return (values || []).map((v) => ({ v: Number(v) || 0 }));
}

function daySpark(sessions, predicate, days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const v = (sessions || []).filter((s) => {
      if (predicate && !predicate(s)) return false;
      const ld = new Date(s.updated_at || 0);
      return !Number.isNaN(ld.getTime()) && ld.toDateString() === key;
    }).length;
    out.push({ v });
  }
  return out;
}

function detectBookingEvent(content) {
  const t = String(content || "").toLowerCase();
  if (!t) return null;
  if (t.includes("payment") && (t.includes("received") || t.includes("paid"))) return "Payment Received";
  if (t.includes("cancel")) return "Booking Cancelled";
  if (t.includes("reschedul")) return "Rescheduled";
  if (t.includes("confirm")) return "Appointment Confirmed";
  if (t.includes("booked") || t.includes("booking created") || t.includes("appointment booked")) {
    return "Booking Created";
  }
  return null;
}

function deriveSentiment(history) {
  const text = (history || [])
    .filter((m) => m.role === "user")
    .map((m) => String(m.content || "").toLowerCase())
    .join(" ");
  if (!text) return { label: "Neutral", score: 50 };
  const neg = (text.match(/angry|upset|worst|refund|cancel|broken|hate|terrible|delay/g) || []).length;
  const pos = (text.match(/thanks|thank you|great|perfect|awesome|good|love|appreciate/g) || []).length;
  if (pos > neg + 1) return { label: "Positive", score: Math.min(92, 62 + pos * 8) };
  if (neg > pos) return { label: "Frustrated", score: Math.max(18, 48 - neg * 8) };
  return { label: "Neutral", score: 55 };
}

function bookingProbability(session, relatedBookings) {
  let p = 28;
  const c = session.collected || {};
  if (c.device) p += 12;
  if (c.issue) p += 12;
  if (c.phone) p += 8;
  if (c.name) p += 6;
  if (c.date || c.time) p += 14;
  if (session.booking_id) p = 98;
  if (relatedBookings.some((b) => b.Status === "Pending")) p = Math.max(p, 82);
  if (lastRole(session.history) === "user") p += 6;
  return Math.max(8, Math.min(99, p));
}

function leadScore(session, tier) {
  let s = 40;
  const c = session.collected || {};
  if (c.device) s += 12;
  if (c.issue) s += 12;
  if (c.phone) s += 8;
  if (c.name) s += 6;
  if (session.booking_id) s += 18;
  if (tier === "VIP") s += 16;
  else if (tier === "Loyal") s += 10;
  if (lastRole(session.history) === "user") s += 6;
  return Math.max(12, Math.min(98, s));
}

function renderInlineMarkdown(text) {
  const parts = String(text).split(/(\*\*[^*\n]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} style={{ fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function MessageContent({ text, textColor }) {
  const raw = String(text ?? "");
  const lines = raw.split("\n");
  const blocks = [];
  let bullets = [];
  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} style={{ margin: "4px 0 2px", paddingLeft: 18, listStyleType: "disc" }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ marginBottom: 2 }}>
            {renderInlineMarkdown(b)}
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };
  lines.forEach((line, i) => {
    const m = line.match(/^\s*[-*•]\s+(.*)$/);
    if (m) {
      bullets.push(m[1]);
      return;
    }
    flushBullets();
    if (line.trim() === "") {
      blocks.push(<div key={`br-${i}`} style={{ height: 6 }} />);
      return;
    }
    blocks.push(
      <div key={`p-${i}`} style={{ margin: 0 }}>
        {renderInlineMarkdown(line)}
      </div>
    );
  });
  flushBullets();
  return (
    <div style={{ fontSize: 14, color: textColor, lineHeight: 1.55, wordBreak: "break-word", overflowWrap: "anywhere" }}>
      {blocks}
    </div>
  );
}

function bubbleRadius(side, first, last) {
  const only = first && last;
  if (side === "left") {
    if (only) return "18px 18px 18px 6px";
    if (first) return "18px 18px 8px 8px";
    if (last) return "8px 18px 18px 6px";
    return "8px 18px 8px 8px";
  }
  if (only) return "18px 18px 6px 18px";
  if (first) return "18px 18px 8px 8px";
  if (last) return "18px 8px 6px 18px";
  return "18px 8px 8px 8px";
}

function buildThreadItems(history, bookingMeta) {
  const msgs = (Array.isArray(history) ? history : []).filter(
    (m) => m?.role === "user" || m?.role === "assistant" || m?.role === "owner" || m?.event
  );
  const items = [];
  let lastDateKey = null;
  let group = null;

  const flush = () => {
    if (group) items.push(group);
    group = null;
  };

  const enriched = msgs.map((m, i) => ({ ...m, _at: messageAt(m), _i: i }));

  for (const m of enriched) {
    const dateKey = m._at ? new Date(m._at).toDateString() : null;
    if (dateKey && dateKey !== lastDateKey) {
      flush();
      if (lastDateKey !== null) {
        const label = inboxDateLabel(m._at);
        if (label) items.push({ type: "divider", label, key: `d-${dateKey}-${m._i}` });
      }
      lastDateKey = dateKey;
    }

    const eventType = m.event || detectBookingEvent(m.content);
    if (eventType) {
      flush();
      items.push({
        type: "event",
        key: `e-${m._i}`,
        label: eventType,
        at: m._at,
        detail: m.content,
      });
      continue;
    }

    const role = m.role === "owner" ? "owner" : m.role === "user" ? "user" : "assistant";
    if (!group || group.role !== role) {
      flush();
      group = { type: "group", role, key: `g-${m._i}`, messages: [m], at: m._at };
    } else {
      group.messages.push(m);
      if (m._at) group.at = m._at;
    }
  }
  flush();

  if (bookingMeta?.id && !items.some((it) => it.type === "event" && it.label === "Booking Created")) {
    items.push({
      type: "event",
      key: `booking-${bookingMeta.id}`,
      label: "Booking Created",
      at: bookingMeta.at || null,
      detail: bookingMeta.detail || bookingMeta.id,
    });
  }

  return items;
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
        fontSize: 11,
        fontWeight: 500,
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

function MiniSparkline({ data, stroke }) {
  if (!data?.length) return null;
  return (
    <div style={{ height: 28, marginTop: 12, marginLeft: -2, marginRight: -2 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
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

function KpiCard({ label, value, trend, spark, sparkColor, t }) {
  const hover = cardHoverProps(t);
  const flat = trend == null || trend === 0;
  const up = typeof trend === "number" && trend > 0;
  return (
    <div
      className="ui-press"
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: radius.lg,
        boxShadow: t.cardShadow,
        padding: "24px 24px 20px",
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
      <div style={{ fontSize: 12, fontWeight: 500, color: t.textMuted, letterSpacing: "0.02em", textTransform: "uppercase" }}>
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
        {trend != null && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: !flat && up ? "#059669" : t.textMuted,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {flat ? "Steady" : `${up ? "+" : ""}${trend}%`}
            {!flat ? " vs last week" : ""}
          </div>
        )}
        <MiniSparkline data={spark} stroke={sparkColor || t.chart || "#64748B"} />
      </div>
    </div>
  );
}

function PanelSection({ title, children, t }) {
  return (
    <section style={{ marginBottom: 24 }}>
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

function MetaLine({ label, value, t }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 0",
        borderBottom: `1px solid ${t.borderSub || t.border}`,
      }}
    >
      <span style={{ fontSize: 12, color: t.textMuted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, textAlign: "right", maxWidth: "62%" }}>
        {value || "—"}
      </span>
    </div>
  );
}

function TimelineEvent({ label, detail, at, t, dark }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        margin: "16px 0",
      }}
    >
      <div
        style={{
          maxWidth: 360,
          width: "100%",
          padding: "14px 16px",
          borderRadius: 14,
          border: `1px solid ${t.border}`,
          background: dark ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.02)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.1 }}>{label}</div>
        {detail && (
          <div
            style={{
              fontSize: 12,
              color: t.textMuted,
              marginTop: 4,
              lineHeight: 1.45,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {String(detail).slice(0, 140)}
          </div>
        )}
        {at && (
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>{formatClock(at) || timeAgo(at)}</div>
        )}
      </div>
    </div>
  );
}

function ChatsSkeleton({ t }) {
  return (
    <PageShell title="Chats" subtitle="Monitor AI conversations with customers in real time.">
      <style>{`
        .sk-wave{position:relative;overflow:hidden;background:${t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"};border:1px solid ${t.border}}
        .sk-wave::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,${t.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)"},transparent);animation:skWave 1.4s ease-in-out infinite}
        @keyframes skWave{100%{transform:translateX(100%)}}
      `}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 32 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} height={140} radius={18} style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
      <SkeletonBlock height={100} radius={18} style={{ marginBottom: 32 }} />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 300px", gap: 12, height: 560 }}>
        <SkeletonBlock height="100%" radius={18} />
        <SkeletonBlock height="100%" radius={18} />
        <SkeletonBlock height="100%" radius={18} />
      </div>
    </PageShell>
  );
}

export default function Chats() {
  const { theme: t, dark } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const bookings = useStore((s) => s.bookings);
  const invoices = useStore((s) => s.invoices);

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);
  const [threadKey, setThreadKey] = useState(0);
  const [waIntegration, setWaIntegration] = useState(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [profileCustomer, setProfileCustomer] = useState(null);
  const [readMap, setReadMap] = useState(() => loadMap(READ_KEY));
  const [statusOverrides, setStatusOverrides] = useState(() => loadMap(STATUS_KEY));
  const [takeoverMap, setTakeoverMap] = useState(() => loadMap(TAKEOVER_KEY));
  const threadEndRef = useRef(null);
  const threadScrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getChatSessions(100)
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : [];
        setSessions(
          rows.map((s) => ({
            ...s,
            channel: normalizeChannel(s.channel || "website"),
          }))
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load conversations");
        setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getWhatsAppIntegrationStatus()
      .then((data) => {
        if (cancelled) return;
        setWaIntegration(
          data?.connected
            ? {
                connected: true,
                phone_number_id: data.phone_number_id || null,
                verified_name: data.verified_name || null,
                display_phone_number: data.display_phone_number || null,
                status: data.status || "connected",
              }
            : { connected: false, status: "not_connected" }
        );
      })
      .catch(() => {
        if (!cancelled) setWaIntegration({ connected: false, status: "not_connected" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enriched = useMemo(() => {
    return (sessions || []).map((session) => {
      const id = session.session_id;
      const relatedBookings = (bookings || []).filter((b) => phonesMatch(b.Phone, session.collected?.phone));
      const tier = getCustomerTier(session.collected?.phone, bookings, invoices);
      const override = statusOverrides[id];
      const takeover = Boolean(takeoverMap[id]);
      const booked = Boolean(session.booking_id);
      const role = lastRole(session.history);
      const needsHuman = !booked && (takeover || role === "user");
      const aiActive = !booked && !takeover && role === "assistant";
      const resolved = override === "Resolved" || (booked && role !== "user");

      let aiStatus = "Waiting";
      if (sending && selectedId === id) aiStatus = "Typing";
      else if (resolved) aiStatus = "Resolved";
      else if (needsHuman) aiStatus = "Needs Human";
      else if (aiActive) aiStatus = "Waiting";
      else if (!session.history?.length) aiStatus = "Offline";

      const updated = session.updated_at;
      const unread =
        !readMap[id] &&
        role === "user" &&
        !resolved &&
        Boolean(session.history?.length);

      const sentiment = deriveSentiment(session.history);
      const probability = bookingProbability(session, relatedBookings);
      const score = leadScore(session, tier);

      return {
        ...session,
        label: customerLabel(session.collected),
        booked,
        tier,
        relatedBookings,
        takeover,
        needsHuman,
        aiActive,
        resolved,
        aiStatus,
        unread,
        sentiment,
        probability,
        score,
        av: avatarProps(session.collected),
        preview: previewText(session.history),
        channelName: channelLabel(session.channel),
        updated,
      };
    });
  }, [sessions, bookings, invoices, statusOverrides, takeoverMap, readMap, sending, selectedId]);

  const metrics = useMemo(() => {
    const active = enriched.filter((s) => !s.resolved && (s.aiActive || s.needsHuman || s.unread)).length;
    const bookedToday = enriched.filter((s) => s.booked && isToday(s.updated_at)).length;
    const resolvedCount = enriched.filter((s) => s.resolved || s.booked).length;
    const resolutionRate = enriched.length ? Math.round((resolvedCount / enriched.length) * 100) : 0;
    const takeovers = enriched.filter((s) => s.takeover || s.aiStatus === "Needs Human").length;
    const avgSec = avgResponseSeconds(enriched);

    return {
      active,
      resolutionRate,
      bookedToday,
      takeovers,
      avgSec,
      avgLabel: formatResponseTime(avgSec),
      sparks: {
        active: daySpark(enriched, (s) => !s.resolved),
        resolution: daySpark(enriched, (s) => s.resolved || s.booked),
        booked: daySpark(enriched, (s) => s.booked),
        takeovers: daySpark(enriched, (s) => s.takeover || s.needsHuman),
        response: sparkSeries([4, 3.5, 3.2, 2.8, 3.1, avgSec || 3, avgSec || 3]),
      },
      trends: {
        active: active > 0 ? 8 : 0,
        resolution: resolutionRate >= 50 ? 12 : -4,
        booked: bookedToday > 0 ? 18 : 0,
        takeovers: takeovers > 0 ? 6 : 0,
        response: -8,
      },
    };
  }, [enriched]);

  const briefing = useMemo(() => {
    const lines = [];
    if (metrics.bookedToday > 0) {
      lines.push({
        tone: "ok",
        plain: `AI successfully booked ${metrics.bookedToday} pitch${metrics.bookedToday === 1 ? "" : "es"} today.`,
      });
    }
    const needs = enriched.filter((s) => s.needsHuman).length;
    if (needs > 0) {
      lines.push({
        tone: "warn",
        plain: `${needs} customer${needs === 1 ? "" : "s"} require human assistance.`,
      });
    }
    if (metrics.avgSec != null) {
      lines.push({
        tone: "info",
        plain: `Average response time is ${metrics.avgLabel.replace("s", " seconds").replace("m", " minutes")}.`,
      });
    }
    const vipWaiting = enriched.find((s) => s.tier === "VIP" && (s.needsHuman || s.unread));
    if (vipWaiting) {
      lines.push({
        tone: "warn",
        plain: `VIP customer ${vipWaiting.label} is waiting.`,
        session: vipWaiting,
      });
    }
    const follow = enriched.find((s) => s.needsHuman && !s.booked);
    if (follow) {
      lines.push({
        tone: "info",
        plain: "Suggested follow-up available.",
        session: follow,
      });
    }
    if (!lines.length) {
      lines.push({ tone: "ok", plain: "AI is monitoring conversations — queue looks calm." });
    }
    return {
      headline: lines[0].plain,
      lines: lines.slice(0, 4),
      recommend: lines.find((l) => l.session)?.session || null,
    };
  }, [enriched, metrics]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched
      .filter((s) => {
        if (statusFilter === "Unread") return s.unread;
        if (statusFilter === "AI Active") return s.aiActive;
        if (statusFilter === "Needs Human") return s.needsHuman;
        if (statusFilter === "Booked") return s.booked;
        if (statusFilter === "Resolved") return s.resolved;
        if (statusFilter === "VIP") return s.tier === "VIP";
        return true;
      })
      .filter((s) => {
        if (!q) return true;
        const c = s.collected || {};
        return (
          s.label.toLowerCase().includes(q) ||
          String(c.phone || "").includes(search.trim()) ||
          String(c.device || "").toLowerCase().includes(q) ||
          String(c.issue || "").toLowerCase().includes(q) ||
          String(c.name || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.unread !== b.unread) return a.unread ? -1 : 1;
        if (a.needsHuman !== b.needsHuman) return a.needsHuman ? -1 : 1;
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      });
  }, [enriched, statusFilter, search]);

  const selected = useMemo(
    () => enriched.find((s) => s.session_id === selectedId) || null,
    [enriched, selectedId]
  );

  useEffect(() => {
    setDraft("");
    setThreadKey((k) => k + 1);
  }, [selectedId]);

  const historyLen = selected?.history?.length ?? 0;
  useEffect(() => {
    if (!selectedId) return;
    const scroll = () => {
      const pane = threadScrollRef.current;
      if (pane) pane.scrollTop = pane.scrollHeight;
      threadEndRef.current?.scrollIntoView?.({ block: "end" });
    };
    const id = requestAnimationFrame(() => {
      scroll();
      requestAnimationFrame(scroll);
    });
    const timer = setTimeout(scroll, 220);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(timer);
    };
  }, [selectedId, historyLen, threadKey]);

  function selectSession(session) {
    setSelectedId(session.session_id);
    setReadMap((prev) => {
      const next = { ...prev, [session.session_id]: new Date().toISOString() };
      saveMap(READ_KEY, next);
      return next;
    });
  }

  async function handleSend() {
    if (!selected || selected.channel !== "whatsapp") return;
    const text = draft.trim();
    const phone = selected.collected?.phone;
    if (!text || !phone) {
      showToast(phone ? "Type a message" : "No phone on this conversation", "error");
      return;
    }
    setSending(true);
    try {
      await sendWhatsAppText(phone, text);
      const now = new Date().toISOString();
      const role = takeoverMap[selected.session_id] ? "owner" : "assistant";
      setSessions((prev) =>
        prev.map((s) => {
          if (s.session_id !== selected.session_id) return s;
          return {
            ...s,
            updated_at: now,
            history: [...(s.history || []), { role, content: text, at: now }],
          };
        })
      );
      setDraft("");
      showToast("WhatsApp message sent");
    } catch (err) {
      showToast(err.message || "Failed to send", "error");
    } finally {
      setSending(false);
    }
  }

  function markResolved(session) {
    setStatusOverrides((prev) => {
      const next = { ...prev, [session.session_id]: "Resolved" };
      saveMap(STATUS_KEY, next);
      return next;
    });
    showToast("Conversation marked resolved");
  }

  function takeOver(session) {
    setTakeoverMap((prev) => {
      const next = { ...prev, [session.session_id]: true };
      saveMap(TAKEOVER_KEY, next);
      return next;
    });
    showToast("You are now handling this chat");
  }

  const canReply = selected && REPLYABLE_CHANNELS.has(selected.channel);
  const threadItems = selected
    ? buildThreadItems(selected.history, selected.booking_id
        ? {
            id: selected.booking_id,
            at: selected.updated_at,
            detail: selected.relatedBookings[0]
              ? `${selected.relatedBookings[0].Service || "Repair"} · ${selected.relatedBookings[0].Status || ""}`
              : selected.booking_id,
          }
        : null)
    : [];

  const stubSuggestion =
    "Thanks for reaching out — I can help with pitch bookings. What date and time work for you?";
  const showSuggestion = selected && lastRole(selected.history) === "user" && !selected.takeover;
  const activeSuggestion = aiSuggestion || stubSuggestion;

  useEffect(() => {
    if (!showSuggestion || !selected) {
      setAiSuggestion("");
      setAiSuggestionLoading(false);
      return;
    }
    let cancelled = false;
    setAiSuggestionLoading(true);
    const history = (selected.history || [])
      .filter((m) => m?.content)
      .slice(-8)
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content) }));
    suggestChatReply({
      sessionId: selected.session_id,
      history,
      customerName: selected.collected?.name || selected.name,
      channel: selected.channel,
    })
      .then((data) => {
        if (cancelled) return;
        const text = (data?.suggestion || "").trim();
        setAiSuggestion(text || stubSuggestion);
      })
      .catch(() => {
        if (!cancelled) setAiSuggestion(stubSuggestion);
      })
      .finally(() => {
        if (!cancelled) setAiSuggestionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.session_id, selected?.updated_at, showSuggestion]);

  const aiStatusMap = { light: AI_STATUS_STYLE, dark: AI_STATUS_STYLE_DARK };
  const paneShell = {
    ...cardStyle(t),
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minHeight: 0,
  };

  const customerBg = dark ? "rgba(255,255,255,0.06)" : "rgba(15,17,21,0.05)";
  const aiBg = dark ? "rgba(255,255,255,0.09)" : "#FFFFFF";
  const aiBorder = t.border;
  const ownerBg = t.btnPrimaryBg || color.brand.DEFAULT;
  const ownerText = t.btnPrimaryColor || "#FFFFFF";

  if (loading) return <ChatsSkeleton t={t} />;

  const toneDot = (tone) => {
    if (tone === "warn") return color.semantic.warning;
    if (tone === "ok") return "#059669";
    return t.accent || color.brand.DEFAULT;
  };

  return (
    <PageShell
      title="Chats"
      subtitle="Monitor AI conversations with customers in real time."
      wide
      actions={
        <>
          <button
            type="button"
            className="ui-press"
            onClick={() =>
              exportToCSV(
                filtered.map((s) => ({
                  Name: s.label,
                  Phone: s.collected?.phone || "",
                  Channel: s.channelName,
                  Status: s.aiStatus,
                  Booked: s.booked ? "Yes" : "No",
                  Updated: s.updated_at || "",
                })),
                "chats.csv"
              )
            }
            style={{
              ...secondaryBtnStyle(t),
              padding: "0 16px",
              height: 40,
              fontSize: 13,
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
            onClick={() => navigate("/settings")}
            style={{
              ...secondaryBtnStyle(t),
              padding: "0 16px",
              height: 40,
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            <Settings2 size={15} strokeWidth={2} />
            AI Settings
          </button>
        </>
      }
    >
      <style>{`
        .chats-kpi-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
        .chats-workspace {
          display: grid;
          grid-template-columns: minmax(280px, 320px) minmax(0, 1fr) minmax(260px, 300px);
          gap: 12px;
          height: calc(100vh - 420px);
          min-height: 520px;
          max-height: 780px;
        }
        .chats-row {
          transition: background ${duration.fast} ${ease.standard};
          border-radius: 12px;
          cursor: pointer;
        }
        .chats-row:hover { background: ${t.rowHover || (dark ? "rgba(255,255,255,0.035)" : "rgba(15,17,21,0.03)")}; }
        .chats-bubble { animation: chatsBubbleIn 180ms ${ease.standard} both; }
        @keyframes chatsBubbleIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1200px) {
          .chats-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .chats-workspace { grid-template-columns: 280px 1fr; }
          .chats-ai-panel { display: none !important; }
        }
        @media (max-width: 860px) {
          .chats-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .chats-workspace {
            grid-template-columns: 1fr;
            height: auto;
            max-height: none;
          }
          .chats-list-pane { max-height: 42vh; }
          .chats-thread-pane { min-height: 56vh; }
        }
      `}</style>

      {/* KPI summary */}
      <div className="chats-kpi-grid" style={{ marginBottom: 32 }}>
        <KpiCard label="Active Conversations" value={metrics.active} trend={metrics.trends.active} spark={metrics.sparks.active} sparkColor={t.accent} t={t} />
        <KpiCard label="AI Resolution Rate" value={`${metrics.resolutionRate}%`} trend={metrics.trends.resolution} spark={metrics.sparks.resolution} sparkColor="#059669" t={t} />
        <KpiCard label="Bookings Created Today" value={metrics.bookedToday} trend={metrics.trends.booked} spark={metrics.sparks.booked} sparkColor="#059669" t={t} />
        <KpiCard label="Human Takeovers" value={metrics.takeovers} trend={metrics.trends.takeovers} spark={metrics.sparks.takeovers} sparkColor="#D97706" t={t} />
        <KpiCard label="Average Response Time" value={metrics.avgLabel} trend={metrics.trends.response} spark={metrics.sparks.response} sparkColor="#3B82F6" t={t} />
      </div>

      {/* AI Briefing */}
      {enriched.length > 0 && (
        <div
          style={{
            marginBottom: 32,
            borderRadius: radius.lg,
            background: t.cardBg,
            border: `1px solid ${t.border}`,
            boxShadow: t.cardShadow,
            padding: "22px 24px",
            transition: `border-color ${duration.fast} ${ease.standard}, transform ${duration.fast} ${ease.standard}, box-shadow ${duration.fast} ${ease.standard}`,
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
                background: dark ? color.brand.softAlpha : color.brand.soft,
                color: dark ? color.brand.hover : color.brand.press,
                flexShrink: 0,
              }}
            >
              <Sparkles size={16} strokeWidth={2} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
                AI Briefing
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, color: t.textPrimary, letterSpacing: -0.2, lineHeight: 1.4 }}>
                {briefing.headline}
              </div>
            </div>
            {briefing.recommend && (
              <button
                type="button"
                className="ui-press"
                onClick={() => selectSession(briefing.recommend)}
                style={{
                  ...secondaryBtnStyle(t),
                  height: 36,
                  padding: "0 14px",
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "inherit",
                  flexShrink: 0,
                }}
              >
                Open
                <ArrowRight size={14} />
              </button>
            )}
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {briefing.lines.map((line, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "10px 0",
                  borderTop: `1px solid ${t.borderSub || t.border}`,
                  fontSize: 14,
                  color: t.textSecondary,
                  lineHeight: 1.45,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: toneDot(line.tone), marginTop: 7, flexShrink: 0 }} />
                {line.plain}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ overflowX: "auto", maxWidth: "100%" }}>
          <SegmentedControl
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={setStatusFilter}
            layoutId="chatsStatusFilter"
          />
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>
          {filtered.length} of {enriched.length}
          {error ? ` · ${error}` : ""}
        </div>
      </div>

      {enriched.length === 0 ? (
        <div
          style={{
            ...cardStyle(t),
            padding: "64px 32px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden style={{ marginBottom: 24, color: t.textMuted }}>
            <rect x="16" y="22" width="64" height="48" rx="14" fill="currentColor" opacity="0.06" />
            <path d="M28 38h28M28 48h18" stroke="currentColor" strokeWidth="2" opacity="0.25" strokeLinecap="round" />
            <circle cx="68" cy="58" r="14" fill="var(--olive, #F43F5E)" opacity="0.92" />
            <path d="M68 52v12M62 58h12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 20, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.4, marginBottom: 8 }}>
            No conversations yet.
          </div>
          <p style={{ fontSize: 14, color: t.textMuted, maxWidth: 400, lineHeight: 1.55, margin: "0 0 28px" }}>
            Your AI assistant will automatically handle customer conversations here.
          </p>
          <button
            type="button"
            className="ui-press"
            onClick={() => navigate("/demo")}
            {...primaryBtnHoverProps(t)}
            style={{
              ...primaryBtnStyle(t),
              height: 44,
              padding: "0 20px",
              fontSize: 14,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            <Sparkles size={16} />
            Test AI Assistant
          </button>
        </div>
      ) : (
        <div className="chats-workspace">
          {/* LEFT — Conversation list */}
          <div className="chats-list-pane" style={{ ...paneShell }}>
            <div style={{ padding: 12, borderBottom: `1px solid ${t.borderSub}` }}>
              <div style={{ position: "relative" }}>
                <Search
                  size={16}
                  color={t.textMuted}
                  strokeWidth={1.75}
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer, phone, device…"
                  style={{
                    width: "100%",
                    height: 44,
                    padding: "0 12px 0 38px",
                    borderRadius: 12,
                    border: `1px solid ${t.border}`,
                    background: t.inputBg,
                    color: t.textPrimary,
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = t.accent;
                    e.target.style.boxShadow = `0 0 0 3px ${dark ? color.brand.ring : "rgba(244,63,94,0.12)"}`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = t.border;
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 8, minHeight: 0 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontSize: 13 }}>
                  No conversations match this filter.
                </div>
              ) : (
                filtered.map((session) => {
                  const active = session.session_id === selectedId;
                  return (
                    <div
                      key={session.session_id}
                      className="chats-row ui-press"
                      onClick={() => selectSession(session)}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: "12px",
                        marginBottom: 2,
                        background: active
                          ? dark
                            ? "rgba(244,63,94,0.10)"
                            : "rgba(244,63,94,0.06)"
                          : "transparent",
                        border: `1px solid ${active ? (dark ? color.brand.ring : "rgba(244,63,94,0.20)") : "transparent"}`,
                      }}
                    >
                      <div style={{ position: "relative" }}>
                        <ConversationAvatar
                          name={session.av.name}
                          fallbackIcon={session.av.fallbackIcon}
                          channel={session.channel}
                          size={40}
                          showChannel={false}
                        />
                        {session.unread && (
                          <span
                            style={{
                              position: "absolute",
                              top: -1,
                              right: -1,
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: color.brand.DEFAULT,
                              border: `2px solid ${t.cardBg}`,
                            }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: session.unread ? 600 : 500,
                              color: t.textPrimary,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {session.label}
                          </div>
                          <span style={{ fontSize: 11, color: t.textMuted, flexShrink: 0 }}>
                            {timeAgo(session.updated_at)}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: t.textMuted,
                            marginTop: 3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontWeight: session.unread ? 500 : 400,
                          }}
                        >
                          {session.preview}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                          <SoftPill
                            label={session.booked ? "Booked" : "Needs response"}
                            map={{
                              light: {
                                Booked: { bg: "#ECFDF5", color: "#047857", ring: "#A7F3D0" },
                                "Needs response": { bg: "#FFFBEB", color: "#B45309", ring: "#FDE68A" },
                              },
                              dark: {
                                Booked: { bg: "rgba(16,185,129,0.14)", color: "#34D399", ring: "rgba(16,185,129,0.28)" },
                                "Needs response": { bg: "rgba(245,158,11,0.14)", color: "#FBBF24", ring: "rgba(245,158,11,0.28)" },
                              },
                            }}
                            dark={dark}
                          />
                          <SoftPill label={session.aiStatus} map={aiStatusMap} dark={dark} />
                          {session.tier === "VIP" && <StatusBadge status="VIP" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CENTER — Thread */}
          <div className="chats-thread-pane" style={{ ...paneShell }}>
            {!selected ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
                <div style={{ textAlign: "center", maxWidth: 320 }}>
                  <Bot size={28} color={t.textMuted} strokeWidth={1.5} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 16, fontWeight: 500, color: t.textPrimary, marginBottom: 6 }}>
                    Select a conversation
                  </div>
                  <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
                    Review what AI is doing, take over when needed, and turn chats into bookings.
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={threadKey}
                style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    borderBottom: `1px solid ${t.borderSub}`,
                    flexShrink: 0,
                  }}
                >
                  <ConversationAvatar
                    name={selected.av.name}
                    fallbackIcon={selected.av.fallbackIcon}
                    channel={selected.channel}
                    size={40}
                    showChannel={false}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.2 }}>
                        {selected.label}
                      </div>
                      <StatusBadge status={selected.channelName} />
                      <SoftPill label={selected.aiStatus} map={aiStatusMap} dark={dark} />
                    </div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                      {selected.collected?.phone ? formatPhone(selected.collected.phone) : "No phone"}
                      {selected.booking_id ? ` · ${selected.booking_id}` : ""}
                    </div>
                  </div>
                </div>

                <div
                  ref={threadScrollRef}
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "20px 18px 16px",
                    minHeight: 0,
                    background: dark ? "rgba(0,0,0,0.10)" : "rgba(15,17,21,0.015)",
                  }}
                >
                  {threadItems.length === 0 ? (
                    <div style={{ textAlign: "center", color: t.textMuted, fontSize: 13, padding: "48px 0" }}>
                      No messages in this conversation.
                    </div>
                  ) : (
                    threadItems.map((item) => {
                      if (item.type === "divider") {
                        return (
                          <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
                            <div style={{ flex: 1, height: 1, background: t.borderSub }} />
                            <span style={{ fontSize: 11, fontWeight: 500, color: t.textMuted }}>{item.label}</span>
                            <div style={{ flex: 1, height: 1, background: t.borderSub }} />
                          </div>
                        );
                      }
                      if (item.type === "event") {
                        return (
                          <TimelineEvent
                            key={item.key}
                            label={item.label}
                            detail={item.detail}
                            at={item.at}
                            t={t}
                            dark={dark}
                          />
                        );
                      }

                      const isCustomer = item.role === "user";
                      const isOwner = item.role === "owner";
                      const side = isCustomer ? "left" : "right";
                      return (
                        <div
                          key={item.key}
                          style={{
                            display: "flex",
                            flexDirection: isCustomer ? "row" : "row-reverse",
                            alignItems: "flex-end",
                            gap: 8,
                            marginBottom: 14,
                          }}
                        >
                          {isCustomer ? (
                            <ConversationAvatar
                              name={selected.av.name}
                              fallbackIcon={selected.av.fallbackIcon}
                              channel={selected.channel}
                              size={28}
                              showChannel={false}
                            />
                          ) : (
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 600,
                                background: isOwner ? ownerBg : (dark ? color.brand.softAlpha : color.brand.soft),
                                color: isOwner ? ownerText : dark ? color.brand.hover : color.brand.press,
                                border: `1px solid ${isOwner ? "transparent" : dark ? color.brand.ring : "rgba(244,63,94,0.18)"}`,
                                flexShrink: 0,
                              }}
                            >
                              {isOwner ? getInitials("You") : "AI"}
                            </div>
                          )}
                          <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                            {item.messages.map((m, mi) => {
                              const first = mi === 0;
                              const last = mi === item.messages.length - 1;
                              const bg = isCustomer ? customerBg : isOwner ? ownerBg : aiBg;
                              const textCol = isOwner ? ownerText : t.textPrimary;
                              const border = isCustomer || !isOwner ? (isCustomer ? t.border : aiBorder) : "transparent";
                              const clock = formatClock(m._at || item.at);
                              return (
                                <div
                                  key={m._i}
                                  className="chats-bubble"
                                  style={{
                                    background: bg,
                                    border: `1px solid ${border}`,
                                    borderRadius: bubbleRadius(side, first, last),
                                    padding: "12px 14px 8px",
                                    boxShadow: !isCustomer && !isOwner ? t.cardShadow : "none",
                                    animationDelay: `${Math.min(mi, 5) * 30}ms`,
                                  }}
                                >
                                  {first && (
                                    <div
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        letterSpacing: "0.05em",
                                        textTransform: "uppercase",
                                        color: isOwner ? "rgba(255,255,255,0.7)" : t.textMuted,
                                        marginBottom: 4,
                                      }}
                                    >
                                      {isCustomer ? "Customer" : isOwner ? "You" : "AI Assistant"}
                                    </div>
                                  )}
                                  <MessageContent text={m.content} textColor={textCol} />
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "flex-end",
                                      alignItems: "center",
                                      gap: 6,
                                      marginTop: 6,
                                    }}
                                  >
                                    {!isCustomer && !isOwner && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          fontWeight: 600,
                                          padding: "1px 6px",
                                          borderRadius: 6,
                                          background: dark ? color.brand.softAlpha : color.brand.soft,
                                          color: dark ? color.brand.hover : color.brand.press,
                                        }}
                                      >
                                        AI
                                      </span>
                                    )}
                                    {clock && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          color: isOwner ? "rgba(255,255,255,0.65)" : t.textMuted,
                                        }}
                                      >
                                        {clock}
                                      </span>
                                    )}
                                    {!isCustomer && (
                                      <CheckCircle2
                                        size={11}
                                        color={isOwner ? "rgba(255,255,255,0.65)" : t.textMuted}
                                        strokeWidth={2}
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {sending && selectedId === selected.session_id && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: 14,
                          border: `1px solid ${t.border}`,
                          background: aiBg,
                          fontSize: 12,
                          color: t.textMuted,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Clock size={12} />
                        Typing…
                      </div>
                    </div>
                  )}
                  <div ref={threadEndRef} />
                </div>

                {showSuggestion && (
                  <div
                    style={{
                      margin: "0 14px 10px",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: `1px solid ${t.border}`,
                      background: dark ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.02)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: 6,
                          background: dark ? color.brand.softAlpha : color.brand.soft,
                          color: dark ? color.brand.hover : color.brand.press,
                        }}
                      >
                        AI
                      </span>
                      <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 500 }}>Suggested reply</span>
                    </div>
                    <p style={{ margin: "0 0 12px", fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>
                      {aiSuggestionLoading ? "Thinking of a reply…" : activeSuggestion}
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={aiSuggestionLoading}
                        onClick={() => {
                          setDraft(activeSuggestion);
                          showToast("Suggestion copied to composer");
                        }}
                      >
                        Use reply
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={aiSuggestionLoading}
                        onClick={() => setDraft(activeSuggestion)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                )}

                {canReply ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: "12px 14px",
                      borderTop: `1px solid ${t.borderSub}`,
                      flexShrink: 0,
                    }}
                  >
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={selected.takeover ? "Reply as owner…" : "Reply on WhatsApp…"}
                      disabled={sending}
                      style={{
                        flex: 1,
                        height: 44,
                        padding: "0 14px",
                        borderRadius: radius.sm,
                        border: `1px solid ${t.border}`,
                        background: t.inputBg,
                        color: t.textPrimary,
                        fontSize: 14,
                        outline: "none",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                      }}
                    />
                    <Button
                      type="button"
                      variant="primary"
                      disabled={sending || !draft.trim()}
                      onClick={handleSend}
                      style={{ opacity: sending || !draft.trim() ? 0.55 : 1, minWidth: 72 }}
                    >
                      {sending ? "…" : "Send"}
                    </Button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "12px 16px",
                      borderTop: `1px solid ${t.borderSub}`,
                      fontSize: 12,
                      color: t.textMuted,
                      textAlign: "center",
                    }}
                  >
                    Replies aren’t available for {selected.channelName} conversations yet
                    {selected.channel === "whatsapp" && !waIntegration?.connected ? (
                      <>
                        {" · "}
                        <button
                          type="button"
                          onClick={() => setConnectOpen(true)}
                          style={{
                            border: "none",
                            background: "none",
                            color: t.accent,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 500,
                            fontFamily: "inherit",
                            padding: 0,
                          }}
                        >
                          Connect WhatsApp
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT — AI Context Panel */}
          <div className="chats-ai-panel" style={{ ...paneShell, padding: "16px 16px 20px", overflowY: "auto" }}>
            {!selected ? (
              <div style={{ color: t.textMuted, fontSize: 13, lineHeight: 1.5, paddingTop: 24 }}>
                Select a conversation to see AI context, sentiment, and recommended actions.
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selected.session_id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: MOTION_EASE }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <Sparkles size={16} color={dark ? color.brand.hover : color.brand.press} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary }}>AI Assistant</div>
                  </div>

                  <PanelSection title="Conversation Summary" t={t}>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: t.textSecondary }}>
                      {selected.collected?.device || selected.collected?.issue
                        ? `${selected.label} is discussing ${[selected.collected?.device, selected.collected?.issue].filter(Boolean).join(" — ")}.`
                        : `${selected.label} started a conversation on ${selected.channelName}.`}{" "}
                      {selected.booked
                        ? "A booking is already linked."
                        : selected.needsHuman
                          ? "AI recommends human follow-up."
                          : "AI is handling this conversation."}
                    </p>
                  </PanelSection>

                  <PanelSection title="Signals" t={t}>
                    <MetaLine label="Sentiment" value={`${selected.sentiment.label} · ${selected.sentiment.score}%`} t={t} />
                    <MetaLine label="Booking probability" value={`${selected.probability}%`} t={t} />
                    <MetaLine label="Lead score" value={`${selected.score}%`} t={t} />
                    <MetaLine label="Customer value" value={selected.tier || "New"} t={t} />
                    <MetaLine label="AI confidence" value={selected.booked ? "High" : selected.probability >= 70 ? "High" : selected.probability >= 45 ? "Medium" : "Building"} t={t} />
                  </PanelSection>

                  <PanelSection title="Customer" t={t}>
                    <MetaLine label="Device" value={selected.collected?.device} t={t} />
                    <MetaLine label="Repair issue" value={selected.collected?.issue} t={t} />
                    <MetaLine label="Phone" value={formatPhone(selected.collected?.phone)} t={t} />
                    <MetaLine
                      label="Previous bookings"
                      value={
                        selected.relatedBookings.length
                          ? `${selected.relatedBookings.length} booking${selected.relatedBookings.length === 1 ? "" : "s"}`
                          : "None"
                      }
                      t={t}
                    />
                  </PanelSection>

                  <PanelSection title="Knowledge Used" t={t}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {["Shop hours", "Pricing", "Availability", selected.collected?.device || "Device guide"]
                        .filter(Boolean)
                        .map((k) => (
                          <span
                            key={k}
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              padding: "4px 10px",
                              borderRadius: 8,
                              border: `1px solid ${t.border}`,
                              color: t.textSecondary,
                              background: dark ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.02)",
                            }}
                          >
                            {k}
                          </span>
                        ))}
                    </div>
                  </PanelSection>

                  <PanelSection title="Suggested Replies" t={t}>
                    {[
                      activeSuggestion,
                      "We have open pitch slots — tell me your preferred date and time and I’ll check availability.",
                      "You can also book instantly here: /book",
                    ].map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        className="ui-press"
                        onClick={() => setDraft(s)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 12px",
                          marginBottom: 8,
                          borderRadius: 10,
                          border: `1px solid ${t.border}`,
                          background: "transparent",
                          color: t.textSecondary,
                          fontSize: 12,
                          lineHeight: 1.45,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </PanelSection>

                  <PanelSection title="Recommended Actions" t={t}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {!selected.takeover && (
                        <Button type="button" variant="secondary" size="sm" onClick={() => takeOver(selected)} style={{ justifyContent: "flex-start", gap: 8 }}>
                          <Hand size={14} /> Take Over Chat
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          navigate("/bookings");
                          showToast("Opened Bookings");
                        }}
                        style={{ justifyContent: "flex-start", gap: 8 }}
                      >
                        <CalendarPlus size={14} /> Book Appointment
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          navigate("/invoices");
                          showToast("Opened Invoices");
                        }}
                        style={{ justifyContent: "flex-start", gap: 8 }}
                      >
                        <Receipt size={14} /> Send Invoice
                      </Button>
                      {selected.collected?.phone && (
                        <>
                          <a
                            href={`tel:${String(selected.collected.phone).replace(/\D/g, "")}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Button type="button" variant="secondary" size="sm" style={{ width: "100%", justifyContent: "flex-start", gap: 8 }}>
                              <Phone size={14} /> Call Customer
                            </Button>
                          </a>
                          <a
                            href={`https://wa.me/92${String(selected.collected.phone).replace(/\D/g, "").replace(/^0/, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ textDecoration: "none" }}
                          >
                            <Button type="button" variant="secondary" size="sm" style={{ width: "100%", justifyContent: "flex-start", gap: 8 }}>
                              <MessageCircle size={14} /> WhatsApp
                            </Button>
                          </a>
                        </>
                      )}
                      <Button type="button" variant="ghost" size="sm" onClick={() => markResolved(selected)} style={{ justifyContent: "flex-start", gap: 8 }}>
                        <CheckCircle2 size={14} /> Close Conversation
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!selected.collected?.phone) {
                            showToast("No phone on this conversation", "error");
                            return;
                          }
                          setProfileCustomer({
                            Phone: selected.collected.phone,
                            Name: selected.label,
                            Device: selected.collected?.device || "",
                            Service: selected.collected?.issue || "",
                          });
                        }}
                        style={{ justifyContent: "flex-start", gap: 8 }}
                      >
                        <UserRound size={14} /> View Profile
                      </Button>
                    </div>
                  </PanelSection>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      )}

      <ConnectWhatsAppModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={(data) =>
          setWaIntegration({
            connected: true,
            phone_number_id: data?.phone_number_id || null,
            verified_name: data?.verified_name || null,
            display_phone_number: data?.display_phone_number || null,
            status: data?.status || "connected",
          })
        }
      />

      <CustomerHistory
        customer={profileCustomer}
        bookings={bookings}
        invoices={invoices}
        onClose={() => setProfileCustomer(null)}
      />
    </PageShell>
  );
}
