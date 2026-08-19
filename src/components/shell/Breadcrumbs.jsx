import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getBreadcrumbs } from "./navConfig";
import { SHELL } from "./shellTokens";

/**
 * Quiet breadcrumb trail — Home › Current page
 */
export default function Breadcrumbs({ pathname }) {
  const { theme: t } = useTheme();
  const crumbs = getBreadcrumbs(pathname);

  const crumbStyle = {
    fontSize: SHELL.font.caption.size,
    fontWeight: 500,
    lineHeight: 1.2,
    letterSpacing: 0,
  };

  if (crumbs.length <= 1) {
    return (
      <span style={{ ...crumbStyle, color: t.textMuted }}>
        Home
      </span>
    );
  }

  return (
    <nav
      aria-label="Breadcrumb"
      style={{ display: "flex", alignItems: "center", gap: SHELL.gap.xs, minWidth: 0 }}
    >
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span
            key={crumb.path + i}
            style={{ display: "inline-flex", alignItems: "center", gap: SHELL.gap.xs, minWidth: 0 }}
          >
            {i > 0 && (
              <ChevronRight
                size={12}
                strokeWidth={SHELL.iconStroke}
                color={t.textMuted}
                aria-hidden
                style={{ flexShrink: 0, opacity: 0.7 }}
              />
            )}
            {last ? (
              <span
                style={{
                  ...crumbStyle,
                  color: t.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                style={{
                  ...crumbStyle,
                  color: t.textMuted,
                  textDecoration: "none",
                  transition: `color ${SHELL.duration} ${SHELL.ease}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = t.textSecondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = t.textMuted;
                }}
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
