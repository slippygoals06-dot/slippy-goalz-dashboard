import { useTheme, primaryBtnStyle, primaryBtnHoverProps, cardStyle } from "../context/ThemeContext";

const ILLUSTRATIONS = {
  leads: (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
      <rect x="8" y="14" width="56" height="44" rx="12" fill="currentColor" opacity="0.08" />
      <circle cx="28" cy="32" r="8" fill="currentColor" opacity="0.18" />
      <path d="M18 48c2.5-6 7-9 10-9s7.5 3 10 9" stroke="currentColor" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
      <rect x="42" y="28" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.22" />
      <rect x="42" y="36" width="12" height="3" rx="1.5" fill="currentColor" opacity="0.14" />
      <circle cx="54" cy="48" r="10" fill="var(--olive)" opacity="0.9" />
      <path d="M54 43v10M49 48h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  waitlist: (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
      <circle cx="36" cy="36" r="24" fill="currentColor" opacity="0.08" />
      <circle cx="36" cy="36" r="18" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <path d="M36 24v14l8 5" stroke="var(--olive)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="36" cy="36" r="3" fill="var(--olive)" />
    </svg>
  ),
  audit: (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
      <rect x="16" y="10" width="40" height="52" rx="8" fill="currentColor" opacity="0.08" />
      <rect x="24" y="22" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.2" />
      <rect x="24" y="30" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.14" />
      <rect x="24" y="38" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.14" />
      <circle cx="48" cy="50" r="12" fill="var(--olive)" opacity="0.95" />
      <path d="M43 50l3.5 3.5L54 46" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bookings: (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
      <rect x="12" y="16" width="48" height="42" rx="10" fill="currentColor" opacity="0.08" />
      <rect x="12" y="16" width="48" height="12" rx="10" fill="currentColor" opacity="0.12" />
      <circle cx="24" cy="22" r="2.5" fill="var(--olive)" />
      <circle cx="36" cy="22" r="2.5" fill="currentColor" opacity="0.25" />
      <circle cx="48" cy="22" r="2.5" fill="currentColor" opacity="0.25" />
      <rect x="22" y="36" width="10" height="8" rx="2" fill="var(--olive)" opacity="0.7" />
      <rect x="36" y="36" width="10" height="8" rx="2" fill="currentColor" opacity="0.12" />
    </svg>
  ),
  security: (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
      <path d="M36 12l20 8v16c0 14-8.5 22-20 26-11.5-4-20-12-20-26V20l20-8z" fill="currentColor" opacity="0.08" />
      <path d="M36 16l16 6.5v13c0 11-6.8 17.5-16 20.5-9.2-3-16-9.5-16-20.5v-13L36 16z" stroke="var(--olive)" strokeWidth="2" opacity="0.5" />
      <path d="M30 36l5 5 9-10" stroke="var(--olive)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  default: (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
      <rect x="14" y="18" width="44" height="36" rx="10" fill="currentColor" opacity="0.08" />
      <circle cx="36" cy="34" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <path d="M36 30v5l3 2" stroke="var(--olive)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

/** Quiet empty state — fade + soft rise · 180ms */
export default function EmptyState({
  icon = "◈",
  illustration,
  title,
  subtitle,
  action,
  onAction,
  compact = false,
}) {
  const { theme: t } = useTheme();
  const art = illustration ? ILLUSTRATIONS[illustration] || ILLUSTRATIONS.default : null;

  return (
    <div
      className="empty-enter"
      style={{
        ...cardStyle(t),
        padding: compact ? "40px 24px" : "64px 32px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {art ? (
        <div style={{ color: t.textMuted, marginBottom: compact ? 12 : 18, lineHeight: 0 }}>
          {art}
        </div>
      ) : (
        <div
          style={{
            fontSize: compact ? 18 : 22,
            marginBottom: compact ? 8 : 12,
            color: t.textMuted,
            lineHeight: 1,
            opacity: 0.85,
          }}
        >
          {icon}
        </div>
      )}
      <div
        className="font-display"
        style={{
          fontSize: compact ? 15 : 17,
          fontWeight: 550,
          color: t.textPrimary,
          letterSpacing: -0.3,
          marginBottom: subtitle ? 8 : 0,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 13,
            color: t.textMuted,
            marginBottom: action ? 20 : 0,
            lineHeight: 1.5,
            maxWidth: 340,
          }}
        >
          {subtitle}
        </div>
      )}
      {action && onAction && (
        <button
          type="button"
          className="ui-press"
          onClick={onAction}
          {...primaryBtnHoverProps(t)}
          style={{
            ...primaryBtnStyle(t),
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}
