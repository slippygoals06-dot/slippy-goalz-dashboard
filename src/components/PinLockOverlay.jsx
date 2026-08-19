import { useState } from "react";
import { useTheme, primaryBtnStyle } from "../context/ThemeContext";
import { verifyPin, unlockWithPassword } from "../api";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];

/**
 * Soft-lock overlay: PIN keypad + password fallback.
 * Keeps JWT/session; only clears the locked UI flag on success.
 */
export default function PinLockOverlay({ onUnlocked, onFullLogout }) {
  const { theme: t } = useTheme();
  const [digits, setDigits] = useState("");
  const [mode, setMode] = useState("pin"); // pin | password
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function tryPin(nextDigits) {
    if (nextDigits.length < 4 || nextDigits.length > 6) return;
    setBusy(true);
    setError("");
    try {
      await verifyPin(nextDigits);
      setDigits("");
      onUnlocked();
    } catch (err) {
      setError(err.message || "Incorrect PIN");
      setDigits("");
    } finally {
      setBusy(false);
    }
  }

  function onKey(key) {
    if (busy) return;
    setError("");
    if (key === "⌫") {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    if (key === "✓") {
      if (digits.length >= 4) tryPin(digits);
      return;
    }
    if (digits.length >= 6) return;
    const next = digits + key;
    setDigits(next);
    if (next.length === 6) tryPin(next);
  }

  async function submitPassword(e) {
    e?.preventDefault?.();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      await unlockWithPassword(password);
      setPassword("");
      onUnlocked();
    } catch (err) {
      setError(err.message || "Incorrect password");
    } finally {
      setBusy(false);
    }
  }

  const keyStyle = {
    height: 56,
    borderRadius: 14,
    border: `1px solid ${t.border}`,
    background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
    color: t.textPrimary,
    fontSize: 20,
    fontWeight: 700,
    cursor: busy ? "wait" : "pointer",
    boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 20px rgba(0,0,0,0.25)",
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="modal-surface"
        style={{
          width: "100%",
          maxWidth: 360,
          background: t.cardBgSolid || t.cardBg,
          borderRadius: 20,
          padding: "28px 24px 22px",
          border: `1px solid ${t.border}`,
          borderTop: `1px solid ${t.borderTopHighlight}`,
          boxShadow: t.cardShadow,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            margin: "0 auto 14px",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: t.accentGlow,
            border: `1px solid ${t.accent}`,
            boxShadow: "none",
            color: t.accent,
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          ✱
        </div>
        <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.textPrimary, letterSpacing: -0.4 }}>
          Screen locked
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: t.textSecondary, lineHeight: 1.45 }}>
          {mode === "pin"
            ? "Enter your Quick PIN to continue. Session stays signed in."
            : "Enter your password to unlock."}
        </p>

        {mode === "pin" ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 10,
                margin: "22px 0 18px",
                minHeight: 14,
              }}
            >
              {Array.from({ length: Math.max(4, digits.length || 4) }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: i < digits.length ? t.accentSolid || t.accent : "transparent",
                    border: `1.5px solid ${i < digits.length ? (t.accentSolid || t.accent) : t.border}`,
                    boxShadow: "none",
                  }}
                />
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                marginBottom: 14,
              }}
            >
              {KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="ui-interactive"
                  disabled={busy}
                  onClick={() => onKey(key)}
                  style={{
                    ...keyStyle,
                    fontSize: key === "⌫" || key === "✓" ? 18 : 20,
                    color: key === "✓" ? "#4ade80" : t.textPrimary,
                  }}
                >
                  {key}
                </button>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={submitPassword} style={{ marginTop: 20, marginBottom: 12, textAlign: "left" }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: t.textMuted,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 7,
              }}
            >
              Password
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                background: t.inputBg,
                border: `1px solid ${t.border}`,
                color: t.textPrimary,
                fontSize: 14,
                outline: "none",
                marginBottom: 12,
              }}
            />
            <button
              type="submit"
              className="ui-interactive"
              disabled={busy || !password}
              style={{ ...primaryBtnStyle(t), width: "100%", padding: "12px", opacity: busy ? 0.7 : 1 }}
            >
              {busy ? "Unlocking…" : "Unlock"}
            </button>
          </form>
        )}

        {error && (
          <div style={{ color: "#f87171", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>{error}</div>
        )}

        <button
          type="button"
          className="ui-interactive"
          onClick={() => {
            setMode(mode === "pin" ? "password" : "pin");
            setError("");
            setDigits("");
            setPassword("");
          }}
          style={{
            background: "none",
            border: "none",
            color: t.accent,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            padding: "8px 4px",
          }}
        >
          {mode === "pin" ? "Use password instead" : "Use Quick PIN instead"}
        </button>

        <div>
          <button
            type="button"
            className="ui-interactive"
            onClick={onFullLogout}
            style={{
              background: "none",
              border: "none",
              color: t.textMuted,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              padding: "6px 4px",
              marginTop: 2,
            }}
          >
            Sign out completely
          </button>
        </div>
      </div>
    </div>
  );
}
