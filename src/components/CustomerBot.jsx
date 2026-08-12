import { useState, useRef, useEffect } from "react";
import { BUSINESS_NAME } from "../constants/brand";
import logoSrc from "../assets/logo.png";

const API = "https://irepair-backend-production-2418.up.railway.app";
const BRAND_RED = "#E11D48";
const BRAND_RED_HOVER = "#BE123C";
const SURFACE = "#13151A";
const SURFACE_2 = "#1A1D24";
const CHARCOAL = "#0B0D10";

function BotMark({ size = 28 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid rgba(225,29,72,0.25)",
        background: SURFACE_2,
        flexShrink: 0,
      }}
    >
      <img
        src={logoSrc}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

export default function CustomerBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! 👋 Welcome to ${BUSINESS_NAME}. I can help you book a repair appointment. What device do you need help with?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/chat/customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          history: newMessages.slice(0, -1),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (data.booking_created) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "✅ Your booking has been confirmed! We'll contact you shortly to confirm the details.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-[10px] text-white flex items-center justify-center transition-all border border-[rgba(225,29,72,0.3)]"
        style={{
          background: BRAND_RED,
          boxShadow: "0 4px 16px rgba(0,0,0,0.24)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = BRAND_RED_HOVER; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = BRAND_RED; }}
      >
        {open ? (
          <span className="text-white text-xl font-bold">✕</span>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"
              fill="#FFFFFF"
            />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[500px] flex flex-col overflow-hidden rounded-2xl"
          style={{
            background: CHARCOAL,
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
          }}
        >
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{
              background: SURFACE,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <BotMark size={34} />
            <div>
              <p className="text-white font-semibold text-sm">
                We <span style={{ color: BRAND_RED }}>F</span>ix Assistant
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                Online — book your repair
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && <BotMark size={26} />}
                <div
                  className="max-w-[80%] px-3 py-2 rounded-2xl text-sm"
                  style={
                    m.role === "user"
                      ? {
                          background: BRAND_RED,
                          color: "#FFFFFF",
                          borderBottomRightRadius: 4,
                          fontWeight: 550,
                        }
                      : {
                          background: SURFACE_2,
                          color: "rgba(255,255,255,0.88)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderBottomLeftRadius: 4,
                        }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start gap-2">
                <BotMark size={26} />
                <div
                  className="px-3 py-2 rounded-2xl text-sm"
                  style={{
                    background: SURFACE_2,
                    color: "rgba(255,255,255,0.4)",
                    borderBottomLeftRadius: 4,
                  }}
                >
                  Typing...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div
            className="p-3 flex gap-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: SURFACE }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message..."
              className="flex-1 text-sm px-3 py-2 rounded-[10px] outline-none"
              style={{
                background: SURFACE_2,
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={loading}
              className="px-3 py-2 rounded-[10px] text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: BRAND_RED,
                color: "#FFFFFF",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = BRAND_RED_HOVER; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = BRAND_RED; }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
