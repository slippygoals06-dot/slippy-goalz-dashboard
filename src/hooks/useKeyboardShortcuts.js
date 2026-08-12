import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCommand } from "../context/CommandContext";

const GO_MAP = {
  d: "/",
  b: "/bookings",
  i: "/invoices",
  c: "/cash",
  s: "/slots",
  l: "/leads",
  w: "/waitlist",
  a: "/analytics",
  t: "/settings",
};

/**
 * Global keyboard shortcuts (ignore when typing in inputs).
 * ⌘/Ctrl+K — command palette
 * / — open palette (search)
 * C — new booking (via command bus)
 * G then <key> — go to route
 * Esc — close palette / drawers (dispatches slippy:escape)
 */
export function useKeyboardShortcuts({ enabled = true } = {}) {
  const navigate = useNavigate();
  const { open, openPalette, closePalette, requestNewBooking } = useCommand();
  const goArmed = useRef(false);
  const goTimer = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const isTyping = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
        return;
      }

      if (e.key === "Escape") {
        if (open) {
          e.preventDefault();
          closePalette();
        }
        window.dispatchEvent(new CustomEvent("slippy:escape"));
        goArmed.current = false;
        return;
      }

      if (isTyping(e.target) || meta || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        openPalette();
        return;
      }

      if (e.key.toLowerCase() === "c" && !goArmed.current) {
        e.preventDefault();
        requestNewBooking();
        navigate("/bookings");
        return;
      }

      if (e.key.toLowerCase() === "g" && !goArmed.current) {
        e.preventDefault();
        goArmed.current = true;
        clearTimeout(goTimer.current);
        goTimer.current = setTimeout(() => {
          goArmed.current = false;
        }, 900);
        return;
      }

      if (goArmed.current) {
        const path = GO_MAP[e.key.toLowerCase()];
        goArmed.current = false;
        clearTimeout(goTimer.current);
        if (path) {
          e.preventDefault();
          navigate(path);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(goTimer.current);
    };
  }, [enabled, open, openPalette, closePalette, requestNewBooking, navigate]);
}
