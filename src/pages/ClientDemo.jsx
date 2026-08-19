/**

 * Lightweight public demo surface — Gemini / Material 3 chrome

 * (matches owner portal). Cyan logo/widget branding stays on

 * /slippygoalz-widget.html only.

 */

import { BUSINESS_NAME, BUSINESS_TAGLINE } from "../constants/brand";

import { BrandSparkle } from "../components/icons";

import { useTheme } from "../context/ThemeContext";



export default function ClientDemo() {

  const { theme: t } = useTheme();



  return (

    <div

      className="glow-ambient"

      style={{

        minHeight: "100vh",

        background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${t.accentGlow}, transparent), ${t.pageBg}`,

        fontFamily: 'var(--font-sans), "Google Sans Flex", system-ui, -apple-system, sans-serif',

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        padding: 24,

      }}

    >

      <div

        className="ds-card-enter"

        style={{

          maxWidth: 420,

          width: "100%",

          padding: "28px 24px",

          borderRadius: t.cardRadius ?? 32,

          background: t.cardBg,

          border: `1px solid ${t.border}`,

          borderTop: `1px solid ${t.borderTopHighlight}`,

          boxShadow: t.cardShadow,

        }}

      >

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

          <div

            style={{

              width: 44,

              height: 44,

              borderRadius: 9999,

              background: t.name === "dark" ? "rgba(168,199,250,0.14)" : "#E8F0FE",

              border: "none",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              boxShadow: "none",

              flexShrink: 0,

            }}

          >

            <BrandSparkle size={20} color={t.accent} />

          </div>

          <div>

            <div className="font-display" style={{ fontSize: 16, fontWeight: 500, color: t.textPrimary, letterSpacing: -0.2 }}>

              {BUSINESS_NAME}

            </div>

            <div style={{ fontSize: 13, color: t.textMuted, marginTop: 3 }}>

              {BUSINESS_TAGLINE}

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}


