import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { STATUS_COLORS, PAYMENT_COLORS } from "../constants";
import { PAYMENT_STATUSES, PAYMENT_STATUS_LABELS, normalizePaymentStatus } from "../utils/bookingFields";

export function closeAllTableDropdowns() {
  openDropdownId = null;
  notifyDropdownChange();
}

let openDropdownId = null;
const listeners = new Set();

function notifyDropdownChange() {
  listeners.forEach((fn) => fn());
}

function subscribeDropdown(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useCloseWhenTableDropdownOpens(setOpen) {
  useEffect(() => {
    return subscribeDropdown(() => {
      if (openDropdownId != null) setOpen(false);
    });
  }, [setOpen]);
}

export const BOOKING_STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Confirmed", label: "Confirmed" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "Rejected", label: "Rejected" },
  { value: "Completed", label: "Completed" },
  { value: "Reschedule", label: "Reschedule", apiValue: "Pending" },
];

const STATUS_SEMANTIC = {
  Pending: { dot: "#F59E0B" },
  Confirmed: { dot: "#059669" },
  Cancelled: { dot: "#71717A" },
  Rejected: { dot: "#E11D48" },
  Completed: { dot: "#059669" },
  Reschedule: { dot: "#6366F1" },
};

const STATUS_SEMANTIC_DARK = {
  Pending: { dot: "#FBBF24" },
  Confirmed: { dot: "#34D399" },
  Cancelled: { dot: "#A1A1AA" },
  Rejected: { dot: "#F43F5E" },
  Completed: { dot: "#34D399" },
  Reschedule: { dot: "#818CF8" },
};

function resolveStatusDot(status, dark) {
  const map = dark ? STATUS_SEMANTIC_DARK : STATUS_SEMANTIC;
  if (map[status]) return map[status].dot;
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.default;
  return cfg.dot;
}

function resolvePaymentDot(status, dark) {
  const normalized = normalizePaymentStatus(status);
  const cfg = PAYMENT_COLORS[normalized] || PAYMENT_COLORS.Unpaid;
  return cfg.dot;
}

function paymentLabel(status) {
  const normalized = normalizePaymentStatus(status);
  return PAYMENT_STATUS_LABELS[normalized] || normalized;
}

function useDropdownRegistry(instanceId) {
  const [, bump] = useState(0);

  useEffect(() => subscribeDropdown(() => bump((n) => n + 1)), []);

  const isOpenElsewhere = openDropdownId != null && openDropdownId !== instanceId;

  const open = useCallback(() => {
    openDropdownId = instanceId;
    notifyDropdownChange();
  }, [instanceId]);

  const close = useCallback(() => {
    if (openDropdownId === instanceId) {
      openDropdownId = null;
      notifyDropdownChange();
    }
  }, [instanceId]);

  const toggle = useCallback(() => {
    if (openDropdownId === instanceId) {
      close();
    } else {
      open();
    }
  }, [instanceId, open, close]);

  return { isOpen: openDropdownId === instanceId, isOpenElsewhere, open, close, toggle };
}

function TableDropdown({
  label,
  valueLabel,
  dotColor,
  options,
  selectedValue,
  disabled,
  loading,
  minWidth = 152,
  onSelect,
}) {
  const { theme: t, dark } = useTheme();
  const instanceId = useId();
  const { isOpen, toggle, close } = useDropdownRegistry(instanceId);
  const [pos, setPos] = useState({ top: 0, left: 0, width: minWidth, openUp: false });
  const [activeIndex, setActiveIndex] = useState(-1);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const placeMenu = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const menuH = Math.min(options.length * 42 + 12, 280);
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < menuH + 12 && r.top > menuH + 12;
    const width = Math.max(minWidth, r.width);
    let left = r.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    setPos({
      top: openUp ? Math.max(8, r.top - menuH - 6) : r.bottom + 6,
      left,
      width,
      openUp,
    });
  }, [minWidth, options.length]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    placeMenu();
    const idx = options.findIndex((o) => o.value === selectedValue);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [isOpen, placeMenu, options, selectedValue]);

  useEffect(() => {
    if (!isOpen) return;
    function onDoc(e) {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      close();
    }
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [isOpen, close, placeMenu]);

  function handleTriggerKeyDown(e) {
    if (disabled || loading) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) toggle();
      else setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) toggle();
      else setActiveIndex((i) => Math.max(i - 1, 0));
    }
  }

  function handleMenuKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) selectOption(opt);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
      btnRef.current?.focus();
    }
  }

  function selectOption(opt) {
    if (disabled || loading) return;
    close();
    if (opt.value !== selectedValue) onSelect?.(opt);
  }

  const controlBg = dark ? "#181819" : "#FFFFFF";
  const controlBorder = t.border;

  return (
    <div style={{ display: "inline-flex", minWidth: 0 }}>
      <button
        ref={btnRef}
        type="button"
        className="bk-table-dd-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        title={label}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled && !loading) toggle();
        }}
        onKeyDown={handleTriggerKeyDown}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 42,
          minWidth: minWidth,
          maxWidth: 168,
          padding: "0 12px",
          borderRadius: 10,
          border: `1px solid ${isOpen ? (dark ? "rgba(255,255,255,0.14)" : "rgba(15,17,21,0.14)") : controlBorder}`,
          background: controlBg,
          color: t.textPrimary,
          fontSize: 13,
          fontWeight: 500,
          cursor: disabled ? "not-allowed" : loading ? "wait" : "pointer",
          opacity: disabled ? 0.55 : loading ? 0.72 : 1,
          fontFamily: "inherit",
          transition: "border-color 160ms ease, background 160ms ease, opacity 160ms ease",
          boxSizing: "border-box",
        }}
      >
        {loading ? (
          <Loader2 size={14} strokeWidth={2} className="bk-dd-spin" aria-hidden style={{ flexShrink: 0, color: t.textMuted }} />
        ) : (
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dotColor,
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            flex: 1,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {valueLabel}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2.25}
          aria-hidden
          style={{
            flexShrink: 0,
            color: t.textMuted,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 160ms ease",
          }}
        />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            className="bk-table-dd-menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 5000,
              padding: 6,
              borderRadius: 11,
              background: dark ? "#111112" : "#FFFFFF",
              border: `1px solid ${t.border}`,
              boxShadow: dark
                ? "0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)"
                : "0 12px 32px rgba(15,17,21,0.10), 0 0 0 1px rgba(15,17,21,0.04)",
              maxHeight: 280,
              overflowY: "auto",
            }}
          >
            {options.map((opt, i) => {
              const active = opt.value === selectedValue;
              const focused = i === activeIndex;
              const dot = opt.dot ?? dotColor;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className="bk-table-dd-option"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectOption(opt);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    height: 42,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: "none",
                    background: focused ? t.rowHover : active ? (dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.03)") : "transparent",
                    color: t.textPrimary,
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "background 150ms ease",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: dot,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1 }}>{opt.label}</span>
                  {active && <Check size={14} strokeWidth={2.25} color={t.textMuted} aria-hidden />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

export function BookingStatusDropdown({ status, bookingId, disabled, loading, onChange }) {
  const { dark } = useTheme();
  const current = status || "Pending";
  const options = BOOKING_STATUS_OPTIONS.map((opt) => ({
    ...opt,
    dot: resolveStatusDot(opt.value, dark),
  }));
  const selectedOpt = BOOKING_STATUS_OPTIONS.find((o) => o.value === current);
  const valueLabel = selectedOpt?.label || current;
  const dot = resolveStatusDot(current, dark);

  return (
    <TableDropdown
      label="Booking status"
      valueLabel={valueLabel}
      dotColor={dot}
      options={options}
      selectedValue={BOOKING_STATUS_OPTIONS.some((o) => o.value === current) ? current : current}
      disabled={disabled}
      loading={loading}
      minWidth={148}
      onSelect={(opt) => {
        const next = opt.apiValue ?? opt.value;
        onChange?.(bookingId, next, opt.value);
      }}
    />
  );
}

export function BookingPaymentDropdown({ status, bookingId, disabled, loading, onChange }) {
  const { dark } = useTheme();
  const current = normalizePaymentStatus(status);
  const options = PAYMENT_STATUSES.map((item) => ({
    value: item,
    label: PAYMENT_STATUS_LABELS[item] || item,
    dot: resolvePaymentDot(item, dark),
  }));

  return (
    <TableDropdown
      label="Payment status"
      valueLabel={paymentLabel(current)}
      dotColor={resolvePaymentDot(current, dark)}
      options={options}
      selectedValue={current}
      disabled={disabled}
      loading={loading}
      minWidth={140}
      onSelect={(opt) => onChange?.(bookingId, opt.value)}
    />
  );
}
