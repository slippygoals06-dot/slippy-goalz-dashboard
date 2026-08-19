import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useTheme } from "../context/ThemeContext";
import { NAV_ITEMS } from "../constants";
import { useSwipeNav } from "../hooks/useSwipeNav";
import CommandPalette from "./CommandPalette";
import { useMobile } from "../hooks/useMobile";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useCommand } from "../context/CommandContext";
import OwnerBot from "./OwnerBot";
import { NavIcon } from "./icons";
import { MoreHorizontal } from "lucide-react";
import Sidebar from "./shell/Sidebar";
import TopBar from "./shell/TopBar";
import {
  MOBILE_BP,
  SIDEBAR_W,
  SIDEBAR_COLLAPSED,
} from "./shell/navConfig";
import { BRAND_ACCENT } from "../constants/brand";
import { sidebarSurface, divider, hoverFill, SHELL } from "./shell/shellTokens";

/**
 * Application shell — sidebar + topbar + page viewport.
 * Feature pages render as children; shell owns chrome only.
 */
export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme: t, dark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openPalette, requestNewBooking } = useCommand();
  useKeyboardShortcuts({ enabled: true });

  const bookings = useStore((s) => s.bookings);
  const newBadge = useStore((s) => s.newBadge);
  const clearBadge = useStore((s) => s.clearBadge);
  const isPaused = useStore((s) => s.isPaused);
  const setIsPaused = useStore((s) => s.setIsPaused);
  const lastFetch = useStore((s) => s.lastFetch);
  useSwipeNav();
  const isMobile = useMobile(MOBILE_BP);

  const pendingCount = bookings.filter((b) => b.Status === "Pending").length;
  const collapsed = !sidebarOpen && !isMobile;
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_W;

  const lastFetchStr = lastFetch
    ? lastFetch.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "—";

  const toggleSidebar = () => {
    if (isMobile) setMobileOpen((o) => !o);
    else setSidebarOpen((o) => !o);
  };

  const handleNewBooking = () => {
    requestNewBooking();
    navigate("/bookings");
  };

  const sidebarBg = sidebarSurface(dark);
  const hoverBg = hoverFill(dark);
  const line = divider(dark);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: t.pageBg,
        fontFamily: 'var(--font-sans), "Inter", system-ui, sans-serif',
        transition: "background 180ms cubic-bezier(0.2, 0, 0, 1)",
        overflow: "hidden",
        color: t.textPrimary,
      }}
    >
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        a{text-decoration:none;color:inherit;}
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-thumb{
          background:${dark ? "rgba(255,255,255,0.12)" : "rgba(15,17,21,0.12)"};
          border-radius:9999px;
          border:2px solid transparent;
          background-clip:padding-box;
        }
        ::-webkit-scrollbar-track{background:transparent;}

        .shell-sidebar-desktop{
          position:fixed;
          left:0;top:0;bottom:0;
          width:${sidebarWidth}px;
          z-index:20;
          transition:width var(--ds-duration-drawer, 220ms) var(--ds-ease, cubic-bezier(0.2, 0, 0, 1));
          overflow:hidden;
          background:${sidebarBg};
        }

        .shell-main{
          flex:1;
          display:flex;
          flex-direction:column;
          overflow:hidden;
          min-width:0;
          margin-left:${sidebarWidth}px;
          transition:margin-left var(--ds-duration-drawer, 220ms) var(--ds-ease, cubic-bezier(0.2, 0, 0, 1));
          background:${t.pageBg};
        }

        .shell-sidebar-mobile-backdrop{ display:none; }
        .shell-sidebar-mobile{ display:none; }

        .shell-icon-btn:hover{
          background:${hoverBg} !important;
          color:${t.textPrimary} !important;
        }
        .shell-icon-btn:focus-visible{
          outline:2px solid ${BRAND_ACCENT};
          outline-offset:2px;
        }
        /* Keep topbar CTA on the shared 40px baseline */
        .shell-topbar-cta:hover,
        .shell-topbar-cta:active{
          transform:none !important;
        }

        .page-content{ min-height:100%; }

        @media(max-width:${MOBILE_BP}px){
          .shell-sidebar-desktop{display:none!important}
          .topbar-sync-label{display:none!important}
          .shell-main{margin-left:0!important}

          .shell-sidebar-mobile-backdrop{
            display:block;
            position:fixed;
            inset:0;
            z-index:50;
            background:rgba(0,0,0,0.45);
            opacity:0;
            pointer-events:none;
            transition:opacity ${SHELL.duration} ${SHELL.ease};
          }
          .shell-sidebar-mobile-backdrop.is-open{
            opacity:1;
            pointer-events:auto;
          }
          .shell-sidebar-mobile{
            display:flex;
            flex-direction:column;
            position:fixed;
            left:0;top:0;bottom:0;
            width:${SIDEBAR_W}px;
            z-index:60;
            transform:translateX(-100%);
            transition:transform var(--ds-duration-drawer, 220ms) ${SHELL.ease};
            pointer-events:none;
            background:${sidebarBg};
            box-shadow:0 18px 48px rgba(0,0,0,0.25);
          }
          .shell-sidebar-mobile.is-open{
            transform:translateX(0);
            pointer-events:auto;
          }
        }
        @media(min-width:${MOBILE_BP + 1}px){
          .shell-mobile-nav{display:none!important}
          .shell-sidebar-mobile,
          .shell-sidebar-mobile-backdrop{display:none!important}
        }
      `}</style>

      <aside className="shell-sidebar-desktop" aria-label="Sidebar">
        <Sidebar
          location={location}
          pendingCount={pendingCount}
          clearBadge={clearBadge}
          collapsed={collapsed}
          t={t}
          dark={dark}
        />
      </aside>

      <div
        className={`shell-sidebar-mobile-backdrop${mobileOpen ? " is-open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />
      <aside
        className={`shell-sidebar-mobile${mobileOpen ? " is-open" : ""}`}
        onClick={(e) => e.stopPropagation()}
        aria-label="Mobile sidebar"
      >
        <Sidebar
          location={location}
          pendingCount={pendingCount}
          clearBadge={clearBadge}
          onNav={() => setMobileOpen(false)}
          collapsed={false}
          t={t}
          dark={dark}
        />
      </aside>

      <div className="shell-main">
        <TopBar
          pathname={location.pathname}
          dark={dark}
          t={t}
          toggleTheme={toggle}
          toggleSidebar={toggleSidebar}
          openPalette={openPalette}
          lastFetchStr={lastFetchStr}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          newBadge={newBadge}
          clearBadge={clearBadge}
          onNewBooking={handleNewBooking}
          isMobile={isMobile}
        />

        <main
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            background: t.pageBg,
          }}
        >
          <div key={location.pathname} className="page-enter page-content">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="shell-mobile-nav"
          aria-label="Mobile"
          style={{
            height: 64,
            background: sidebarBg,
            borderTop: `1px solid ${line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            padding: `0 ${SHELL.gap.sm}px`,
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          {NAV_ITEMS.slice(0, 5).map(({ path, label, badge }) => {
            const active = location.pathname === path;
            const count = badge ? pendingCount : 0;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => badge && clearBadge()}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: SHELL.gap.xs,
                  padding: `${SHELL.gap.sm}px ${SHELL.gap.sm}px`,
                  borderRadius: SHELL.radius,
                  position: "relative",
                  color: active ? (BRAND_ACCENT) : t.textMuted,
                  background: active ? hoverBg : "transparent",
                  minWidth: 48,
                  minHeight: 48,
                  textDecoration: "none",
                }}
              >
                <NavIcon path={path} size={SHELL.icon} />
                <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1 }}>{label}</span>
                {count > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      background: BRAND_ACCENT,
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 600,
                      borderRadius: 9999,
                      padding: `0 ${SHELL.gap.xs}px`,
                      height: 16,
                      minWidth: 16,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: SHELL.gap.xs,
              padding: `${SHELL.gap.sm}px`,
              borderRadius: SHELL.radius,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: t.textMuted,
              minWidth: 48,
              minHeight: 48,
              fontFamily: "inherit",
            }}
          >
            <MoreHorizontal size={SHELL.icon} strokeWidth={SHELL.iconStroke} />
            <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1 }}>More</span>
          </button>
        </nav>
      </div>

      <CommandPalette />
      <OwnerBot />
    </div>
  );
}
