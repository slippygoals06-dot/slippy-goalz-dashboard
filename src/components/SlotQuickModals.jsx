import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { useTheme, primaryBtnStyle, primaryBtnHoverProps, secondaryBtnStyle } from "../context/ThemeContext";

const DEFAULT_TIMES = [
  "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00",
];

function fieldStyle(t) {
  return {
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
}

function ModalShell({ open, onClose, title, subtitle, children, footer, maxWidth = 440 }) {
  const { theme: t } = useTheme();
  return (
    <Modal open={open} onClose={onClose} maxWidth={maxWidth}>
      <div style={{ padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: t.textPrimary, letterSpacing: -0.3 }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: t.textMuted, fontWeight: 400, lineHeight: 1.4 }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: t.cardBg2,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              width: 36,
              height: 36,
              cursor: "pointer",
              fontSize: 18,
              color: t.textSecondary,
            }}
          >
            ×
          </button>
        </div>
        {children}
        {footer && (
          <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
            {footer}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Label({ children, t }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 8 }}>
      {children}
    </div>
  );
}

export function AddSlotModal({ open, onClose, defaultDate, onSubmit }) {
  const { theme: t } = useTheme();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDate(defaultDate || new Date().toISOString().slice(0, 10));
    setTime("18:00");
    setError("");
    setSaving(false);
  }, [open, defaultDate]);

  async function save() {
    if (!date || !time) {
      setError("Date and time are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({ date, time, status: "Available" });
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to add slot");
    } finally {
      setSaving(false);
    }
  }

  const input = fieldStyle(t);
  return (
    <ModalShell
      open={open}
      onClose={() => !saving && onClose?.()}
      title="Add slot"
      subtitle="Add a new time customers can book."
      footer={
        <>
          <button type="button" disabled={saving} onClick={() => !saving && onClose?.()} style={{ ...secondaryBtnStyle(t), padding: "10px 16px", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={save} {...primaryBtnHoverProps(t)} style={{ ...primaryBtnStyle(t), padding: "10px 16px", fontFamily: "inherit" }}>
            {saving ? "Saving…" : "Add slot"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <Label t={t}>Date *</Label>
          <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label t={t}>Time *</Label>
          <input type="time" style={input} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        {error && <div style={{ color: "#fca5a5", fontSize: 13 }}>{error}</div>}
      </div>
    </ModalShell>
  );
}

export function BlockTimeModal({ open, onClose, defaultDate, daySlots = [], onSubmit }) {
  const { theme: t } = useTheme();
  const available = useMemo(
    () => daySlots.filter((s) => s.Status === "Available").sort((a, b) => String(a.Time).localeCompare(String(b.Time))),
    [daySlots]
  );
  const [slotId, setSlotId] = useState("");
  const [time, setTime] = useState("");
  const [mode, setMode] = useState("existing");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode(available.length ? "existing" : "new");
    setSlotId(available[0] ? String(available[0].id ?? available[0].ID) : "");
    setTime(available[0]?.Time || "18:00");
    setError("");
    setSaving(false);
  }, [open, available]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      if (mode === "existing") {
        if (!slotId) throw new Error("Pick a slot to block");
        await onSubmit({ type: "block", slotId });
      } else {
        if (!defaultDate || !time) throw new Error("Date and time are required");
        await onSubmit({ type: "create-blocked", date: defaultDate, time });
      }
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to block time");
    } finally {
      setSaving(false);
    }
  }

  const input = fieldStyle(t);
  return (
    <ModalShell
      open={open}
      onClose={() => !saving && onClose?.()}
      title="Block time"
      subtitle={defaultDate ? `Close this time so customers cannot book it.` : "Close a time so customers cannot book it."}
      footer={
        <>
          <button type="button" disabled={saving} onClick={() => !saving && onClose?.()} style={{ ...secondaryBtnStyle(t), padding: "10px 16px", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={save} {...primaryBtnHoverProps(t)} style={{ ...primaryBtnStyle(t), padding: "10px 16px", fontFamily: "inherit" }}>
            {saving ? "Blocking…" : "Block time"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        {available.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            {[
              ["existing", "Block existing"],
              ["new", "Create blocked"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${mode === id ? t.accent : t.border}`,
                  background: mode === id ? t.accentGlow : t.inputBg,
                  color: t.textPrimary,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {mode === "existing" && available.length > 0 ? (
          <div>
            <Label t={t}>Available slot *</Label>
            <select
              style={input}
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
            >
              {available.map((s) => (
                <option key={String(s.id ?? s.ID)} value={String(s.id ?? s.ID)}>
                  {s.Time}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <Label t={t}>Time to block *</Label>
            <input type="time" style={input} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        )}
        {error && <div style={{ color: "#fca5a5", fontSize: 13 }}>{error}</div>}
      </div>
    </ModalShell>
  );
}

export function ExtraSlotModal({ open, onClose, defaultDate, daySlots = [], onSubmit }) {
  const { theme: t } = useTheme();
  const suggested = useMemo(() => {
    const times = daySlots.map((s) => s.Time).filter(Boolean).sort();
    if (!times.length) return "18:00";
    const last = times[times.length - 1];
    const m = String(last).match(/(\d{1,2}):(\d{2})/);
    if (!m) return "18:00";
    let h = Number(m[1]) + 1;
    if (h > 23) h = 23;
    return `${String(h).padStart(2, "0")}:${m[2]}`;
  }, [daySlots]);
  const [time, setTime] = useState("18:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTime(suggested);
    setError("");
    setSaving(false);
  }, [open, suggested]);

  async function save() {
    if (!defaultDate || !time) {
      setError("Select a day first, then pick a time");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({ date: defaultDate, time, status: "Available" });
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to open extra slot");
    } finally {
      setSaving(false);
    }
  }

  const input = fieldStyle(t);
  return (
    <ModalShell
      open={open}
      onClose={() => !saving && onClose?.()}
      title="Open extra slot"
      subtitle={defaultDate ? `Add one more open time on ${defaultDate}.` : "First tap a day on the calendar."}
      footer={
        <>
          <button type="button" disabled={saving} onClick={() => !saving && onClose?.()} style={{ ...secondaryBtnStyle(t), padding: "10px 16px", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button type="button" disabled={saving || !defaultDate} onClick={save} {...primaryBtnHoverProps(t)} style={{ ...primaryBtnStyle(t), padding: "10px 16px", fontFamily: "inherit" }}>
            {saving ? "Opening…" : "Open slot"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <Label t={t}>Extra time *</Label>
          <input type="time" style={input} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        {error && <div style={{ color: "#fca5a5", fontSize: 13 }}>{error}</div>}
      </div>
    </ModalShell>
  );
}

export function CopyScheduleModal({ open, onClose, fromDate, onSubmit }) {
  const { theme: t } = useTheme();
  const [toDate, setToDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (fromDate) {
      const d = new Date(`${fromDate}T12:00:00`);
      d.setDate(d.getDate() + 1);
      setToDate(d.toISOString().slice(0, 10));
    } else {
      setToDate("");
    }
    setError("");
    setSaving(false);
  }, [open, fromDate]);

  async function save() {
    if (!fromDate || !toDate) {
      setError("Pick a source day on the calendar, then a target date");
      return;
    }
    if (fromDate === toDate) {
      setError("Choose a different target date");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({ from_date: fromDate, to_date: toDate });
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to copy schedule");
    } finally {
      setSaving(false);
    }
  }

  const input = fieldStyle(t);
  return (
    <ModalShell
      open={open}
      onClose={() => !saving && onClose?.()}
      title="Copy schedule"
      subtitle={fromDate ? `Copy this day's times to another date.` : "First tap the day you want to copy."}
      footer={
        <>
          <button type="button" disabled={saving} onClick={() => !saving && onClose?.()} style={{ ...secondaryBtnStyle(t), padding: "10px 16px", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button type="button" disabled={saving || !fromDate} onClick={save} {...primaryBtnHoverProps(t)} style={{ ...primaryBtnStyle(t), padding: "10px 16px", fontFamily: "inherit" }}>
            {saving ? "Copying…" : "Copy day"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <Label t={t}>From</Label>
          <input style={{ ...input, opacity: 0.7 }} value={fromDate || "—"} readOnly />
        </div>
        <div>
          <Label t={t}>To date *</Label>
          <input type="date" style={input} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        {error && <div style={{ color: "#fca5a5", fontSize: 13 }}>{error}</div>}
      </div>
    </ModalShell>
  );
}

export function EditCapacityModal({ open, onClose, defaultDate, daySlots = [], onSaveTimes, onToggleSlot }) {
  const { theme: t } = useTheme();
  const existing = useMemo(() => new Set(daySlots.map((s) => s.Time).filter(Boolean)), [daySlots]);
  const [selected, setSelected] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(DEFAULT_TIMES.filter((tm) => !existing.has(tm))));
    setError("");
    setSaving(false);
  }, [open, existing]);

  function toggleTime(tm) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tm)) next.delete(tm);
      else next.add(tm);
      return next;
    });
  }

  async function save() {
    if (!defaultDate) {
      setError("Select a day on the calendar first");
      return;
    }
    const times = [...selected].sort();
    if (!times.length) {
      setError("Pick at least one new time to add");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSaveTimes({ date: defaultDate, times });
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to update capacity");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={() => !saving && onClose?.()}
      title="Set times"
      subtitle={defaultDate ? `Choose which times are open on ${defaultDate}.` : "First tap a day on the calendar."}
      maxWidth={520}
      footer={
        <>
          <button type="button" disabled={saving} onClick={() => !saving && onClose?.()} style={{ ...secondaryBtnStyle(t), padding: "10px 16px", fontFamily: "inherit" }}>
            Done
          </button>
          <button type="button" disabled={saving || !defaultDate} onClick={save} {...primaryBtnHoverProps(t)} style={{ ...primaryBtnStyle(t), padding: "10px 16px", fontFamily: "inherit" }}>
            {saving ? "Saving…" : "Save times"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 18 }}>
        {daySlots.length > 0 && (
          <div>
            <Label t={t}>Current times — tap to open or close</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[...daySlots].sort((a, b) => String(a.Time).localeCompare(String(b.Time))).map((s) => {
                const id = String(s.id ?? s.ID);
                const avail = s.Status === "Available";
                const blocked = s.Status === "Blocked";
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={saving || (!avail && !blocked)}
                    title={avail || blocked ? "Toggle availability" : "Booked — manage from Bookings"}
                    onClick={() => onToggleSlot?.(s)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      border: `1px solid ${t.border}`,
                      background: avail ? "rgba(5,150,105,0.1)" : blocked ? "rgba(95,99,104,0.12)" : "rgba(225,29,72,0.08)",
                      color: t.textPrimary,
                      fontSize: 12,
                      cursor: avail || blocked ? "pointer" : "not-allowed",
                      fontFamily: "inherit",
                      opacity: avail || blocked ? 1 : 0.65,
                    }}
                  >
                    {s.Time} · {s.Status}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div>
          <Label t={t}>Add common times</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {DEFAULT_TIMES.map((tm) => {
              const taken = existing.has(tm);
              const on = selected.has(tm);
              return (
                <button
                  key={tm}
                  type="button"
                  disabled={taken || saving}
                  onClick={() => toggleTime(tm)}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 10,
                    border: `1px solid ${on ? t.accent : t.border}`,
                    background: taken ? (t.name === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.03)") : on ? t.accentGlow : t.inputBg,
                    color: taken ? t.textMuted : t.textPrimary,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: taken ? "default" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {tm}{taken ? " ✓" : ""}
                </button>
              );
            })}
          </div>
        </div>
        {error && <div style={{ color: "#fca5a5", fontSize: 13 }}>{error}</div>}
      </div>
    </ModalShell>
  );
}
