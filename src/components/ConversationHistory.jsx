import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { getBookingHistory } from "../api";

/**
 * Read-only chatbot conversation bubbles.
 * - Pass `messages` to render a history array directly (Chats page).
 * - Pass `bookingId` to fetch via GET /bookings/{id}/history (booking History tab).
 */
export default function ConversationHistory({ bookingId, messages: messagesProp }) {
  const { theme: t } = useTheme();
  const useDirect = messagesProp !== undefined && messagesProp !== null;
  const [messages, setMessages] = useState(useDirect ? (Array.isArray(messagesProp) ? messagesProp : []) : []);
  const [loading, setLoading] = useState(!useDirect);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (useDirect) {
      setMessages(Array.isArray(messagesProp) ? messagesProp : []);
      setLoading(false);
      setError(null);
      return;
    }
    if (!bookingId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBookingHistory(bookingId)
      .then((data) => {
        if (cancelled) return;
        setMessages(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load history");
        setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, useDirect, messagesProp]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "36px 0", color: t.textMuted, fontSize: 13 }}>
        Loading conversation…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "36px 0", color: t.textSecondary, fontSize: 13 }}>
        {error}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "36px 0", color: t.textMuted, fontSize: 13 }}>
        {useDirect ? (
          "No messages in this conversation."
        ) : (
          <>
            No chat history for this booking.
            <div style={{ marginTop: 6, fontSize: 12 }}>
              History appears for bookings made via the customer chatbot after linking is enabled.
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className="list-stagger"
      style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "50vh", overflowY: "auto", paddingRight: 4 }}
    >
      {messages.map((m, i) => {
        const isCustomer = m.role === "user";
        const isBot = m.role === "assistant";
        if (!isCustomer && !isBot) return null;
        return (
          <div key={i} style={{ display: "flex", justifyContent: isCustomer ? "flex-start" : "flex-end" }}>
            <div
              style={{
                background: isCustomer ? "rgba(255,255,255,0.04)" : t.cardBg,
                border: `1px solid ${t.border}`,
                borderRadius: isCustomer ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
                padding: "12px 14px",
                maxWidth: "85%",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: t.textMuted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.7,
                  marginBottom: 5,
                }}
              >
                {isCustomer ? "Customer" : "Bot"}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: t.textPrimary,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
