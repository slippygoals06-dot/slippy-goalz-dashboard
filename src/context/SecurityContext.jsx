import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeContext";
import { getPinStatus } from "../api";
import PinLockOverlay from "../components/PinLockOverlay";

const SecurityContext = createContext();

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min
const WARN_BEFORE     = 2  * 60 * 1000; // warn 2 min before
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION   = 15 * 60 * 1000; // 15 min lockout
const PIN_SET_KEY = "slippy_pin_set";

export function SecurityProvider({ children }) {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [showWarning,   setShowWarning]   = useState(false);
  const [countdown,     setCountdown]     = useState(120);
  const [locked,        setLocked]        = useState(false);
  const [pinConfigured, setPinConfigured] = useState(() => {
    try { return localStorage.getItem(PIN_SET_KEY) === "1"; } catch { return false; }
  });
  const [securityLog,   setSecurityLog]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("slippy_seclog") || "[]"); } catch { return []; }
  });

  const timeoutRef   = useRef(null);
  const warnRef      = useRef(null);
  const countRef     = useRef(null);
  const lastActivity = useRef(Date.now());
  const lockedRef    = useRef(false);
  const pinConfiguredRef = useRef(pinConfigured);

  useEffect(() => { lockedRef.current = locked; }, [locked]);
  useEffect(() => { pinConfiguredRef.current = pinConfigured; }, [pinConfigured]);

  const resetTimerRef = useRef(null);
  const refreshPinStatusRef = useRef(null);

  const addLog = useCallback((event, detail = "") => {
    const entry = {
      event, detail,
      time: new Date().toLocaleString(),
      ts: Date.now(),
    };
    setSecurityLog(prev => {
      const next = [entry, ...prev].slice(0, 100);
      localStorage.setItem("slippy_seclog", JSON.stringify(next));
      return next;
    });
  }, []);

  const setPinEnabled = useCallback((enabled) => {
    setPinConfigured(Boolean(enabled));
    try {
      localStorage.setItem(PIN_SET_KEY, enabled ? "1" : "0");
    } catch { /* ignore */ }
  }, []);

  const refreshPinStatus = useCallback(async () => {
    if (!localStorage.getItem("auth") || !localStorage.getItem("slippy_token")) return;
    try {
      const data = await getPinStatus();
      setPinEnabled(Boolean(data?.pin_set));
    } catch {
      // Keep cached value on failure
    }
  }, [setPinEnabled]);

  const logout = useCallback((reason = "Manual logout") => {
    addLog("Logout", reason);
    localStorage.removeItem("auth");
    localStorage.removeItem("slippy_session");
    clearTimeout(timeoutRef.current);
    clearTimeout(warnRef.current);
    clearInterval(countRef.current);
    setShowWarning(false);
    setLocked(false);
    lockedRef.current = false;
    navigate("/login");
  }, [addLog, navigate]);

  const softLock = useCallback((reason = "Session idle") => {
    if (lockedRef.current) return;
    addLog("Screen locked", reason);
    clearTimeout(timeoutRef.current);
    clearTimeout(warnRef.current);
    clearInterval(countRef.current);
    setShowWarning(false);
    setLocked(true);
    lockedRef.current = true;
  }, [addLog]);

  const unlockSession = useCallback(() => {
    addLog("Screen unlocked", "Quick PIN / password");
    setLocked(false);
    lockedRef.current = false;
  }, [addLog]);

  const expireSession = useCallback(() => {
    if (pinConfiguredRef.current) {
      softLock("Session timeout");
    } else {
      logout("Session timeout");
    }
  }, [softLock, logout]);

  const resetTimer = useCallback(() => {
    if (lockedRef.current) return;
    lastActivity.current = Date.now();
    setShowWarning(false);
    clearTimeout(timeoutRef.current);
    clearTimeout(warnRef.current);
    clearInterval(countRef.current);

    warnRef.current = setTimeout(() => {
      if (lockedRef.current) return;
      setCountdown(WARN_BEFORE / 1000);
      setShowWarning(true);
      countRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countRef.current);
            expireSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, SESSION_TIMEOUT - WARN_BEFORE);

    timeoutRef.current = setTimeout(() => {
      expireSession();
    }, SESSION_TIMEOUT);
  }, [expireSession]);

  resetTimerRef.current = resetTimer;
  refreshPinStatusRef.current = refreshPinStatus;

  // After unlock, restart idle timers
  useEffect(() => {
    if (!locked && localStorage.getItem("auth")) {
      resetTimer();
    }
  }, [locked, resetTimer]);

  // Track user activity + load PIN status once per authenticated mount
  useEffect(() => {
    if (!localStorage.getItem("auth")) return;
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    const handler = () => {
      if (lockedRef.current) return;
      resetTimerRef.current?.();
    };
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetTimerRef.current?.();
    refreshPinStatusRef.current?.();
    addLog("Login", "Session started");
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearTimeout(timeoutRef.current);
      clearTimeout(warnRef.current);
      clearInterval(countRef.current);
    };
  }, [addLog]);

  // ── Login attempt tracker (exported for Login page) ────────────────────────
  const checkLoginAttempt = useCallback((username) => {
    const key = "slippy_attempts";
    const data = JSON.parse(localStorage.getItem(key) || '{"count":0,"lockUntil":0}');
    const now = Date.now();

    if (data.lockUntil > now) {
      const mins = Math.ceil((data.lockUntil - now) / 60000);
      return { allowed: false, message: `Too many attempts. Locked for ${mins} min.` };
    }

    return { allowed: true };
  }, []);

  const recordLoginSuccess = useCallback((username) => {
    localStorage.removeItem("slippy_attempts");
    localStorage.setItem("slippy_session", JSON.stringify({ user: username, start: Date.now() }));
    addLog("Login Success", `User: ${username}`);
    refreshPinStatus();
  }, [addLog, refreshPinStatus]);

  const recordLoginFail = useCallback((username) => {
    const key = "slippy_attempts";
    const data = JSON.parse(localStorage.getItem(key) || '{"count":0,"lockUntil":0}');
    const count = data.count + 1;
    const lockUntil = count >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCKOUT_DURATION : 0;
    localStorage.setItem(key, JSON.stringify({ count, lockUntil }));
    addLog("Login Failed", `User: ${username} (attempt ${count})`);
    if (lockUntil) addLog("Account Locked", `Locked for 15 min after ${count} failed attempts`);
    return { remaining: MAX_LOGIN_ATTEMPTS - count, locked: !!lockUntil };
  }, [addLog]);

  const remainingAttempts = () => {
    const data = JSON.parse(localStorage.getItem("slippy_attempts") || '{"count":0}');
    return MAX_LOGIN_ATTEMPTS - data.count;
  };

  const warnUsesSoftLock = pinConfigured;

  return (
    <SecurityContext.Provider value={{
      logout,
      softLock,
      unlockSession,
      locked,
      pinConfigured,
      setPinEnabled,
      refreshPinStatus,
      securityLog,
      checkLoginAttempt,
      recordLoginSuccess,
      recordLoginFail,
      remainingAttempts,
      addLog,
    }}>
      {children}

      {locked && createPortal(
        <PinLockOverlay
          onUnlocked={unlockSession}
          onFullLogout={() => logout("Signed out from lock screen")}
        />,
        document.body
      )}

      {/* ── SESSION TIMEOUT WARNING MODAL ── */}
      {showWarning && !locked && createPortal(
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="modal-surface"
            style={{
              background: t.cardBg,
              borderRadius: 14,
              padding: 36,
              maxWidth: 400,
              width: "90%",
              textAlign: "center",
              border: `1px solid ${t.border}`,
              borderTop: `1px solid ${t.borderTopHighlight}`,
              boxShadow: t.cardShadow,
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ fontSize:40, marginBottom:16, opacity:0.6 }}>⏱</div>
            <h2 style={{ color:t.textPrimary, fontWeight:700, fontSize:20, marginBottom:8 }}>
              {warnUsesSoftLock ? "Screen Will Lock" : "Session Expiring"}
            </h2>
            <p style={{ color:t.textSecondary, fontSize:14, marginBottom:24 }}>
              {warnUsesSoftLock
                ? "Your screen will lock in"
                : "You will be logged out in"}
            </p>
            <div style={{ fontSize:52, fontWeight:700, color: countdown < 30 ? t.textPrimary : "var(--accent)", marginBottom:24, fontVariantNumeric:"tabular-nums" }}>
              {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,"0")}
            </div>
            <div style={{ display:"flex", gap:12 }}>
              <button className="ui-interactive" onClick={() => { resetTimer(); }} style={{ flex:1, padding:"13px", borderRadius:10, border:"none", background:t.btnPrimaryBg, color:t.btnPrimaryColor, boxShadow:t.btnPrimaryShadow, fontWeight:700, fontSize:14, cursor:"pointer" }}>
                Stay Active
              </button>
              <button className="ui-interactive" onClick={() => logout("User chose to logout")} style={{ flex:1, padding:"13px", borderRadius:10, border:`1px solid rgba(255,255,255,0.12)`, background:"transparent", color:t.textSecondary, fontWeight:600, fontSize:14, cursor:"pointer" }}>
                Logout
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </SecurityContext.Provider>
  );
}

export const useSecurity = () => useContext(SecurityContext);
