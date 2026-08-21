import { useEffect, useState } from "react";
import Modal from "./Modal";
import { useTheme, primaryBtnStyle, primaryBtnHoverProps, secondaryBtnStyle } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { createWeeklyPackage } from "../api";
import { useStore } from "../store/useStore";

const EMPTY = {
  name: "",
  phone: "",
  title: "Weekly league",
  start_date: "",
  time: "",
  weeks: "4",
  amount_per_session: "",
};

/**
 * Create N weekly pitch bookings for one customer (same weekday + time).
 */
export default function CreateWeeklyPackageModal({ open, onClose }) {
  const { theme: t } = useTheme();
  const { showToast } = useToast();
  const fetchAll = useStore((s) => s.fetchAll);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setError("");
    setSaving(false);
  }, [open]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    const missing = [];
    if (!form.name?.trim()) missing.push("name");
    if (!form.phone?.trim()) missing.push("phone");
    if (!form.start_date) missing.push("start date");
    if (!form.time) missing.push("time");
    const weeks = Number(form.weeks);
    if (!Number.isFinite(weeks) || weeks < 2 || weeks > 12) missing.push("weeks (2–12)");
    if (missing.length) {
      setError(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        title: (form.title || "Weekly league").trim(),
        start_date: form.start_date,
        time: form.time.length === 5 ? form.time : form.time.slice(0, 5),
        weeks,
      };
      if (form.amount_per_session.trim() !== "") {
        const amt = Number(form.amount_per_session);
        if (Number.isNaN(amt) || amt < 0) {
          setError("Enter a valid amount per session");
          setSaving(false);
          return;
        }
        payload.amount_per_session = amt;
      }

      const result = await createWeeklyPackage(payload);
      const n = result?.bookings?.length || weeks;
      showToast(`Weekly package created — ${n} sessions booked`);
      fetchAll(true, showToast);
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to create package");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    border: `1px solid ${t.border}`,
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 13,
    background: t.inputBg,
    color: t.textPrimary,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: t.textMuted,
    marginBottom: 6,
  };

  return (
    <Modal open={open} onClose={() => !saving && onClose?.()} maxWidth={520} maxHeight="90vh">
      <div style={{ padding: 28 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: t.textPrimary }}>
            Weekly package
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: t.textMuted }}>
            Same player, same time, every week — linked as one package.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: 10,
              background: t.riskBg || "rgba(225,29,72,0.08)",
              color: t.risk || "#BE123C",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={labelStyle}>Package title</label>
            <input
              style={inputStyle}
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Weekly league"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Customer name</label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Name"
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                style={inputStyle}
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="0300…"
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>First date</label>
              <input
                type="date"
                style={inputStyle}
                value={form.start_date}
                onChange={(e) => setField("start_date", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Time</label>
              <input
                type="time"
                style={inputStyle}
                value={form.time}
                onChange={(e) => setField("time", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Weeks (2–12)</label>
              <input
                type="number"
                min={2}
                max={12}
                style={inputStyle}
                value={form.weeks}
                onChange={(e) => setField("weeks", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Amount per session (optional)</label>
            <input
              type="number"
              min={0}
              style={inputStyle}
              value={form.amount_per_session}
              onChange={(e) => setField("amount_per_session", e.target.value)}
              placeholder="Rs"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={saving}
            onClick={() => !saving && onClose?.()}
            style={{ ...secondaryBtnStyle(t), padding: "10px 16px" }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            style={{
              ...primaryBtnStyle(t),
              padding: "10px 16px",
              opacity: saving ? 0.75 : 1,
            }}
            {...primaryBtnHoverProps(t)}
          >
            {saving ? "Creating…" : "Create package"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
