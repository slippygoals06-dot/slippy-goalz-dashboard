import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Settings, Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { BUSINESS_NAME } from "../../constants/brand";
import { clearSession } from "../../constants/permissions";
import { logout as apiLogout } from "../../api";
import { SHELL, hoverFill, iconButtonStyle } from "./shellTokens";

/**
 * Compact macOS-style profile control + dropdown
 */
export default function ProfileMenu({ compact = false, align = "left" }) {
  const { theme: t, dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const hoverBg = hoverFill(dark);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const logout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("slippy_token");
    clearSession();
    apiLogout().finally(() => navigate("/login"));
  };

  const menu = open && (
    <div
      role="menu"
      className="ds-dropdown"
      style={{
        position: "absolute",
        [align === "right" ? "right" : "left"]: 0,
        ...(compact
          ? { top: `calc(100% + ${SHELL.gap.sm}px)`, bottom: "auto" }
          : { bottom: `calc(100% + ${SHELL.gap.sm}px)`, top: "auto" }),
        width: 220,
        zIndex: 80,
      }}
    >
      <div style={{ padding: `${SHELL.gap.sm}px ${SHELL.gap.md}px` }}>
        <div
          style={{
            fontSize: SHELL.font.nav.size,
            fontWeight: 600,
            color: t.textPrimary,
            lineHeight: 1.3,
          }}
        >
          {BUSINESS_NAME}
        </div>
        <div
          style={{
            fontSize: SHELL.font.caption.size,
            color: t.textMuted,
            marginTop: SHELL.gap.xs,
            lineHeight: 1.3,
          }}
        >
          Owner · Admin
        </div>
      </div>
      <hr className="ds-dropdown__sep" />
      <button
        type="button"
        role="menuitem"
        className="ds-dropdown__item"
        onClick={() => {
          setOpen(false);
          navigate("/settings");
        }}
      >
        <Settings size={SHELL.iconSm} strokeWidth={SHELL.iconStroke} />
        Settings
      </button>
      <button
        type="button"
        role="menuitem"
        className="ds-dropdown__item"
        onClick={() => {
          toggle();
        }}
      >
        {dark ? (
          <Sun size={SHELL.iconSm} strokeWidth={SHELL.iconStroke} />
        ) : (
          <Moon size={SHELL.iconSm} strokeWidth={SHELL.iconStroke} />
        )}
        {dark ? "Light mode" : "Dark mode"}
      </button>
      <hr className="ds-dropdown__sep" />
      <button
        type="button"
        role="menuitem"
        className="ds-dropdown__item ds-dropdown__item--danger"
        onClick={logout}
      >
        <LogOut size={SHELL.iconSm} strokeWidth={SHELL.iconStroke} />
        Sign out
      </button>
    </div>
  );

  if (compact) {
    return (
      <div ref={ref} style={{ position: "relative" }}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="shell-icon-btn"
          title="Account"
          style={{
            ...iconButtonStyle(t),
            background: open ? hoverBg : "transparent",
          }}
        >
          <Avatar size={28} t={t} />
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        margin: `0 ${SHELL.sidebarInset}px ${SHELL.gap.md}px`,
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: SHELL.gap.md,
          height: 48,
          padding: `0 ${SHELL.gap.md}px`,
          borderRadius: SHELL.radius,
          border: "none",
          background: open ? hoverBg : "transparent",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
          transition: `background ${SHELL.duration} ${SHELL.ease}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = hoverBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = open ? hoverBg : "transparent";
        }}
      >
        <Avatar size={28} t={t} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: SHELL.font.nav.size,
              fontWeight: SHELL.font.nav.weight,
              color: t.textPrimary,
              lineHeight: 1.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Owner
          </div>
          <div
            style={{
              fontSize: SHELL.font.caption.size,
              color: t.textMuted,
              marginTop: SHELL.gap.xs,
              lineHeight: 1.25,
            }}
          >
            Admin
          </div>
        </div>
        <ChevronDown
          size={SHELL.iconSm}
          strokeWidth={SHELL.iconStroke}
          color={t.textMuted}
          style={{
            flexShrink: 0,
            opacity: open ? 0.55 : 1,
            transform: open ? "translateY(1px)" : "translateY(0)",
            transition: `opacity ${SHELL.duration} ${SHELL.ease}, transform ${SHELL.duration} ${SHELL.ease}`,
          }}
        />
      </button>
      {menu}
    </div>
  );
}

function Avatar({ size, t }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: SHELL.radiusChip,
        background: t.activeTint,
        color: t.accentSolid || t.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      OW
    </div>
  );
}
