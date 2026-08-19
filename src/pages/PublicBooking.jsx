import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { BUSINESS_NAME } from "../constants/brand";
import {
  toApiPayload,
  PAYMENT_MODES,
  joinName,
  clampPlayers,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from "../utils/bookingFields";
import { API_URL as API } from "../config";
import { supabase } from "../lib/supabase";
import imageCompression from "browser-image-compression";
import { Upload, X as XIcon, Camera } from "lucide-react";

function formatDateLabel(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function networkErrorMessage(err) {
  const msg = String(err?.message || "");
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return "Couldn't reach the server. Please check your connection and try again.";
  }
  return msg || "Something went wrong. Please try again.";
}

function Section({ title, children }) {
  const { theme: t } = useTheme();
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.3 }}>
        {title}
      </h3>
      {children}
    </section>
  );
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
    players: MAX_PLAYERS,
    paymentMode: "Cash",
    date: "",
    time: "",
  });
  const [playersDraft, setPlayersDraft] = useState(String(MAX_PLAYERS));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const imgInputRef = useRef(null);

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
        setSlotsError("Couldn't load live times — pick a date and time and we'll confirm.");
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
    if (!form.firstName.trim() || !form.lastName.trim()) { setError("Enter your full name."); return false; }
    if (!form.phone.trim()) { setError("Enter your phone number."); return false; }
    if (!form.date || !form.time) { setError("Choose a date and time."); return false; }
    if (!form.paymentMode) { setError("Choose a payment method."); return false; }
    setError("");
    return true;
  }

  const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_IMG_SIZE = 5 * 1024 * 1024;
  const MAX_IMG_COUNT = 5;

  function handleImageSelect(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const valid = [];
    for (const f of files) {
      if (!IMAGE_MIMES.includes(f.type)) { setError(`Unsupported: ${f.name}. Use jpg/png/webp.`); return; }
      if (f.size > MAX_IMG_SIZE) { setError(`${f.name} exceeds 5 MB.`); return; }
      valid.push(f);
    }
    setSelectedImages((prev) => {
      const next = [...prev, ...valid].slice(0, MAX_IMG_COUNT);
      if (prev.length + valid.length > MAX_IMG_COUNT) setError(`Max ${MAX_IMG_COUNT} images.`);
      return next;
    });
    setError("");
  }

  function removeImage(idx) {
    setSelectedImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadImages(bookingId) {
    for (const rawFile of selectedImages) {
      try {
        const compressed = await imageCompression(rawFile, { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true });
        const ext = rawFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${bookingId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("booking-images")
          .upload(path, compressed, { contentType: compressed.type, upsert: false });
        if (upErr) throw upErr;
        await supabase.from("booking_attachments").insert({
          booking_id: bookingId,
          uploaded_by_role: "customer",
          file_path: path,
          file_type: "image",
          mime_type: compressed.type,
          size_bytes: compressed.size,
        });
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }
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
      source: "Public book",
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
        if (res.status === 409) throw new Error(detail || "Slot no longer available.");
        if (res.status === 400) throw new Error(detail || "Check your details and try again.");
        throw new Error(detail || `Server returned ${res.status}`);
      }
      const result = await res.json();
      if (selectedImages.length > 0 && result?.id) await uploadImages(result.id);
      setDone(true);
    } catch (err) {
      setError(networkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    background: dark ? "rgba(255,255,255,0.04)" : "#fff",
    border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`,
    color: t.textPrimary,
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color 150ms ease",
  };
  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: t.textSecondary,
    marginBottom: 6,
  };

  if (done) {
    return (
      <div style={{ minHeight: "100dvh", background: dark ? "#0a0a0b" : "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 24px",
            background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 28,
          }}>
            ✓
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 12px", color: dark ? "#fff" : "#0f1115" }}>
            Booking submitted
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)", lineHeight: 1.6 }}>
            {joinName(form.firstName, form.lastName)}, your booking for{" "}
            <strong style={{ color: dark ? "#fff" : "#0f1115" }}>{formatDateLabel(form.date)}</strong> at{" "}
            <strong style={{ color: dark ? "#fff" : "#0f1115" }}>{form.time}</strong> ({clampPlayers(form.players)} players)
            has been sent. We'll confirm shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: dark ? "#0a0a0b" : "#fafafa", fontFamily: "inherit" }}>
      <style>{`
        .pb-range { -webkit-appearance:none; appearance:none; width:100%; height:4px; border-radius:999px; outline:none;
          background: linear-gradient(to right, ${t.accent} 0%, ${t.accent} ${((clampPlayers(form.players)-1)/(MAX_PLAYERS-1))*100}%, ${dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"} ${((clampPlayers(form.players)-1)/(MAX_PLAYERS-1))*100}%, ${dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"} 100%); }
        .pb-range::-webkit-slider-thumb { -webkit-appearance:none; width:20px; height:20px; border-radius:50%; background:${t.accent}; border:3px solid ${dark?"#0a0a0b":"#fafafa"}; box-shadow:0 1px 4px rgba(0,0,0,0.2); cursor:pointer; }
        .pb-range::-moz-range-thumb { width:20px; height:20px; border-radius:50%; background:${t.accent}; border:3px solid ${dark?"#0a0a0b":"#fafafa"}; box-shadow:0 1px 4px rgba(0,0,0,0.2); cursor:pointer; }
        .pb-input:focus { border-color: ${t.accent} !important; }
      `}</style>

      {/* Header */}
      <header style={{
        padding: "20px 24px",
        borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        background: dark ? "rgba(10,10,11,0.9)" : "rgba(250,250,250,0.9)",
        backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: t.accent }}>
              {BUSINESS_NAME}
            </span>
            <h1 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 600, letterSpacing: -0.4, color: dark ? "#fff" : "#0f1115" }}>
              Book a pitch
            </h1>
          </div>
          <button
            type="button" onClick={toggle} aria-label="Toggle theme"
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`,
              background: "transparent", cursor: "pointer", fontSize: 14,
              color: dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {dark ? "☀" : "☾"}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "32px 20px 64px" }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 36 }}>

          {/* Details */}
          <Section title="Your details">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>First name</label>
                <input className="pb-input" style={inputStyle} value={form.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="Ali" autoComplete="given-name" />
              </div>
              <div>
                <label style={labelStyle}>Last name</label>
                <input className="pb-input" style={inputStyle} value={form.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  placeholder="Hassan" autoComplete="family-name" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Phone number</label>
              <input className="pb-input" style={inputStyle} value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+92 3xx xxxxxxx" inputMode="tel" autoComplete="tel" />
            </div>
          </Section>

          {/* Players */}
          <Section title="Players">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <input
                  className="pb-range"
                  type="range" min={MIN_PLAYERS} max={MAX_PLAYERS} step={1}
                  value={clampPlayers(form.players)}
                  onChange={(e) => applyPlayers(e.target.value)}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", marginTop: 6 }}>
                  <span>{MIN_PLAYERS}</span>
                  <span>{MAX_PLAYERS}</span>
                </div>
              </div>
              <input
                className="pb-input"
                style={{ ...inputStyle, width: 56, textAlign: "center", fontSize: 16, fontWeight: 600, padding: "10px 8px" }}
                type="number" min={MIN_PLAYERS} max={MAX_PLAYERS} inputMode="numeric"
                value={playersDraft}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") { setPlayersDraft(""); return; }
                  const n = Number(raw);
                  if (!Number.isFinite(n)) return;
                  const next = clampPlayers(n);
                  handleChange("players", next);
                  setPlayersDraft(String(next));
                }}
                onBlur={() => applyPlayers(playersDraft === "" ? MIN_PLAYERS : playersDraft)}
              />
            </div>
          </Section>

          {/* Date & Time */}
          <Section title="Select a day">
            {loadingSlots ? (
              <div style={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>Loading…</div>
            ) : slotsError ? (
              <div style={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>{slotsError}</div>
            ) : availableDates.length === 0 ? (
              <div style={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
                No set times — pick any date & time below.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                {availableDates.slice(0, 14).map((d) => {
                  const active = form.date === d;
                  const dt = new Date(`${d}T12:00:00`);
                  const day = dt.getDate();
                  const month = dt.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
                  const weekday = dt.toLocaleDateString("en-GB", { weekday: "short" });
                  return (
                    <button
                      key={d} type="button"
                      onClick={() => { handleChange("date", d); handleChange("time", ""); }}
                      style={{
                        padding: "14px 8px",
                        borderRadius: 12,
                        border: `1px solid ${active ? t.accent : dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                        background: active ? (dark ? "rgba(244,63,94,0.12)" : "rgba(244,63,94,0.06)") : "transparent",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "center",
                        transition: "all 150ms ease",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 500, color: active ? t.accent : (dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"), marginBottom: 2 }}>
                        {weekday}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: active ? t.accent : (dark ? "#fff" : "#0f1115"), letterSpacing: -0.3 }}>
                        {day} {month}
                      </div>
                      <div style={{ fontSize: 11, color: active ? t.accent : (dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"), marginTop: 2 }}>
                        {(slotsByDate[d] || []).length} open
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Time chips */}
            {form.date && timesForDate.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600, color: dark ? "#fff" : "#0f1115", letterSpacing: -0.3 }}>
                  Pick a time
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {timesForDate.map((tm) => {
                    const active = form.time === tm;
                    return (
                      <button
                        key={tm} type="button"
                        onClick={() => handleChange("time", tm)}
                        style={{
                          padding: "10px 16px",
                          borderRadius: 8,
                          border: `1px solid ${active ? t.accent : dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                          background: active ? t.accent : "transparent",
                          color: active ? "#fff" : (dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"),
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all 150ms ease",
                        }}
                      >
                        {tm}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fallback inputs */}
            {(availableDates.length === 0 || slotsError) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input className="pb-input" style={inputStyle} type="date" value={form.date}
                    onChange={(e) => handleChange("date", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Time</label>
                  <input className="pb-input" style={inputStyle} type="time" value={form.time}
                    onChange={(e) => handleChange("time", e.target.value)} />
                </div>
              </div>
            )}
          </Section>

          {/* Payment */}
          <Section title="Payment">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {PAYMENT_MODES.map((mode) => {
                const active = form.paymentMode === mode;
                return (
                  <button
                    key={mode} type="button"
                    onClick={() => handleChange("paymentMode", mode)}
                    style={{
                      padding: "14px 12px",
                      borderRadius: 10,
                      border: `1px solid ${active ? t.accent : dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                      background: active ? (dark ? "rgba(244,63,94,0.12)" : "rgba(244,63,94,0.06)") : "transparent",
                      color: active ? t.accent : (dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"),
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 14,
                      transition: "all 150ms ease",
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Photos */}
          <Section title="Photos">
            <input ref={imgInputRef} type="file" hidden accept=".jpg,.jpeg,.png,.webp" multiple onChange={handleImageSelect} />
            {selectedImages.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {selectedImages.map((file, i) => (
                  <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
                    <img src={URL.createObjectURL(file)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <button type="button" onClick={() => removeImage(i)}
                      style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                      <XIcon size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {selectedImages.length < MAX_IMG_COUNT && (
              <button type="button" onClick={() => imgInputRef.current?.click()}
                style={{
                  width: "100%", padding: "16px",
                  borderRadius: 10,
                  border: `1px dashed ${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                  background: "transparent",
                  color: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "border-color 150ms ease",
                }}>
                <Camera size={16} strokeWidth={1.5} />
                Add photos (optional)
              </button>
            )}
          </Section>

          {/* Error */}
          {error && (
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              background: dark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)",
              border: `1px solid ${dark ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.2)"}`,
              color: dark ? "#fca5a5" : "#dc2626",
              fontSize: 13, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit" disabled={submitting}
            style={{
              width: "100%", padding: "16px",
              borderRadius: 12, border: "none",
              background: t.accent, color: "#fff",
              fontSize: 15, fontWeight: 600,
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.7 : 1,
              fontFamily: "inherit",
              transition: "opacity 150ms ease",
              boxShadow: `0 1px 2px rgba(0,0,0,0.08), 0 4px 12px ${dark ? "rgba(244,63,94,0.2)" : "rgba(244,63,94,0.15)"}`,
            }}
          >
            {submitting ? "Submitting…" : "Submit booking"}
          </button>
        </form>
      </main>
    </div>
  );
}
