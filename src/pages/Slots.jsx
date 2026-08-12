import { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar as CalendarIcon,
  Table2,
  Search,
  Plus,
  Copy,
  Ban,
  Sparkles,
  Clock,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useStore } from "../store/useStore";
import {
  useTheme,
  secondaryBtnStyle,
  cardHoverProps,
} from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import PageShell from "../components/PageShell";
import SegmentedControl from "../components/SegmentedControl";
import { SkeletonBlock } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { exportToCSV } from "../utils/export";
import {
  AddSlotModal,
  BlockTimeModal,
  ExtraSlotModal,
  CopyScheduleModal,
  EditCapacityModal,
} from "../components/SlotQuickModals";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PERIODS = ["Today", "Week", "Month"];

/** Soft capacity colours — never harsh */
const CAPACITY = {
  high: { tint: "rgba(5,150,105,0.08)", bar: "#059669", label: "High", text: "#047857" },
  medium: { tint: "rgba(217,119,6,0.08)", bar: "#D97706", label: "Medium", text: "#B45309" },
  low: { tint: "rgba(225,29,72,0.08)", bar: "#E11D48", label: "Low", text: "#BE123C" },
  empty: { tint: "transparent", bar: "transparent", label: "None", text: null },
};

function parseSlotDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d)) return d;
  const parts = String(dateStr).split(/[-/.\s]/);
  if (parts.length === 3) {
    const alt = new Date(`${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`);
    if (!isNaN(alt)) return alt;
  }
  return null;
}

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isAvailable(s) {
  return s.Status === "Available";
}

function capacityLevel(available, total) {
  if (!total) return "empty";
  const util = (total - available) / total;
  if (util >= 0.8) return "low";
  if (util >= 0.5) return "medium";
  return "high";
}

function sortTimes(a, b) {
  const ta = String(a.Time || "");
  const tb = String(b.Time || "");
  return ta.localeCompare(tb, undefined, { numeric: true });
}

function parseHour(timeStr) {
  if (!timeStr) return null;
  const m = String(timeStr).match(/(\d{1,2})/);
  if (!m) return null;
  let h = Number(m[1]);
  const lower = String(timeStr).toLowerCase();
  if (lower.includes("pm") && h < 12) h += 12;
  if (lower.includes("am") && h === 12) h = 0;
  return h;
}

function WalletCard({ label, value, trend, children, t }) {
  const hover = cardHoverProps(t);
  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: 18,
        boxShadow: t.cardShadow,
        padding: "24px 24px 20px",
        minHeight: 128,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
        transition:
          "border-color 150ms cubic-bezier(0.2, 0, 0, 1), box-shadow 150ms cubic-bezier(0.2, 0, 0, 1), transform 150ms cubic-bezier(0.2, 0, 0, 1)",
      }}
      onMouseEnter={(e) => {
        hover.onMouseEnter(e);
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        hover.onMouseLeave(e);
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 400, color: t.textMuted, lineHeight: 1.3 }}>{label}</div>
      <div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: t.textPrimary,
            letterSpacing: -1.2,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            fontFamily: "var(--font-mono)",
          }}
        >
          {value}
        </div>
        {trend != null && (
          <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted, fontWeight: 400 }}>{trend}</div>
        )}
        {children}
      </div>
    </div>
  );
}

function MiniSparkline({ data, color }) {
  if (!data?.length) return null;
  return (
    <div style={{ height: 32, marginTop: 10 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill="transparent"
            isAnimationActive
            animationDuration={500}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SlotsSkeleton() {
  const { theme: t } = useTheme();
  return (
    <PageShell
      title="Slots"
      subtitle="Manage pitch availability and booking capacity."
    >
      <style>{`
        .sk-wave{position:relative;overflow:hidden;background:${t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"};border:1px solid ${t.border}}
        .sk-wave::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,${t.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)"},transparent);animation:skWave 1.4s ease-in-out infinite}
        @keyframes skWave{100%{transform:translateX(100%)}}
      `}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} height={128} radius={18} style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
      <SkeletonBlock height={88} radius={18} style={{ marginBottom: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        <SkeletonBlock height={420} radius={18} />
        <SkeletonBlock height={420} radius={18} />
      </div>
    </PageShell>
  );
}

function buildAiInsights(slots, slotsByDate, metrics) {
  const bullets = [];
  const dates = Object.keys(slotsByDate).sort();

  let fullest = null;
  let fullestUtil = -1;
  let freest = null;
  let freestAvail = -1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  dates.forEach((dateStr) => {
    const d = parseSlotDate(dateStr);
    if (!d || d < today) return;
    const daySlots = slotsByDate[dateStr];
    const avail = daySlots.filter(isAvailable).length;
    const total = daySlots.length;
    const util = total ? (total - avail) / total : 0;
    if (util > fullestUtil) {
      fullestUtil = util;
      fullest = { dateStr, d, avail, total, util };
    }
    if (avail > freestAvail) {
      freestAvail = avail;
      freest = { dateStr, d, avail, total };
    }
  });

  if (fullest && fullest.util >= 0.75) {
    const dayName = fullest.d.toLocaleDateString("en-US", { weekday: "long" });
    bullets.push({
      text: `${dayName} is almost full — ${fullest.total - fullest.avail}/${fullest.total} slots booked.`,
      tone: "warn",
    });
  }

  if (freest && freest.avail > 0) {
    const dayName = freest.d.toLocaleDateString("en-US", { weekday: "long" });
    bullets.push({
      text: `${dayName} has ${freest.avail} available slot${freest.avail === 1 ? "" : "s"}.`,
      tone: "ok",
    });
  }

  let morningBooked = 0;
  let afternoonBooked = 0;
  slots.forEach((s) => {
    if (isAvailable(s)) return;
    const h = parseHour(s.Time);
    if (h == null) return;
    if (h < 12) morningBooked += 1;
    else afternoonBooked += 1;
  });
  if (morningBooked + afternoonBooked > 0) {
    const morningShare = Math.round((morningBooked / (morningBooked + afternoonBooked)) * 100);
    if (morningShare >= 55) {
      bullets.push({
        text: `Morning demand is elevated (${morningShare}% of bookings before noon).`,
        tone: "info",
      });
    } else if (morningShare <= 40) {
      bullets.push({
        text: "Afternoon demand is stronger — mornings still have room to fill.",
        tone: "info",
      });
    }
  }

  if (metrics.utilisation >= 80) {
    bullets.push({
      text: "Recommend opening two extra pitch slots on the next busy day.",
      tone: "warn",
    });
  } else if (metrics.available > 10) {
    bullets.push({
      text: "Plenty of room — promote this day in WhatsApp or Instagram.",
      tone: "ok",
    });
  }

  if (bullets.length === 0) {
    bullets.push({ text: "No strong capacity signals yet — keep monitoring this week.", tone: "info" });
  }

  return bullets.slice(0, 4);
}

function CalendarView({
  slotsByDate,
  t,
  dark,
  selectedKey,
  onSelectDay,
  currentDate,
  setCurrentDate,
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  const startOffset = (firstDay + 6) % 7;
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{
      background: t.cardBg,
      border: `1px solid ${t.border}`,
      borderRadius: 18,
      boxShadow: t.cardShadow,
      padding: "28px 24px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <button
          type="button"
          className="ui-press"
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          aria-label="Previous month"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: `1px solid ${t.border}`,
            background: "transparent",
            color: t.textPrimary,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </button>
        <div style={{ fontWeight: 500, fontSize: 17, color: t.textPrimary, letterSpacing: -0.3 }}>
          {MONTHS[month]} {year}
        </div>
        <button
          type="button"
          className="ui-press"
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          aria-label="Next month"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: `1px solid ${t.border}`,
            background: "transparent",
            color: t.textPrimary,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronRight size={18} strokeWidth={1.75} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 8 }}>
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 500,
              color: t.textMuted,
              padding: "8px 0",
              letterSpacing: "0.02em",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} style={{ minHeight: 72 }} />;
          const dateStr = toDateKey(year, month, day);
          const daySlots = slotsByDate[dateStr] || [];
          const avail = daySlots.filter(isAvailable).length;
          const booked = daySlots.length - avail;
          const level = capacityLevel(avail, daySlots.length);
          const cfg = CAPACITY[level];
          const isToday =
            today.getDate() === day &&
            today.getMonth() === month &&
            today.getFullYear() === year;
          const isSelected = selectedKey === dateStr;
          const weekday = new Date(year, month, day).getDay();
          const isWeekend = weekday === 0 || weekday === 6;
          const util = daySlots.length ? booked / daySlots.length : 0;

          return (
            <button
              key={dateStr}
              type="button"
              className="slots-day-cell ui-press"
              onClick={() => onSelectDay(isSelected ? null : dateStr)}
              style={{
                minHeight: 84,
                borderRadius: 14,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "space-between",
                gap: 6,
                padding: "10px 8px 8px",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                transition:
                  "background 150ms cubic-bezier(0.2, 0, 0, 1), border-color 150ms cubic-bezier(0.2, 0, 0, 1), transform 150ms cubic-bezier(0.2, 0, 0, 1)",
                background: isSelected
                  ? (dark ? "rgba(255,255,255,0.06)" : "rgba(15,17,21,0.04)")
                  : daySlots.length
                    ? cfg.tint
                    : isWeekend
                      ? (dark ? "rgba(255,255,255,0.02)" : "rgba(15,17,21,0.015)")
                      : "transparent",
                border: isSelected
                  ? `1.5px solid ${t.borderHover || t.border}`
                  : isToday
                    ? `1.5px solid ${t.accent}66`
                    : `1px solid ${t.borderSub}`,
                boxShadow: isSelected ? t.cardShadow : "none",
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: isToday || isSelected ? 500 : 400,
                    color: isToday ? t.accent : isWeekend ? t.textMuted : t.textPrimary,
                    fontVariantNumeric: "tabular-nums",
                    fontFamily: "var(--font-mono)",
                    lineHeight: 1,
                  }}
                >
                  {day}
                </span>
                {daySlots.length > 0 && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: cfg.bar,
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
              {daySlots.length > 0 ? (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: cfg.text || t.textMuted,
                      fontVariantNumeric: "tabular-nums",
                      fontFamily: "var(--font-mono)",
                      marginBottom: 4,
                    }}
                  >
                    {avail} open
                  </div>
                  <div
                    style={{
                      height: 3,
                      borderRadius: 999,
                      background: dark ? "rgba(255,255,255,0.06)" : "rgba(15,17,21,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.round(util * 100)}%`,
                        background: cfg.bar,
                        borderRadius: 999,
                        opacity: 0.85,
                        transition: "width 200ms cubic-bezier(0.2, 0, 0, 1)",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 10, color: t.textMuted, opacity: 0.5 }}>—</div>
              )}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 20,
          paddingTop: 16,
          borderTop: `1px solid ${t.borderSub}`,
          flexWrap: "wrap",
        }}
      >
        {[
          [CAPACITY.high.bar, "High availability"],
          [CAPACITY.medium.bar, "Medium"],
          [CAPACITY.low.bar, "Low / full"],
          [t.accent, "Today"],
        ].map(([c, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textMuted }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayPanel({
  selectedKey,
  daySlots,
  t,
  dark,
  onQuickAction,
}) {
  const sorted = useMemo(() => [...daySlots].sort(sortTimes), [daySlots]);
  const available = daySlots.filter(isAvailable).length;
  const booked = daySlots.length - available;
  const level = capacityLevel(available, daySlots.length);
  const cfg = CAPACITY[level];

  const dateLabel = selectedKey
    ? (() => {
        const d = parseSlotDate(selectedKey);
        return d
          ? d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
          : selectedKey;
      })()
    : null;

  const hours =
    sorted.length > 0
      ? `${sorted[0].Time || "—"} – ${sorted[sorted.length - 1].Time || "—"}`
      : "—";

  const suggestions = useMemo(() => {
    if (!selectedKey) return [];
    const list = [];
    if (available === 0 && daySlots.length > 0) {
      list.push("This day is fully booked — consider opening an extra evening slot.");
    } else if (available <= 2 && daySlots.length > 0) {
      list.push("Capacity is tight — block non-urgent work or add a slot.");
    } else if (available >= 6) {
      list.push("Plenty of room — promote this day in WhatsApp or Instagram.");
    }
    if (booked > 0) {
      list.push(`${booked} booking${booked === 1 ? "" : "s"} already scheduled.`);
    }
    if (list.length === 0) list.push("No slots on this date yet — copy a schedule from another day.");
    return list.slice(0, 3);
  }, [selectedKey, available, booked, daySlots.length]);

  if (!selectedKey) {
    return (
      <div
        style={{
          background: t.cardBg,
          border: `1px solid ${t.border}`,
          borderRadius: 18,
          boxShadow: t.cardShadow,
          padding: "48px 28px",
          minHeight: 420,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden style={{ opacity: 0.45, marginBottom: 16, color: t.textMuted }}>
          <rect x="12" y="16" width="48" height="42" rx="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M12 28h48" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
          <circle cx="28" cy="40" r="3" fill="currentColor" opacity="0.35" />
          <circle cx="40" cy="40" r="3" fill="currentColor" opacity="0.2" />
          <circle cx="52" cy="40" r="3" fill="currentColor" opacity="0.15" />
        </svg>
        <div style={{ fontSize: 15, fontWeight: 500, color: t.textPrimary, marginBottom: 8 }}>
          Select a day to view schedule
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, maxWidth: 240, lineHeight: 1.5 }}>
          Tap any date on the calendar to see availability, bookings, and suggested optimisations.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: 18,
        boxShadow: t.cardShadow,
        display: "flex",
        flexDirection: "column",
        maxHeight: "min(720px, 80vh)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "24px 24px 16px", borderBottom: `1px solid ${t.borderSub}`, flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: t.textPrimary, letterSpacing: -0.2, lineHeight: 1.3 }}>
          {dateLabel}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Available</div>
            <div className="font-mono-data" style={{ fontSize: 22, fontWeight: 500, color: CAPACITY.high.text }}>
              {available}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Booked</div>
            <div className="font-mono-data" style={{ fontSize: 22, fontWeight: 500, color: t.textPrimary }}>
              {booked}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Capacity</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: cfg.text || t.textMuted, marginTop: 6 }}>
              {cfg.label}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>
            Overview
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              ["Pitch", "Slippy Goalz"],
              ["Business hours", hours],
              ["Total slots", String(daySlots.length)],
            ].map(([label, value], i, arr) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: i < arr.length - 1 ? `1px solid ${t.borderSub}` : "none",
                }}
              >
                <span style={{ fontSize: 13, color: t.textMuted }}>{label}</span>
                <span style={{ fontSize: 13, color: t.textPrimary }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>
            Timeline
          </div>
          {sorted.length === 0 ? (
            <div style={{ fontSize: 13, color: t.textMuted, padding: "16px 0" }}>No slots on this date</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {sorted.map((s, i) => {
                const avail = isAvailable(s);
                const blocked = s.Status === "Blocked";
                const dot = avail ? CAPACITY.high.bar : blocked ? "#5F6368" : CAPACITY.low.bar;
                const label = avail
                  ? "Open for booking"
                  : blocked
                    ? "Blocked"
                    : (s["Booked By"] && s["Booked By"] !== "EMPTY" ? s["Booked By"] : "Booked");
                return (
                  <div
                    key={s.id || s.ID || `${s.Time}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 0",
                      borderBottom: i < sorted.length - 1 ? `1px solid ${t.borderSub}` : "none",
                    }}
                  >
                    <span
                      className="font-mono-data"
                      style={{
                        width: 52,
                        fontSize: 12,
                        color: t.textMuted,
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                      }}
                    >
                      {s.Time || "—"}
                    </span>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: dot,
                        opacity: 0.85,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary }}>
                        {label}
                      </div>
                      {!avail && !blocked && s.Phone && s.Phone !== "EMPTY" && (
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{s.Phone}</div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "3px 8px",
                        borderRadius: 9999,
                        background: avail
                          ? (dark ? "rgba(5,150,105,0.14)" : CAPACITY.high.tint)
                          : blocked
                            ? (dark ? "rgba(95,99,104,0.18)" : "rgba(95,99,104,0.10)")
                            : (dark ? "rgba(225,29,72,0.12)" : CAPACITY.low.tint),
                        color: avail ? CAPACITY.high.text : blocked ? "#5F6368" : CAPACITY.low.text,
                        border: `1px solid ${
                          avail
                            ? "rgba(5,150,105,0.22)"
                            : blocked
                              ? "rgba(95,99,104,0.25)"
                              : "rgba(225,29,72,0.2)"
                        }`,
                        flexShrink: 0,
                      }}
                    >
                      {s.Status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>
            AI suggestions
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {suggestions.map((s, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: i < suggestions.length - 1 ? `1px solid ${t.borderSub}` : "none",
                  fontSize: 13,
                  color: t.textSecondary,
                  lineHeight: 1.45,
                }}
              >
                <Sparkles size={14} strokeWidth={1.75} color={t.textMuted} style={{ marginTop: 2, flexShrink: 0 }} />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>
            Quick actions
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { id: "add", label: "Add slot", icon: Plus },
              { id: "block", label: "Block time", icon: Ban },
              { id: "extra", label: "Open extra", icon: Clock },
              { id: "copy", label: "Copy schedule", icon: Copy },
              { id: "capacity", label: "Edit capacity", icon: Users },
            ].map((a) => (
              <button
                key={a.id}
                type="button"
                className="ui-press"
                onClick={() => onQuickAction(a.id, selectedKey)}
                style={{
                  ...secondaryBtnStyle(t),
                  height: 38,
                  padding: "0 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontFamily: "inherit",
                  borderRadius: 11,
                  transition: "border-color 150ms ease, background 150ms ease, transform 150ms ease",
                }}
              >
                <a.icon size={14} strokeWidth={2} />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Slots() {
  const slots = useStore((s) => s.slots);
  const loading = useStore((s) => s.loading);
  const { theme: t, dark } = useTheme();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [view, setView] = useState("calendar");
  const [period, setPeriod] = useState("Month");
  const [technician, setTechnician] = useState("All");
  const [serviceType, setServiceType] = useState("All");
  const [selectedKey, setSelectedKey] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [actionModal, setActionModal] = useState(null);
  const searchRef = useRef(null);
  const createSlot = useStore((s) => s.createSlot);
  const createSlotsBulk = useStore((s) => s.createSlotsBulk);
  const copySlotsDay = useStore((s) => s.copySlotsDay);
  const updateSlotStatus = useStore((s) => s.updateSlotStatus);

  const slotsByDate = useMemo(() => {
    const map = {};
    (slots || []).forEach((s) => {
      if (!s.Date) return;
      if (!map[s.Date]) map[s.Date] = [];
      map[s.Date].push(s);
    });
    return map;
  }, [slots]);

  const metrics = useMemo(() => {
    const all = slots || [];
    const available = all.filter(isAvailable).length;
    const booked = all.length - available;
    const utilisation = all.length ? Math.round((booked / all.length) * 100) : 0;

    const byDate = {};
    all.forEach((s) => {
      if (!s.Date) return;
      if (!byDate[s.Date]) byDate[s.Date] = { total: 0, booked: 0 };
      byDate[s.Date].total += 1;
      if (!isAvailable(s)) byDate[s.Date].booked += 1;
    });
    const dates = Object.keys(byDate);
    const avgDaily = dates.length ? Math.round(all.length / dates.length) : 0;

    let peakDay = "—";
    let peakCount = -1;
    Object.entries(byDate).forEach(([date, stats]) => {
      if (stats.booked > peakCount) {
        peakCount = stats.booked;
        const d = parseSlotDate(date);
        peakDay = d
          ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
          : date;
      }
    });

    const spark = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
      const day = byDate[key];
      spark.push({ v: day ? day.booked : 0 });
    }

    return { available, booked, utilisation, avgDaily, peakDay, spark, total: all.length };
  }, [slots]);

  const insights = useMemo(
    () => buildAiInsights(slots || [], slotsByDate, metrics),
    [slots, slotsByDate, metrics]
  );

  const selectedSlots = selectedKey ? slotsByDate[selectedKey] || [] : [];

  useEffect(() => {
    if (period === "Today") {
      const now = new Date();
      setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
      setSelectedKey(toDateKey(now.getFullYear(), now.getMonth(), now.getDate()));
    } else if (period === "Week") {
      const now = new Date();
      setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  }, [period]);

  const filteredTable = useMemo(() => {
    const s = search.toLowerCase().trim();
    return (slots || []).filter((slot) => {
      if (!s) return true;
      return (
        slot.Day?.toLowerCase().includes(s) ||
        slot["Booked By"]?.toLowerCase().includes(s) ||
        slot.Date?.toLowerCase().includes(s) ||
        slot.Time?.toLowerCase().includes(s) ||
        slot.Phone?.toString().includes(s) ||
        slot.Status?.toLowerCase().includes(s)
      );
    });
  }, [slots, search]);

  function handleQuickAction(id) {
    if ((id === "block" || id === "extra" || id === "copy" || id === "capacity") && !selectedKey) {
      showToast("Select a day on the calendar first", "error");
      return;
    }
    setActionModal(id);
  }

  async function withSlotError(fn, okMsg) {
    try {
      const result = await fn();
      if (okMsg) showToast(okMsg);
      return result;
    } catch (err) {
      showToast(err?.message || "Action failed", "error");
      throw err;
    }
  }

  function handleExport() {
    exportToCSV(
      (slots || []).map((s) => ({
        ID: s.ID,
        Day: s.Day,
        Date: s.Date,
        Time: s.Time,
        Status: s.Status,
        "Booked By": s["Booked By"] || "",
        Phone: s.Phone || "",
      })),
      "slots.csv"
    );
  }

  if (loading) return <SlotsSkeleton />;

  const panel = {
    background: t.cardBg,
    border: `1px solid ${t.border}`,
    borderRadius: 18,
    boxShadow: t.cardShadow,
  };

  const TH = {
    padding: "14px 20px",
    fontSize: 12,
    fontWeight: 400,
    color: t.thColor,
    textAlign: "left",
    background: t.cardBg,
    borderBottom: `1px solid ${t.borderSub}`,
    position: "sticky",
    top: 0,
    zIndex: 1,
  };
  const TD = {
    padding: "16px 20px",
    fontSize: 14,
    color: t.tdColor,
    borderBottom: `1px solid ${t.borderSub}`,
  };

  return (
    <PageShell
      title="Slots"
      subtitle="Manage pitch availability and booking capacity."
      wide
      actions={
        <div className="slots-header-btns" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="ui-press"
            onClick={() => setView(view === "table" ? "calendar" : "table")}
            style={{
              ...secondaryBtnStyle(t),
              height: 40,
              padding: "0 16px",
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            {view === "table" ? <CalendarIcon size={15} strokeWidth={2} /> : <Table2 size={15} strokeWidth={2} />}
            {view === "table" ? "Calendar" : "Table"}
          </button>
          <button
            type="button"
            className="ui-press"
            onClick={handleExport}
            style={{
              ...secondaryBtnStyle(t),
              height: 40,
              padding: "0 16px",
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            <Download size={15} strokeWidth={2} />
            Export
          </button>
        </div>
      }
    >
      <style>{`
        @media(max-width:1100px){
          .slots-kpi{grid-template-columns:repeat(3,1fr)!important}
          .slots-cal-grid{grid-template-columns:1fr!important}
        }
        @media(max-width:768px){
          .slots-kpi{grid-template-columns:1fr 1fr!important}
          .slots-header-btns{width:100%}
          .slots-filters{flex-direction:column!important;align-items:stretch!important}
        }
        @media(max-width:520px){
          .slots-kpi{grid-template-columns:1fr!important}
        }
        .slots-day-cell:hover {
          transform: translateY(-1px);
        }
      `}</style>

      <div
        className="slots-kpi"
        style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}
      >
        <WalletCard label="Available slots" value={metrics.available.toLocaleString()} trend="Open for booking" t={t}>
          <MiniSparkline data={metrics.spark} color="#059669" />
        </WalletCard>
        <WalletCard label="Booked slots" value={metrics.booked.toLocaleString()} trend="Already taken" t={t} />
        <WalletCard label="Utilisation" value={`${metrics.utilisation}%`} trend="Booked ÷ total" t={t} />
        <WalletCard label="Peak day" value={metrics.peakDay} trend="Most bookings" t={t} />
        <WalletCard label="Avg daily capacity" value={metrics.avgDaily.toLocaleString()} trend="Slots per active day" t={t} />
      </div>

      <div
        style={{
          ...panel,
          padding: "20px 24px",
          marginBottom: 28,
          transition: "border-color 150ms cubic-bezier(0.2, 0, 0, 1), transform 150ms cubic-bezier(0.2, 0, 0, 1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = t.borderHover;
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = t.border;
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: insights.some((i) => i.tone === "warn") ? "#D97706" : "#059669",
              boxShadow: insights.some((i) => i.tone === "warn")
                ? "0 0 0 4px rgba(217,119,6,0.12)"
                : "0 0 0 4px rgba(5,150,105,0.10)",
            }}
          />
          <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            AI capacity insights
          </div>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {insights.map((item, i) => (
            <li
              key={i}
              style={{
                fontSize: 14,
                color: t.textSecondary,
                padding: "10px 0",
                borderBottom: i < insights.length - 1 ? `1px solid ${t.borderSub}` : "none",
                lineHeight: 1.45,
                display: "flex",
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background:
                    item.tone === "warn" ? "#D97706" : item.tone === "ok" ? "#059669" : t.accent,
                  marginTop: 7,
                  flexShrink: 0,
                  opacity: 0.85,
                }}
              />
              {item.text}
            </li>
          ))}
        </ul>
      </div>

      <div
        className="slots-filters"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <SegmentedControl
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          layoutId="slotsPeriodTab"
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
            aria-label="Technician"
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 10,
              border: `1px solid ${t.border}`,
              background: t.cardBg,
              color: t.textSecondary,
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            <option value="All">All technicians</option>
            <option value="Shop" disabled>
              Per technician (soon)
            </option>
          </select>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            aria-label="Service type"
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 10,
              border: `1px solid ${t.border}`,
              background: t.cardBg,
              color: t.textSecondary,
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            <option value="All">All services</option>
            <option value="Screen" disabled>
              By service (soon)
            </option>
          </select>
          <select
            disabled
            aria-label="Location"
            title="Location — future ready"
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 10,
              border: `1px solid ${t.border}`,
              background: t.cardBg,
              color: t.textMuted,
              fontSize: 13,
              fontFamily: "inherit",
              opacity: 0.7,
            }}
          >
            <option>All locations</option>
          </select>
        </div>
      </div>

      {view === "calendar" ? (
        <div
          className="slots-cal-grid"
          style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 20, alignItems: "start" }}
        >
          <CalendarView
            slotsByDate={slotsByDate}
            t={t}
            dark={dark}
            selectedKey={selectedKey}
            onSelectDay={setSelectedKey}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
          <DayPanel
            selectedKey={selectedKey}
            daySlots={selectedSlots}
            t={t}
            dark={dark}
            onQuickAction={handleQuickAction}
          />
        </div>
      ) : (
        <>
          <div style={{ position: "relative", marginBottom: 20, maxWidth: 480 }}>
            <Search
              size={16}
              strokeWidth={1.75}
              style={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                color: t.textMuted,
                pointerEvents: "none",
              }}
            />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search day, customer, phone…"
              style={{
                width: "100%",
                height: 44,
                padding: "0 16px 0 44px",
                borderRadius: 12,
                background: t.cardBg,
                border: `1px solid ${t.border}`,
                fontSize: 14,
                color: t.textPrimary,
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
          {filteredTable.length === 0 ? (
            <EmptyState
              illustration="default"
              title="No slots found"
              subtitle="Try a different search, or switch back to calendar view"
            />
          ) : (
            <div style={{ ...panel, overflow: "hidden" }}>
              <div style={{ overflowX: "auto", maxHeight: "min(70vh, 800px)" }}>
                <table className="data-table" style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["ID", "Day", "Date", "Time", "Status", "Booked By", "Phone"].map((h) => (
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTable.map((s, i) => {
                      const avail = isAvailable(s);
                      return (
                        <tr
                          key={s.ID || i}
                          style={{ cursor: s.Date ? "pointer" : "default", transition: "background 150ms cubic-bezier(0.2, 0, 0, 1)" }}
                          onClick={() => {
                            if (!s.Date) return;
                            setSelectedKey(s.Date);
                            const d = parseSlotDate(s.Date);
                            if (d) setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
                            setView("calendar");
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = t.rowHover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <td style={{ ...TD, fontFamily: "var(--font-mono)", fontSize: 12, color: t.textMuted }}>
                            {s.ID}
                          </td>
                          <td style={{ ...TD, fontWeight: 500 }}>{s.Day}</td>
                          <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>{s.Date}</td>
                          <td style={{ ...TD, fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                            {s.Time}
                          </td>
                          <td style={TD}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 9999,
                                fontSize: 12,
                                fontWeight: 500,
                                background: avail
                                  ? (dark ? "rgba(5,150,105,0.14)" : CAPACITY.high.tint)
                                  : (dark ? "rgba(225,29,72,0.12)" : CAPACITY.low.tint),
                                color: avail ? CAPACITY.high.text : CAPACITY.low.text,
                                border: `1px solid ${avail ? "rgba(5,150,105,0.22)" : "rgba(225,29,72,0.2)"}`,
                              }}
                            >
                              <span
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: "50%",
                                  background: avail ? CAPACITY.high.bar : CAPACITY.low.bar,
                                }}
                              />
                              {s.Status}
                            </span>
                          </td>
                          <td style={TD}>{s["Booked By"] || "—"}</td>
                          <td style={TD}>
                            {s.Phone ? (
                              <a
                                href={
                                  "https://wa.me/92" +
                                  String(s.Phone || "").replace(/[^0-9]/g, "").replace(/^0/, "")
                                }
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: t.accent, fontWeight: 500, textDecoration: "none" }}
                              >
                                {s.Phone}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    
      <AddSlotModal
        open={actionModal === "add"}
        onClose={() => setActionModal(null)}
        defaultDate={selectedKey}
        onSubmit={async (payload) => {
          await withSlotError(() => createSlot(payload), "Slot added");
        }}
      />
      <BlockTimeModal
        open={actionModal === "block"}
        onClose={() => setActionModal(null)}
        defaultDate={selectedKey}
        daySlots={selectedSlots}
        onSubmit={async (payload) => {
          if (payload.type === "block") {
            await withSlotError(() => updateSlotStatus(payload.slotId, "Blocked"), "Time blocked");
          } else {
            await withSlotError(
              () => createSlot({ date: payload.date, time: payload.time, status: "Blocked" }),
              "Blocked slot created"
            );
          }
        }}
      />
      <ExtraSlotModal
        open={actionModal === "extra"}
        onClose={() => setActionModal(null)}
        defaultDate={selectedKey}
        daySlots={selectedSlots}
        onSubmit={async (payload) => {
          await withSlotError(() => createSlot(payload), "Extra slot opened");
        }}
      />
      <CopyScheduleModal
        open={actionModal === "copy"}
        onClose={() => setActionModal(null)}
        fromDate={selectedKey}
        onSubmit={async (payload) => {
          const result = await withSlotError(() => copySlotsDay(payload), null);
          const n = result?.created?.length ?? 0;
          const skipped = result?.skipped?.length ?? 0;
          showToast(`Copied ${n} slot${n === 1 ? "" : "s"}${skipped ? ` (${skipped} skipped)` : ""}`);
          if (payload.to_date) setSelectedKey(payload.to_date);
        }}
      />
      <EditCapacityModal
        open={actionModal === "capacity"}
        onClose={() => setActionModal(null)}
        defaultDate={selectedKey}
        daySlots={selectedSlots}
        onSaveTimes={async (payload) => {
          const result = await withSlotError(() => createSlotsBulk(payload), null);
          const n = result?.created?.length ?? 0;
          showToast(`Added ${n} time${n === 1 ? "" : "s"}`);
        }}
        onToggleSlot={async (slot) => {
          const id = slot.id ?? slot.ID;
          const next = slot.Status === "Available" ? "Blocked" : "Available";
          await withSlotError(() => updateSlotStatus(id, next), next === "Blocked" ? "Slot blocked" : "Slot reopened");
        }}
      />
</PageShell>
  );
}
