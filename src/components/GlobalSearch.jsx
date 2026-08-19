import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useTheme, cardStyle } from "../context/ThemeContext";
import { Search, ChevronRight } from "lucide-react";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const bookings = useStore((s) => s.bookings);
  const leads = useStore((s) => s.leads);
  const waitlist = useStore((s) => s.waitlist);
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const keys = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", keys);
    return () => document.removeEventListener("keydown", keys);
  }, []);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    setQuery("");
  }, [open]);

  const q = query.toLowerCase().trim();
  const results =
    q.length < 2
      ? []
      : [
          ...bookings
            .filter(
              (b) =>
                b.Name?.toLowerCase().includes(q) ||
                b.Phone?.includes(q) ||
                b.Service?.toLowerCase().includes(q)
            )
            .slice(0, 4)
            .map((b) => ({
              type: "Booking",
              label: b.Name,
              sub: b.Service + " · " + b.Date,
              status: b.Status,
              path: "/bookings",
            })),
          ...leads
            .filter(
              (l) =>
                l.Name?.toLowerCase().includes(q) ||
                l.Phone?.includes(q) ||
                l.Device?.toLowerCase().includes(q) ||
                l.Issue?.toLowerCase().includes(q)
            )
            .slice(0, 3)
            .map((l) => ({
              type: "Lead",
              label: l.Name,
              sub: (l.Device || l.Issue || "Lead") + " · " + l.Phone,
              path: "/leads",
            })),
          ...waitlist
            .filter((w) => w.Name?.toLowerCase().includes(q) || w.Phone?.includes(q))
            .slice(0, 3)
            .map((w) => ({
              type: "Waitlist",
              label: w.Name,
              sub: w.Service + " · " + w["Preferred Day"],
              path: "/waitlist",
            })),
        ];

  const go = (path) => {
    navigate(path);
    setOpen(false);
    setQuery("");
  };

  const quickActions = [
    { label: "Go to Bookings", path: "/bookings", type: "Action" },
    { label: "Go to Invoices", path: "/invoices", type: "Action" },
    { label: "Go to Cash Ledger", path: "/cash", type: "Action" },
    { label: "Go to Leads", path: "/leads", type: "Action" },
    { label: "Open Settings", path: "/settings", type: "Action" },
  ];

  const filteredActions =
    q.length === 0
      ? quickActions
      : quickActions.filter((a) => a.label.toLowerCase().includes(q));

  const showResults = q.length >= 2;
  const list = showResults ? results : filteredActions.map((a) => ({
    type: a.type,
    label: a.label,
    sub: "Quick action",
    path: a.path,
  }));

  return (
    <>
      <button
        type="button"
        className="ui-interactive"
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 12px",
          borderRadius: 10,
          background: t.inputBg || t.cardBg,
          border: `1px solid ${t.border}`,
          color: t.textMuted,
          fontSize: 13,
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <Search size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Search…
        </span>
        <kbd
          className="font-mono-data"
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: 6,
            border: `1px solid ${t.border}`,
            background: t.cardBg2 || t.pageBg,
            color: t.textFaint || t.textMuted,
            flexShrink: 0,
          }}
        >
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(26,28,23,0.35)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "12vh 16px 16px",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            ref={panelRef}
            className="modal-surface"
            role="dialog"
            aria-label="Command palette"
            onClick={(e) => e.stopPropagation()}
            style={{
              ...cardStyle(t),
              width: "100%",
              maxWidth: 520,
              padding: 0,
              overflow: "hidden",
              boxShadow: t.cardShadowHover,
            }}
          >
            <div style={{ position: "relative", borderBottom: `1px solid ${t.border}` }}>
              <Search
                size={18}
                strokeWidth={2}
                style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: t.textMuted }}
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or jump to…"
                style={{
                  width: "100%",
                  padding: "16px 16px 16px 44px",
                  border: "none",
                  background: "transparent",
                  color: t.textPrimary,
                  fontSize: 15,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ maxHeight: 360, overflowY: "auto", padding: "8px 0" }}>
              {!showResults && (
                <div
                  style={{
                    padding: "6px 16px 4px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: t.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  }}
                >
                  Quick actions
                </div>
              )}
              {showResults && results.length === 0 ? (
                <div style={{ padding: "20px 16px", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
                  No results for “{query}”
                </div>
              ) : (
                list.map((r, i) => (
                  <div
                    key={i}
                    className="ds-row clickable"
                    onClick={() => go(r.path)}
                    style={{ margin: "0 8px", borderRadius: 10 }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 8,
                        background: t.cardBg2,
                        color: t.textSecondary,
                        border: `1px solid ${t.border}`,
                        flexShrink: 0,
                      }}
                    >
                      {r.type}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: t.textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.label}
                      </div>
                      {r.sub && (
                        <div className="font-mono-data" style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>
                          {r.sub}
                        </div>
                      )}
                    </div>
                    {r.status && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, flexShrink: 0 }}>{r.status}</span>
                    )}
                    <ChevronRight size={16} strokeWidth={2} className="ds-chevron" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
