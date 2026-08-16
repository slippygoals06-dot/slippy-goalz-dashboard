import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { BUSINESS_NAME } from "../constants/brand";
import {
  toApiPayload,
  PAYMENT_MODES,
  HEARD_FROM_OPTIONS,
  joinName,
  clampPlayers,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from "../utils/bookingFields";
import { API_URL as API } from "../config";

function formatDateLabel(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatDateParts(iso) {
  if (!iso) return { day: "", date: "" };
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return { day: "", date: formatDateLabel(iso) };
  return {
    day: d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase(),
    date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase(),
  };
}

function networkErrorMessage(err) {
  const msg = String(err?.message || "");
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return "Couldn't reach the server. Please check your connection and try again.";
  }
  return msg || "Something went wrong. Please try again.";
}

function bookingPalette(dark) {
  if (dark) {
    return {
      page: "#0B0B0C",
      header: "#0B0B0C",
      form: "#111112",
      input: "#181819",
      text: "#F4F4F5",
      secondary: "#A1A1AA",
      muted: "#71717A",
      border: "#27272A",
      accent: "#F43F5E",
      accentHover: "#FB7185",
      accentSoft: "rgba(244,63,94,0.10)",
      errorBg: "rgba(244,63,94,0.08)",
      errorText: "#FCA5A5",
      noticeBg: "#181819",
    };
  }
  return {
    page: "#F7F7F8",
    header: "#FFFFFF",
    form: "#FFFFFF",
    input: "#FAFAFA",
    text: "#18181B",
    secondary: "#52525B",
    muted: "#71717A",
    border: "#E4E4E7",
    accent: "#E93656",
    accentHover: "#F43F5E",
    accentSoft: "rgba(233,54,86,0.08)",
    errorBg: "rgba(233,54,86,0.08)",
    errorText: "#BE123C",
    noticeBg: "#FAFAFA",
  };
}

export default function PublicBooking() {
  const { dark, toggle } = useTheme();
  const c = bookingPalette(dark);

  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsError, setSlotsError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    players: MAX_PLAYERS,
    paymentMode: "Cash",
    heardFrom: "",
    heardFromOther: "",
    date: "",
    time: "",
  });
  const [playersDraft, setPlayersDraft] = useState(String(MAX_PLAYERS));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function loadSlots() {
      try {
        const res = await fetch(`${API}/slots/`);
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayKey = [
          today.getFullYear(),
          String(today.getMonth() + 1).padStart(2, "0"),
          String(today.getDate()).padStart(2, "0"),
        ].join("-");
        const remote = Array.isArray(data)
          ? data.filter((s) => s.Status === "Available" && s.Date && String(s.Date) >= todayKey)
          : [];
        setSlots(remote);
      } catch {
        setSlotsError("Couldn't load live availability.");
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, []);

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function applyPlayers(raw) {
    const next = clampPlayers(raw);
    handleChange("players", next);
    setPlayersDraft(String(next));
    return next;
  }

  const slotsByDate = {};
  slots.forEach((s) => {
    if (!s.Date) return;
    (slotsByDate[s.Date] ||= []).push(s.Time);
  });
  const availableDates = Object.keys(slotsByDate).sort();
  const timesForDate = form.date ? (slotsByDate[form.date] || []).slice().sort() : [];

  function validate() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Please enter your first and last name.");
      return false;
    }
    if (!form.phone.trim()) {
      setError("Please enter your phone number.");
      return false;
    }
    const players = clampPlayers(form.players);
    if (!players) {
      setError(`Please choose between ${MIN_PLAYERS} and ${MAX_PLAYERS} players.`);
      return false;
    }
    if (!form.date || !form.time) {
      setError("Please choose a booking date and time.");
      return false;
    }
    if (!form.paymentMode) {
      setError("Please choose a payment mode.");
      return false;
    }
    if (!form.heardFrom) {
      setError("Please tell us where you heard about us.");
      return false;
    }
    if (form.heardFrom === "Other" && !form.heardFromOther.trim()) {
      setError("Please tell us where you heard about us.");
      return false;
    }
    setError("");
    return true;
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!validate()) return;
    setSubmitting(true);
    setError("");

    const booking = toApiPayload({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      players: clampPlayers(form.players),
      paymentMode: form.paymentMode,
      paymentStatus: "Unpaid",
      date: form.date,
      time: form.time,
      notes: null,
      status: "Pending",
      source:
        form.heardFrom === "Other"
          ? form.heardFromOther.trim().slice(0, 40)
          : form.heardFrom,
    });

    try {
      const res = await fetch(`${API}/bookings/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(booking),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = typeof err.detail === "string" ? err.detail : null;
        if (res.status === 409) {
          throw new Error(detail || "This slot is no longer available, please choose another.");
        }
        if (res.status === 400) {
          throw new Error(detail || "Please check your phone number and try again.");
        }
        throw new Error(detail || `Server returned ${res.status}`);
      }
      setDone(true);
    } catch (err) {
      setError(networkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%",
    height: 54,
    padding: "0 16px",
    borderRadius: 10,
    background: c.input,
    border: `1px solid ${c.border}`,
    color: c.text,
    fontSize: 15,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color 180ms ease, background-color 180ms ease",
  };
  const label = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: c.secondary,
    marginBottom: 8,
  };
  const sectionTitle = {
    fontSize: 17,
    fontWeight: 600,
    color: c.text,
    letterSpacing: -0.2,
    margin: 0,
  };
  const sectionHint = {
    margin: "6px 0 0",
    fontSize: 13,
    color: c.muted,
    lineHeight: 1.45,
  };

  if (done) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: c.page,
          color: c.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "inherit",
          transition: "background-color 180ms ease, color 180ms ease",
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: "100%",
            background: c.form,
            border: `1px solid ${c.border}`,
            borderRadius: 16,
            padding: "32px 28px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 10, letterSpacing: -0.4 }}>
            Booking sent
          </div>
          <p style={{ margin: 0, color: c.secondary, lineHeight: 1.55, fontSize: 14 }}>
            Thanks {joinName(form.firstName, form.lastName)}. Your booking for{" "}
            <span style={{ color: c.text, fontWeight: 500 }}>{formatDateLabel(form.date)}</span> at{" "}
            <span style={{ color: c.text, fontWeight: 500 }}>{form.time}</span> for{" "}
            <span style={{ color: c.text, fontWeight: 500 }}>{clampPlayers(form.players)} players</span> is
            with the {BUSINESS_NAME} team. We'll confirm shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="pb-page"
      style={{
        minHeight: "100vh",
        background: c.page,
        color: c.text,
        fontFamily: "inherit",
        transition: "background-color 180ms ease, color 180ms ease",
      }}
    >
      <style>{`
        .pb-page,
        .pb-page *,
        .pb-page *::before,
        .pb-page *::after {
          box-sizing: border-box;
        }
        .pb-page {
          overflow-x: hidden;
        }
        .pb-form {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
        }
        .pb-form section,
        .pb-form .pb-grid,
        .pb-form .pb-dt-dates,
        .pb-form .pb-dt-times {
          min-width: 0;
          max-width: 100%;
        }
        .pb-page input,
        .pb-page select,
        .pb-page button {
          max-width: 100%;
        }
        .pb-page input::placeholder,
        .pb-page textarea::placeholder {
          color: ${c.muted};
        }
        .pb-page input:focus,
        .pb-page select:focus {
          border-color: ${c.accent} !important;
        }
        .pb-range {
          -webkit-appearance: none;
          appearance: none;
          display: block;
          width: 100%;
          max-width: 100%;
          height: 4px;
          border-radius: 999px;
          background: ${c.border};
          outline: none;
          margin: 4px 0 0;
        }
        .pb-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${c.accent};
          border: 0;
          cursor: pointer;
          transition: transform 150ms ease;
        }
        .pb-range::-webkit-slider-thumb:hover {
          transform: scale(1.08);
        }
        .pb-range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${c.accent};
          border: 0;
          cursor: pointer;
        }
        .pb-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 16px;
          width: 100%;
        }
        .pb-grid > * {
          min-width: 0;
        }
        .pb-submit:hover:not(:disabled) {
          background: ${c.accentHover} !important;
        }
        .pb-submit:active:not(:disabled) {
          transform: scale(0.985);
        }
        .pb-theme:hover {
          border-color: ${c.secondary} !important;
        }
        .pb-pay, .pb-date-card, .pb-time-slot {
          transition: border-color 180ms ease, background-color 180ms ease, color 180ms ease;
        }
        .pb-date-card:focus-visible,
        .pb-time-slot:focus-visible {
          outline: 2px solid ${c.accent};
          outline-offset: 2px;
        }
        .pb-date-card:hover:not([aria-pressed="true"]) {
          border-color: ${dark ? "#3F3F46" : "#D4D4D8"} !important;
          background: ${dark ? "#1A1A1C" : "#FAFAFA"} !important;
        }
        .pb-time-slot:hover:not([aria-pressed="true"]) {
          border-color: ${dark ? "#3F3F46" : "#D4D4D8"} !important;
          background: ${dark ? "#1A1A1C" : "#FAFAFA"} !important;
        }
        .pb-dt-dates {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
        }
        .pb-dt-times {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
        }
        .pb-date-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          min-height: 74px;
          min-width: 0;
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
        }
        .pb-time-slot {
          height: 46px;
          min-width: 0;
          width: 100%;
          padding: 0 10px;
          border-radius: 10px;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
        }
        .pb-skel {
          border-radius: 10px;
          background: ${dark ? "#1A1A1C" : "#F4F4F5"};
          animation: pb-skel 1.2s ease infinite;
        }
        @keyframes pb-skel {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @media (max-width: 1099px) {
          .pb-dt-dates { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .pb-dt-times { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        @media (max-width: 767px) {
          .pb-dt-dates {
            display: flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            gap: 10px;
            padding-bottom: 2px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .pb-dt-dates::-webkit-scrollbar { height: 0; }
          .pb-date-card,
          .pb-skel-date {
            flex: 0 0 112px;
            width: 112px;
          }
          .pb-dt-times { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 420px) {
          .pb-dt-times { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 1024px) {
          .pb-intro-title { font-size: 36px !important; }
        }
        @media (max-width: 768px) {
          .pb-intro-title { font-size: 32px !important; }
          .pb-form { padding: 20px 16px !important; }
          .pb-page main { padding: 28px 16px 48px !important; }
          .pb-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
          .pb-intro-title { font-size: 28px !important; }
          .pb-header-inner { padding: 0 16px !important; }
        }
      `}</style>

      <header
        style={{
          background: c.header,
          borderBottom: `1px solid ${c.border}`,
          transition: "background-color 180ms ease, border-color 180ms ease",
        }}
      >
        <div
          className="pb-header-inner"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 32px",
            height: 64,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 1.4,
              color: c.text,
              textTransform: "uppercase",
            }}
          >
            {BUSINESS_NAME}
          </div>
          <button
            type="button"
            className="pb-theme"
            onClick={toggle}
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 36,
              padding: "0 12px",
              border: `1px solid ${c.border}`,
              background: "transparent",
              color: c.secondary,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
              transition: "border-color 180ms ease, color 180ms ease",
            }}
          >
            {dark ? <Sun size={14} strokeWidth={1.75} /> : <Moon size={14} strokeWidth={1.75} />}
            {dark ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1120, width: "100%", margin: "0 auto", padding: "40px 32px 64px", minWidth: 0 }}>
        <div style={{ maxWidth: 680, width: "100%", margin: "0 auto", minWidth: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 1.6,
                color: c.accent,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Book a pitch
            </div>
            <h1
              className="pb-intro-title"
              style={{
                margin: 0,
                fontSize: 44,
                fontWeight: 600,
                letterSpacing: -1.2,
                lineHeight: 1.15,
                color: c.text,
              }}
            >
              Reserve your game
            </h1>
            <p
              style={{
                margin: "12px auto 0",
                maxWidth: 420,
                color: c.secondary,
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Choose your players, pick a time, and send your booking. We'll confirm soon.
            </p>
          </div>

          <form
            className="pb-form"
            onSubmit={handleSubmit}
            style={{
              background: c.form,
              border: `1px solid ${c.border}`,
              borderRadius: 16,
              padding: "28px 28px 24px",
              display: "grid",
              gap: 32,
              width: "100%",
              minWidth: 0,
              overflow: "hidden",
              transition: "background-color 180ms ease, border-color 180ms ease",
            }}
          >
            <section>
              <h2 style={sectionTitle}>Your details</h2>
              <div className="pb-grid" style={{ marginTop: 16 }}>
                <div>
                  <label style={label}>First name *</label>
                  <input
                    style={inputStyle}
                    value={form.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    placeholder="Ali"
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label style={label}>Last name *</label>
                  <input
                    style={inputStyle}
                    value={form.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    placeholder="Hassan"
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={label}>Phone number *</label>
                <input
                  style={inputStyle}
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+92 3xx xxxxxxx"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={label}>Where did you hear about us? *</label>
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={form.heardFrom}
                  onChange={(e) => handleChange("heardFrom", e.target.value)}
                >
                  <option value="">Select one</option>
                  {HEARD_FROM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              {form.heardFrom === "Other" && (
                <div style={{ marginTop: 16 }}>
                  <label style={label}>Tell us where *</label>
                  <input
                    style={inputStyle}
                    value={form.heardFromOther}
                    onChange={(e) => handleChange("heardFromOther", e.target.value.slice(0, 40))}
                    placeholder="e.g. YouTube, poster, event"
                    maxLength={40}
                  />
                </div>
              )}
            </section>

            <section>
              <h2 style={sectionTitle}>Players</h2>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, color: c.muted, marginBottom: 4 }}>Selected</div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 600,
                    letterSpacing: -0.8,
                    lineHeight: 1.1,
                    color: c.text,
                    marginBottom: 16,
                  }}
                >
                  {clampPlayers(form.players)}
                  <span style={{ fontSize: 16, fontWeight: 500, color: c.muted, marginLeft: 6 }}>
                    / {MAX_PLAYERS}
                  </span>
                </div>
                <input
                  className="pb-range"
                  type="range"
                  min={MIN_PLAYERS}
                  max={MAX_PLAYERS}
                  step={1}
                  value={clampPlayers(form.players)}
                  onChange={(e) => applyPlayers(e.target.value)}
                  aria-label="Players slider"
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: c.muted,
                    marginTop: 8,
                  }}
                >
                  <span>{MIN_PLAYERS}</span>
                  <span>5</span>
                  <span>{MAX_PLAYERS}</span>
                </div>
                <input
                  aria-label="Type number of players"
                  style={{
                    ...inputStyle,
                    width: 72,
                    height: 44,
                    textAlign: "center",
                    fontSize: 16,
                    fontWeight: 600,
                    padding: 0,
                    marginTop: 12,
                  }}
                  type="number"
                  min={MIN_PLAYERS}
                  max={MAX_PLAYERS}
                  inputMode="numeric"
                  value={playersDraft}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setPlayersDraft("");
                      return;
                    }
                    const n = Number(raw);
                    if (!Number.isFinite(n)) return;
                    const next = clampPlayers(n);
                    handleChange("players", next);
                    setPlayersDraft(String(next));
                  }}
                  onBlur={() => applyPlayers(playersDraft === "" ? MIN_PLAYERS : playersDraft)}
                />
              </div>
            </section>

            <section>
              <h2 style={{ ...sectionTitle, fontSize: 21, letterSpacing: -0.35 }}>Date & time</h2>
              <p style={{ ...sectionHint, fontSize: 14, marginTop: 8 }}>
                Tap an open day, then choose a time.
              </p>

              <div style={{ marginTop: 28 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: c.text }}>
                  Select a day
                </h3>
                <div style={{ marginTop: 12 }}>
                  {loadingSlots ? (
                    <div className="pb-dt-dates" aria-hidden="true">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="pb-skel pb-skel-date" style={{ height: 74 }} />
                      ))}
                    </div>
                  ) : slotsError ? (
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>
                        Couldn't load live availability.
                      </div>
                      <p style={{ margin: "6px 0 0", fontSize: 13, color: c.secondary, lineHeight: 1.45 }}>
                        Please refresh the page and try again.
                      </p>
                    </div>
                  ) : availableDates.length === 0 ? (
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>
                        No available times
                      </div>
                      <p style={{ margin: "6px 0 0", fontSize: 13, color: c.muted, lineHeight: 1.45 }}>
                        Try another day or check back later.
                      </p>
                    </div>
                  ) : (
                    <div className="pb-dt-dates">
                      {availableDates.slice(0, 14).map((d) => {
                        const active = form.date === d;
                        const parts = formatDateParts(d);
                        const openCount = (slotsByDate[d] || []).length;
                        return (
                          <button
                            key={d}
                            type="button"
                            className="pb-date-card"
                            aria-pressed={active}
                            aria-label={`${parts.day} ${parts.date}, ${openCount} open`}
                            onClick={() => {
                              handleChange("date", d);
                              handleChange("time", "");
                            }}
                            style={{
                              border: `1px solid ${active ? c.accent : c.border}`,
                              background: active ? c.accentSoft : dark ? "#181819" : "#FFFFFF",
                              color: c.text,
                            }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 500, color: c.secondary, letterSpacing: 0.4 }}>
                              {parts.day}
                            </span>
                            <span style={{ fontSize: 15, fontWeight: 600, marginTop: 2, letterSpacing: -0.2 }}>
                              {parts.date}
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                marginTop: 6,
                                color: active ? c.accent : c.muted,
                                fontWeight: 400,
                              }}
                            >
                              {openCount} open
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {(loadingSlots || form.date) && !slotsError && (
                <div style={{ marginTop: 32 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: c.text }}>
                    Select a time
                  </h3>
                  <div style={{ marginTop: 12 }}>
                    {loadingSlots ? (
                      <div className="pb-dt-times" aria-hidden="true">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} className="pb-skel" style={{ height: 46 }} />
                        ))}
                      </div>
                    ) : timesForDate.length === 0 ? (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>
                          No available times
                        </div>
                        <p style={{ margin: "6px 0 0", fontSize: 13, color: c.muted, lineHeight: 1.45 }}>
                          Try another day or check back later.
                        </p>
                      </div>
                    ) : (
                      <div className="pb-dt-times">
                        {timesForDate.map((tm) => {
                          const active = form.time === tm;
                          return (
                            <button
                              key={tm}
                              type="button"
                              className="pb-time-slot"
                              aria-pressed={active}
                              aria-label={`Time ${tm}${active ? ", selected" : ""}`}
                              onClick={() => handleChange("time", tm)}
                              style={{
                                border: `1px solid ${active ? c.accent : c.border}`,
                                background: active ? c.accent : dark ? "#181819" : "#FFFFFF",
                                color: active ? "#FFFFFF" : c.text,
                              }}
                            >
                              {tm}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section>
              <h2 style={sectionTitle}>Payment</h2>
              <div
                className="pb-grid"
                style={{
                  gap: 12,
                  marginTop: 16,
                }}
              >
                {PAYMENT_MODES.map((mode) => {
                  const active = form.paymentMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      className="pb-pay"
                      onClick={() => handleChange("paymentMode", mode)}
                      style={{
                        height: 48,
                        padding: "0 12px",
                        borderRadius: 10,
                        border: `1px solid ${active ? c.accent : c.border}`,
                        background: active ? c.accentSoft : "transparent",
                        color: c.text,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 14,
                      }}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </section>

            {error && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: c.errorBg,
                  border: `1px solid ${c.border}`,
                  color: c.errorText,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="pb-submit"
              disabled={submitting}
              style={{
                width: "100%",
                height: 54,
                borderRadius: 12,
                border: "none",
                background: c.accent,
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.7 : 1,
                fontFamily: "inherit",
                transition: "background-color 180ms ease, transform 150ms ease, opacity 180ms ease",
              }}
            >
              {submitting ? "Sending…" : "Submit booking"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
