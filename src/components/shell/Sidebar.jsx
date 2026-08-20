import { Link } from "react-router-dom";
import { NavIcon } from "../icons";
import Tooltip from "../Tooltip";
import ProfileMenu from "./ProfileMenu";
import { BUSINESS_NAME, BRAND_INITIAL, BRAND_ACCENT } from "../../constants/brand";
import { NAV_GROUPS, navByPath } from "./navConfig";
import { SHELL, hoverFill, divider, sidebarSurface } from "./shellTokens";
import { filterNavPaths, loadSession } from "../../constants/permissions";

/**
 * Premium app sidebar — quiet nav, left accent active state, compact profile
 */
export default function Sidebar({
  location,
  pendingCount,
  clearBadge,
  onNav,
  collapsed,
  t,
  dark,
}) {
  const itemsByPath = navByPath();
  const hoverBg = hoverFill(dark);
  const sidebarBg = sidebarSurface(dark);
  const inset = SHELL.sidebarInset;
  const session = loadSession();


  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: sidebarBg,
        fontFamily: 'var(--font-sans), "Inter", system-ui, sans-serif',
      }}
    >
      {/* Brand — same horizontal inset as nav */}
      <div
        style={{
          padding: collapsed ? `${SHELL.gap.lg}px 0` : `${SHELL.gap.lg}px ${inset}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: SHELL.gap.md,
          flexShrink: 0,
          minHeight: 64,
          boxSizing: "border-box",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 32,
            height: 32,
            borderRadius: SHELL.radius,
            background: BRAND_ACCENT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {BRAND_INITIAL}
          </span>
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: SHELL.font.brand.size,
                fontWeight: SHELL.font.brand.weight,
                color: t.textPrimary,
                letterSpacing: SHELL.font.brand.tracking,
                lineHeight: 1.2,
              }}
            >
              {BUSINESS_NAME}
            </div>
            <div
              style={{
                fontSize: SHELL.font.caption.size,
                color: t.textMuted,
                marginTop: SHELL.gap.xs,
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              Owner portal
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: collapsed ? `0 0 ${SHELL.gap.lg}px` : `0 ${inset}px ${SHELL.gap.lg}px`,
        }}
        aria-label="Main"
      >
        {NAV_GROUPS.map((group, gi) => {
          const paths = filterNavPaths(group.paths, session);
          if (!paths.length) return null;
          return (
          <div key={group.label} style={{ marginTop: gi === 0 ? SHELL.gap.sm : SHELL.gap.lg }}>
            {!collapsed ? (
              <div
                style={{
                  fontSize: SHELL.font.micro.size,
                  fontWeight: SHELL.font.micro.weight,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: t.textMuted,
                  padding: `${SHELL.gap.sm}px ${SHELL.gap.md}px`,
                  userSelect: "none",
                  lineHeight: 1,
                }}
              >
                {group.label}
              </div>
            ) : (
              gi > 0 && (
                <div
                  style={{
                    height: 1,
                    margin: `${SHELL.gap.md}px ${SHELL.gap.lg}px`,
                    background: divider(dark),
                  }}
                  aria-hidden
                />
              )
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: SHELL.gap.xs }}>
              {paths.map((path) => {
                const item = itemsByPath[path];
                if (!item) return null;
                const { label, badge } = item;
                const active = location.pathname === path;
                const count = badge ? pendingCount : 0;

                const row = (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => {
                      if (badge) clearBadge();
                      onNav?.();
                    }}
                    aria-current={active ? "page" : undefined}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      className="shell-nav-item"
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: SHELL.gap.md,
                        height: SHELL.control,
                        padding: collapsed ? 0 : `0 ${SHELL.gap.md}px`,
                        margin: collapsed ? "0 auto" : 0,
                        width: collapsed ? SHELL.control : "auto",
                        justifyContent: collapsed ? "center" : "flex-start",
                        borderRadius: SHELL.radius,
                        cursor: "pointer",
                        fontSize: SHELL.font.nav.size,
                        fontWeight: SHELL.font.nav.weight,
                        color: active ? t.textPrimary : t.textSecondary,
                        background: active ? hoverBg : "transparent",
                        transition: `background ${SHELL.duration} ${SHELL.ease}, color ${SHELL.duration} ${SHELL.ease}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = hoverBg;
                        if (!active) e.currentTarget.style.color = t.textPrimary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = active ? hoverBg : "transparent";
                        e.currentTarget.style.color = active ? t.textPrimary : t.textSecondary;
                      }}
                    >
                      {active && (
                        <span
                          aria-hidden
                          style={{
                            position: "absolute",
                            left: collapsed ? 4 : 0,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 2,
                            height: 14,
                            borderRadius: 9999,
                            background: BRAND_ACCENT,
                          }}
                        />
                      )}
                      <span
                        style={{
                          width: SHELL.icon,
                          height: SHELL.icon,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          color: active ? (BRAND_ACCENT) : "currentColor",
                        }}
                      >
                        <NavIcon path={path} size={SHELL.icon} />
                      </span>
                      {!collapsed && (
                        <>
                          <span
                            style={{
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}
                          </span>
                          {count > 0 && (
                            <span
                              style={{
                                background: BRAND_ACCENT,
                                color: "#fff",
                                fontSize: SHELL.font.micro.size,
                                fontWeight: 600,
                                borderRadius: 9999,
                                padding: `0 ${SHELL.gap.sm}px`,
                                height: 20,
                                minWidth: 20,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontVariantNumeric: "tabular-nums",
                                lineHeight: 1,
                              }}
                            >
                              {count}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </Link>
                );

                return collapsed ? (
                  <Tooltip key={path} content={label} side="right">
                    {row}
                  </Tooltip>
                ) : (
                  row
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {collapsed ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingBottom: SHELL.gap.md,
          }}
        >
          <ProfileMenu compact align="right" />
        </div>
      ) : (
        <ProfileMenu />
      )}
    </div>
  );
}
