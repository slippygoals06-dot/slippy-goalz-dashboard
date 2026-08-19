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
import { Upload, X as XIcon, Loader2 } from "lucide-react";

function formatDateLabel(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatDateChip(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return formatDateLabel(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function networkErrorMessage(err) {
  const msg = String(err?.message || "");
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return "Couldn't reach the server. Please check your connection and try again.";
  }
  return msg || "Something went wrong. Please try again.";
}

function Section({ title, hint, children }) {
  const { theme: t } = useTheme();
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.2 }}>
          {title}
        </div>
        {hint && (
          <div style={{ marginTop: 4, fontSize: 12, color: t.textMuted, lineHeight: 1.4 }}>{hint}</div>
        )}
      </div>
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
        setSlotsError("Couldn't load live times. Please try again in a moment.");
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
      if (!IMAGE_MIMES.includes(f.type)) {
        setError(`Unsupported file: ${f.name}. Use jpg, png, or webp.`);
        return;
      }
      if (f.size > MAX_IMG_SIZE) {
        setError(`${f.name} is too large (max 5 MB).`);
        return;
      }
      valid.push(f);
    }
    setSelectedImages((prev) => {
      const next = [...prev, ...valid].slice(0, MAX_IMG_COUNT);
      if (prev.length + valid.length > MAX_IMG_COUNT) {
        setError(`Maximum ${MAX_IMG_COUNT} images allowed.`);
      }
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
        const compressed = await imageCompression(rawFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });
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
        if (res.status === 409) {
          throw new Error(detail || "This slot is no longer available, please choose another.");
        }
        if (res.status === 400) {
          throw new Error(detail || "Please check your phone number and try again.");
        }
        throw new Error(detail || `Server returned ${res.status}`);
      }
      const result = await res.json();
      if (selectedImages.length > 0 && result?.id) {
        await uploadImages(result.id);
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
    padding: "0 14px",
    height: 52,
    minHeight: 52,
    borderRadius: 12,
    background: dark ? "rgba(255,255,255,0.04)" : "#f8f9fe",
    border: `1.5px solid ${t.border}`,
    color: t.textPrimary,
    fontSize: 15,
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
            borderRadius: 20,
            padding: 36,
            textAlign: "center",
            boxShadow: t.cardShadow,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              margin: "0 auto 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: t.accentGlow,
              color: t.accent,
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            ✓
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, marginBottom: 10, letterSpacing: -0.5 }}>
            Booking sent
          </div>
          <p style={{ margin: 0, color: t.textMuted, lineHeight: 1.55, fontSize: 14 }}>
            Thanks {joinName(form.firstName, form.lastName)}. Your booking for{" "}
            <strong style={{ color: t.textPrimary }}>{formatDateLabel(form.date)}</strong> at{" "}
            <strong style={{ color: t.textPrimary }}>{form.time}</strong> for{" "}
            <strong style={{ color: t.textPrimary }}>{clampPlayers(form.players)} players</strong> is
            with the {BUSINESS_NAME} team. We'll confirm shortly.
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
      }}
    >
      <style>{`
        .pb-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          /* No gradients — keep slider calm */
          background: ${dark ? "rgba(255,255,255,0.10)" : "rgba(15,17,21,0.08)"};
          outline: none;
        }
        .pb-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: ${t.accent};
          border: 3px solid ${dark ? "#1a1d24" : "#fff"};
          box-shadow: none;
          cursor: pointer;
        }
        .pb-range::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: ${t.accent};
          border: 3px solid ${dark ? "#1a1d24" : "#fff"};
          box-shadow: none;
          cursor: pointer;
        }
        .pb-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 767px) {
          .pb-grid { grid-template-columns: 1fr; }
          .pb-date-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .pb-time-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (min-width: 768px) and (max-width: 1099px) {
          .pb-date-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .pb-time-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>

      <div
        style={{
          background: t.cardBg,
          borderBottom: `1px solid ${t.border}`,
          padding: "20px 16px",
        }}
      >
        <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.4, color: t.accent, textTransform: "uppercase" }}>
              {BUSINESS_NAME}
            </div>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle theme"
            style={{
              border: `1px solid ${t.border}`,
              background: t.bg,
              color: t.textSecondary,
              borderRadius: 10,
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            {dark ? "Light" : "Dark"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px 48px" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: t.accent }}>
            BOOK A PITCH
          </div>
          <div style={{ marginTop: 6, fontSize: 38, fontWeight: 650, letterSpacing: -0.9, lineHeight: 1.05 }}>
            Book a pitch
          </div>
          <p style={{ margin: "10px 0 0", color: t.textMuted, fontSize: 14.5, lineHeight: 1.5, maxWidth: 520 }}>
            Choose your players, pick a time, and send your booking. We'll confirm soon.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: t.cardBg,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: "28px 22px 22px",
            boxShadow: "none",
            display: "grid",
            gap: 28,
          }}
        >
          <Section title="Your details">
            <div className="pb-grid">
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
          </Section>

          <Section title="Players" hint={`Slide or type a number. Maximum ${MAX_PLAYERS}.`}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 14,
                background: dark ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.03)",
                border: `1px solid ${t.border}`,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: t.textMuted }}>Selected</div>
                <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, lineHeight: 1.1 }}>
                  {clampPlayers(form.players)}
                  <span style={{ fontSize: 13, fontWeight: 500, color: t.textMuted, marginLeft: 6 }}>
                    / {MAX_PLAYERS}
                  </span>
                </div>
              </div>
              <input
                aria-label="Type number of players"
                style={{
                  ...inputStyle,
                  width: 72,
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: 600,
                  padding: "10px 8px",
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
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t.textMuted }}>
              <span>{MIN_PLAYERS}</span>
              <span>5</span>
              <span>{MAX_PLAYERS}</span>
            </div>
          </Section>

          <Section title="Date & time" hint="Tap an open day, then choose a time.">
            {loadingSlots ? (
              <div style={{ fontSize: 13, color: t.textMuted }}>Loading availability…</div>
            ) : slotsError ? (
              <div style={{ fontSize: 13, color: t.textMuted }}>{slotsError}</div>
            ) : availableDates.length === 0 ? (
              <div style={{ fontSize: 13, color: t.textMuted }}>
                No available times right now. Please try again later.
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 650, color: t.textPrimary, marginBottom: 12 }}>
                  Select a day
                </div>
                <div className="pb-date-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                {availableDates.slice(0, 14).map((d) => {
                  const active = form.date === d;
                  const dt = new Date(`${d}T12:00:00`);
                  const weekday = dt.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
                  const day = dt.getDate();
                  const month = dt.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
                  const openCount = (slotsByDate[d] || []).length;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        handleChange("date", d);
                        handleChange("time", "");
                      }}
                      style={{
                        padding: "12px 6px",
                        minHeight: 72,
                        borderRadius: 12,
                        border: `1px solid ${active ? t.accent : t.border}`,
                        background: active ? t.accentGlow : (dark ? "rgba(255,255,255,0.02)" : "#fff"),
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "center",
                        transition: "border-color 150ms ease, background 150ms ease",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 500, color: active ? t.accent : t.textMuted, marginBottom: 2, letterSpacing: 0.3 }}>
                        {weekday}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.2 }}>
                        {day} {month}
                      </div>
                      <div style={{ fontSize: 11, color: active ? t.accent : t.textMuted, marginTop: 3 }}>
                        {openCount} open
                      </div>
                    </button>
                  );
                })}
                </div>
              </div>
            )}

            {form.date && timesForDate.length > 0 && (
              <>
                <div style={{ marginTop: 22, fontSize: 15, fontWeight: 600, color: t.textPrimary }}>
                  Select a time
                </div>
                <div className="pb-time-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 12 }}>
                  {timesForDate.map((tm) => {
                    const active = form.time === tm;
                    return (
                      <button
                        key={tm}
                        type="button"
                        onClick={() => handleChange("time", tm)}
                        aria-pressed={active}
                        style={{
                          height: 46,
                          padding: "0 8px",
                          borderRadius: 10,
                          border: `1px solid ${active ? t.accent : t.border}`,
                          background: active
                            ? t.accent
                            : dark
                              ? "rgba(255,255,255,0.03)"
                              : "#fff",
                          color: active ? "#fff" : t.textPrimary,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "border-color 150ms ease, background 150ms ease, transform 150ms ease",
                        }}
                      >
                        {tm}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </Section>

          <Section title="Payment">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {PAYMENT_MODES.map((mode) => {
                const active = form.paymentMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleChange("paymentMode", mode)}
                    style={{
                      padding: "14px 10px",
                      borderRadius: 14,
                      border: `1.5px solid ${active ? t.accent : t.border}`,
                      background: active ? t.accentGlow : "transparent",
                      color: t.textPrimary,
                      fontWeight: 600,
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
          </Section>

          <Section title="Photos" hint={`Optional — attach up to ${MAX_IMG_COUNT} images (jpg/png/webp, max 5 MB each).`}>
            <input
              ref={imgInputRef}
              type="file"
              hidden
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleImageSelect}
            />
            {selectedImages.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
                {selectedImages.map((file, i) => (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      aspectRatio: "1",
                      borderRadius: 10,
                      overflow: "hidden",
                      border: `1px solid ${t.border}`,
                      background: dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)",
                    }}
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(0,0,0,0.55)",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {selectedImages.length < MAX_IMG_COUNT && (
              <button
                type="button"
                onClick={() => imgInputRef.current?.click()}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 12,
                  border: `1.5px dashed ${t.border}`,
                  background: "transparent",
                  color: t.textSecondary,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Upload size={16} strokeWidth={1.75} />
                Add photos
              </button>
            )}
          </Section>

          {error && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: dark ? "#fca5a5" : "#b91c1c",
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {error}
            </div>
          )}

          {/* Small confirmation summary */}
          {(form.date || form.time) && (
            <div style={{ marginTop: 2, padding: "0 2px 2px" }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: t.textSecondary, marginBottom: 6 }}>
                Your booking
              </div>
              <div style={{ fontSize: 13, color: t.textPrimary, lineHeight: 1.5 }}>
                {clampPlayers(form.players)} players
                {form.date ? (
                  <>
                    {" "}
                    · {formatDateLabel(form.date)}
                  </>
                ) : null}
                {form.time ? (
                  <>
                    {" "}
                    · {form.time}
                  </>
                ) : null}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            onMouseEnter={(e) => {
              if (!submitting) e.currentTarget.style.filter = "brightness(1.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = "none";
            }}
            style={{
              width: "100%",
              height: 54,
              padding: "0 16px",
              borderRadius: 12,
              border: "none",
              background: t.accent,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.7 : 1,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {submitting ? "Sending…" : "Submit booking ->"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: t.textMuted, marginTop: 22 }}>
          Powered by {BUSINESS_NAME}
        </p>
      </div>
    </div>
  );
}
