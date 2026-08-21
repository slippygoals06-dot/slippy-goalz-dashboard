import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings as SettingsIcon,
  Building2,
  Bot,
  Calendar,
  FileText,
  Bell,
  Users,
  Shield,
  Plug,
  Palette,
  CreditCard,
  SlidersHorizontal,
  LifeBuoy,
  Search,
  Download,
  HardDrive,
  Sparkles,
  Check,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  Clock,
  KeyRound,
  Lock,
  MessageCircle,
  Wallet,
  UserPlus,
  X,
} from "lucide-react";

/** Lucide removed brand icons — local SVGs matching lucide props */
function Instagram({ size = 24, color = "currentColor", strokeWidth = 2, ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function Facebook({ size = 24, color = "currentColor", strokeWidth = 2, ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
import {
  useTheme,
  primaryBtnStyle,
  primaryBtnHoverProps,
  secondaryBtnStyle,
  cardStyle,
} from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useSecurity } from "../context/SecurityContext";
import { SERVICE_PRICES } from "../constants";
import { BUSINESS_NAME } from "../constants/brand";
import { setPin, clearPin, testWhatsApp } from "../api";
import PageShell from "../components/PageShell";
import Sheet from "../components/Sheet";
import { SkeletonBlock } from "../components/Skeleton";
import { Button, Badge, Input, Field } from "../design-system";
import { spacing, radius, duration, ease, color } from "../design-system/tokens";
import { exportToJSON, exportToCSV } from "../utils/export";
import TeamManager from "../components/TeamManager";

const EASE = ease.standard;
const TRANS = `${duration.fast} ${EASE}`;
const AI_PREFS_KEY = "slippy_ai_prefs";
const NOTIF_PREFS_KEY = "slippy_notif_prefs";

const NAV = [
  { id: "general", title: "General", desc: "Language, timezone, defaults", icon: SettingsIcon, keywords: "language timezone currency general" },
  { id: "business", title: "Business Profile", desc: "Shop identity and hours", icon: Building2, keywords: "shop name phone email address hours city" },
  { id: "ai", title: "AI Assistant", desc: "Behaviour, languages, tone", icon: Bot, keywords: "ai bot greeting temperature prompt knowledge" },
  { id: "bookings", title: "Bookings", desc: "Rules and service prices", icon: Calendar, keywords: "booking prices services slots rules" },
  { id: "invoices", title: "Invoices", desc: "Taxes, currency, templates", icon: FileText, keywords: "invoice tax currency template" },
  { id: "notifications", title: "Notifications", desc: "Email, SMS, WhatsApp alerts", icon: Bell, keywords: "email sms push whatsapp alerts" },
  { id: "team", title: "Team", desc: "Members and permissions", icon: Users, keywords: "team staff role invite permissions" },
  { id: "security", title: "Security", desc: "PIN, password, access", icon: Shield, keywords: "pin password lock security" },
  { id: "integrations", title: "Integrations", desc: "Channels and tools", icon: Plug, keywords: "whatsapp instagram facebook stripe calendar email" },
  { id: "appearance", title: "Appearance", desc: "Theme and display", icon: Palette, keywords: "theme dark light system appearance" },
  { id: "billing", title: "Billing", desc: "Plan and invoices", icon: CreditCard, keywords: "billing plan subscription payment" },
  { id: "advanced", title: "Advanced", desc: "Developer and edge cases", icon: SlidersHorizontal, keywords: "advanced developer export backup" },
  { id: "support", title: "Support", desc: "Help and contact", icon: LifeBuoy, keywords: "support help contact documentation" },
];

const DEFAULT_AI = {
  enabled: true,
  languages: "English, Urdu",
  greeting: "Hi! Welcome to Slippy Goalz Arena — how can I help you today?",
  bookingBehaviour: "confirm_slots",
  escalation: true,
  knowledgeBase: true,
  responseStyle: "professional",
  temperature: 0.4,
};

const DEFAULT_NOTIFS = {
  email: true,
  sms: false,
  push: true,
  whatsapp: true,
  bookingAlerts: true,
  invoiceAlerts: true,
  securityAlerts: true,
  marketing: false,
};

function loadJson(key, fallback) {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) || "{}") };
  } catch {
    return { ...fallback };
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/* ── Shared UI ───────────────────────────────────────────────────────────── */

function OverviewCard({ label, value, hint, tone = "neutral", onClick }) {
  const { theme: t, dark } = useTheme();
  const accent =
    tone === "success"
      ? color.semantic.success
      : tone === "warning"
        ? t.warning || color.semantic.warning
        : tone === "brand"
          ? t.accentSolid || color.brand.DEFAULT
          : t.textMuted;

  return (
    <button
      type="button"
      className="set-lift"
      onClick={onClick}
      style={{
        ...cardStyle(t, { interactive: true }),
        padding: "22px 22px 20px",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        fontFamily: "inherit",
        color: "inherit",
        width: "100%",
        minHeight: 112,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
        borderRadius: radius.lg,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
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
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: accent,
            boxShadow: `0 0 0 4px ${
              dark ? "rgba(255,255,255,0.06)" : "rgba(15,17,21,0.05)"
            }`,
            flexShrink: 0,
            marginTop: 2,
          }}
        />
      </div>
      <div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: -0.6,
            color: t.textPrimary,
            lineHeight: 1.15,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
        {hint && (
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6, lineHeight: 1.4 }}>{hint}</div>
        )}
      </div>
    </button>
  );
}

function SettingCard({ title, description, status, statusTone = "neutral", children, action, secondary }) {
  const { theme: t, dark } = useTheme();
  const statusColor =
    statusTone === "success"
      ? color.semantic.success
      : statusTone === "warning"
        ? t.warning || color.semantic.warning
        : statusTone === "danger"
          ? t.risk || color.semantic.danger
          : t.textMuted;

  return (
    <div
      className="set-lift"
      style={{
        ...cardStyle(t, { interactive: true }),
        padding: 24,
        borderRadius: radius.lg,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: children || action ? 20 : 0,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, letterSpacing: -0.2 }}>
            {title}
          </div>
          {description && (
            <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.5, marginTop: 6, maxWidth: 520 }}>
              {description}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {status && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                color: statusColor,
                background: dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)",
                border: `1px solid ${t.border}`,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor }} />
              {status}
            </span>
          )}
          {secondary}
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}

function PrefToggle({ title, description, checked, onChange, locked }) {
  const { theme: t, dark } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 0",
        borderBottom: `1px solid ${t.borderSub || t.border}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 550, color: t.textPrimary }}>{title}</div>
        {description && (
          <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.45, marginTop: 4 }}>
            {description}
          </div>
        )}
        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>
          {checked ? "Enabled" : "Disabled"}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={locked}
        onClick={() => !locked && onChange?.(!checked)}
        style={{
          width: 48,
          height: 28,
          borderRadius: 999,
          border: "none",
          padding: 2,
          background: checked
            ? t.accentSolid || color.brand.DEFAULT
            : dark
              ? "rgba(255,255,255,0.12)"
              : "rgba(15,17,21,0.12)",
          cursor: locked ? "default" : "pointer",
          opacity: locked ? 0.65 : 1,
          transition: `background 180ms ${EASE}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "block",
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            transform: checked ? "translateX(20px)" : "translateX(0)",
            transition: `transform 180ms ${EASE}`,
          }}
        />
      </button>
    </div>
  );
}

function EmptySection({ title = "No settings available yet.", subtitle = "This feature will become available soon." }) {
  const { theme: t } = useTheme();
  return (
    <div
      style={{
        ...cardStyle(t, { interactive: false }),
        padding: "48px 28px",
        borderRadius: radius.lg,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>{subtitle}</div>
    </div>
  );
}

function SectionIntro({ title, subtitle }) {
  const { theme: t } = useTheme();
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 550, letterSpacing: -0.4, color: t.textPrimary }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: 14, color: t.textMuted, lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function ThemePreview({ mode }) {
  if (mode === "light") {
    return (
      <div style={{ height: 48, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)", display: "flex" }}>
        <div style={{ width: 14, background: "#E11D48" }} />
        <div style={{ flex: 1, background: "#F0F4F8", padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ height: 6, width: "70%", borderRadius: 3, background: "#E1E3E1" }} />
          <div style={{ height: 16, borderRadius: 4, background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }} />
        </div>
      </div>
    );
  }
  if (mode === "dark") {
    return (
      <div style={{ height: 48, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", display: "flex" }}>
        <div style={{ width: 14, background: "#E11D48" }} />
        <div style={{ flex: 1, background: "#131314", padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ height: 6, width: "70%", borderRadius: 3, background: "#282A2C" }} />
          <div style={{ height: 16, borderRadius: 4, background: "#1E1F20", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ height: 48, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)", display: "flex" }}>
      <div style={{ flex: 1, background: "#F0F4F8", display: "flex" }}>
        <div style={{ width: 8, background: "#E11D48" }} />
        <div style={{ flex: 1, padding: 5 }}>
          <div style={{ height: 5, width: "60%", borderRadius: 2, background: "#E1E3E1", marginBottom: 3 }} />
          <div style={{ height: 12, borderRadius: 3, background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }} />
        </div>
      </div>
      <div style={{ flex: 1, background: "#131314", display: "flex" }}>
        <div style={{ width: 8, background: "#F43F5E" }} />
        <div style={{ flex: 1, padding: 5 }}>
          <div style={{ height: 5, width: "60%", borderRadius: 2, background: "#282A2C", marginBottom: 3 }} />
          <div style={{ height: 12, borderRadius: 3, background: "#1E1F20", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ name, description, status, statusTone, lastSync, icon: Icon, onConfigure, onDisconnect }) {
  const { theme: t, dark } = useTheme();
  return (
    <div
      className="set-lift"
      style={{
        ...cardStyle(t, { interactive: true }),
        padding: 20,
        borderRadius: radius.lg,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        minHeight: 168,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)",
            border: `1px solid ${t.border}`,
            color: t.textSecondary,
          }}
        >
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <Badge
          variant={
            statusTone === "success" ? "success" : statusTone === "warning" ? "warning" : "neutral"
          }
          dot
        >
          {status}
        </Badge>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary }}>{name}</div>
        <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.45, marginTop: 4 }}>{description}</div>
        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 10 }}>Last sync · {lastSync}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="ui-press"
          onClick={onConfigure}
          style={{
            ...secondaryBtnStyle(t),
            height: 36,
            padding: "0 14px",
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          Configure
        </button>
        {onDisconnect && (
          <button
            type="button"
            className="ui-press"
            onClick={onDisconnect}
            style={{
              height: 36,
              padding: "0 12px",
              border: "none",
              background: "transparent",
              color: t.textMuted,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

function SettingsSkeleton({ t }) {
  return (
    <div>
      <style>{`
        .sk-wave {
          position: relative; overflow: hidden;
          background: ${t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"};
          border: 1px solid ${t.border};
        }
        .sk-wave::after {
          content: ""; position: absolute; inset: 0; transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, ${
            t.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.65)"
          }, transparent);
          animation: sk-shimmer 1.2s infinite;
        }
        @keyframes sk-shimmer { 100% { transform: translateX(100%); } }
      `}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16, marginBottom: 40 }} className="set-overview">
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} height={112} radius={18} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 32 }} className="set-layout">
        <SkeletonBlock height={480} radius={18} />
        <div>
          <SkeletonBlock height={28} width={200} radius={8} style={{ marginBottom: 12 }} />
          <SkeletonBlock height={16} width={280} radius={6} style={{ marginBottom: 24 }} />
          <SkeletonBlock height={160} radius={18} style={{ marginBottom: 16 }} />
          <SkeletonBlock height={200} radius={18} />
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function Settings() {
  const { theme: t, dark, preference, setPreference } = useTheme();
  const { showToast } = useToast();
  const { pinConfigured, setPinEnabled, refreshPinStatus } = useSecurity();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("general");
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(null);

  const [prices, setPrices] = useState(SERVICE_PRICES);
  const [shop, setShop] = useState({
    name: BUSINESS_NAME,
    phone: "+92 300 0000000",
    email: "owner@slippygoalz.com",
    address: "Lahore, Pakistan",
    city: "Lahore",
    hours: "10:00 AM – 8:00 PM",
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialRef = useRef(null);

  const [pin, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinPassword, setPinPassword] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [clearPassword, setClearPassword] = useState("");
  const [waTestPhone, setWaTestPhone] = useState("");
  const [waTestBusy, setWaTestBusy] = useState(false);
  const [waTestResult, setWaTestResult] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [aiPrefs, setAiPrefs] = useState(() => loadJson(AI_PREFS_KEY, DEFAULT_AI));
  const [notifs, setNotifs] = useState(() => loadJson(NOTIF_PREFS_KEY, DEFAULT_NOTIFS));

  const [generalPrefs, setGeneralPrefs] = useState(() =>
    loadJson("slippy_general_prefs", {
      language: "English",
      timezone: "Asia/Karachi",
      currency: "PKR",
    })
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await refreshPinStatus?.();
      } finally {
        setTimeout(() => alive && setLoading(false), 220);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshPinStatus]);

  useEffect(() => {
    if (!initialRef.current) {
      initialRef.current = {
        shop: JSON.stringify(shop),
        prices: JSON.stringify(prices),
      };
    }
  }, []);

  useEffect(() => {
    if (!initialRef.current) return;
    const changed =
      JSON.stringify(shop) !== initialRef.current.shop ||
      JSON.stringify(prices) !== initialRef.current.prices;
    setDirty(changed);
  }, [shop, prices]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV;
    return NAV.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.desc.toLowerCase().includes(q) ||
        n.keywords.includes(q)
    );
  }, [query]);

  const updateAi = useCallback((key, value) => {
    setAiPrefs((prev) => {
      const next = { ...prev, [key]: value };
      saveJson(AI_PREFS_KEY, next);
      return next;
    });
  }, []);

  const updateNotif = useCallback((key, value) => {
    setNotifs((prev) => {
      const next = { ...prev, [key]: value };
      saveJson(NOTIF_PREFS_KEY, next);
      return next;
    });
  }, []);

  const updateGeneral = useCallback((key, value) => {
    setGeneralPrefs((prev) => {
      const next = { ...prev, [key]: value };
      saveJson("slippy_general_prefs", next);
      return next;
    });
  }, []);

  async function handleTestWhatsApp() {
    const to = waTestPhone.trim();
    if (!to) {
      showToast("Enter a phone number to test", "error");
      return;
    }
    setWaTestBusy(true);
    setWaTestResult(null);
    try {
      const res = await testWhatsApp(to, "hello_world");
      setWaTestResult({ ok: true, text: `Sent hello_world to ${to}` });
      showToast("WhatsApp test message sent");
      console.info("WhatsApp test response:", res);
    } catch (err) {
      const text = err.message || "WhatsApp test failed";
      setWaTestResult({ ok: false, text });
      showToast(text, "error");
    } finally {
      setWaTestBusy(false);
    }
  }

  async function handleSavePin() {
    if (!/^\d{4,6}$/.test(pin)) {
      showToast("PIN must be 4–6 digits", "error");
      return;
    }
    if (pin !== pinConfirm) {
      showToast("PINs do not match", "error");
      return;
    }
    if (!pinPassword) {
      showToast("Enter your password to confirm", "error");
      return;
    }
    setPinBusy(true);
    try {
      await setPin(pin, pinPassword);
      setPinEnabled(true);
      setPinValue("");
      setPinConfirm("");
      setPinPassword("");
      showToast(pinConfigured ? "Quick PIN updated" : "Quick PIN enabled");
    } catch (err) {
      showToast(err.message || "Failed to save PIN", "error");
    } finally {
      setPinBusy(false);
    }
  }

  async function handleClearPin() {
    if (!clearPassword) {
      showToast("Enter your password to remove PIN", "error");
      return;
    }
    setPinBusy(true);
    try {
      await clearPin(clearPassword);
      setPinEnabled(false);
      setClearPassword("");
      showToast("Quick PIN removed — idle timeout will log out again");
    } catch (err) {
      showToast(err.message || "Failed to remove PIN", "error");
    } finally {
      setPinBusy(false);
    }
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      initialRef.current = {
        shop: JSON.stringify(shop),
        prices: JSON.stringify(prices),
      };
      setDirty(false);
      setSaving(false);
      showToast("Settings saved");
    }, 400);
  }

  function handleDiscard() {
    if (initialRef.current) {
      setShop(JSON.parse(initialRef.current.shop));
      setPrices(JSON.parse(initialRef.current.prices));
    }
  }

  function exportSettings() {
    exportToJSON(
      {
        exportedAt: new Date().toISOString(),
        shop,
        prices,
        appearance: preference,
        general: generalPrefs,
        ai: aiPrefs,
        notifications: notifs,
      },
      `settings-export-${new Date().toISOString().slice(0, 10)}.json`
    );
    showToast("Settings exported");
  }

  function backupSettings() {
    exportToCSV(
      [
        { key: "business_name", value: shop.name },
        { key: "phone", value: shop.phone },
        { key: "email", value: shop.email },
        { key: "city", value: shop.city },
        { key: "hours", value: shop.hours },
        ...Object.entries(prices).map(([k, v]) => ({ key: `price_${k}`, value: String(v) })),
      ],
      `settings-backup-${new Date().toISOString().slice(0, 10)}.csv`
    );
    showToast("Backup downloaded");
  }

  const sessionUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("slippy_session") || "{}").user || "Owner";
    } catch {
      return "Owner";
    }
  }, []);

  /* ── Section renderers ─────────────────────────────────────────────────── */

  function renderGeneral() {
    return (
      <>
        <SectionIntro title="General" subtitle="Workspace defaults that apply across the shop." />
        <SettingCard title="Language" description="Primary language for the dashboard and customer messages." status={generalPrefs.language} statusTone="success">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="set-field-grid">
            {["English", "Urdu"].map((lang) => (
              <button
                key={lang}
                type="button"
                className="ui-press set-lift"
                onClick={() => updateGeneral("language", lang)}
                style={{
                  padding: "14px 16px",
                  borderRadius: radius.md,
                  border: `1px solid ${generalPrefs.language === lang ? t.accent : t.border}`,
                  background: t.cardBg,
                  color: t.textPrimary,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        </SettingCard>
        <SettingCard title="Timezone" description="Used for bookings, invoices, and security timestamps." status={generalPrefs.timezone}>
          <Field label="Timezone">
            <Input
              value={generalPrefs.timezone}
              onChange={(e) => updateGeneral("timezone", e.target.value)}
            />
          </Field>
        </SettingCard>
        <SettingCard title="Currency" description="Display currency for prices and invoices." status={generalPrefs.currency} statusTone="success">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["PKR", "USD", "AED"].map((c) => (
              <button
                key={c}
                type="button"
                className="ui-press"
                onClick={() => updateGeneral("currency", c)}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: radius.sm,
                  border: `1px solid ${generalPrefs.currency === c ? t.accent : t.border}`,
                  background: generalPrefs.currency === c ? (dark ? color.brand.softAlpha : color.brand.soft) : t.cardBg,
                  color: t.textPrimary,
                  fontSize: 13,
                  fontWeight: 550,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </SettingCard>
      </>
    );
  }

  function renderBusiness() {
    return (
      <>
        <SectionIntro title="Business Profile" subtitle="Your business name and contact details." />
        <SettingCard title="Business information" description="Shown on invoices, booking pages, and customer messages." status="Editable" statusTone="success">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="set-field-grid">
            <Field label="Shop name">
              <Input value={shop.name} onChange={(e) => setShop((s) => ({ ...s, name: e.target.value }))} />
            </Field>
            <Field label="Phone">
              <Input value={shop.phone} onChange={(e) => setShop((s) => ({ ...s, phone: e.target.value }))} />
            </Field>
            <Field label="Email">
              <Input type="email" value={shop.email} onChange={(e) => setShop((s) => ({ ...s, email: e.target.value }))} />
            </Field>
            <Field label="City">
              <Input value={shop.city} onChange={(e) => setShop((s) => ({ ...s, city: e.target.value }))} />
            </Field>
            <Field label="Address" hint="Street and area">
              <Input value={shop.address} onChange={(e) => setShop((s) => ({ ...s, address: e.target.value }))} />
            </Field>
            <Field label="Opening hours">
              <Input value={shop.hours} onChange={(e) => setShop((s) => ({ ...s, hours: e.target.value }))} />
            </Field>
          </div>
        </SettingCard>
        <SettingCard
          title="Operating hours"
          description="Customers see these hours when booking and chatting."
          status={shop.hours}
          action={
            <Button variant="secondary" size="sm" onClick={() => setDrawer("hours")}>
              Advanced
            </Button>
          }
        >
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: t.textSecondary }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Clock size={14} strokeWidth={1.75} color={t.textMuted} />
              {shop.hours}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MapPin size={14} strokeWidth={1.75} color={t.textMuted} />
              {shop.city}
            </span>
          </div>
        </SettingCard>
      </>
    );
  }

  function renderAi() {
    return (
      <>
        <SectionIntro title="AI Assistant" subtitle="Configure your intelligent shop employee — calm, clear, and on-brand." />
        <SettingCard title="AI enabled" description="Allow the assistant to help with bookings, FAQs, and triage." status={aiPrefs.enabled ? "Active" : "Paused"} statusTone={aiPrefs.enabled ? "success" : "warning"}>
          <PrefToggle
            title="Enable AI assistant"
            description="When off, customers are routed to manual chat only."
            checked={aiPrefs.enabled}
            onChange={(v) => updateAi("enabled", v)}
          />
        </SettingCard>
        <SettingCard title="Languages" description="Languages the assistant may reply in." status={aiPrefs.languages}>
          <Field label="Supported languages">
            <Input value={aiPrefs.languages} onChange={(e) => updateAi("languages", e.target.value)} />
          </Field>
        </SettingCard>
        <SettingCard title="Greeting message" description="First message customers see when opening chat.">
          <Field label="Greeting">
            <Input value={aiPrefs.greeting} onChange={(e) => updateAi("greeting", e.target.value)} />
          </Field>
        </SettingCard>
        <SettingCard title="Booking behaviour" description="How the assistant handles slot requests." status="Confirm slots" statusTone="success">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { id: "confirm_slots", label: "Confirm available slots before booking" },
              { id: "suggest_only", label: "Suggest times — owner confirms" },
              { id: "waitlist_first", label: "Offer waitlist when full" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="ui-press"
                onClick={() => updateAi("bookingBehaviour", opt.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 0",
                  border: "none",
                  borderBottom: `1px solid ${t.borderSub || t.border}`,
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  color: t.textPrimary,
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: `2px solid ${aiPrefs.bookingBehaviour === opt.id ? t.accent : t.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {aiPrefs.bookingBehaviour === opt.id && (
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.accent }} />
                  )}
                </span>
                <span style={{ fontSize: 14 }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </SettingCard>
        <SettingCard title="Escalation & knowledge" description="When to hand off to a human, and whether to use shop knowledge.">
          <PrefToggle
            title="Escalation rules"
            description="Hand off to staff when the customer asks for a human or intent is unclear."
            checked={aiPrefs.escalation}
            onChange={(v) => updateAi("escalation", v)}
          />
          <PrefToggle
            title="Knowledge base"
            description="Use shop services, prices, and FAQs in answers."
            checked={aiPrefs.knowledgeBase}
            onChange={(v) => updateAi("knowledgeBase", v)}
          />
        </SettingCard>
        <SettingCard title="Response style" description="Voice and warmth of replies." status={aiPrefs.responseStyle}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["professional", "friendly", "concise"].map((s) => (
              <button
                key={s}
                type="button"
                className="ui-press"
                onClick={() => updateAi("responseStyle", s)}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: radius.sm,
                  border: `1px solid ${aiPrefs.responseStyle === s ? t.accent : t.border}`,
                  background: aiPrefs.responseStyle === s ? (dark ? color.brand.softAlpha : color.brand.soft) : t.cardBg,
                  color: t.textPrimary,
                  fontSize: 13,
                  fontWeight: 550,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textTransform: "capitalize",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </SettingCard>
        <SettingCard
          title="Temperature"
          description="Lower is more predictable. Higher is more creative."
          status={String(aiPrefs.temperature)}
          action={
            <Button variant="secondary" size="sm" onClick={() => setDrawer("ai-preview")}>
              Prompt preview
            </Button>
          }
        >
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={aiPrefs.temperature}
            onChange={(e) => updateAi("temperature", Number(e.target.value))}
            style={{ width: "100%", accentColor: t.accentSolid || color.brand.DEFAULT }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: t.textMuted, marginTop: 8 }}>
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </SettingCard>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              showToast("AI test conversation opened in Chats");
              navigate("/chats");
            }}
          >
            <Sparkles size={16} strokeWidth={2} />
            Test AI
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/chats")}>
            Open chats
          </Button>
        </div>
      </>
    );
  }

  function renderBookings() {
    return (
      <>
        <SectionIntro title="Bookings" subtitle="Service pricing and how appointments are accepted." />
        <SettingCard title="Booking rules" description="Core rules that keep the calendar healthy." status="Active" statusTone="success">
          <PrefToggle title="Require phone number" description="Customers must provide a WhatsApp-ready number." checked locked />
          <PrefToggle title="Allow same-day bookings" description="Customers can book available slots for today." checked locked />
          <PrefToggle title="Auto-confirm when slot is free" description="Coming soon — currently owner confirms pending bookings." checked={false} locked />
        </SettingCard>
        <SettingCard title="Service prices" description={`Used on invoices and booking estimates. Amounts in ${generalPrefs.currency}.`} status={`${Object.keys(prices).length} services`}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="set-field-grid">
            {Object.entries(prices).map(([service, price]) => (
              <Field key={service} label={service}>
                <div style={{ position: "relative" }}>
                  <span
                    className="font-mono-data"
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: t.textMuted,
                      zIndex: 1,
                    }}
                  >
                    {generalPrefs.currency}
                  </span>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrices((p) => ({ ...p, [service]: +e.target.value }))}
                    style={{ paddingLeft: 48, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                  />
                </div>
              </Field>
            ))}
          </div>
        </SettingCard>
      </>
    );
  }

  function renderInvoices() {
    return (
      <>
        <SectionIntro title="Invoices" subtitle="How money is presented on documents and receipts." />
        <SettingCard title="Taxes" description="Sales tax applied to invoices." status="Not configured" statusTone="warning" action={<Button variant="secondary" size="sm" onClick={() => setDrawer("taxes")}>Configure</Button>}>
          <div style={{ fontSize: 13, color: t.textSecondary }}>No tax rate set. Invoices will show line totals without tax.</div>
        </SettingCard>
        <SettingCard title="Currency" description="Matches your general workspace currency." status={generalPrefs.currency} statusTone="success">
          <div style={{ fontSize: 13, color: t.textSecondary }}>Change currency under General.</div>
        </SettingCard>
        <SettingCard title="Email templates" description="Receipt and reminder copy sent to customers." status="Default" action={<Button variant="secondary" size="sm" onClick={() => setDrawer("email-templates")}>Edit</Button>} />
        <SettingCard title="SMS templates" description="Short payment and pickup reminders." status="Default" action={<Button variant="secondary" size="sm" onClick={() => setDrawer("sms-templates")}>Edit</Button>} />
      </>
    );
  }

  function renderNotifications() {
    return (
      <>
        <SectionIntro title="Notifications" subtitle="Choose how the shop hears about bookings, money, and security." />
        <SettingCard title="Channels" description="Delivery channels for alerts.">
          <PrefToggle title="Email" description="Send alerts to the owner email." checked={notifs.email} onChange={(v) => updateNotif("email", v)} />
          <PrefToggle title="SMS" description="Text message alerts for urgent events." checked={notifs.sms} onChange={(v) => updateNotif("sms", v)} />
          <PrefToggle title="Push" description="In-app notification bell." checked={notifs.push} onChange={(v) => updateNotif("push", v)} />
          <PrefToggle title="WhatsApp" description="Operational alerts via WhatsApp Business." checked={notifs.whatsapp} onChange={(v) => updateNotif("whatsapp", v)} />
        </SettingCard>
        <SettingCard title="Categories" description="What kinds of events should notify you.">
          <PrefToggle title="Booking alerts" description="New, confirmed, and cancelled bookings." checked={notifs.bookingAlerts} onChange={(v) => updateNotif("bookingAlerts", v)} />
          <PrefToggle title="Invoice alerts" description="Unpaid invoices and payment updates." checked={notifs.invoiceAlerts} onChange={(v) => updateNotif("invoiceAlerts", v)} />
          <PrefToggle title="Security alerts" description="Failed logins, lockouts, and PIN changes." checked={notifs.securityAlerts} onChange={(v) => updateNotif("securityAlerts", v)} />
          <PrefToggle title="Marketing" description="Product updates and tips. Optional." checked={notifs.marketing} onChange={(v) => updateNotif("marketing", v)} />
        </SettingCard>
      </>
    );
  }

  function renderTeam() {
    return <TeamManager sessionUser={sessionUser} />;
  }

  function _renderTeam_OLD_UNUSED() {
    return (
      <>
        <SectionIntro title="Team" subtitle="People who can operate this workspace." />
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Button variant="primary" size="sm" onClick={() => showToast("Team invites coming soon")}>
            <UserPlus size={16} strokeWidth={2} />
            Invite member
          </Button>
        </div>
        <div
          className="set-lift"
          style={{
            ...cardStyle(t, { interactive: true }),
            padding: 20,
            borderRadius: radius.lg,
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: dark ? color.brand.softAlpha : color.brand.soft,
              color: t.accentDeep || color.brand.hover,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 650,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {String(sessionUser).slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary }}>{sessionUser}</span>
              <Badge variant="brand" dot>Owner</Badge>
            </div>
            <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 4 }}>
              Full access · Last active now
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setDrawer("role-owner")}>
            Manage role
          </Button>
        </div>
        <EmptySection title="No other members yet." subtitle="Invite staff when you’re ready to share access." />
      </>
    );
  }

  function renderSecurity() {
    return (
      <>
        <SectionIntro title="Security" subtitle="Protect this account with PIN unlock and password controls." />
        <SettingCard
          title="Quick PIN"
          description={
            pinConfigured
              ? "Enabled — after 30 min idle the screen locks; unlock with PIN (JWT stays valid)."
              : "Optional. Without a PIN, idle timeout still logs you out completely."
          }
          status={pinConfigured ? "Enabled" : "Off"}
          statusTone={pinConfigured ? "success" : "warning"}
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate("/security")}>
              Security center
              <ArrowRight size={14} strokeWidth={2} />
            </Button>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="set-field-grid">
            <Field label={pinConfigured ? "New PIN (4–6 digits)" : "PIN (4–6 digits)"}>
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••"
              />
            </Field>
            <Field label="Confirm PIN">
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••"
              />
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Current password" hint="Required to set or update PIN">
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={pinPassword}
                  onChange={(e) => setPinPassword(e.target.value)}
                  placeholder="Required to set PIN"
                />
              </Field>
            </div>
          </div>
          <Button variant="primary" size="sm" disabled={pinBusy} onClick={handleSavePin}>
            <KeyRound size={16} strokeWidth={2} />
            {pinBusy ? "Saving…" : pinConfigured ? "Update Quick PIN" : "Enable Quick PIN"}
          </Button>
          {pinConfigured && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${t.borderSub || t.border}` }}>
              <Field label="Password to remove PIN">
                <Input
                  type="password"
                  value={clearPassword}
                  onChange={(e) => setClearPassword(e.target.value)}
                  placeholder="Owner password"
                />
              </Field>
              <div style={{ marginTop: 12 }}>
                <Button variant="danger" size="sm" disabled={pinBusy} onClick={handleClearPin}>
                  Remove Quick PIN
                </Button>
              </div>
            </div>
          )}
        </SettingCard>

        <SettingCard title="Change password" description="Update the password used for full sign-in." status="Protected" statusTone="success">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="set-field-grid">
            <Field label="Current password">
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <Field label="New password">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div style={{ marginTop: 16 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!currentPassword || !newPassword) {
                  showToast("Enter current and new password", "error");
                  return;
                }
                showToast("Password update will be available in a future release");
              }}
            >
              <Lock size={16} strokeWidth={2} />
              Update password
            </Button>
          </div>
        </SettingCard>
      </>
    );
  }

  function renderIntegrations() {
    return (
      <>
        <SectionIntro title="Integrations" subtitle="Connect the channels your customers already use." />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
          className="set-int-grid"
        >
          <IntegrationCard
            name="WhatsApp"
            description="Business messaging and booking alerts."
            status="Connected"
            statusTone="success"
            lastSync="Just now"
            icon={MessageCircle}
            onConfigure={() => setDrawer("whatsapp")}
            onDisconnect={() => showToast("WhatsApp remains required for shop operations")}
          />
          <IntegrationCard
            name="Instagram"
            description="Receive booking messages from Instagram."
            status="Not connected"
            statusTone="neutral"
            lastSync="Never"
            icon={Instagram}
            onConfigure={() => showToast("Instagram integration coming soon")}
          />
          <IntegrationCard
            name="Facebook Messenger"
            description="Messenger leads into your inbox."
            status="Not connected"
            statusTone="neutral"
            lastSync="Never"
            icon={Facebook}
            onConfigure={() => showToast("Messenger integration coming soon")}
          />
          <IntegrationCard
            name="Email"
            description="Transactional mail for invoices and receipts."
            status="Configured"
            statusTone="success"
            lastSync={shop.email}
            icon={Mail}
            onConfigure={() => setSection("business")}
          />
          <IntegrationCard
            name="Google Calendar"
            description="Sync confirmed bookings to your calendar."
            status="Not connected"
            statusTone="neutral"
            lastSync="Never"
            icon={Calendar}
            onConfigure={() => showToast("Google Calendar coming soon")}
          />
          <IntegrationCard
            name="Stripe"
            description="Card payments for invoices."
            status="Not connected"
            statusTone="neutral"
            lastSync="Never"
            icon={Wallet}
            onConfigure={() => showToast("Stripe integration coming soon")}
          />
        </div>
      </>
    );
  }

  function renderAppearance() {
    const THEME_OPTS = [
      { id: "light", label: "Light" },
      { id: "dark", label: "Dark (OLED)" },
      { id: "system", label: "System" },
    ];
    return (
      <>
        <SectionIntro title="Appearance" subtitle="Theme follows system by default. OLED dark uses pure black surfaces." />
        <SettingCard title="Theme" description="Choose how Slippy Goalz looks on this device." status={preference} statusTone="success">
          <div className="theme-picker" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {THEME_OPTS.map((opt) => {
              const active = preference === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className="ui-press set-lift"
                  onClick={() => setPreference(opt.id)}
                  style={{
                    position: "relative",
                    padding: 14,
                    borderRadius: radius.md,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    border: `1px solid ${active ? t.accent : t.border}`,
                    background: t.cardBg,
                    color: t.textPrimary,
                    overflow: "hidden",
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="activeTheme"
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: radius.md,
                        border: `2px solid ${t.accent}`,
                        pointerEvents: "none",
                      }}
                      transition={{ type: "tween", duration: 0.18, ease: [0.2, 0, 0, 1] }}
                    />
                  )}
                  <ThemePreview mode={opt.id} />
                  <div style={{ marginTop: 12, fontSize: 13, fontWeight: 550, display: "flex", alignItems: "center", gap: 6 }}>
                    {active && <Check size={14} strokeWidth={2} color={t.accent} />}
                    {opt.label}
                  </div>
                </button>
              );
            })}
          </div>
        </SettingCard>
      </>
    );
  }

  function renderBilling() {
    return (
      <>
        <SectionIntro title="Billing" subtitle="Plan details for this workspace." />
        <SettingCard title="Subscription plan" description="Current plan for Slippy Goalz." status="Pro" statusTone="success">
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, color: t.textPrimary, marginBottom: 8 }}>Pro</div>
          <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>
            Includes AI assistant, WhatsApp channel, unlimited bookings, and security controls.
          </div>
        </SettingCard>
        <SettingCard title="Payment method" description="How renewals are charged." status="Not on file" statusTone="warning" action={<Button variant="secondary" size="sm" onClick={() => showToast("Billing portal coming soon")}>Add method</Button>} />
        <EmptySection title="No billing history yet." subtitle="Invoices will appear here when billing is connected." />
      </>
    );
  }

  function renderAdvanced() {
    return (
      <>
        <SectionIntro title="Advanced" subtitle="Export, backup, and developer utilities." />
        <SettingCard
          title="Export settings"
          description="Download a JSON snapshot of shop, prices, and preferences."
          action={<Button variant="secondary" size="sm" onClick={exportSettings}>Export</Button>}
        />
        <SettingCard
          title="Backup"
          description="CSV backup of core business fields and prices."
          action={<Button variant="secondary" size="sm" onClick={backupSettings}>Download backup</Button>}
        />
        <SettingCard
          title="WhatsApp test"
          description="Dev-only: sends Meta’s hello_world template via POST /test-whatsapp."
          status="Temporary"
          statusTone="warning"
          action={<Button variant="secondary" size="sm" onClick={() => setDrawer("whatsapp")}>Open tester</Button>}
        />
      </>
    );
  }

  function renderSupport() {
    return (
      <>
        <SectionIntro title="Support" subtitle="Get help without leaving the control center." />
        <SettingCard
          title="Documentation"
          description="Guides for bookings, invoices, and AI setup."
          action={
            <Button variant="secondary" size="sm" onClick={() => showToast("Docs link coming soon")}>
              Open docs
            </Button>
          }
        />
        <SettingCard
          title="Contact support"
          description="Reach the Slippy Goalz team for account or channel issues."
          action={
            <Button variant="secondary" size="sm" onClick={() => { window.location.href = `mailto:${shop.email}`; }}>
              Email support
            </Button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: t.textSecondary }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Mail size={14} color={t.textMuted} strokeWidth={1.75} /> {shop.email}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Phone size={14} color={t.textMuted} strokeWidth={1.75} /> {shop.phone}
            </span>
          </div>
        </SettingCard>
        <SettingCard
          title="Security center"
          description="Review sessions, health score, and recent security activity."
          action={
            <Button variant="primary" size="sm" onClick={() => navigate("/security")}>
              Open Security
            </Button>
          }
        />
      </>
    );
  }

  function renderSection() {
    switch (section) {
      case "general":
        return renderGeneral();
      case "business":
        return renderBusiness();
      case "ai":
        return renderAi();
      case "bookings":
        return renderBookings();
      case "invoices":
        return renderInvoices();
      case "notifications":
        return renderNotifications();
      case "team":
        return renderTeam();
      case "security":
        return renderSecurity();
      case "integrations":
        return renderIntegrations();
      case "appearance":
        return renderAppearance();
      case "billing":
        return renderBilling();
      case "advanced":
        return renderAdvanced();
      case "support":
        return renderSupport();
      default:
        return <EmptySection />;
    }
  }

  return (
    <PageShell
      title="Settings"
      subtitle="Update your business, assistant, and account settings."
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={exportSettings}>
            <Download size={16} strokeWidth={2} />
            Export Settings
          </Button>
          <Button variant="secondary" size="sm" onClick={backupSettings}>
            <HardDrive size={16} strokeWidth={2} />
            Backup
          </Button>
        </>
      }
    >
      <style>{`
        .set-lift {
          transition: border-color ${TRANS}, box-shadow ${TRANS}, transform ${TRANS};
        }
        .set-lift:hover {
          transform: translateY(-1px);
          border-color: ${t.borderHover} !important;
          box-shadow: ${t.cardShadowHover || t.cardShadow} !important;
        }
        .set-overview {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 16px;
        }
        .set-layout {
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          gap: 32px;
          align-items: start;
        }
        .set-nav-item {
          transition: background ${TRANS}, color ${TRANS}, border-color ${TRANS};
        }
        .set-nav-item:hover {
          background: ${dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"};
        }
        .set-nav-item[data-active="1"] {
          background: ${dark ? color.brand.softAlpha : color.brand.soft};
          border-color: ${dark ? "rgba(244,63,94,0.22)" : color.brand.softBorder};
        }
        .set-int-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 1100px) {
          .set-overview { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .set-layout { grid-template-columns: 240px minmax(0, 1fr); gap: 24px; }
        }
        @media (max-width: 860px) {
          .set-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .set-layout { grid-template-columns: 1fr; }
          .set-field-grid { grid-template-columns: 1fr !important; }
          .theme-picker { grid-template-columns: 1fr !important; }
          .set-int-grid { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .set-lift, .set-lift:hover { transition: none; transform: none !important; }
        }
      `}</style>

      {loading ? (
        <SettingsSkeleton t={t} />
      ) : (
        <>
          {/* Business Overview */}
          <section style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 550, letterSpacing: -0.35, color: t.textPrimary }}>
                Business Overview
              </h2>
              <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
                A calm snapshot of how this workspace is configured.
              </p>
            </div>
            <div className="set-overview">
              <OverviewCard
                label="Business Name"
                value={shop.name || BUSINESS_NAME}
                hint={shop.city}
                tone="brand"
                onClick={() => setSection("business")}
              />
              <OverviewCard
                label="Subscription Plan"
                value="Pro"
                hint="Active"
                tone="success"
                onClick={() => setSection("billing")}
              />
              <OverviewCard
                label="Storage Usage"
                value="12%"
                hint="Local preferences"
                tone="neutral"
                onClick={() => setSection("advanced")}
              />
              <OverviewCard
                label="AI Usage"
                value={aiPrefs.enabled ? "On" : "Off"}
                hint={aiPrefs.responseStyle}
                tone={aiPrefs.enabled ? "success" : "warning"}
                onClick={() => setSection("ai")}
              />
              <OverviewCard
                label="Connected Channels"
                value="2"
                hint="WhatsApp · Email"
                tone="success"
                onClick={() => setSection("integrations")}
              />
            </div>
          </section>

          {/* Nav + Content */}
          <div className="set-layout">
            <aside style={{ position: "sticky", top: 88 }}>
              <div
                style={{
                  ...cardStyle(t, { interactive: false }),
                  borderRadius: radius.lg,
                  padding: 12,
                  overflow: "hidden",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    height: 44,
                    padding: "0 12px",
                    borderRadius: radius.sm,
                    border: `1px solid ${t.border}`,
                    background: dark ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.02)",
                    marginBottom: 12,
                  }}
                >
                  <Search size={16} color={t.textMuted} strokeWidth={1.75} />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search settings…"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: 13,
                      color: t.textPrimary,
                      fontFamily: "inherit",
                      height: "100%",
                    }}
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setQuery("")}
                      style={{
                        border: "none",
                        background: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: t.textMuted,
                        display: "flex",
                      }}
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  )}
                </label>

                <nav style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
                  {filteredNav.length === 0 ? (
                    <div style={{ padding: "20px 12px", fontSize: 13, color: t.textMuted, textAlign: "center" }}>
                      No matching settings
                    </div>
                  ) : (
                    filteredNav.map((item) => {
                      const Icon = item.icon;
                      const active = section === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className="set-nav-item ui-press"
                          data-active={active ? "1" : undefined}
                          onClick={() => setSection(item.id)}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            width: "100%",
                            textAlign: "left",
                            padding: "12px 12px",
                            borderRadius: radius.sm,
                            border: `1px solid ${active ? "transparent" : "transparent"}`,
                            background: "transparent",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            color: "inherit",
                          }}
                        >
                          <span
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 10,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: active
                                ? dark
                                  ? "rgba(244,63,94,0.16)"
                                  : "#fff"
                                : dark
                                  ? "rgba(255,255,255,0.04)"
                                  : "rgba(15,17,21,0.04)",
                              color: active ? t.accentDeep || color.brand.hover : t.textSecondary,
                              flexShrink: 0,
                              border: `1px solid ${active ? (dark ? "rgba(244,63,94,0.28)" : color.brand.softBorder) : t.border}`,
                            }}
                          >
                            <Icon size={16} strokeWidth={1.75} />
                          </span>
                          <span style={{ minWidth: 0, flex: 1, paddingTop: 1 }}>
                            <span
                              style={{
                                display: "block",
                                fontSize: 13,
                                fontWeight: 550,
                                color: t.textPrimary,
                                letterSpacing: -0.1,
                              }}
                            >
                              {item.title}
                            </span>
                            <span
                              style={{
                                display: "block",
                                fontSize: 12,
                                color: t.textMuted,
                                lineHeight: 1.35,
                                marginTop: 2,
                              }}
                            >
                              {item.desc}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </nav>
              </div>
            </aside>

            <main style={{ minWidth: 0, paddingBottom: dirty ? 96 : 24 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={section}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                >
                  {renderSection()}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </>
      )}

      {/* Floating save bar */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
          display: "flex",
          justifyContent: "center",
          padding: "0 16px 24px",
          pointerEvents: dirty ? "auto" : "none",
          transform: dirty ? "translateY(0)" : "translateY(24px)",
          opacity: dirty ? 1 : 0,
          transition: `transform 200ms ${EASE}, opacity 200ms ${EASE}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "12px 16px 12px 20px",
            borderRadius: radius.lg,
            background: t.cardBg,
            border: `1px solid ${t.border}`,
            boxShadow: t.cardShadowHover || "0 8px 32px rgba(0,0,0,0.12)",
            maxWidth: 520,
            width: "100%",
          }}
        >
          <span style={{ flex: 1, fontSize: 13, color: t.textSecondary, fontWeight: 500 }}>
            You have unsaved changes.
          </span>
          <button
            type="button"
            className="ui-press"
            onClick={handleDiscard}
            style={{
              ...secondaryBtnStyle(t),
              height: 36,
              padding: "0 14px",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            Discard
          </button>
          <button
            type="button"
            className="ui-press"
            disabled={saving}
            onClick={handleSave}
            {...primaryBtnHoverProps(t)}
            style={{
              ...primaryBtnStyle(t),
              height: 36,
              padding: "0 16px",
              fontSize: 13,
              fontFamily: "inherit",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Detail drawers */}
      <Sheet
        open={drawer === "hours"}
        onClose={() => setDrawer(null)}
        title="Operating hours"
        subtitle="Advanced schedule"
        width={420}
        footer={
          <Button variant="primary" size="sm" onClick={() => setDrawer(null)}>
            Done
          </Button>
        }
      >
        <Field label="Display hours">
          <Input value={shop.hours} onChange={(e) => setShop((s) => ({ ...s, hours: e.target.value }))} />
        </Field>
        <p style={{ marginTop: 16, fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>
          Day-by-day schedules will appear here. For now, a single hours string is shown on booking pages.
        </p>
      </Sheet>

      <Sheet
        open={drawer === "ai-preview"}
        onClose={() => setDrawer(null)}
        title="Prompt preview"
        subtitle="How the assistant introduces itself"
        width={460}
      >
        <div
          style={{
            padding: 20,
            borderRadius: radius.md,
            border: `1px solid ${t.border}`,
            background: dark ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.03)",
            fontSize: 14,
            color: t.textSecondary,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {`You are the AI assistant for ${shop.name}.\nStyle: ${aiPrefs.responseStyle}\nTemperature: ${aiPrefs.temperature}\nLanguages: ${aiPrefs.languages}\n\nGreeting:\n"${aiPrefs.greeting}"`}
        </div>
      </Sheet>

      <Sheet
        open={drawer === "whatsapp"}
        onClose={() => setDrawer(null)}
        title="WhatsApp test"
        subtitle="Temporary developer utility"
        width={420}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDrawer(null)}>
              Close
            </Button>
            <div style={{ marginLeft: "auto" }}>
              <Button variant="primary" size="sm" disabled={waTestBusy} onClick={handleTestWhatsApp}>
                {waTestBusy ? "Sending…" : "Send test"}
              </Button>
            </div>
          </>
        }
      >
        <div
          style={{
            padding: 14,
            borderRadius: radius.md,
            border: `1px solid ${dark ? "rgba(245,158,11,0.28)" : "rgba(245,158,11,0.25)"}`,
            background: dark ? "rgba(245,158,11,0.10)" : "rgba(245,158,11,0.08)",
            fontSize: 13,
            color: t.textSecondary,
            lineHeight: 1.45,
            marginBottom: 20,
          }}
        >
          Dev-only: sends Meta’s <code style={{ color: t.textPrimary }}>hello_world</code> template via{" "}
          <code style={{ color: t.textPrimary }}>POST /test-whatsapp</code>.
        </div>
        <Field label="Recipient phone" hint="03001234567 or +923001234567">
          <Input
            type="tel"
            value={waTestPhone}
            onChange={(e) => setWaTestPhone(e.target.value)}
            placeholder="03001234567"
          />
        </Field>
        {waTestResult && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.4,
              background: waTestResult.ok
                ? dark
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(34,197,94,0.10)"
                : dark
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(239,68,68,0.08)",
              border: `1px solid ${waTestResult.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              color: waTestResult.ok ? color.semantic.success : t.risk || color.semantic.danger,
            }}
          >
            {waTestResult.text}
          </div>
        )}
      </Sheet>

      <Sheet
        open={drawer === "taxes" || drawer === "email-templates" || drawer === "sms-templates" || drawer === "role-owner"}
        onClose={() => setDrawer(null)}
        title={
          drawer === "taxes"
            ? "Taxes"
            : drawer === "email-templates"
              ? "Email templates"
              : drawer === "sms-templates"
                ? "SMS templates"
                : "Owner role"
        }
        subtitle="Advanced configuration"
        width={420}
        footer={
          <Button variant="primary" size="sm" onClick={() => setDrawer(null)}>
            Done
          </Button>
        }
      >
        <EmptySection
          title="No settings available yet."
          subtitle="This feature will become available soon."
        />
      </Sheet>
    </PageShell>
  );
}
