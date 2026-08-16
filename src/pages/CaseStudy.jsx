/**
 * Public product case study — walks Login → Settings with live screenshots.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BUSINESS_NAME,
  BUSINESS_SUBTITLE,
  BRAND_ACCENT,
  BRAND_ACCENT_HOVER,
  BRAND_SOFT_BG,
} from "../constants/brand";

const SECTIONS = [
  {
    id: "login",
    step: "01",
    route: "/login",
    title: "Login",
    image: "/case-study/01-login.png",
    summary: "Secure owner access with a calm, branded entry point.",
    body: "The login page introduces Slippy Goalz as an AI-powered repair shop workspace. Owners see the product story on the left — booking assistant, scheduling, invoices, CRM, and analytics — then sign in on the right with secure authentication, lockout protection, and encrypted sessions.",
    highlights: [
      "Brand-led split layout with clear product pitch",
      "Username / password with show-password and rate limiting",
      "Trust signals: secure auth, encryption, enterprise protection",
    ],
  },
  {
    id: "dashboard",
    step: "02",
    route: "/",
    title: "Dashboard",
    image: "/case-study/02-dashboard.png",
    summary: "The daily command center for shop health.",
    body: "After sign-in, owners land on the dashboard: today’s bookings, cash on hand, unpaid invoices, and an AI briefing that surfaces what matters. Date ranges (Today → All Time) keep the view scoped, while charts and recent activity turn raw jobs into a readable pulse of the business.",
    highlights: [
      "KPI strip for bookings, cash, and unpaid invoices",
      "AI briefing with demand and capacity cues",
      "Trend charts, job-status mix, and recent activity",
    ],
  },
  {
    id: "bookings",
    step: "03",
    route: "/bookings",
    title: "Bookings",
    image: "/case-study/03-bookings.png",
    summary: "End-to-end repair appointment workflow.",
    body: "Bookings is where appointments live — from pending request to completed job. Owners filter by status, search customers, confirm or reject requests, and open a detail drawer with customer, appointment, payment, notes, and AI suggestions.",
    highlights: [
      "Status filters: Pending, Confirmed, Completed, Rejected",
      "KPI cards for today’s volume, revenue, and VIP customers",
      "Add / export actions plus deep booking detail sheets",
    ],
  },
  {
    id: "invoices",
    step: "04",
    route: "/invoices",
    title: "Invoices",
    image: "/case-study/04-invoices.png",
    summary: "Billing and payment tracking without spreadsheet chaos.",
    body: "Invoices ties completed repairs to money. Owners track paid vs unpaid balances, preview or download PDFs, mark invoices paid, and send them to customers — so every repair has a clear financial trail.",
    highlights: [
      "Outstanding balances and payment status at a glance",
      "PDF preview, download, send, and mark-paid actions",
      "Customer and repair context inside each invoice drawer",
    ],
  },
  {
    id: "cash",
    step: "05",
    route: "/cash",
    title: "Cash Ledger",
    image: "/case-study/05-cash.png",
    summary: "Every cash movement logged in one place.",
    body: "The cash ledger records cash-ins, expenses, and payouts across the shop floor. Quick entry keeps the till honest; each entry carries notes, links, and an audit trail so owners always know where cash went.",
    highlights: [
      "Quick entry for cash in, expense, and payout",
      "Timeline and AI summary on each ledger item",
      "Attachments and linked bookings when available",
    ],
  },
  {
    id: "slots",
    step: "06",
    route: "/slots",
    title: "Slots",
    image: "/case-study/06-slots.png",
    summary: "Technician capacity planned like a real schedule.",
    body: "Slots controls when the shop can take work. Owners add slots, block time, open extras, copy schedules, and edit capacity — balancing demand against available technicians so overbooking stays rare.",
    highlights: [
      "Calendar and list views of availability",
      "Add, block, open extra, copy, and capacity tools",
      "Demand heat cues for high / medium / low utilization",
    ],
  },
  {
    id: "leads",
    step: "08",
    route: "/leads",
    title: "Leads",
    image: "/case-study/08-leads.png",
    summary: "Potential customers captured by the AI assistant.",
    body: "Leads collects people who inquired but have not booked yet. The AI assistant funnels WhatsApp and channel conversations into a pipeline owners can follow up, convert, or dismiss — so interest never disappears into chat history.",
    highlights: [
      "AI-collected prospects ready for follow-up",
      "Channel-aware lead context",
      "Convert interest into bookings without losing the thread",
    ],
  },
  {
    id: "waitlist",
    step: "09",
    route: "/waitlist",
    title: "Waitlist",
    image: "/case-study/09-waitlist.png",
    summary: "Customers waiting for the next open repair slot.",
    body: "When the calendar is full, Waitlist holds demand. Priority scoring, estimated availability, and conversation history help owners decide who to notify first when a slot opens.",
    highlights: [
      "Priority score and reason for each waiting customer",
      "Estimated availability cues",
      "History and quick actions to book when capacity frees",
    ],
  },
  {
    id: "chats",
    step: "10",
    route: "/chats",
    title: "Chats",
    image: "/case-study/10-chats.png",
    summary: "Live oversight of AI customer conversations.",
    body: "Chats is the owner’s window into every AI conversation. Monitor tone, catch escalations early, and jump into context when a human needs to take over — without leaving the portal.",
    highlights: [
      "Real-time conversation monitoring",
      "Session list with customer context",
      "Handoff-ready when the assistant needs a human",
    ],
  },
  {
    id: "analytics",
    step: "11",
    route: "/analytics",
    title: "Analytics",
    image: "/case-study/11-analytics.png",
    summary: "Performance insights across money, demand, and ops.",
    body: "Analytics turns shop data into decisions: executive summary, AI business insights, revenue sources, booking conversion, customer value, service mix, capacity leakage, peak demand, and light predictions for what tomorrow may look like.",
    highlights: [
      "Executive summary and AI insights",
      "Revenue, bookings, customers, and services breakdowns",
      "Operational load, peaks, and forward-looking cues",
    ],
  },
  {
    id: "audit",
    step: "12",
    route: "/audit",
    title: "Audit Log",
    image: "/case-study/12-audit.png",
    summary: "A chronological trail of important shop actions.",
    body: "Audit Log records meaningful actions across the workspace — who changed what, and when. It supports accountability for staff, billing disputes, and security reviews without digging through chat or memory.",
    highlights: [
      "Immutable-feeling action history",
      "Filterable trail of shop operations",
      "Accountability for bookings, money, and access changes",
    ],
  },
  {
    id: "security",
    step: "13",
    route: "/security",
    title: "Security",
    image: "/case-study/13-security.png",
    summary: "Account protection without slowing the floor.",
    body: "Security covers health overview, AI security review, authentication options, active sessions, preferences like Quick PIN and auto-logout, and recent security activity — so the owner portal stays locked down while remaining usable mid-shift.",
    highlights: [
      "Security health score and AI review",
      "Sessions, PIN, timeouts, and login alerts",
      "Recent lock / unlock / sign-in activity",
    ],
  },
  {
    id: "settings",
    step: "14",
    route: "/settings",
    title: "Settings",
    image: "/case-study/14-settings.png",
    summary: "Configure the shop, AI, and account preferences.",
    body: "Settings is the control room: language and timezone, business profile, AI assistant behaviour, booking prices, invoices, notifications, team invites, PIN and password, channel integrations, appearance, billing, exports, and support. Everything that shapes how Slippy Goalz runs for this shop lives here.",
    highlights: [
      "General, business profile, and AI assistant controls",
      "Bookings, invoices, notifications, and team access",
      "Integrations, theme, billing, backup, and support links",
    ],
  },
];

function useScrollSpy(ids) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(`cs-${id}`))
      .filter(Boolean);
    if (!nodes.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActive(visible[0].target.id.replace(/^cs-/, ""));
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.35, 0.55] }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

export default function CaseStudy() {
  const ids = useMemo(() => SECTIONS.map((s) => s.id), []);
  const active = useScrollSpy(ids);

  return (
    <div className="case-study">
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Syne:wght@600;700&display=swap");

        .case-study {
          --cs-bg: #F7F8FA;
          --cs-surface: #FFFFFF;
          --cs-elevated: #EEF0F4;
          --cs-border: rgba(15,17,21,0.10);
          --cs-text: #111827;
          --cs-muted: #5C6370;
          --cs-faint: #8B929E;
          --cs-accent: ${BRAND_ACCENT};
          --cs-accent-hover: ${BRAND_ACCENT_HOVER};
          --cs-soft: ${BRAND_SOFT_BG};
          --cs-font: "Manrope", system-ui, sans-serif;
          --cs-display: "Syne", system-ui, sans-serif;

          min-height: 100vh;
          background: var(--cs-bg);
          color: var(--cs-text);
          font-family: var(--cs-font);
          font-size: 15px;
          line-height: 1.55;
        }

        .case-study * { box-sizing: border-box; }

        .cs-hero {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 32px clamp(20px, 5vw, 64px) 56px;
          overflow: hidden;
          background:
            radial-gradient(ellipse 70% 55% at 72% 18%, rgba(244,63,94,0.14), transparent 58%),
            radial-gradient(ellipse 45% 35% at 8% 88%, rgba(244,63,94,0.06), transparent 55%),
            linear-gradient(165deg, #FFFFFF 0%, #F3F5F8 48%, #ECEFF4 100%);
        }

        .cs-hero-media {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .cs-hero-media img {
          position: absolute;
          right: -2%;
          top: 6%;
          width: min(64vw, 860px);
          border-radius: 16px;
          border: 1px solid var(--cs-border);
          opacity: 0.92;
          box-shadow: none;
          transform: perspective(1400px) rotateY(-9deg) rotateX(3deg) translateY(0);
          mask-image: linear-gradient(90deg, transparent 0%, #000 22%, #000 85%, transparent 100%),
            linear-gradient(180deg, #000 62%, transparent 100%);
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 22%, #000 85%, transparent 100%),
            linear-gradient(180deg, #000 62%, transparent 100%);
          mask-composite: intersect;
          -webkit-mask-composite: source-in;
        }

        .cs-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 640px;
        }

        .cs-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
        }

        .cs-brand-mark {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--cs-accent);
          color: #fff;
          display: grid;
          place-items: center;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: -0.02em;
        }

        .cs-brand-name {
          font-family: var(--cs-display);
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .cs-brand-sub {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--cs-muted);
          margin-top: 4px;
        }

        .cs-hero h1 {
          margin: 0 0 16px;
          font-family: var(--cs-display);
          font-size: clamp(36px, 5.5vw, 56px);
          font-weight: 600;
          letter-spacing: -0.03em;
          line-height: 1.08;
        }

        .cs-hero p.lead {
          margin: 0 0 28px;
          color: var(--cs-muted);
          font-size: 17px;
          max-width: 42ch;
        }

        .cs-cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .cs-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          border: 1px solid transparent;
          font-family: var(--cs-font);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
        }

        .cs-btn-primary {
          background: var(--cs-accent);
          color: #fff;
        }
        .cs-btn-primary:hover { background: var(--cs-accent-hover); }

        .cs-btn-ghost {
          background: transparent;
          color: var(--cs-text);
          border-color: var(--cs-border);
        }
        .cs-btn-ghost:hover { border-color: rgba(255,255,255,0.22); }

        .cs-layout {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 0;
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 clamp(16px, 4vw, 40px) 96px;
        }

        .cs-toc {
          position: sticky;
          top: 24px;
          align-self: start;
          padding: 48px 16px 24px 0;
          max-height: calc(100vh - 48px);
          overflow: auto;
        }

        .cs-toc-label {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--cs-faint);
          margin-bottom: 14px;
          padding-left: 10px;
        }

        .cs-toc a {
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          color: var(--cs-muted);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          border-left: 2px solid transparent;
        }

        .cs-toc a:hover { color: var(--cs-text); background: rgba(15,17,21,0.03); }

        .cs-toc a.active {
          color: var(--cs-text);
          border-left-color: var(--cs-accent);
          background: var(--cs-soft);
        }

        .cs-toc .n {
          font-variant-numeric: tabular-nums;
          color: var(--cs-faint);
          font-size: 11px;
          min-width: 18px;
        }

        .cs-main { padding-top: 40px; min-width: 0; }

        .cs-intro {
          padding: 24px 0 48px;
          border-bottom: 1px solid var(--cs-border);
          margin-bottom: 8px;
        }

        .cs-intro h2 {
          margin: 0 0 10px;
          font-family: var(--cs-display);
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .cs-intro p { margin: 0; color: var(--cs-muted); max-width: 62ch; }

        .cs-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 20px;
          margin-top: 20px;
          font-size: 13px;
          color: var(--cs-faint);
        }

        .cs-meta strong { color: var(--cs-muted); font-weight: 600; }

        .cs-section {
          padding: 56px 0;
          border-bottom: 1px solid var(--cs-border);
          scroll-margin-top: 24px;
        }

        .cs-section:last-child { border-bottom: none; }

        .cs-kicker {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          color: var(--cs-accent);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .cs-kicker span.route {
          color: var(--cs-faint);
          font-weight: 500;
          letter-spacing: 0;
          text-transform: none;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
        }

        .cs-section h3 {
          margin: 0 0 10px;
          font-family: var(--cs-display);
          font-size: clamp(26px, 3vw, 34px);
          font-weight: 600;
          letter-spacing: -0.025em;
          line-height: 1.15;
        }

        .cs-section .summary {
          margin: 0 0 16px;
          color: var(--cs-text);
          font-size: 17px;
          font-weight: 500;
          max-width: 48ch;
        }

        .cs-section .body {
          margin: 0 0 20px;
          color: var(--cs-muted);
          max-width: 62ch;
        }

        .cs-points {
          list-style: none;
          margin: 0 0 28px;
          padding: 0;
          display: grid;
          gap: 8px;
          max-width: 560px;
        }

        .cs-points li {
          position: relative;
          padding-left: 16px;
          color: var(--cs-muted);
          font-size: 14px;
        }

        .cs-points li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0.55em;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--cs-accent);
        }

        .cs-frame {
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--cs-border);
          background: var(--cs-surface);
        }

        .cs-frame-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          background: var(--cs-elevated);
          border-bottom: 1px solid var(--cs-border);
        }

        .cs-frame-bar i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(15,17,21,0.16);
          display: block;
        }

        .cs-frame-bar span {
          margin-left: 8px;
          font-size: 11px;
          color: var(--cs-faint);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .cs-frame img {
          display: block;
          width: 100%;
          height: auto;
          background: #fff;
        }

        .cs-footer {
          max-width: 1180px;
          margin: 0 auto;
          padding: 48px clamp(16px, 4vw, 40px) 80px;
          border-top: 1px solid var(--cs-border);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .cs-footer p {
          margin: 0;
          color: var(--cs-muted);
          max-width: 42ch;
        }

        @media (max-width: 900px) {
          .cs-layout { grid-template-columns: 1fr; }
          .cs-toc { display: none; }
          .cs-hero-media img {
            opacity: 0.35;
            right: -18%;
            width: 92vw;
            transform: none;
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .cs-hero-inner {
            animation: cs-rise 700ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
          }
          .cs-hero-media img {
            animation: cs-float 900ms cubic-bezier(0.22, 0.61, 0.36, 1) 120ms both;
          }
        }

        @keyframes cs-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes cs-float {
          from { opacity: 0; transform: perspective(1400px) rotateY(-9deg) rotateX(3deg) translateY(20px); }
          to { opacity: 0.92; transform: perspective(1400px) rotateY(-9deg) rotateX(3deg); }
        }
      `}</style>

      <header className="cs-hero">
        <div className="cs-hero-media" aria-hidden>
          <img src="/case-study/02-dashboard.png" alt="" />
        </div>
        <div className="cs-hero-inner">
          <div className="cs-brand">
            <div className="cs-brand-mark">W</div>
            <div>
              <div className="cs-brand-name">{BUSINESS_NAME}</div>
              <div className="cs-brand-sub">{BUSINESS_SUBTITLE}</div>
            </div>
          </div>
          <h1>Owner portal case study</h1>
          <p className="lead">
            A page-by-page walkthrough of the Slippy Goalz repair-shop dashboard —
            from secure login to full workspace settings.
          </p>
          <div className="cs-cta-row">
            <a className="cs-btn cs-btn-primary" href="#cs-login">
              Start walkthrough
            </a>
            <a className="cs-btn cs-btn-ghost" href="/login">
              Open live portal
            </a>
          </div>
        </div>
      </header>

      <div className="cs-layout">
        <nav className="cs-toc" aria-label="Page outline">
          <div className="cs-toc-label">Pages</div>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#cs-${s.id}`}
              className={active === s.id ? "active" : undefined}
            >
              <span className="n">{s.step}</span>
              {s.title}
            </a>
          ))}
        </nav>

        <div className="cs-main">
          <div className="cs-intro">
            <h2>Product walkthrough</h2>
            <p>
              Slippy Goalz is an AI-assisted owner portal for a mobile repair shop.
              Operations (bookings, money, capacity), pipeline (leads, waitlist,
              chats), and system (analytics, audit, security, settings) sit in
              one workspace so the owner can run the floor without juggling apps.
            </p>
            <div className="cs-meta">
              <span>
                <strong>Product</strong> · Owner portal
              </span>
              <span>
                <strong>Pages</strong> · {SECTIONS.length} screens
              </span>
              <span>
                <strong>Path</strong> · Login → Settings
              </span>
            </div>
          </div>

          {SECTIONS.map((s) => (
            <section key={s.id} id={`cs-${s.id}`} className="cs-section">
              <div className="cs-kicker">
                <span>Step {s.step}</span>
                <span className="route">{s.route}</span>
              </div>
              <h3>{s.title}</h3>
              <p className="summary">{s.summary}</p>
              <p className="body">{s.body}</p>
              <ul className="cs-points">
                {s.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <figure className="cs-frame">
                <div className="cs-frame-bar">
                  <i />
                  <i />
                  <i />
                  <span>
                    slippygoalz · {s.route === "/" ? "dashboard" : s.route.replace(/^\//, "")}
                  </span>
                </div>
                <img src={s.image} alt={`${s.title} screen in the Slippy Goalz owner portal`} loading="lazy" />
              </figure>
            </section>
          ))}
        </div>
      </div>

      <footer className="cs-footer">
        <p>
          Built for {BUSINESS_NAME} — a calm control center for bookings,
          money, AI conversations, and shop security.
        </p>
        <a className="cs-btn cs-btn-primary" href="/login">
          Sign in to portal
        </a>
      </footer>
    </div>
  );
}
