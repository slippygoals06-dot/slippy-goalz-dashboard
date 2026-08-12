import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Lock,
  Loader2,
  ShieldCheck,
  Bot,
  Calendar,
  FileText,
  Users,
  BarChart3,
  Check,
} from "lucide-react";
import { useSecurity } from "../context/SecurityContext";
import {
  BUSINESS_NAME,
  BRAND_INITIAL,
  BRAND_ACCENT,
  BRAND_ACCENT_HOVER,
  BRAND_ACCENT_PRESS,
  BRAND_RING,
  BRAND_SOFT_BG,
} from "../constants/brand";
import { API_URL } from "../config";

const FEATURES = [
  {
    icon: Bot,
    title: "AI Booking Help",
    desc: "Answer customer questions and take bookings automatically.",
  },
  {
    icon: Calendar,
    title: "Easy Scheduling",
    desc: "See open times, block busy hours, and avoid double booking.",
  },
  {
    icon: FileText,
    title: "Simple Invoices",
    desc: "Create bills and track who has paid — cash or online.",
  },
  {
    icon: Users,
    title: "Customer Records",
    desc: "Keep every booking, chat, and history in one place.",
  },
  {
    icon: BarChart3,
    title: "Clear Reports",
    desc: "See bookings and revenue at a glance.",
  },
];

const TRUST = [
  "Secure authentication",
  "Encrypted connection",
  "Enterprise-grade protection",
];

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { checkLoginAttempt, recordLoginSuccess, recordLoginFail } = useSecurity();

  const handleLogin = async (e) => {
    e?.preventDefault?.();

    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }

    const check = checkLoginAttempt(username);
    if (!check.allowed) {
      setError(check.message);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const result = recordLoginFail(username);
        if (result.locked) {
          setError("Too many failed attempts. Account locked for 15 minutes.");
        } else {
          setError(
            `Invalid credentials. ${result.remaining} attempt${result.remaining !== 1 ? "s" : ""} remaining.`
          );
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      localStorage.setItem("slippy_token", data.access_token);
      localStorage.setItem("auth", "true");
      recordLoginSuccess(username);
      navigate("/");
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  const inputError = Boolean(error);

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          --login-bg: #FAFAFB;
          --login-surface: #FFFFFF;
          --login-panel: #F6F7F9;
          --login-border: #E5E7EB;
          --login-border-soft: #ECEEF2;
          --login-text: #111827;
          --login-secondary: #4B5563;
          --login-muted: #6B7280;
          --login-disabled: #9CA3AF;
          --login-accent: ${BRAND_ACCENT};
          --login-accent-hover: ${BRAND_ACCENT_HOVER};
          --login-accent-press: ${BRAND_ACCENT_PRESS};
          --login-ring: ${BRAND_RING};
          --login-soft: ${BRAND_SOFT_BG};
          --login-ease: cubic-bezier(0.2, 0, 0, 1);
          --login-enter-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
          --login-enter-duration: 600ms;
          --login-enter-stagger: 80ms;
          --login-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);

          min-height: 100vh;
          min-height: 100dvh;
          font-family: var(--font-sans), "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--login-bg);
          color: var(--login-text);
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
          position: relative;
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
        }

        .login-story {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px 72px 64px 80px;
          background: var(--login-panel);
          border-right: 1px solid var(--login-border-soft);
          overflow: hidden;
        }

        .login-story-dot {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--login-border);
          opacity: 0.9;
          pointer-events: none;
        }
        .login-story-dot-1 { top: 48px; left: 48px; }
        .login-story-dot-2 { top: 48px; right: 64px; }
        .login-story-dot-3 { bottom: 56px; left: 80px; }

        .login-story-inner {
          max-width: 520px;
          position: relative;
          z-index: 1;
        }

        .login-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 500;
          color: var(--login-muted);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 32px;
        }

        .login-kicker-mark {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--login-accent);
        }

        .login-hero-title {
          margin: 0;
          font-size: 48px;
          font-weight: 600;
          letter-spacing: -0.03em;
          line-height: 1.12;
          color: var(--login-text);
        }

        .login-hero-title span {
          display: block;
          color: var(--login-secondary);
          font-weight: 500;
        }

        .login-hero-copy {
          margin: 24px 0 0;
          font-size: 17px;
          line-height: 1.55;
          color: var(--login-secondary);
          max-width: 420px;
          font-weight: 400;
        }

        .login-trust-line {
          margin: 40px 0 0;
          font-size: 13px;
          color: var(--login-muted);
          font-weight: 500;
        }

        .login-features {
          margin-top: 56px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .login-feature {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px 0;
          border-top: 1px solid var(--login-border-soft);
        }

        .login-feature:last-child {
          border-bottom: 1px solid var(--login-border-soft);
        }

        .login-feature-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--login-surface);
          border: 1px solid var(--login-border);
          color: var(--login-secondary);
        }

        .login-feature-title {
          font-size: 14px;
          font-weight: 550;
          color: var(--login-text);
          letter-spacing: -0.01em;
          margin: 0 0 4px;
        }

        .login-feature-desc {
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
          color: var(--login-muted);
        }

        .login-auth {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          background: var(--login-bg);
        }

        .login-auth-inner {
          width: 100%;
          max-width: 400px;
        }

        .login-card {
          background: var(--login-surface);
          border: 1px solid var(--login-border);
          border-radius: 24px;
          box-shadow: var(--login-shadow);
          padding: 40px 36px 36px;
        }

        .login-logo {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--login-accent);
          color: #FFFFFF;
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.4px;
          margin-bottom: 28px;
        }

        .login-welcome {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.03em;
          line-height: 1.2;
          color: var(--login-text);
        }

        .login-welcome-sub {
          margin: 10px 0 0;
          font-size: 14px;
          line-height: 1.5;
          color: var(--login-muted);
          max-width: 300px;
        }

        .login-form {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .login-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--login-secondary);
          margin-bottom: 8px;
        }

        .login-field {
          position: relative;
        }

        .login-input {
          width: 100%;
          min-height: 52px;
          padding: 14px 16px;
          border-radius: 12px;
          background: var(--login-surface);
          border: 1px solid var(--login-border);
          color: var(--login-text);
          font-size: 15px;
          outline: none;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 150ms var(--login-ease), box-shadow 150ms var(--login-ease), background 150ms var(--login-ease);
        }

        .login-input::placeholder {
          color: var(--login-disabled);
        }

        .login-input:hover {
          border-color: #D1D5DB;
        }

        .login-input:focus {
          border-color: var(--login-accent);
          box-shadow: 0 0 0 3px var(--login-ring);
          background: #FFFFFF;
        }

        .login-input.has-error {
          border-color: rgba(239, 68, 68, 0.55);
        }

        .login-input.has-error:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.16);
        }

        .login-pass-wrap .login-input {
          padding-right: 52px;
        }

        .login-eye {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          background: none;
          border: none;
          color: var(--login-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          transition: color 150ms var(--login-ease), background 150ms var(--login-ease);
        }

        .login-eye:hover {
          color: var(--login-text);
          background: rgba(15, 17, 21, 0.04);
        }

        .login-eye:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px var(--login-ring);
        }

        .login-error {
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.18);
          border-radius: 12px;
          padding: 12px 14px;
          color: #B91C1C;
          font-size: 13px;
          line-height: 1.45;
        }

        .login-submit {
          width: 100%;
          min-height: 52px;
          margin-top: 8px;
          padding: 14px 18px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 550;
          font-family: inherit;
          cursor: pointer;
          color: #FFFFFF;
          background: var(--login-accent);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 150ms var(--login-ease), transform 100ms ease-out;
        }

        .login-submit:hover:not(:disabled) {
          background: var(--login-accent-hover);
        }

        .login-submit:active:not(:disabled) {
          background: var(--login-accent-press);
          transform: scale(0.985);
        }

        .login-submit:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px var(--login-ring);
        }

        .login-submit:disabled {
          opacity: 0.72;
          cursor: wait;
        }

        .login-spinner {
          animation: loginSpin 0.7s linear infinite;
        }

        @keyframes loginSpin {
          to { transform: rotate(360deg); }
        }

        .login-secondary-links {
          margin-top: 24px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 8px 4px;
          font-size: 13px;
          color: var(--login-muted);
        }

        .login-secondary-links a,
        .login-secondary-links button {
          background: none;
          border: none;
          padding: 4px 8px;
          font: inherit;
          font-size: 13px;
          font-weight: 500;
          color: var(--login-muted);
          cursor: pointer;
          text-decoration: none;
          border-radius: 8px;
          transition: color 150ms var(--login-ease), background 150ms var(--login-ease);
        }

        .login-secondary-links a:hover,
        .login-secondary-links button:hover {
          color: var(--login-accent-hover);
          background: var(--login-soft);
        }

        .login-secondary-links a:focus-visible,
        .login-secondary-links button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px var(--login-ring);
        }

        .login-dot-sep {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--login-border);
          flex-shrink: 0;
        }

        .login-security {
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid var(--login-border-soft);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .login-security-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--login-muted);
          font-weight: 500;
        }

        .login-security-item svg {
          color: var(--login-muted);
          flex-shrink: 0;
        }

        .login-mobile-brand {
          display: none;
        }

        /* Premium staggered entrance — fade + soft rise, never bounce */
        @keyframes loginEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-enter {
          opacity: 0;
          animation: loginEnter var(--login-enter-duration) var(--login-enter-ease) both;
        }

        /* Auth column — sequence 1…8 */
        .login-enter-a1 { animation-delay: 0ms; }
        .login-enter-a2 { animation-delay: 80ms; }
        .login-enter-a3 { animation-delay: 160ms; }
        .login-enter-a4 { animation-delay: 240ms; }
        .login-enter-a5 { animation-delay: 320ms; }
        .login-enter-a6 { animation-delay: 400ms; }
        .login-enter-a7 { animation-delay: 480ms; }
        .login-enter-a8 { animation-delay: 560ms; }

        /* Hero column — headline → copy → features (staggered) */
        .login-enter-h1 { animation-delay: 40ms; }
        .login-enter-h2 { animation-delay: 120ms; }
        .login-enter-h3 { animation-delay: 200ms; }
        .login-enter-h4 { animation-delay: 280ms; }
        .login-enter-f1 { animation-delay: 360ms; }
        .login-enter-f2 { animation-delay: 440ms; }
        .login-enter-f3 { animation-delay: 520ms; }
        .login-enter-f4 { animation-delay: 600ms; }
        .login-enter-f5 { animation-delay: 680ms; }

        @media (prefers-reduced-motion: reduce) {
          .login-enter {
            opacity: 1;
            animation: none !important;
            transform: none !important;
          }
          .login-spinner { animation: none !important; }
          .login-submit:active:not(:disabled) { transform: none; }
        }

        @media (max-width: 1100px) {
          .login-story { padding: 56px 48px; }
          .login-hero-title { font-size: 40px; }
          .login-auth { padding: 40px 32px; }
        }

        @media (max-width: 860px) {
          .login-page {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto;
          }

          .login-auth {
            order: 1;
            padding: 32px 20px 40px;
            align-items: flex-start;
            min-height: auto;
          }

          .login-story {
            order: 2;
            border-right: none;
            border-top: 1px solid var(--login-border-soft);
            padding: 48px 24px 56px;
            justify-content: flex-start;
          }

          .login-story-inner { max-width: none; }
          .login-hero-title { font-size: 32px; }
          .login-hero-copy { font-size: 15px; margin-top: 16px; }
          .login-trust-line { margin-top: 28px; }
          .login-features { margin-top: 40px; }
          .login-card { padding: 32px 24px 28px; }
          .login-welcome { font-size: 24px; }
          .login-mobile-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 24px;
            font-size: 14px;
            font-weight: 550;
            color: var(--login-text);
            letter-spacing: -0.01em;
          }
          .login-mobile-brand .login-logo {
            margin-bottom: 0;
            width: 32px;
            height: 32px;
            font-size: 14px;
            border-radius: 10px;
          }
          .login-card .login-logo { display: none; }
        }

        @media (max-width: 480px) {
          .login-auth { padding: 24px 16px 32px; }
          .login-story { padding: 40px 20px 48px; }
          .login-hero-title { font-size: 28px; }
          .login-card { padding: 28px 20px 24px; border-radius: 20px; }
          .login-input, .login-submit { min-height: 48px; }
        }
      `}</style>

      {/* Left — storytelling */}
      <section className="login-story" aria-label="Product overview">
        <span className="login-story-dot login-story-dot-1" aria-hidden />
        <span className="login-story-dot login-story-dot-2" aria-hidden />
        <span className="login-story-dot login-story-dot-3" aria-hidden />

        <div className="login-story-inner">
          <div className="login-kicker login-enter login-enter-h1">
            <span className="login-kicker-mark" aria-hidden />
            {BUSINESS_NAME}
          </div>

          <h1 className="login-hero-title login-enter login-enter-h2">
            Manage your business.
            <span>Powered by AI.</span>
          </h1>

          <p className="login-hero-copy login-enter login-enter-h3">
            Manage bookings, invoices, conversations, customers and business insights
            from one beautiful workspace.
          </p>

          <p className="login-trust-line login-enter login-enter-h4">
            Trusted by modern growing businesses.
          </p>

          <div className="login-features" role="list">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div
                className={`login-feature login-enter login-enter-f${i + 1}`}
                role="listitem"
                key={title}
              >
                <span className="login-feature-icon" aria-hidden>
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="login-feature-title">{title}</p>
                  <p className="login-feature-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Right — authentication */}
      <section className="login-auth" aria-label="Sign in">
        <div className="login-auth-inner">
          <div className="login-mobile-brand login-enter login-enter-a1">
            <div className="login-logo" aria-hidden>
              {BRAND_INITIAL}
            </div>
            {BUSINESS_NAME}
          </div>

          <div className="login-card">
            <div className="login-logo login-enter login-enter-a1" aria-hidden>
              {BRAND_INITIAL}
            </div>

            <h2 className="login-welcome login-enter login-enter-a2">Welcome back</h2>
            <p className="login-welcome-sub login-enter login-enter-a3">
              Sign in to continue managing your business.
            </p>

            <form className="login-form" onSubmit={handleLogin} noValidate>
              {error && (
                <div className="login-error" role="alert">
                  {error}
                </div>
              )}

              <div className="login-enter login-enter-a4">
                <label className="login-label" htmlFor="login-username">
                  Username
                </label>
                <div className="login-field">
                  <input
                    id="login-username"
                    className={`login-input${inputError ? " has-error" : ""}`}
                    type="text"
                    name="username"
                    value={username}
                    placeholder="owner"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={loading}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError("");
                    }}
                  />
                </div>
              </div>

              <div className="login-enter login-enter-a5">
                <label className="login-label" htmlFor="login-password">
                  Password
                </label>
                <div className="login-field login-pass-wrap">
                  <input
                    id="login-password"
                    className={`login-input${inputError ? " has-error" : ""}`}
                    type={showPass ? "text" : "password"}
                    name="password"
                    value={password}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                  />
                  <button
                    type="button"
                    className="login-eye"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                    title={showPass ? "Hide password" : "Show password"}
                    tabIndex={0}
                  >
                    {showPass ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-submit login-enter login-enter-a6"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} strokeWidth={2} className="login-spinner" />
                    Verifying…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="login-secondary-links login-enter login-enter-a7">
              <button
                type="button"
                onClick={() => setError("Contact your admin to reset the owner password.")}
              >
                Forgot password
              </button>
              <span className="login-dot-sep" aria-hidden />
              <button
                type="button"
                onClick={() => setError("New accounts are provisioned by your administrator.")}
              >
                Create account
              </button>
              <span className="login-dot-sep" aria-hidden />
              <a href={`mailto:support@slippy.local?subject=${encodeURIComponent("Login help")}`}>
                Need help?
              </a>
            </div>

            <div className="login-security login-enter login-enter-a8" aria-label="Security assurances">
              {TRUST.map((item) => (
                <div className="login-security-item" key={item}>
                  {item === "Secure authentication" ? (
                    <ShieldCheck size={13} strokeWidth={2} aria-hidden />
                  ) : item === "Encrypted connection" ? (
                    <Lock size={13} strokeWidth={2} aria-hidden />
                  ) : (
                    <Check size={13} strokeWidth={2.25} aria-hidden />
                  )}
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
