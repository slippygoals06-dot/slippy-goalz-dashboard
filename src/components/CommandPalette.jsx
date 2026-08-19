import { useEffect, useMemo } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Receipt,
  Banknote,
  Clock,
  Users,
  Hourglass,
  MessageSquare,
  BarChart3,
  ScrollText,
  Shield,
  Settings,
  Plus,
  CalendarRange,
  Search,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useCommand } from "../context/CommandContext";
import { useStore } from "../store/useStore";
import { DATE_RANGES, NAV_ITEMS } from "../constants";

const NAV_ICONS = {
  "/": LayoutDashboard,
  "/bookings": ClipboardList,
  "/invoices": Receipt,
  "/cash": Banknote,
  "/slots": Clock,
  "/leads": Users,
  "/waitlist": Hourglass,
  "/chats": MessageSquare,
  "/analytics": BarChart3,
  "/audit": ScrollText,
  "/security": Shield,
  "/settings": Settings,
};

function Kbd({ children }) {
  const { theme: t } = useTheme();
  return (
    <kbd
      className="font-mono-data"
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 8,
        border: `1px solid ${t.border}`,
        background: t.cardBg2,
        color: t.textMuted,
        marginLeft: 8,
      }}
    >
      {children}
    </kbd>
  );
}

export default function CommandPalette() {
  const { theme: t, dark } = useTheme();
  const { open, setOpen, requestRange, requestNewBooking } = useCommand();
  const navigate = useNavigate();
  const bookings = useStore((s) => s.bookings);
  const leads = useStore((s) => s.leads);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, setOpen]);

  const bookingHits = useMemo(
    () =>
      (bookings || []).slice(0, 40).map((b) => ({
        id: b["Booking ID"] || `${b.Name}-${b.Date}`,
        label: b.Name || "Booking",
        sub: `${b.Service || "—"} · ${b.Date || ""} · ${b.Status || ""}`,
      })),
    [bookings]
  );

  const leadHits = useMemo(
    () =>
      (leads || []).slice(0, 20).map((l, i) => ({
        id: l.id || `lead-${i}`,
        label: l.Name || "Lead",
        sub: `${l.Device || l.Issue || "Lead"} · ${l.Phone || ""}`,
      })),
    [leads]
  );

  const run = (fn) => {
    setOpen(false);
    fn();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cmdk-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "tween", duration: 0.15, ease: [0.2, 0, 0, 1] }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: dark ? "rgba(0,0,0,0.55)" : "rgba(26,28,23,0.35)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "14vh 16px 16px",
          }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ type: "tween", duration: 0.18, ease: [0.2, 0, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              borderRadius: 18,
              overflow: "hidden",
              background: t.cardBg,
              border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.14), inset 0 1px 0 0 rgba(255,255,255,0.08)",
            }}
          >
            <Command label="Command menu" loop>
              <div style={{ position: "relative", borderBottom: `1px solid ${t.border}` }}>
                <Search
                  size={16}
                  strokeWidth={2}
                  style={{
                    position: "absolute",
                    left: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: t.textMuted,
                  }}
                />
                <Command.Input
                  placeholder="Search routes, bookings, actions…  ⌘K"
                  style={{
                    width: "100%",
                    padding: "16px 16px 16px 42px",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: t.textPrimary,
                    fontSize: 15,
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <Command.List
                style={{
                  maxHeight: 380,
                  overflowY: "auto",
                  padding: "8px",
                }}
              >
                <Command.Empty
                  style={{
                    padding: "28px 12px",
                    textAlign: "center",
                    color: t.textMuted,
                    fontSize: 13,
                  }}
                >
                  No matches
                </Command.Empty>

                <Command.Group heading="Navigation" style={groupStyle(t)}>
                  {NAV_ITEMS.map((item) => {
                    const Icon = NAV_ICONS[item.path] || LayoutDashboard;
                    return (
                      <Command.Item
                        key={item.path}
                        value={`${item.label} ${item.path} go navigate`}
                        onSelect={() => run(() => navigate(item.path))}
                        style={itemStyle(t)}
                        className="cmdk-item"
                      >
                        <Icon size={15} strokeWidth={2} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        <span className="font-mono-data" style={{ fontSize: 10, color: t.textMuted }}>
                          {item.path === "/" ? "G D" : ""}
                        </span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>

                <Command.Group heading="Actions" style={groupStyle(t)}>
                  <Command.Item
                    value="create new booking C"
                    onSelect={() =>
                      run(() => {
                        requestNewBooking();
                        navigate("/bookings");
                      })
                    }
                    style={itemStyle(t)}
                    className="cmdk-item"
                  >
                    <Plus size={15} strokeWidth={2} />
                    <span style={{ flex: 1 }}>Create booking</span>
                    <Kbd>C</Kbd>
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="Date filter" style={groupStyle(t)}>
                  {DATE_RANGES.map((r) => (
                    <Command.Item
                      key={r}
                      value={`filter date ${r}`}
                      onSelect={() => run(() => {
                        requestRange(r);
                        navigate("/");
                      })}
                      style={itemStyle(t)}
                      className="cmdk-item"
                    >
                      <CalendarRange size={15} strokeWidth={2} />
                      <span style={{ flex: 1 }}>Filter: {r}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {bookingHits.length > 0 && (
                  <Command.Group heading="Bookings" style={groupStyle(t)}>
                    {bookingHits.map((b) => (
                      <Command.Item
                        key={b.id}
                        value={`booking ${b.label} ${b.sub}`}
                        onSelect={() =>
                          run(() => {
                            navigate("/bookings");
                            window.dispatchEvent(
                              new CustomEvent("slippy:open-booking", { detail: { id: b.id } })
                            );
                          })
                        }
                        style={itemStyle(t)}
                        className="cmdk-item"
                      >
                        <ClipboardList size={15} strokeWidth={2} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{b.label}</div>
                          <div className="font-mono-data" style={{ fontSize: 11, color: t.textMuted }}>
                            {b.sub}
                          </div>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {leadHits.length > 0 && (
                  <Command.Group heading="Leads" style={groupStyle(t)}>
                    {leadHits.map((l) => (
                      <Command.Item
                        key={l.id}
                        value={`lead ${l.label} ${l.sub}`}
                        onSelect={() => run(() => navigate("/leads"))}
                        style={itemStyle(t)}
                        className="cmdk-item"
                      >
                        <Users size={15} strokeWidth={2} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{l.label}</div>
                          <div className="font-mono-data" style={{ fontSize: 11, color: t.textMuted }}>
                            {l.sub}
                          </div>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "10px 14px",
                  borderTop: `1px solid ${t.border}`,
                  fontSize: 11,
                  color: t.textMuted,
                }}
              >
                <span>↑↓ navigate</span>
                <span>↵ select</span>
                <span>esc close</span>
              </div>
            </Command>

            <style>{`
              [cmdk-group-heading] {
                font-size: 11px;
                font-weight: 600;
                color: ${t.textMuted};
                text-transform: uppercase;
                letter-spacing: 0.6px;
                padding: 8px 10px 4px;
              }
              .cmdk-item[data-selected="true"] {
                background: ${t.accentGlow} !important;
                color: ${t.textPrimary} !important;
              }
            `}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function groupStyle(t) {
  return { marginBottom: 4, color: t.textPrimary };
}

function itemStyle(t) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 10px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    color: t.textPrimary,
    contentVisibility: "auto",
  };
}
