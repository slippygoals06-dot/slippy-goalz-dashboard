import { useTheme } from "../context/ThemeContext";
import { layout, radius } from "../design-system/tokens";
import { SHELL } from "./shell/shellTokens";

/**
 * Shared page chrome — title, description, actions.
 * Route enter is handled by Layout `.page-enter` (fade + y, 200ms).
 */
export default function PageShell({
  children,
  title,
  subtitle,
  actions,
  narrow = false,
  wide: _wide = false,
  className = "",
}) {
  const { theme: t } = useTheme();
  const maxWidth = narrow ? layout.maxWidth.narrow : layout.maxWidth.default;

  return (
    <div
      className={`page-shell ${className}`.trim()}
      style={{
        padding: `${layout.pagePadding.y}px ${layout.pagePadding.x}px ${layout.pagePadding.bottom}px`,
        maxWidth,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {(title || actions) && (
        <div
          className="page-shell-header"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: SHELL.gap.xl,
            marginBottom: SHELL.gap["2xl"],
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, flex: 1, maxWidth: 640 }}>
            {title && (
              <h1
                style={{
                  margin: 0,
                  fontSize: SHELL.pageTitle.size,
                  fontWeight: SHELL.pageTitle.weight,
                  letterSpacing: SHELL.pageTitle.tracking,
                  lineHeight: 1.2,
                  color: t.textPrimary,
                  fontFamily: 'var(--font-sans), "Inter", system-ui, sans-serif',
                }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p
                style={{
                  margin: `${SHELL.gap.sm}px 0 0`,
                  fontSize: SHELL.pageSubtitle.size,
                  color: t.textMuted,
                  lineHeight: 1.5,
                  fontWeight: SHELL.pageSubtitle.weight,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: SHELL.gap.sm,
                flexWrap: "wrap",
                minHeight: SHELL.control,
              }}
            >
              {actions}
            </div>
          )}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export function pagePanelStyle(t) {
  return {
    background: t.cardBg,
    border: `1px solid ${t.border}`,
    borderRadius: t.cardRadius ?? radius.lg,
    boxShadow: t.cardShadow,
  };
}

export function pageInputStyle(t) {
  return {
    width: "100%",
    padding: `0 ${SHELL.gap.lg}px`,
    minHeight: 48,
    height: 48,
    borderRadius: radius.sm,
    background: t.inputBg,
    border: `1px solid ${t.border}`,
    fontSize: 15,
    color: t.textPrimary,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: `border-color ${SHELL.duration} ${SHELL.ease}, box-shadow ${SHELL.duration} ${SHELL.ease}`,
  };
}

export function pageTableTH(t) {
  return {
    padding: `${SHELL.gap.md}px ${SHELL.gap.lg}px`,
    fontSize: SHELL.font.caption.size,
    fontWeight: 500,
    color: t.thColor,
    textAlign: "left",
    background: t.thBg,
    borderBottom: `1px solid ${t.borderSub}`,
    letterSpacing: 0,
    textTransform: "none",
  };
}

export function pageTableTD(t) {
  return {
    padding: `${SHELL.gap.lg}px`,
    height: 56,
    fontSize: 14,
    color: t.tdColor,
    borderBottom: `1px solid ${t.borderSub}`,
    fontWeight: 400,
  };
}
