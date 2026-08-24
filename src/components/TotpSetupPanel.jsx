import { useEffect, useState } from "react";
import { useTheme, primaryBtnStyle, secondaryBtnStyle } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { getTotpStatus, setupTotp, enableTotp, disableTotp } from "../api";

/** Owner-only authenticator app (TOTP) setup panel for Security page. */
export default function TotpSetupPanel() {
  const { theme: t } = useTheme();
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [otpauth, setOtpauth] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getTotpStatus()
      .then((d) => setEnabled(Boolean(d.enabled)))
      .catch(() => {});
  }, []);

  const inputStyle = {
    width: "100%",
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    padding: "10px 12px",
    background: t.inputBg,
    color: t.textPrimary,
    fontSize: 13,
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  async function startSetup() {
    setBusy(true);
    try {
      const d = await setupTotp();
      setSecret(d.secret || "");
      setOtpauth(d.otpauth_url || "");
      showToast("Scan the secret in your authenticator app, then enter a code");
    } catch (e) {
      showToast(e.message || "Setup failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    setBusy(true);
    try {
      await enableTotp(password, code);
      setEnabled(true);
      setSecret("");
      setOtpauth("");
      setPassword("");
      setCode("");
      showToast("Two-factor authentication enabled");
    } catch (e) {
      showToast(e.message || "Could not enable 2FA", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable() {
    setBusy(true);
    try {
      await disableTotp(password, code);
      setEnabled(false);
      setPassword("");
      setCode("");
      showToast("Two-factor authentication disabled");
    } catch (e) {
      showToast(e.message || "Could not disable 2FA", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 14,
        border: `1px solid ${t.border}`,
        background: t.cardBg,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary }}>
        Authenticator 2FA (owner)
      </div>
      <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.45 }}>
        {enabled
          ? "Login requires a code from your authenticator app after password."
          : "Protect the owner account with Google Authenticator / Authy."}
      </div>
      <div style={{ fontSize: 12, color: enabled ? "#059669" : t.textMuted }}>
        Status: {enabled ? "Enabled" : "Off"}
      </div>

      {!enabled && !secret && (
        <button type="button" disabled={busy} onClick={startSetup} style={primaryBtnStyle(t)}>
          {busy ? "…" : "Set up authenticator"}
        </button>
      )}

      {secret && (
        <>
          <div style={{ fontSize: 12, color: t.textSecondary, wordBreak: "break-all" }}>
            Secret: <code>{secret}</code>
          </div>
          {otpauth && (
            <div style={{ fontSize: 11, color: t.textMuted, wordBreak: "break-all" }}>{otpauth}</div>
          )}
          <input
            style={inputStyle}
            type="password"
            placeholder="Owner password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
          />
          <button type="button" disabled={busy} onClick={confirmEnable} style={primaryBtnStyle(t)}>
            Confirm & enable
          </button>
        </>
      )}

      {enabled && (
        <>
          <input
            style={inputStyle}
            type="password"
            placeholder="Owner password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="Current 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
          />
          <button type="button" disabled={busy} onClick={confirmDisable} style={secondaryBtnStyle(t)}>
            Disable 2FA
          </button>
        </>
      )}
    </div>
  );
}
