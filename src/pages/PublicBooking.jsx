import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { BUSINESS_NAME } from "../constants/brand";
import { toApiPayload, PAYMENT_MODES, joinName } from "../utils/bookingFields";

const API =
  import.meta.env.VITE_API_URL || "https://irepair-backend-production-2418.up.railway.app";

function formatDateLabel(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default function PublicBooking() {
  const { theme: t, dark, toggle } = useTheme();

  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsError, setSlotsError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    players: 10,
    paymentMode: "Cash",
    date: "",
    time: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function loadSlots() {
      try {
        const res = await fetch(`${API}/slots`);
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
        let local = [];
        try {
          local = JSON.parse(localStorage.getItem("slippy_local_slots") || "[]");
        } catch {
          local = [];
        }
        const map = new Map();
        [...remote, ...(Array.isArray(local) ? local : [])].forEach((s) => {
          if (!s?.Date || !s?.Time) return;
          if (s.Status !== "Available") return;
          if (String(s.Date) < todayKey) return;
          map.set(`${s.Date}|${s.Time}`, s);
        });
        setSlots([...map.values()]);
      } catch {
        setSlotsError("Couldn't load live availability — pick a date and time and we'll confirm.");
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, []);

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
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
    if (!form.players || Number(form.players) < 1) {
      setError("Please set the number of players.");
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
      players: form.players,
      paymentMode: form.paymentMode,
      paymentStatus: "Unpaid",
      date: form.date,
      time: form.time,
      notes: null,
      status: "Pending",
      source: "Public book",
    });

    try {
      const res = await fetch(`${API}/bookings`, {
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
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "13px 15px",
    borderRadius: 10,
    background: dark ? "rgba(255,255,255,0.04)" : "#f8f9fe",
    border: `1.5px solid ${t.border}`,
    color: t.textPrimary,
    fontSize: 14.5,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };
  const label = {
    display: "block",
    fontSize: 12.5,
    fontWeight: 500,
    color: t.textSecondary,
    marginBottom: 8,
  };

  if (done) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: t.bg,
          color: t.textPrimary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "inherit",
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: "100%",
            background: t.cardBg,
            border: `1px solid ${t.border}`,
            borderRadius: 18,
            padding: 32,
            textAlign: "center",
            boxShadow: t.cardShadow,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 10 }}>Request sent</div>
          <p style={{ margin: 0, color: t.textMuted, lineHeight: 1.5, fontSize: 14 }}>
            Thanks {joinName(form.firstName, form.lastName)}. Your booking for{" "}
            <strong>{formatDateLabel(form.date)}</strong> at <strong>{form.time}</strong> is with the{" "}
            {BUSINESS_NAME} team. We'll confirm shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.textPrimary,
        fontFamily: "inherit",
        padding: "28px 16px 48px",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.2, color: t.accent, textTransform: "uppercase" }}>
              {BUSINESS_NAME}
            </div>
            <h1 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 600, letterSpacing: -0.6 }}>Book a slot</h1>
            <p style={{ margin: "8px 0 0", color: t.textMuted, fontSize: 14 }}>
              Open booking — requests show up in the admin portal automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            style={{
              border: `1px solid ${t.border}`,
              background: t.cardBg,
              color: t.textSecondary,
              borderRadius: 10,
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            Theme
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: t.cardBg,
            border: `1px solid ${t.border}`,
            borderRadius: 18,
            padding: 24,
            boxShadow: t.cardShadow,
            display: "grid",
            gap: 16,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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

          <div>
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

          <div>
            <label style={label}>Number of players *</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => handleChange("players", Math.max(1, Number(form.players || 1) - 1))}
                style={{ ...inputStyle, width: 48, padding: 0, cursor: "pointer", fontSize: 20 }}
              >
                −
              </button>
              <input
                style={{ ...inputStyle, textAlign: "center" }}
                type="number"
                min={1}
                value={form.players}
                onChange={(e) => handleChange("players", Math.max(1, Number(e.target.value) || 1))}
              />
              <button
                type="button"
                onClick={() => handleChange("players", Number(form.players || 1) + 1)}
                style={{ ...inputStyle, width: 48, padding: 0, cursor: "pointer", fontSize: 20 }}
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label style={label}>Available slots</label>
            {loadingSlots ? (
              <div style={{ fontSize: 13, color: t.textMuted }}>Loading availability…</div>
            ) : slotsError ? (
              <div style={{ fontSize: 13, color: t.textMuted }}>{slotsError}</div>
            ) : availableDates.length === 0 ? (
              <div style={{ fontSize: 13, color: t.textMuted }}>
                No listed slots right now — pick any date and time below.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {availableDates.slice(0, 12).map((d) => {
                  const active = form.date === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        handleChange("date", d);
                        handleChange("time", "");
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: `1px solid ${active ? t.accent : t.border}`,
                        background: active ? t.accentGlow : "transparent",
                        color: t.textPrimary,
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {formatDateLabel(d)} · {(slotsByDate[d] || []).length} open
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={label}>Booking date * (dd/mm/yyyy)</label>
              {availableDates.length > 0 ? (
                <select
                  style={inputStyle}
                  value={form.date}
                  onChange={(e) => {
                    handleChange("date", e.target.value);
                    handleChange("time", "");
                  }}
                >
                  <option value="">Select date</option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {formatDateLabel(d)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  style={inputStyle}
                  type="date"
                  value={form.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                />
              )}
            </div>
            <div>
              <label style={label}>Booking time * (hh:mm)</label>
              {timesForDate.length > 0 ? (
                <select
                  style={inputStyle}
                  value={form.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                >
                  <option value="">Select time</option>
                  {timesForDate.map((tm) => (
                    <option key={tm} value={tm}>
                      {tm}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  style={inputStyle}
                  type="time"
                  value={form.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                />
              )}
            </div>
          </div>

          <div>
            <label style={label}>Payment mode *</label>
            <div style={{ display: "flex", gap: 8 }}>
              {PAYMENT_MODES.map((mode) => {
                const active = form.paymentMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleChange("paymentMode", mode)}
                    style={{
                      flex: 1,
                      padding: "12px 10px",
                      borderRadius: 12,
                      border: `1px solid ${active ? t.accent : t.border}`,
                      background: active ? t.accentGlow : "transparent",
                      color: t.textPrimary,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 4,
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "none",
              background: t.accent,
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.7 : 1,
              fontFamily: "inherit",
            }}
          >
            {submitting ? "Sending…" : "Request booking"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: t.textMuted, marginTop: 22 }}>
          Powered by {BUSINESS_NAME}
        </p>
      </div>
    </div>
  );
}
