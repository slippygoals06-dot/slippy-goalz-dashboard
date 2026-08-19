import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  KeyRound,
  Smartphone,
  Fingerprint,
  Mail,
  Phone,
  Monitor,
  Laptop,
  Tablet,
  MapPin,
  Globe,
  Clock,
  LogIn,
  LogOut,
  AlertTriangle,
  Download,
  ArrowRight,
  Settings2,
  Lock,
  Unlock,
  Key,
  User,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { useSecurity } from "../context/SecurityContext";
import {
  useTheme,
  cardStyle,
  primaryBtnStyle,
  primaryBtnHoverProps,
  secondaryBtnStyle,
} from "../context/ThemeContext";
import EmptyState from "../components/EmptyState";
import PageShell from "../components/PageShell";
import Sheet from "../components/Sheet";
import { SkeletonBlock } from "../components/Skeleton";
import { Button, Badge } from "../design-system";
import { spacing, radius, duration, ease, color } from "../design-system/tokens";
import { exportToCSV } from "../utils/export";

const PREFS_KEY = "slippy_sec_prefs";
const EASE = ease.standard;
const TRANS = `${duration.fast} ${EASE}`;

const DEFAULT_PREFS = {
  require2fa: false,
  autoLogout: true,
  sessionTimeout: true,
  trustedDevices: true,
  loginAlerts: true,
  emailNotifications: true,
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function parseUserAgent(ua = navigator.userAgent) {
  let browser = "Browser";
  let os = "Unknown OS";
  let device = "desktop";

  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  if (/iPad|Tablet/i.test(ua)) device = "tablet";
  else if (/Mobi|Android|iPhone/i.test(ua)) device = "mobile";

  return { browser, os, device };
}

function loadPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

function formatRelative(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dateGroupLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diff = (today - that) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function eventMeta(event = "") {
  const e = String(event).toLowerCase();
  if (e.includes("fail")) {
    return { label: "Login Failed", tone: "danger", icon: AlertTriangle, risk: "Elevated" };
  }
  if (e.includes("lock") && e.includes("account")) {
    return { label: "Account Locked", tone: "danger", icon: ShieldAlert, risk: "High" };
  }
  if (e.includes("screen lock")) {
    return { label: "Screen Locked", tone: "neutral", icon: Lock, risk: "Low" };
  }
  if (e.includes("unlock")) {
    return { label: "Screen Unlocked", tone: "success", icon: Unlock, risk: "Low" };
  }
  if (e.includes("logout") || e.includes("signed out")) {
    return { label: "Session Revoked", tone: "neutral", icon: LogOut, risk: "Low" };
  }
  if (e.includes("success")) {
    return { label: "Successful Login", tone: "success", icon: LogIn, risk: "Low" };
  }
  if (e.includes("session") || e === "login") {
    return { label: "Session Started", tone: "success", icon: Monitor, risk: "Low" };
  }
  if (e.includes("password")) {
    return { label: "Password Changed", tone: "warning", icon: KeyRound, risk: "Medium" };
  }
  if (e.includes("2fa") || e.includes("pin")) {
    return { label: "2FA Updated", tone: "success", icon: ShieldCheck, risk: "Low" };
  }
  if (e.includes("email")) {
    return { label: "Email Updated", tone: "neutral", icon: Mail, risk: "Low" };
  }
  if (e.includes("recovery")) {
    return { label: "Recovery Codes Downloaded", tone: "warning", icon: Key, risk: "Medium" };
  }
  if (e.includes("device")) {
    return { label: "New Device", tone: "warning", icon: Smartphone, risk: "Medium" };
  }
  return { label: event || "Security Event", tone: "neutral", icon: Shield, risk: "Low" };
}

function toneColor(tone, t) {
  if (tone === "success") return color.semantic.success;
  if (tone === "warning") return t.warning || color.semantic.warning;
  if (tone === "danger") return t.risk || color.semantic.danger;
  return t.textMuted;
}

function computeScore({ pinConfigured, isLocked, failCount, recentFails }) {
  let score = 62;
  if (pinConfigured) score += 18;
  else score -= 8;
  if (!isLocked) score += 8;
  else score -= 20;
  if (failCount === 0) score += 6;
  else if (failCount >= 3) score -= 10;
  if (recentFails === 0) score += 6;
  else if (recentFails >= 2) score -= 8;
  // Always-on protections
  score += 10; // rate limit + encrypted session + idle lock
  return Math.max(12, Math.min(100, score));
}

function scoreLabel(score) {
  if (score >= 90) return { text: "Excellent", tone: "success" };
  if (score >= 75) return { text: "Strong", tone: "success" };
  if (score >= 60) return { text: "Needs Attention", tone: "warning" };
  return { text: "At Risk", tone: "danger" };
}

function riskLevel(score, isLocked, recentFails) {
  if (isLocked || recentFails >= 3 || score < 55) return { text: "High", tone: "danger" };
  if (score < 75 || recentFails > 0) return { text: "Medium", tone: "warning" };
  return { text: "Low", tone: "success" };
}

function DeviceIcon({ kind, size = 20 }) {
  if (kind === "mobile") return <Smartphone size={size} strokeWidth={1.75} />;
  if (kind === "tablet") return <Tablet size={size} strokeWidth={1.75} />;
  if (kind === "laptop") return <Laptop size={size} strokeWidth={1.75} />;
  return <Monitor size={size} strokeWidth={1.75} />;
}

/* ── Subcomponents ───────────────────────────────────────────────────────── */

function SectionHeader({ title, subtitle, action }) {
  const { theme: t } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: spacing.lg,
        marginBottom: spacing.xl,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0, maxWidth: 560 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 550,
            letterSpacing: -0.35,
            color: t.textPrimary,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function SecurityScoreRing({ score, label, tone, t, dark }) {
  const size = 128;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, score / 100));
  const offset = c * (1 - progress);
  const ringColor = toneColor(tone, t);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: spacing["2xl"], flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={dark ? "rgba(255,255,255,0.06)" : "rgba(15,17,21,0.06)"}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: `stroke-dashoffset 400ms ${EASE}, stroke 200ms ${EASE}` }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="font-mono-data"
            style={{
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: -1.2,
              color: t.textPrimary,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {score}
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, marginTop: 4 }}>/ 100</div>
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 8,
            background:
              tone === "success"
                ? dark
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(34,197,94,0.10)"
                : tone === "warning"
                  ? dark
                    ? "rgba(245,158,11,0.12)"
                    : "rgba(245,158,11,0.10)"
                  : dark
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(239,68,68,0.08)",
            color: ringColor,
            fontSize: 13,
            fontWeight: 550,
            marginBottom: 10,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: ringColor }} />
          {label}
        </div>
        <div style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.5, maxWidth: 280 }}>
          Score reflects enabled protections, recent login health, and active session risk.
        </div>
      </div>
    </div>
  );
}

function HealthCard({ label, value, hint, tone, indicator, onClick }) {
  const { theme: t, dark } = useTheme();
  const accent = toneColor(tone, t);

  return (
    <button
      type="button"
      className="sec-lift"
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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
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
        {indicator != null && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: accent,
              boxShadow: `0 0 0 4px ${
                dark
                  ? tone === "success"
                    ? "rgba(34,197,94,0.15)"
                    : tone === "warning"
                      ? "rgba(245,158,11,0.15)"
                      : "rgba(239,68,68,0.15)"
                  : tone === "success"
                    ? "rgba(34,197,94,0.10)"
                    : tone === "warning"
                      ? "rgba(245,158,11,0.10)"
                      : "rgba(239,68,68,0.08)"
              }`,
              flexShrink: 0,
              marginTop: 2,
            }}
          />
        )}
      </div>
      <div>
        <div
          className="font-mono-data"
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: -0.8,
            color: t.textPrimary,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
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

function AuthCard({ icon: Icon, title, status, statusTone, description, primary, secondary }) {
  const { theme: t, dark } = useTheme();
  const statusColor = toneColor(statusTone, t);

  return (
    <div
      className="sec-lift"
      style={{
        ...cardStyle(t, { interactive: true }),
        padding: 24,
        borderRadius: radius.lg,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        minHeight: 196,
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
            background:
              statusTone === "success"
                ? dark
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(34,197,94,0.10)"
                : statusTone === "warning"
                  ? dark
                    ? "rgba(245,158,11,0.12)"
                    : "rgba(245,158,11,0.10)"
                  : statusTone === "danger"
                    ? dark
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(239,68,68,0.08)"
                    : dark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(15,17,21,0.04)",
            border: `1px solid ${
              statusTone === "success"
                ? dark
                  ? "rgba(34,197,94,0.22)"
                  : "rgba(34,197,94,0.18)"
                : t.border
            }`,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor }} />
          {status}
        </span>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, letterSpacing: -0.2, marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>{description}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {primary && (
          <button
            type="button"
            className="ui-press"
            onClick={primary.onClick}
            disabled={primary.disabled}
            style={{
              ...secondaryBtnStyle(t),
              height: 36,
              padding: "0 14px",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "inherit",
              opacity: primary.disabled ? 0.55 : 1,
              cursor: primary.disabled ? "not-allowed" : "pointer",
            }}
          >
            {primary.label}
          </button>
        )}
        {secondary && (
          <button
            type="button"
            className="ui-press"
            onClick={secondary.onClick}
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
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {secondary.label}
            <ArrowRight size={14} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, onSignOut, isCurrent }) {
  const { theme: t, dark } = useTheme();

  return (
    <div
      className="sec-lift"
      style={{
        ...cardStyle(t, { interactive: true }),
        padding: 20,
        borderRadius: radius.lg,
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
      }}
    >
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
          flexShrink: 0,
        }}
      >
        <DeviceIcon kind={session.device} size={20} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, letterSpacing: -0.2 }}>
            {session.browser} on {session.os}
          </span>
          {isCurrent && <Badge variant="success" dot>Current device</Badge>}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 16px",
            fontSize: 13,
            color: t.textSecondary,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <MapPin size={13} strokeWidth={1.75} color={t.textMuted} />
            {session.location}
          </span>
          <span className="font-mono-data" style={{ fontSize: 12, color: t.textMuted }}>
            {session.ip}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: t.textMuted }}>
            <Clock size={13} strokeWidth={1.75} />
            {session.lastActive}
          </span>
        </div>
      </div>

      {onSignOut && (
        <button
          type="button"
          className="ui-press"
          onClick={onSignOut}
          style={{
            height: 36,
            padding: "0 14px",
            borderRadius: radius.sm,
            border: `1px solid ${dark ? "rgba(242,184,181,0.28)" : "rgba(179,38,30,0.22)"}`,
            background: dark ? "rgba(242,184,181,0.10)" : "#FFF1F2",
            color: dark ? "#F2B8B5" : "#B3261E",
            fontSize: 13,
            fontWeight: 550,
            cursor: "pointer",
            fontFamily: "inherit",
            flexShrink: 0,
            transition: TRANS,
          }}
        >
          Sign out
        </button>
      )}
    </div>
  );
}

function PrefToggle({ title, description, checked, onChange, locked }) {
  const { theme: t, dark } = useTheme();

  return (
    <div
      className="sec-lift"
      style={{
        ...cardStyle(t, { interactive: true }),
        padding: "20px 22px",
        borderRadius: radius.lg,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 550, color: t.textPrimary, letterSpacing: -0.15 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.5, marginTop: 4 }}>
          {description}
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
          opacity: locked ? 0.7 : 1,
          transition: `background 180ms ${EASE}`,
          flexShrink: 0,
          position: "relative",
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

function TimelineItem({ entry, onClick, selected }) {
  const { theme: t, dark } = useTheme();
  const meta = eventMeta(entry.event);
  const Icon = meta.icon;
  const accent = toneColor(meta.tone, t);

  return (
    <button
      type="button"
      className="sec-lift sec-timeline-item"
      onClick={onClick}
      data-selected={selected ? "1" : undefined}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        width: "100%",
        textAlign: "left",
        padding: "18px 20px",
        borderRadius: radius.md,
        border: `1px solid ${selected ? t.borderHover : t.border}`,
        background: selected
          ? dark
            ? "rgba(255,255,255,0.03)"
            : "rgba(15,17,21,0.02)"
          : t.cardBg,
        boxShadow: t.cardShadow,
        cursor: "pointer",
        fontFamily: "inherit",
        color: "inherit",
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
          color: accent,
          flexShrink: 0,
          border: `1px solid ${t.border}`,
        }}
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, letterSpacing: -0.2 }}>
            {meta.label}
          </span>
          <Badge
            variant={
              meta.tone === "success"
                ? "success"
                : meta.tone === "warning"
                  ? "warning"
                  : meta.tone === "danger"
                    ? "danger"
                    : "neutral"
            }
            dot
          >
            {meta.risk}
          </Badge>
        </div>
        <div
          style={{
            fontSize: 13,
            color: t.textSecondary,
            lineHeight: 1.45,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.detail || "No additional detail"}
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
        {formatRelative(entry.ts) || entry.time}
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

function SecuritySkeleton({ t }) {
  return (
    <div>
      <style>{`
        .sk-wave {
          position: relative;
          overflow: hidden;
          background: ${t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"};
          border: 1px solid ${t.border};
        }
        .sk-wave::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, ${
            t.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.65)"
          }, transparent);
          animation: sk-shimmer 1.2s infinite;
        }
        @keyframes sk-shimmer { 100% { transform: translateX(100%); } }
      `}</style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 48,
        }}
        className="sec-health-grid"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} height={112} radius={18} style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
      <SkeletonBlock height={220} radius={18} style={{ marginBottom: 48 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 48 }} className="sec-auth-grid">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} height={196} radius={18} />
        ))}
      </div>
      <SkeletonBlock height={100} radius={18} style={{ marginBottom: 16 }} />
      <SkeletonBlock height={100} radius={18} style={{ marginBottom: 48 }} />
      {[0, 1, 2].map((i) => (
        <SkeletonBlock key={i} height={76} radius={14} style={{ marginBottom: 10 }} />
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function Security() {
  const { securityLog, logout, pinConfigured, refreshPinStatus } = useSecurity();
  const { theme: t, dark } = useTheme();
  const navigate = useNavigate();
  const activityRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [selected, setSelected] = useState(null);
  const [ua] = useState(() => parseUserAgent());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await refreshPinStatus?.();
      } finally {
        if (alive) {
          // Brief settle so skeletons feel intentional, not flashy
          setTimeout(() => alive && setLoading(false), 220);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshPinStatus]);

  const attempts = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("slippy_attempts") || '{"count":0,"lockUntil":0}');
    } catch {
      return { count: 0, lockUntil: 0 };
    }
  }, [securityLog]);

  const session = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("slippy_session") || "{}");
    } catch {
      return {};
    }
  }, [securityLog]);

  const isLocked = attempts.lockUntil > Date.now();
  const sessionAge = session.start ? Math.round((Date.now() - session.start) / 60000) : 0;
  const sessionUser = session.user || "Owner";

  const recentFails = useMemo(
    () =>
      securityLog.filter((e) => {
        const meta = String(e.event || "").toLowerCase();
        return meta.includes("fail") && e.ts && Date.now() - e.ts < 24 * 60 * 60 * 1000;
      }).length,
    [securityLog]
  );

  const recentLogins = useMemo(
    () =>
      securityLog.filter((e) => {
        const meta = String(e.event || "").toLowerCase();
        return (
          (meta.includes("success") || meta.includes("session") || meta === "login") &&
          e.ts &&
          Date.now() - e.ts < 24 * 60 * 60 * 1000
        );
      }).length,
    [securityLog]
  );

  const score = useMemo(
    () =>
      computeScore({
        pinConfigured,
        isLocked,
        failCount: attempts.count || 0,
        recentFails,
      }),
    [pinConfigured, isLocked, attempts.count, recentFails]
  );

  const scoreMeta = scoreLabel(score);
  const risk = riskLevel(score, isLocked, recentFails);

  const aiReview = useMemo(() => {
    const points = [];
    if (score >= 85) points.push({ text: "Your account is well protected.", tone: "ok" });
    else if (score >= 70) points.push({ text: "Your account is mostly protected, with a few gaps.", tone: "warn" });
    else points.push({ text: "Your account needs stronger protection.", tone: "warn" });

    if (pinConfigured) {
      points.push({ text: "Quick PIN unlock is enabled for idle lock.", tone: "ok" });
    } else {
      points.push({ text: "Enable Quick PIN to soft-lock the screen after idle.", tone: "warn" });
    }

    if (recentFails === 0) {
      points.push({ text: "No suspicious logins detected in the last 24 hours.", tone: "ok" });
    } else {
      points.push({
        text: `${recentFails} failed login${recentFails === 1 ? "" : "s"} in the last 24 hours.`,
        tone: "warn",
      });
    }

    points.push({ text: "Login rate limiting and encrypted session tokens are active.", tone: "ok" });

    if (sessionAge > 25) {
      points.push({ text: "This session is nearing idle timeout — stay active or sign out.", tone: "warn" });
    } else {
      points.push({ text: "Current session looks healthy.", tone: "ok" });
    }

    const recommended = !pinConfigured
      ? { label: "Enable Quick PIN", action: () => navigate("/settings") }
      : recentFails > 0
        ? { label: "Review activity", action: () => scrollToActivity() }
        : { label: "Review device list", action: () => scrollToSessions() };

    const headline =
      score >= 90
        ? "Your account is well protected."
        : score >= 75
          ? "Security looks strong — one improvement left."
          : pinConfigured
            ? "Review recent activity to stay ahead of risk."
            : "Enable Quick PIN to harden idle protection.";

    return { points: points.slice(0, 5), recommended, headline };
  }, [score, pinConfigured, recentFails, sessionAge, navigate]);

  const currentSession = useMemo(
    () => ({
      id: "current",
      browser: ua.browser,
      os: ua.os,
      device: ua.device,
      location: "This device",
      ip: "Local session",
      lastActive: session.start ? `Active · ${formatRelative(session.start)} started` : "Active now",
      user: sessionUser,
    }),
    [ua, session.start, sessionUser]
  );

  const groupedActivity = useMemo(() => {
    const groups = [];
    const map = new Map();
    securityLog.forEach((entry, idx) => {
      const ts = entry.ts || Date.now() - idx * 60000;
      const label = dateGroupLabel(ts);
      if (!map.has(label)) {
        const g = { label, items: [] };
        map.set(label, g);
        groups.push(g);
      }
      map.get(label).items.push({ ...entry, ts, _idx: idx });
    });
    return groups;
  }, [securityLog]);

  const updatePref = useCallback(
    (key, value) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        savePrefs(next);
        return next;
      });
      if (key === "require2fa" && value && !pinConfigured) {
        navigate("/settings");
      }
    },
    [navigate, pinConfigured]
  );

  function scrollToActivity() {
    activityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToSessions() {
    document.getElementById("sec-sessions")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function downloadReport() {
    if (!securityLog.length) {
      exportToCSV(
        [
          {
            event: "Security Report",
            detail: `Score ${score}/100 · PIN ${pinConfigured ? "enabled" : "off"} · Risk ${risk.text}`,
            time: new Date().toLocaleString(),
          },
        ],
        `security-report-${new Date().toISOString().slice(0, 10)}.csv`
      );
      return;
    }
    exportToCSV(
      securityLog.map((e) => ({
        event: e.event,
        detail: e.detail || "",
        time: e.time,
        timestamp: e.ts || "",
      })),
      `security-report-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  const selectedMeta = selected ? eventMeta(selected.event) : null;
  const SelectedIcon = selectedMeta?.icon || Shield;

  const aiSummaryForEvent = (entry) => {
    const meta = eventMeta(entry?.event);
    if (meta.tone === "danger") {
      return "This event indicates elevated risk. Confirm it was you, then review active sessions and failed attempts.";
    }
    if (meta.tone === "warning") {
      return "This change affects account access. Ensure it was intentional and that trusted devices remain valid.";
    }
    return "No unusual pattern detected for this event. Your account protections remain in effect.";
  };

  return (
    <PageShell
      title="Security"
      subtitle="Protect your account, staff access and business data."
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={downloadReport}>
            <Download size={16} strokeWidth={2} />
            Download Security Report
          </Button>
          <Button variant="primary" size="sm" onClick={scrollToActivity}>
            Review Activity
          </Button>
        </>
      }
    >
      <style>{`
        .sec-lift {
          transition: border-color ${TRANS}, box-shadow ${TRANS}, transform ${TRANS};
        }
        .sec-lift:hover {
          transform: translateY(-1px);
          border-color: var(--border-hover, ${t.borderHover}) !important;
          box-shadow: ${t.cardShadowHover || t.cardShadow} !important;
        }
        .sec-timeline-item[data-selected="1"] {
          border-color: ${t.borderHover} !important;
        }
        .sec-health-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 16px;
        }
        .sec-auth-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .sec-pref-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 1100px) {
          .sec-health-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 900px) {
          .sec-ai-hero { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 720px) {
          .sec-health-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .sec-auth-grid, .sec-pref-grid { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sec-lift, .sec-lift:hover { transition: none; transform: none !important; }
        }
      `}</style>

      {loading ? (
        <SecuritySkeleton t={t} />
      ) : (
        <>
          {/* ── Security Health ─────────────────────────────────────────── */}
          <section style={{ marginBottom: 56 }}>
            <SectionHeader
              title="Security Health"
              subtitle="A calm overview of how protected this workspace is right now."
            />
            <div className="sec-health-grid">
              <HealthCard
                label="Security Score"
                value={score}
                hint={scoreMeta.text}
                tone={scoreMeta.tone}
                indicator
              />
              <HealthCard
                label="Two-Factor Status"
                value={pinConfigured ? "On" : "Off"}
                hint={pinConfigured ? "Quick PIN armed" : "Enable in Settings"}
                tone={pinConfigured ? "success" : "warning"}
                indicator
                onClick={() => navigate("/settings")}
              />
              <HealthCard
                label="Active Devices"
                value="1"
                hint="This browser only"
                tone="success"
                indicator
                onClick={scrollToSessions}
              />
              <HealthCard
                label="Recent Logins"
                value={recentLogins}
                hint="Last 24 hours"
                tone={recentLogins > 8 ? "warning" : "success"}
                indicator
                onClick={scrollToActivity}
              />
              <HealthCard
                label="Risk Level"
                value={risk.text}
                hint={isLocked ? "Account temporarily locked" : "Based on score & events"}
                tone={risk.tone}
                indicator
              />
            </div>
          </section>

          {/* ── AI Security Review ──────────────────────────────────────── */}
          <section style={{ marginBottom: 56 }}>
            <SectionHeader title="AI Security Review" subtitle="A concise briefing of what matters most." />
            <div
              className="sec-lift"
              style={{
                ...cardStyle(t, { interactive: false }),
                padding: 0,
                overflow: "hidden",
                borderRadius: radius.lg,
              }}
            >
              <div
                style={{
                  padding: "32px 32px 28px",
                  borderBottom: `1px solid ${t.borderSub || t.border}`,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  gap: 32,
                  alignItems: "center",
                }}
                className="sec-ai-hero"
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 11,
                      fontWeight: 500,
                      color: t.textMuted,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      marginBottom: 14,
                    }}
                  >
                    <Sparkles size={14} strokeWidth={1.75} color={t.accentSolid || color.brand.DEFAULT} />
                    AI Security Review
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 500,
                      letterSpacing: -0.5,
                      color: t.textPrimary,
                      lineHeight: 1.35,
                      maxWidth: 560,
                    }}
                  >
                    {aiReview.headline}
                  </p>
                  <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="ui-press"
                      {...primaryBtnHoverProps(t)}
                      onClick={aiReview.recommended.action}
                      style={{
                        ...primaryBtnStyle(t),
                        height: 40,
                        padding: "0 16px",
                        fontSize: 13,
                        fontFamily: "inherit",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {aiReview.recommended.label}
                      <ArrowRight size={14} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className="ui-press"
                      onClick={scrollToActivity}
                      style={{
                        ...secondaryBtnStyle(t),
                        height: 40,
                        padding: "0 16px",
                        fontSize: 13,
                        fontFamily: "inherit",
                      }}
                    >
                      Review activity
                    </button>
                  </div>
                </div>
                <SecurityScoreRing
                  score={score}
                  label={scoreMeta.text}
                  tone={scoreMeta.tone}
                  t={t}
                  dark={dark}
                />
              </div>

              <ul style={{ listStyle: "none", margin: 0, padding: "10px 32px 28px" }}>
                {aiReview.points.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "flex-start",
                      padding: "12px 0",
                      borderBottom:
                        i < aiReview.points.length - 1 ? `1px solid ${t.borderSub || t.border}` : "none",
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
                            ? color.semantic.success
                            : item.tone === "warn"
                              ? t.warning || color.semantic.warning
                              : t.accentSolid || color.brand.DEFAULT,
                      }}
                    />
                    <span style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.5 }}>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ── Authentication ──────────────────────────────────────────── */}
          <section style={{ marginBottom: 56 }}>
            <SectionHeader
              title="Authentication"
              subtitle="How you prove identity when accessing this workspace."
            />
            <div className="sec-auth-grid">
              <AuthCard
                icon={KeyRound}
                title="Password"
                status="Protected"
                statusTone="success"
                description="Sign-in password is required for full access and for changing security settings."
                primary={{ label: "Manage in Settings", onClick: () => navigate("/settings") }}
                secondary={{ label: "Learn more", onClick: () => navigate("/settings") }}
              />
              <AuthCard
                icon={ShieldCheck}
                title="Two-Factor Authentication"
                status={pinConfigured ? "Enabled" : "Not enabled"}
                statusTone={pinConfigured ? "success" : "warning"}
                description={
                  pinConfigured
                    ? "Quick PIN unlocks the screen after idle without ending the session."
                    : "Add a Quick PIN so idle timeout soft-locks the screen instead of signing you out."
                }
                primary={{
                  label: pinConfigured ? "Update PIN" : "Enable Quick PIN",
                  onClick: () => navigate("/settings"),
                }}
                secondary={{ label: "Open Settings", onClick: () => navigate("/settings") }}
              />
              <AuthCard
                icon={Fingerprint}
                title="Passkeys"
                status="Coming soon"
                statusTone="neutral"
                description="Passwordless sign-in with device biometrics. Future-ready — no action needed today."
                primary={{ label: "Notify me", onClick: () => {}, disabled: true }}
              />
              <AuthCard
                icon={Key}
                title="Recovery Codes"
                status="Available via support"
                statusTone="neutral"
                description="Use account recovery through your owner credentials if you lose access to this device."
                primary={{ label: "View guidance", onClick: () => navigate("/settings") }}
              />
              <AuthCard
                icon={Mail}
                title="Email Verification"
                status="Verified"
                statusTone="success"
                description={`Owner account ${sessionUser} is tied to this secured session.`}
                primary={{ label: "Account settings", onClick: () => navigate("/settings") }}
              />
              <AuthCard
                icon={Phone}
                title="Phone Verification"
                status="Optional"
                statusTone="neutral"
                description="WhatsApp alerts and customer messaging use your configured business number."
                primary={{ label: "Configure", onClick: () => navigate("/settings") }}
              />
            </div>
          </section>

          {/* ── Active Sessions ─────────────────────────────────────────── */}
          <section id="sec-sessions" style={{ marginBottom: 56 }}>
            <SectionHeader
              title="Active Sessions"
              subtitle="Devices currently signed in to this workspace."
              action={
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => logout("Manual logout from security page")}
                >
                  <LogOut size={16} strokeWidth={2} />
                  Sign out everywhere
                </Button>
              }
            />

            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: t.textMuted,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Current device
              </div>
              <SessionCard
                session={currentSession}
                isCurrent
                onSignOut={() => logout("Signed out current device from Security")}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: t.textMuted,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Other devices
              </div>
              <div
                style={{
                  ...cardStyle(t, { interactive: false }),
                  padding: "28px 24px",
                  borderRadius: radius.lg,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, marginBottom: 4 }}>
                  No other active sessions
                </div>
                <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
                  Only this browser is signed in. New devices will appear here after sign-in.
                </div>
              </div>
            </div>
          </section>

          {/* ── Security Preferences ────────────────────────────────────── */}
          <section style={{ marginBottom: 56 }}>
            <SectionHeader
              title="Security Preferences"
              subtitle="Quiet controls that keep access tight without slowing the shop down."
            />
            <div className="sec-pref-grid">
              <PrefToggle
                title="Require Quick PIN"
                description="Soft-lock the screen after idle instead of ending the session."
                checked={pinConfigured || prefs.require2fa}
                onChange={(v) => {
                  if (!pinConfigured && v) navigate("/settings");
                  else updatePref("require2fa", v);
                }}
              />
              <PrefToggle
                title="Auto Logout"
                description="End the session after prolonged inactivity when PIN is not set."
                checked={prefs.autoLogout}
                onChange={(v) => updatePref("autoLogout", v)}
                locked
              />
              <PrefToggle
                title="Session Timeout"
                description="30-minute idle timeout with a two-minute warning before lock or logout."
                checked={prefs.sessionTimeout}
                onChange={(v) => updatePref("sessionTimeout", v)}
                locked
              />
              <PrefToggle
                title="Trusted Devices"
                description="Prefer this browser for quieter re-authentication prompts."
                checked={prefs.trustedDevices}
                onChange={(v) => updatePref("trustedDevices", v)}
              />
              <PrefToggle
                title="Login Alerts"
                description="Surface failed attempts and lockouts in the security activity trail."
                checked={prefs.loginAlerts}
                onChange={(v) => updatePref("loginAlerts", v)}
              />
              <PrefToggle
                title="Email Notifications"
                description="Prefer email for security notices when available on this account."
                checked={prefs.emailNotifications}
                onChange={(v) => updatePref("emailNotifications", v)}
              />
            </div>
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Settings2 size={14} color={t.textMuted} strokeWidth={1.75} />
              <button
                type="button"
                className="ui-press"
                onClick={() => navigate("/settings")}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  fontSize: 13,
                  fontWeight: 500,
                  color: t.accentDeep || t.accent,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Advanced session & PIN settings
              </button>
            </div>
          </section>

          {/* ── Recent Security Activity ────────────────────────────────── */}
          <section ref={activityRef} id="sec-activity" style={{ marginBottom: 24 }}>
            <SectionHeader
              title="Recent Security Activity"
              subtitle="A chronological trail of sign-ins, locks, and access changes."
            />

            {groupedActivity.length === 0 ? (
              <EmptyState
                illustration="security"
                title="No recent security events."
                subtitle="Your account is protected and no unusual activity has been detected."
                compact
              />
            ) : (
              groupedActivity.map((group) => (
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
                    {group.items.map((entry) => (
                      <TimelineItem
                        key={`${entry.ts}-${entry._idx}-${entry.event}`}
                        entry={entry}
                        selected={selected?._idx === entry._idx && selected?.ts === entry.ts}
                        onClick={() => setSelected(entry)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}

      {/* Detail drawer */}
      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selectedMeta?.label || "Event details"}
        subtitle={selected ? selected.time || formatRelative(selected.ts) : undefined}
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
            <button
              type="button"
              className="ui-press"
              {...primaryBtnHoverProps(t)}
              onClick={() => {
                setSelected(null);
                scrollToSessions();
              }}
              style={{
                ...primaryBtnStyle(t),
                padding: "10px 14px",
                fontSize: 13,
                fontFamily: "inherit",
                marginLeft: "auto",
              }}
            >
              Review devices
            </button>
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
                  color: toneColor(selectedMeta.tone, t),
                }}
              >
                <SelectedIcon size={20} strokeWidth={1.75} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 550, color: t.textPrimary, letterSpacing: -0.3 }}>
                  {selectedMeta.label}
                </div>
                <div style={{ marginTop: 8 }}>
                  <Badge
                    variant={
                      selectedMeta.tone === "success"
                        ? "success"
                        : selectedMeta.tone === "warning"
                          ? "warning"
                          : selectedMeta.tone === "danger"
                            ? "danger"
                            : "neutral"
                    }
                    dot
                  >
                    {selectedMeta.risk} risk
                  </Badge>
                </div>
              </div>
            </div>

            <DrawerSection title="Full details" t={t}>
              <p style={{ margin: 0, fontSize: 14, color: t.textSecondary, lineHeight: 1.55 }}>
                {selected.detail || "No additional detail was recorded for this event."}
              </p>
            </DrawerSection>

            <DrawerSection title="Context" t={t}>
              <MetaRow icon={Monitor} label="Device" value={`${ua.device === "mobile" ? "Mobile" : "Desktop"} · ${ua.os}`} t={t} />
              <MetaRow icon={Globe} label="Browser" value={ua.browser} t={t} />
              <MetaRow icon={MapPin} label="Location" value="This device" t={t} />
              <MetaRow icon={Globe} label="IP Address" value="Local session" t={t} />
              <MetaRow icon={Clock} label="Time" value={selected.time || formatRelative(selected.ts)} t={t} />
              <MetaRow icon={User} label="Related user" value={sessionUser} t={t} />
            </DrawerSection>

            <DrawerSection title="Risk analysis" t={t}>
              <div
                style={{
                  padding: 16,
                  borderRadius: radius.md,
                  border: `1px solid ${t.border}`,
                  background: dark ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.03)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 550, color: t.textPrimary, marginBottom: 6 }}>
                  {selectedMeta.risk} risk
                </div>
                <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>
                  {selectedMeta.tone === "danger"
                    ? "Failed or lockout events can indicate credential probing. Verify ownership and monitor follow-up attempts."
                    : selectedMeta.tone === "warning"
                      ? "Access-affecting changes should be confirmed. Review whether this matches expected operator activity."
                      : "Routine security activity. No elevated risk signals were attached to this event."}
                </div>
              </div>
            </DrawerSection>

            <DrawerSection title="AI summary" t={t}>
              <p style={{ margin: 0, fontSize: 14, color: t.textSecondary, lineHeight: 1.55 }}>
                {aiSummaryForEvent(selected)}
              </p>
            </DrawerSection>

            <DrawerSection title="Suggested actions" t={t}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedMeta.tone === "danger" && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setSelected(null);
                      logout("Signed out after reviewing suspicious activity");
                    }}
                  >
                    Sign out this session
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelected(null);
                    navigate("/settings");
                  }}
                >
                  Open security settings
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelected(null);
                    scrollToSessions();
                  }}
                >
                  Review active devices
                </Button>
              </div>
            </DrawerSection>
          </div>
        )}
      </Sheet>
    </PageShell>
  );
}
