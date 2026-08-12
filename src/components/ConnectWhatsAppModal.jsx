import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "./Modal";
import { useTheme, secondaryBtnStyle, primaryBtnStyle } from "../context/ThemeContext";
import { connectWhatsApp } from "../api";

const fieldStyle = (t) => ({
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  background: t.inputBg,
  border: `1px solid ${t.border}`,
  fontSize: 14,
  color: t.textPrimary,
  outline: "none",
  boxSizing: "border-box",
});

const labelStyle = (t) => ({
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: t.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.7,
  marginBottom: 8,
});

export default function ConnectWhatsAppModal({ open, onClose, onConnected }) {
  const { theme: t } = useTheme();
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setPhoneNumberId("");
    setAccessToken("");
    setError(null);
    setSubmitting(false);
  }, [open]);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    const id = phoneNumberId.trim();
    const token = accessToken.trim();
    if (!id || !token) {
      setError("Phone Number ID and Access Token are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await connectWhatsApp(id, token);
      onConnected?.(data);
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to connect WhatsApp");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={() => !submitting && onClose?.()} maxWidth={420} maxHeight="90vh">
      <style>{`
        @keyframes waConnectSpin { to { transform: rotate(360deg); } }
      `}</style>
      <form onSubmit={handleSubmit} style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, color: t.textPrimary, letterSpacing: -0.4 }}>
            Connect WhatsApp
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={() => !submitting && onClose?.()}
            style={{
              flexShrink: 0,
              background: t.cardBg2,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              width: 34,
              height: 34,
              cursor: submitting ? "default" : "pointer",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: t.textSecondary,
              opacity: submitting ? 0.5 : 1,
            }}
          >
            ×
          </button>
        </div>
        <p style={{ fontSize: 13, color: t.textSecondary, marginBottom: 18, lineHeight: 1.5 }}>
          Paste your Cloud API credentials to verify and save the connection.
        </p>

        <label style={labelStyle(t)}>Phone Number ID</label>
        <input
          type="text"
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          disabled={submitting}
          autoComplete="off"
          placeholder="e.g. 123456789012345"
          style={{ ...fieldStyle(t), marginBottom: 14 }}
          onFocus={(e) => {
            e.target.style.border = `1px solid ${t.accent}`;
          }}
          onBlur={(e) => {
            e.target.style.border = `1px solid ${t.border}`;
          }}
        />

        <label style={labelStyle(t)}>Access Token</label>
        <input
          type="password"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          disabled={submitting}
          autoComplete="off"
          placeholder="Permanent or temporary token"
          style={{ ...fieldStyle(t), marginBottom: 8 }}
          onFocus={(e) => {
            e.target.style.border = `1px solid ${t.accent}`;
          }}
          onBlur={(e) => {
            e.target.style.border = `1px solid ${t.border}`;
          }}
        />
        <p style={{ fontSize: 12, color: t.textMuted, margin: "0 0 16px", lineHeight: 1.45 }}>
          Find these in Meta for Developers → WhatsApp → API Setup.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.35)",
              color: "#fca5a5",
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="ui-interactive"
            disabled={submitting}
            onClick={() => !submitting && onClose?.()}
            style={{ ...secondaryBtnStyle(t), flex: 1, padding: "12px", fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ui-interactive"
            disabled={submitting}
            style={{
              ...primaryBtnStyle(t),
              flex: 1,
              padding: "12px",
              fontSize: 13,
              opacity: submitting ? 0.75 : 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: submitting ? "wait" : "pointer",
            }}
          >
            {submitting ? (
              <>
                <Loader2
                  size={16}
                  strokeWidth={2}
                  style={{ animation: "waConnectSpin 0.8s linear infinite" }}
                />
                Connecting…
              </>
            ) : (
              "Connect"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
