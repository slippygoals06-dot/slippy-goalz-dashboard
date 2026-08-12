import { Search, Plus, PanelLeft, Moon, Sun } from "lucide-react";
import { Button } from "../../design-system";
import NotifBell from "../NotifBell";
import Breadcrumbs from "./Breadcrumbs";
import ProfileMenu from "./ProfileMenu";
import { getPageTitle, SEARCH_MAX, TOPBAR_H } from "./navConfig";
import { BRAND_ACCENT } from "../../constants/brand";
import { SHELL, hoverFill, divider, iconButtonStyle } from "./shellTokens";

/**
 * Top bar — one baseline, 40px controls, Spotlight search
 */
export default function TopBar({
  pathname,
  dark,
  t,
  toggleTheme,
  toggleSidebar,
  openPalette,
  lastFetchStr,
  isPaused,
  setIsPaused,
  newBadge,
  clearBadge,
  onNewBooking,
  isMobile,
}) {
  const title = getPageTitle(pathname);
  const hoverBg = hoverFill(dark);
  const padX = isMobile ? SHELL.topbarPadXMobile : SHELL.topbarPadX;

  return (
    <header
      style={{
        height: TOPBAR_H,
        flexShrink: 0,
        display: "grid",
        gridTemplateColumns: isMobile
          ? "auto 1fr auto"
          : "minmax(180px, 1fr) minmax(280px, 640px) minmax(180px, 1fr)",
        alignItems: "center",
        gap: SHELL.gap.lg,
        padding: `0 ${padX}px`,
        background: t.pageBg,
        borderBottom: `1px solid ${divider(dark)}`,
        position: "sticky",
        top: 0,
        zIndex: 15,
        fontFamily: 'var(--font-sans), "Inter", system-ui, sans-serif',
      }}
    >
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: SHELL.gap.md, minWidth: 0 }}>
        <button
          type="button"
          className="shell-icon-btn"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          style={iconButtonStyle(t)}
        >
          <PanelLeft size={SHELL.icon} strokeWidth={SHELL.iconStroke} />
        </button>

        {!isMobile && (
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: SHELL.gap.xs }}>
            <h1
              style={{
                margin: 0,
                fontSize: SHELL.font.topbarTitle.size,
                fontWeight: SHELL.font.topbarTitle.weight,
                letterSpacing: SHELL.font.topbarTitle.tracking,
                color: t.textPrimary,
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </h1>
            <Breadcrumbs pathname={pathname} />
          </div>
        )}
      </div>

      {/* Center — Spotlight */}
      {!isMobile ? (
        <button
          type="button"
          onClick={openPalette}
          aria-label="Search"
          style={{
            width: "100%",
            maxWidth: SEARCH_MAX,
            justifySelf: "center",
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: SHELL.gap.sm,
            height: SHELL.field,
            padding: `0 ${SHELL.gap.md}px`,
            borderRadius: SHELL.radius,
            background: dark ? "#15181E" : "#FFFFFF",
            border: `1px solid ${t.border}`,
            boxShadow: "none",
            color: t.textMuted,
            fontSize: SHELL.font.body.size,
            fontWeight: 400,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit",
            transition: `border-color ${SHELL.duration} ${SHELL.ease}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = t.borderHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = t.border;
          }}
        >
          <Search
            size={SHELL.icon}
            strokeWidth={SHELL.iconStroke}
            style={{ flexShrink: 0, opacity: 0.65 }}
          />
          <span
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Search bookings, customers, invoices…
          </span>
          <kbd
            style={{
              fontSize: SHELL.font.micro.size,
              fontWeight: 500,
              padding: `0 ${SHELL.gap.sm}px`,
              height: 22,
              display: "inline-flex",
              alignItems: "center",
              borderRadius: SHELL.radiusChip,
              background: hoverBg,
              color: t.textMuted,
              border: `1px solid ${t.border}`,
              fontFamily: "inherit",
              lineHeight: 1,
            }}
          >
            ⌘K
          </kbd>
        </button>
      ) : (
        <div />
      )}

      {/* Right — single 40px baseline */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: SHELL.gap.sm,
          minWidth: 0,
          height: SHELL.control,
        }}
      >
        {isMobile && (
          <button
            type="button"
            className="shell-icon-btn"
            aria-label="Search"
            onClick={openPalette}
            style={iconButtonStyle(t)}
          >
            <Search size={SHELL.icon} strokeWidth={SHELL.iconStroke} />
          </button>
        )}

        {!isMobile && (
          <button
            type="button"
            className="shell-icon-btn"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume sync" : "Pause sync"}
            style={{
              ...iconButtonStyle(t),
              width: "auto",
              padding: `0 ${SHELL.gap.md}px`,
              gap: SHELL.gap.sm,
              color: isPaused ? t.textMuted : t.textSecondary,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isPaused ? t.textMuted : "#22C55E",
                flexShrink: 0,
              }}
            />
            <span
              className="topbar-sync-label"
              style={{
                fontSize: SHELL.font.meta.size,
                fontWeight: SHELL.font.meta.weight,
                whiteSpace: "nowrap",
              }}
            >
              {isPaused ? "Paused" : `Synced ${lastFetchStr}`}
            </span>
          </button>
        )}

        {newBadge > 0 && !isMobile && (
          <button
            type="button"
            onClick={() => clearBadge()}
            style={{
              height: SHELL.control,
              padding: `0 ${SHELL.gap.md}px`,
              borderRadius: SHELL.radius,
              border: "none",
              background: "rgba(244,63,94,0.12)",
              color: BRAND_ACCENT,
              fontSize: SHELL.font.meta.size,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: `opacity ${SHELL.duration} ${SHELL.ease}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {newBadge} new
          </button>
        )}

        <NotifBell />

        {!isMobile && (
          <button
            type="button"
            className="shell-icon-btn"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
            style={iconButtonStyle(t)}
          >
            {dark ? (
              <Sun size={SHELL.icon} strokeWidth={SHELL.iconStroke} />
            ) : (
              <Moon size={SHELL.icon} strokeWidth={SHELL.iconStroke} />
            )}
          </button>
        )}

        {!isMobile && <ProfileMenu compact align="right" />}

        <Button
          variant="primary"
          onClick={onNewBooking}
          className="shell-topbar-cta"
          style={{
            height: SHELL.field,
            padding: `0 ${SHELL.gap.md}px`,
            gap: SHELL.gap.sm,
            fontSize: SHELL.font.nav.size,
          }}
        >
          <Plus size={SHELL.icon} strokeWidth={SHELL.iconStroke} />
          {!isMobile && <span>New Booking</span>}
        </Button>
      </div>
    </header>
  );
}
