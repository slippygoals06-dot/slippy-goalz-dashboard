import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BUSINESS_NAME } from "../constants/brand";
import { BrandSparkle } from "../components/icons";
import { useTheme } from "../context/ThemeContext";
import { API_URL as API } from "../config";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatEventType(type) {
  const raw = String(type || "").trim().toLowerCase();
  if (raw === "received") return "Received";
  if (raw === "installed") return "Installed";
  if (!raw) return "Event";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const globalStyle = `
  @keyframes pvFadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pvPulse {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 1; }
  }
  @media (max-width: 480px) {
    .pv-title { font-size: 22px !important; }
    .pv-badge { font-size: 18px !important; padding: 14px 16px !important; }
    .pv-card { padding: 22px 18px !important; }
  }
`;

export default function PublicVerify() {
  const { batchNumber } = useParams();
  const { theme: t, dark, toggle } = useTheme();

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!batchNumber) {
        setStatus("error");
        return;
      }

      setStatus("loading");
      setData(null);

      try {
        const res = await fetch(
          `${API}/parts/${encodeURIComponent(batchNumber)}/verify`
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setStatus("success");
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setStatus("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [batchNumber]);

  const themeToggle = (
    <button
      type="button"
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 3,
        width: 40,
        height: 40,
        borderRadius: 12,
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 17,
        cursor: "pointer",
        boxShadow: dark ? "0 4px 16px rgba(0,0,0,0.3)" : "0 4px 16px rgba(0,0,0,0.06)",
      }}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );

  const shell = (children) => (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(ellipse 80% 45% at 50% -15%, ${t.accentGlow}, transparent), ${t.pageBg}`,
        fontFamily: 'var(--font-sans), "Inter", system-ui, -apple-system, sans-serif',
        padding: "48px 16px 56px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{globalStyle}</style>
      {themeToggle}
      <div style={{ maxWidth: 480, margin: "0 auto", position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );

  const brandHeader = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 28,
        animation: "pvFadeUp .35s ease",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: t.btnPrimaryBg || t.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 8px 24px ${t.accentGlow}`,
        }}
      >
        <BrandSparkle size={20} color="#fff" />
      </div>
      <div>
        <div
          className="font-display"
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: t.textPrimary,
            letterSpacing: -0.3,
          }}
        >
          {BUSINESS_NAME}
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, marginTop: 2 }}>
          Part authenticity check
        </div>
      </div>
    </div>
  );

  if (status === "loading") {
    return shell(
      <>
        {brandHeader}
        <div
          className="pv-card"
          style={{
            background: t.cardBg,
            borderRadius: 16,
            border: `1px solid ${t.border}`,
            padding: 32,
            boxShadow: dark ? "0 24px 60px rgba(0,0,0,0.4)" : t.cardShadow,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              margin: "0 auto 16px",
              borderRadius: "50%",
              border: `3px solid ${t.border}`,
              borderTopColor: t.accent,
              animation: "pvPulse 1s ease infinite",
            }}
          />
          <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary }}>
            Verifying batch…
          </div>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 8 }}>
            Checking supply-chain records
          </div>
        </div>
      </>
    );
  }

  if (status === "error") {
    return shell(
      <>
        {brandHeader}
        <div
          className="pv-card"
          style={{
            background: t.cardBg,
            borderRadius: 16,
            border: `1px solid ${t.border}`,
            padding: "40px 28px",
            boxShadow: dark ? "0 24px 60px rgba(0,0,0,0.4)" : t.cardShadow,
            textAlign: "center",
            animation: "pvFadeUp .35s ease",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 18px",
              borderRadius: 16,
              background: t.riskBg,
              border: `1px solid ${t.riskBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              color: t.risk,
            }}
          >
            ?
          </div>
          <h1
            className="pv-title font-display"
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: t.textPrimary,
              letterSpacing: -0.5,
              margin: "0 0 10px",
            }}
          >
            Batch not found
          </h1>
          <p
            style={{
              fontSize: 14.5,
              color: t.textSecondary,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            We couldn’t find a parts record for this code. If you scanned a QR
            from a booking, please contact the arena for help.
          </p>
          {batchNumber && (
            <div
              style={{
                marginTop: 18,
                padding: "10px 14px",
                borderRadius: 10,
                background: dark ? "rgba(255,255,255,0.04)" : t.cardBg2,
                border: `1px solid ${t.border}`,
                fontSize: 12.5,
                color: t.textMuted,
                wordBreak: "break-all",
              }}
            >
              Code: {batchNumber}
            </div>
          )}
        </div>
      </>
    );
  }

  const verified = Boolean(data?.verified);
  const batch = data?.batch || {};
  const events = Array.isArray(data?.events) ? data.events : [];

  const badgeBg = verified ? t.successMuted : t.riskBg;
  const badgeBorder = verified
    ? "rgba(34,197,94,0.28)"
    : t.riskBorder;
  const badgeColor = verified ? t.success : t.risk;

  const infoRows = [
    { label: "Supplier", value: batch.supplier_name },
    { label: "Batch number", value: batch.batch_number || batchNumber },
    { label: "Part type", value: batch.part_type },
    { label: "Received", value: formatDate(batch.received_date) },
  ];

  return shell(
    <>
      {brandHeader}

      <div
        className="pv-badge"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "18px 20px",
          borderRadius: 14,
          background: badgeBg,
          border: `1px solid ${badgeBorder}`,
          color: badgeColor,
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: -0.3,
          marginBottom: 16,
          animation: "pvFadeUp .35s ease",
        }}
        role="status"
      >
        <span aria-hidden="true">{verified ? "✓" : "⚠"}</span>
        <span>{verified ? "Verified" : "Tampered / Unverified"}</span>
      </div>

      <div
        className="pv-card"
        style={{
          background: t.cardBg,
          borderRadius: 16,
          border: `1px solid ${t.border}`,
          padding: 28,
          boxShadow: dark ? "0 24px 60px rgba(0,0,0,0.4)" : t.cardShadow,
          animation: "pvFadeUp .4s ease .05s both",
        }}
      >
        <h1
          className="pv-title font-display"
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: t.textPrimary,
            letterSpacing: -0.5,
            margin: "0 0 6px",
          }}
        >
          Batch details
        </h1>
        <p style={{ fontSize: 13.5, color: t.textMuted, margin: "0 0 20px", lineHeight: 1.5 }}>
          {verified
            ? "This part’s chain of custody matches the on-chain record."
            : "The latest record does not match the blockchain hash."}
        </p>

        <div
          style={{
            display: "grid",
            gap: 0,
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            overflow: "hidden",
            marginBottom: 28,
          }}
        >
          {infoRows.map((row, i) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                padding: "12px 14px",
                background:
                  i % 2 === 0
                    ? "transparent"
                    : dark
                      ? "rgba(255,255,255,0.03)"
                      : t.cardBg2,
                borderTop: i === 0 ? "none" : `1px solid ${t.borderSub || t.border}`,
              }}
            >
              <span style={{ fontSize: 13, color: t.textMuted, flexShrink: 0 }}>
                {row.label}
              </span>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: t.textPrimary,
                  textAlign: "right",
                  wordBreak: "break-word",
                }}
              >
                {row.value || "—"}
              </span>
            </div>
          ))}
        </div>

        <h2
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: t.textPrimary,
            margin: "0 0 16px",
            letterSpacing: -0.2,
          }}
        >
          Event history
        </h2>

        {events.length === 0 ? (
          <div
            style={{
              padding: "16px 14px",
              borderRadius: 12,
              border: `1px dashed ${t.border}`,
              fontSize: 13.5,
              color: t.textMuted,
              textAlign: "center",
            }}
          >
            No events recorded for this batch yet.
          </div>
        ) : (
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {events.map((event, index) => {
              const isLast = index === events.length - 1;
              const label = formatEventType(event.event_type);
              const isInstall = String(event.event_type || "").toLowerCase() === "installed";
              const dotColor = isInstall ? t.accent : t.success;

              return (
                <li
                  key={`${event.timestamp || index}-${label}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "20px 1fr",
                    gap: 14,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: dotColor,
                        marginTop: 4,
                        boxShadow: `0 0 0 4px ${
                          isInstall ? t.accentGlow : t.successMuted
                        }`,
                        flexShrink: 0,
                      }}
                    />
                    {!isLast && (
                      <div
                        style={{
                          width: 2,
                          flex: 1,
                          minHeight: 28,
                          background: t.border,
                          marginTop: 6,
                          marginBottom: 2,
                        }}
                      />
                    )}
                  </div>

                  <div style={{ paddingBottom: isLast ? 0 : 22 }}>
                    <div
                      style={{
                        fontSize: 14.5,
                        fontWeight: 700,
                        color: t.textPrimary,
                        letterSpacing: -0.2,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: t.textMuted,
                        marginTop: 4,
                      }}
                    >
                      {formatDate(event.timestamp)}
                    </div>
                    {(event.location || event.repair_id) && (
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        {event.location && (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: t.textSecondary,
                              background: dark
                                ? "rgba(255,255,255,0.04)"
                                : t.cardBg2,
                              border: `1px solid ${t.border}`,
                              borderRadius: 8,
                              padding: "4px 8px",
                            }}
                          >
                            {event.location}
                          </span>
                        )}
                        {event.repair_id && (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: t.textSecondary,
                              background: dark
                                ? "rgba(255,255,255,0.04)"
                                : t.cardBg2,
                              border: `1px solid ${t.border}`,
                              borderRadius: 8,
                              padding: "4px 8px",
                              wordBreak: "break-all",
                            }}
                          >
                            Booking {event.repair_id}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <p
        style={{
          textAlign: "center",
          fontSize: 12,
          color: t.textMuted,
          marginTop: 24,
          lineHeight: 1.5,
        }}
      >
        Powered by {BUSINESS_NAME} · Parts authenticity
      </p>
    </>
  );
}
