import { useState, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import { useTheme, primaryBtnStyle, secondaryBtnStyle } from "../context/ThemeContext";
import { FabSparkle, CloseIcon } from "./icons";
import { API_URL } from "../config";

const QUICK_PROMPTS = [
  "Today's bookings?",
  "Who hasn't paid?",
  "Available slots?",
  "Recent leads?",
];

export default function OwnerBot() {
  const { theme: t } = useTheme();
  const bookings = useStore((s) => s.bookings || []);
  const slots = useStore((s) => s.slots || []);
  const leads = useStore((s) => s.leads || []);

  const revenue = bookings
    .filter((b) => b.Status === "Confirmed" || b.Status === "Completed")
    .reduce((s, b) => s + (Number(b.amount) || 0), 0);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Salam! I have access to your live shop data. Ask me anything — bookings, payments, slots, leads." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  async function sendMessage(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${API_URL}/chat/owner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("slippy_token")}`,
        },
        body: JSON.stringify({ messages: history, context: { bookings, slots, leads, revenue } }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const canSend = input.trim() && !loading;

  return (
    <>
      <button
        className="ui-interactive"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1001,
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: t.cardBg,
          border: `1px solid ${t.border}`,
          borderTop: `1px solid ${t.borderTopHighlight}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: t.cardShadow,
          color: t.accent,
        }}
        title="AI Assistant"
        aria-label="Open AI assistant"
      >
        {open ? <CloseIcon size={20} /> : <FabSparkle />}
      </button>

      {open && (
        <div
          className="modal-surface"
          style={{
            position: "fixed",
            bottom: 90,
            right: 24,
            zIndex: 1000,
            width: 370,
            maxWidth: "calc(100vw - 48px)",
            background: t.cardBg,
            border: `1px solid ${t.border}`,
            borderTop: `1px solid ${t.borderTopHighlight}`,
            borderRadius: 14,
            boxShadow: t.cardShadow,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            height: 500,
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              background: t.cardBg,
              borderBottom: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: t.cardBg2,
                border: `1px solid ${t.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "none",
                color: t.accent,
              }}
            >
              <FabSparkle size={16} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: t.textPrimary, letterSpacing: "-0.01em" }}>
                Slippy Goalz Arena Assistant
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: t.accent,
                    display: "inline-block",
                  }}
                />
                <p style={{ margin: 0, fontSize: 11, color: t.textSecondary }}>
                  {bookings.length} bookings · {leads.length} leads in context
                </p>
              </div>
            </div>

            <button
              className="ui-interactive"
              onClick={() =>
                setMessages([
                  {
                    role: "assistant",
                    content: "Salam! I have access to your live shop data. Ask me anything — bookings, payments, slots, leads.",
                  },
                ])
              }
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: t.textMuted,
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 6,
              }}
              title="Clear chat"
            >
              Clear
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 14px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              scrollbarWidth: "thin",
              scrollbarColor: `${t.border} transparent`,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  animation: "listRowIn 200ms ease both",
                }}
              >
                {m.role === "assistant" && i === 0 && (
                  <p
                    style={{
                      margin: "0 0 4px 4px",
                      fontSize: 10,
                      color: t.textMuted,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Assistant
                  </p>
                )}
                <div
                  style={{
                    padding: "9px 13px",
                    background: m.role === "user" ? "rgba(255,255,255,0.04)" : t.cardBg,
                    color: t.textPrimary,
                    borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    border: `1px solid ${t.border}`,
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: "flex-start" }}>
                <div
                  style={{
                    padding: "10px 16px",
                    background: t.cardBg,
                    border: `1px solid ${t.border}`,
                    borderRadius: "14px 14px 14px 4px",
                    display: "flex",
                    gap: 5,
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: t.textMuted,
                        display: "inline-block",
                        animation: `skeletonPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div style={{ padding: "6px 14px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {QUICK_PROMPTS.map((q, i) => (
                <button
                  key={i}
                  className="ui-interactive"
                  onClick={() => sendMessage(q)}
                  style={{
                    ...secondaryBtnStyle(t),
                    padding: "5px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = t.borderHover;
                    e.target.style.color = t.textPrimary;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.12)";
                    e.target.style.color = t.textSecondary;
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              padding: "10px 12px 12px",
              borderTop: `1px solid ${t.border}`,
              display: "flex",
              gap: 8,
              alignItems: "center",
              background: t.cardBg,
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Bookings, payments, slots pocho…"
              disabled={loading}
              style={{
                flex: 1,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 13,
                background: t.inputBg,
                color: t.textPrimary,
                outline: "none",
                transition: "border-color 150ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = t.borderHover;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = t.border;
              }}
            />
            <button
              className="ui-interactive"
              onClick={() => sendMessage()}
              disabled={!canSend}
              style={{
                ...(canSend ? primaryBtnStyle(t) : secondaryBtnStyle(t)),
                width: 36,
                height: 36,
                flexShrink: 0,
                padding: 0,
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: canSend ? 1 : 0.5,
                cursor: loading ? "wait" : canSend ? "pointer" : "default",
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
