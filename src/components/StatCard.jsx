import { useTheme, cardStyle, cardHoverProps } from "../context/ThemeContext";

/** Dashboard / StatCard surface */
export function premiumCardStyle(t, { interactive = true } = {}) {
  return {
    ...cardStyle(t, { interactive }),
  };
}

/** Muted label under KPI figures */
export const STAT_LABEL_COLOR = "var(--text-muted)";

/**
 * Stat card — quiet surface, mono KPI, single accent.
 * Ignores legacy gradient / glow props so callers stay quiet.
 */
export default function StatCard({
  label,
  value,
  valuePrefix,
  icon,
  gradient: _gradient,
  iconShadow: _iconShadow,
  glow: _glow,
  sub,
  delta,
  onClick,
  stackPrefix = false,
}) {
  const { theme: t, dark } = useTheme();
  const hover = cardHoverProps(t);
  const flat = delta == null || delta === 0;
  const up = delta != null && delta > 0;

  return (
    <div
      className={`ui-interactive ds-card-enter elev-card${onClick ? " ds-row clickable" : ""}`}
      onClick={onClick}
      style={{
        ...premiumCardStyle(t, { interactive: true }),
        padding: 24,
        display: "flex",
        alignItems: "center",
        gap: 16,
        cursor: onClick ? "pointer" : "default",
        boxShadow: t.cardShadow,
        minHeight: 96,
        borderRadius: t.cardRadius ?? 18,
      }}
      onMouseEnter={(e) => {
        hover.onMouseEnter(e);
      }}
      onMouseLeave={(e) => {
        hover.onMouseLeave(e);
      }}
    >
      {icon != null && (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            flexShrink: 0,
            background: dark ? "rgba(244,63,94,0.12)" : "#FFF1F2",
            border: "none",
            color: dark ? "#F43F5E" : "#E11D48",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
        {stackPrefix && valuePrefix != null ? (
          <>
            <div
              className="font-mono-data"
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: t.textMuted,
                letterSpacing: 0.02,
                lineHeight: 1,
              }}
            >
              {valuePrefix}
            </div>
            <div className="ds-kpi-value">{value}</div>
          </>
        ) : (
          <div
            className="ds-kpi-value"
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            {valuePrefix != null && (
              <span
                className="font-mono-data"
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: t.textMuted,
                  letterSpacing: 0,
                }}
              >
                {valuePrefix}
              </span>
            )}
            <span>{value}</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div className="ds-kpi-label">{label}</div>
          {delta != null && (
            <span className={`ds-trend-pill${!flat && !up ? " is-down" : ""}${flat ? " is-flat" : ""}`}>
              {flat ? "—" : `${up ? "+" : ""}${delta}%`}
            </span>
          )}
        </div>
        {sub && (
          <div className="font-mono-data" style={{ fontSize: 12, color: t.textMuted, fontWeight: 400 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
