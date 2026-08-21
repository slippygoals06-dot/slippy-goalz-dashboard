import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  X,
  MoreHorizontal,
  Plus,
  Trash2,
  Search,
  Download,
  Eye,
  CheckCircle2,
  FileText,
  Wrench,
  Calendar,
  Clock,
  Phone,
  Smartphone,
  MessageCircle,
  Link2,
  Users,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { useTheme, primaryBtnStyle, primaryBtnHoverProps, secondaryBtnStyle, cardHoverProps } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { SkeletonBlock } from "../components/Skeleton";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import SegmentedControl from "../components/SegmentedControl";
import IdChip from "../components/IdChip";
import PageShell from "../components/PageShell";
import Sheet from "../components/Sheet";
import CustomerHistory from "../components/CustomerHistory";
import ConversationHistory from "../components/ConversationHistory";
import CreateWeeklyPackageModal from "../components/CreateWeeklyPackageModal";
import { exportToCSV } from "../utils/export";
import { formatDate, formatPhone, whatsappLink, phoneKey, getInitials } from "../utils/format";
import { isStalePending } from "../utils/sla";
import { getCustomerTier } from "../utils/customerTier";
import { isUnpaidAging } from "../utils/unpaidAging";
import { BookingStatusDropdown, BookingPaymentDropdown, closeAllTableDropdowns, useCloseWhenTableDropdownOpens } from "../components/BookingTableDropdown";
import { usePaymentStatus } from "../hooks/usePaymentStatus";
import { completeBookingWithInvoice, updateBooking } from "../api";
import { bookingRevenue } from "../utils/bookingRevenue";
import { fromApiRow, PAYMENT_STATUSES, PAYMENT_STATUS_LABELS, PAYMENT_MODES } from "../utils/bookingFields";
import BookingAttachments from "../components/BookingAttachments";

/** CUST-8E942B6F → #8E942B */
function shortBookingId(id) {
  if (!id) return "—";
  const s = String(id).trim();
  const hex = s.match(/([A-Fa-f0-9]{6,})(?!.*[A-Fa-f0-9])/);
  if (hex) return `#${hex[1].slice(0, 6).toUpperCase()}`;
  const cleaned = s.replace(/^(CUST|BK)[-_]?/i, "");
  return `#${cleaned.slice(-6).toUpperCase()}`;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  let d = new Date(dateStr);
  if (isNaN(d)) {
    const parts = String(dateStr).split(/[-/.\s]/);
    if (parts.length === 3) {
      d = new Date(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`);
    }
  }
  return isNaN(d) ? null : d;
}

function isToday(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const ADD_EMPTY = {
  name: "",
  phone: "",
  players: 10,
  paymentMode: "Cash",
  date: "",
  time: "",
  paymentStatus: "Unpaid",
  amount: "",
  notes: "",
};

function CustomerAvatar({ name, size = 36, t }) {
  const initials = getInitials(name) || "?";
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.32,
        fontWeight: 500,
        letterSpacing: 0.2,
        color: t.textSecondary,
        background: t.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,17,21,0.05)",
        border: `1px solid ${t.border}`,
      }}
    >
      {initials}
    </div>
  );
}

function WalletCard({ label, value, trend, icon: Icon, t, emphasize }) {
  const hover = cardHoverProps(t);
  return (
    <div
      className="bk-wallet"
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
        gap: 20,
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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 400, color: t.textMuted, lineHeight: 1.3 }}>{label}</div>
        {Icon && (
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)",
              color: t.textMuted,
              flexShrink: 0,
            }}
          >
            <Icon size={14} strokeWidth={1.75} />
          </span>
        )}
      </div>
      <div>
        <div
          style={{
            fontSize: emphasize ? 32 : 28,
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
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 400, color: t.textMuted, lineHeight: 1.3 }}>
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}

function AddBookingModal({ open, onClose, onSaved }) {
  const { theme: t } = useTheme();
  const { showToast } = useToast();
  const addBooking = useStore((s) => s.addBooking);
  const [form, setForm] = useState(ADD_EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(ADD_EMPTY);
    setError("");
    setSaving(false);
  }, [open]);

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    const missing = [];
    if (!form.name?.trim()) missing.push("name");
    if (!form.phone?.trim()) missing.push("phone");
    if (!form.players || Number(form.players) < 1) missing.push("players");
    if (!form.paymentMode) missing.push("payment mode");
    if (!form.date) missing.push("date");
    if (!form.time) missing.push("time");
    if (missing.length) {
      setError(`Please fill in: ${missing.join(", ")}`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addBooking({ ...form });
      showToast("Booking added");
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to add booking");
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

  return (
    <Modal open={open} onClose={() => !saving && onClose?.()} maxWidth={500} maxHeight="90vh">
      <div style={{ padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: t.textPrimary, letterSpacing: -0.3 }}>
              Add booking
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: t.textMuted, fontWeight: 400 }}>
              Add a new customer booking
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => !saving && onClose?.()}
            aria-label="Close"
            style={{
              background: t.cardBg2,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              width: 36,
              height: 36,
              cursor: saving ? "default" : "pointer",
              fontSize: 18,
              color: t.textSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <AddField label="Customer name *" span={2} t={t}>
            <input style={inputStyle} value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Ali Hassan" />
          </AddField>
          <AddField label="Phone number *" t={t}>
            <input style={inputStyle} value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="+92 3xx xxxxxxx" />
          </AddField>
          <AddField label="Players *" t={t}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => handleChange("players", Math.max(1, Number(form.players || 1) - 1))}
                style={{ ...inputStyle, width: 42, padding: 0, cursor: "pointer", fontSize: 18, flexShrink: 0 }}
              >−</button>
              <input
                style={{ ...inputStyle, textAlign: "center" }}
                type="number"
                min={1}
                max={10}
                value={form.players}
                onChange={(e) => handleChange("players", Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
              />
              <button
                type="button"
                onClick={() => handleChange("players", Math.min(10, Number(form.players || 1) + 1))}
                style={{ ...inputStyle, width: 42, padding: 0, cursor: "pointer", fontSize: 18, flexShrink: 0 }}
              >+</button>
            </div>
          </AddField>
          <AddField label="Price (Rs)" span={2} t={t}>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={form.amount}
              onChange={(e) => handleChange("amount", e.target.value)}
              placeholder="e.g. 4000"
            />
          </AddField>
          <AddField label="Payment status" span={2} t={t}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PAYMENT_STATUSES.map((status) => {
                const active = form.paymentStatus === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleChange("paymentStatus", status)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "8px 10px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      border: `1px solid ${active ? t.accent : t.border}`,
                      background: active ? t.accentGlow : t.inputBg,
                      color: active ? t.textPrimary : t.textSecondary,
                      fontFamily: "inherit",
                    }}
                  >
                    {PAYMENT_STATUS_LABELS[status] || status}
                  </button>
                );
              })}
            </div>
          </AddField>
          <AddField label="Payment mode *" span={2} t={t}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PAYMENT_MODES.map((mode) => {
                const active = form.paymentMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleChange("paymentMode", mode)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "8px 10px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      border: `1px solid ${active ? t.accent : t.border}`,
                      background: active ? t.accentGlow : t.inputBg,
                      color: active ? t.textPrimary : t.textSecondary,
                      fontFamily: "inherit",
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </AddField>
          <AddField label="Booking date *" t={t}>
            <input style={inputStyle} type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} />
          </AddField>
          <AddField label="Booking time *" t={t}>
            <input style={inputStyle} type="time" value={form.time} onChange={(e) => handleChange("time", e.target.value)} />
          </AddField>
          <AddField label="Notes" span={2} t={t}>
            <textarea
              style={{ ...inputStyle, resize: "vertical" }}
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Any extra details…"
              rows={2}
            />
          </AddField>
        </div>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              background: "rgba(239,68,68,0.1)",
              color: "#fca5a5",
              borderRadius: 12,
              fontSize: 13,
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="ui-interactive"
            disabled={saving}
            onClick={() => !saving && onClose?.()}
            style={{ ...secondaryBtnStyle(t), padding: "10px 18px", fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ui-interactive"
            onClick={handleSave}
            disabled={saving}
            {...primaryBtnHoverProps(t)}
            style={{
              ...primaryBtnStyle(t),
              padding: "10px 22px",
              fontSize: 13,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Add booking"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddField({ label, children, span = 1, t }) {
  return (
    <div style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 500,
          color: t.textMuted,
          marginBottom: 8,
          letterSpacing: 0,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function RowActionsMenu({ booking, onView, onViewCustomer, onComplete, onInvoice, onDelete, onConfirm, onReject }) {
  const { theme: t } = useTheme();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 8 });
  const [activeIndex, setActiveIndex] = useState(0);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const items = [
    { label: "View booking", icon: Eye, onClick: () => onView?.(booking) },
    { label: "View customer", icon: Users, onClick: () => onViewCustomer?.(booking) },
    booking.Status === "Pending" && {
      label: "Confirm",
      icon: Check,
      onClick: () => onConfirm?.(booking["Booking ID"], booking.Name),
    },
    booking.Status === "Pending" && {
      label: "Reject",
      icon: X,
      onClick: () => onReject?.(booking["Booking ID"], booking.Name),
      danger: true,
    },
    (booking.Status === "Confirmed" || booking.Status === "Pending") && {
      label: "Complete",
      icon: CheckCircle2,
      onClick: () => onComplete?.(booking),
    },
    {
      label: "Invoice",
      icon: FileText,
      onClick: () => onInvoice?.(booking),
    },
    { type: "separator" },
    {
      label: "Delete",
      icon: Trash2,
      onClick: () => onDelete?.(booking),
      danger: true,
    },
  ].filter(Boolean);

  useCloseWhenTableDropdownOpens(setOpen);

  const actionableCount = items.filter((i) => i.type !== "separator").length;

  const placeMenu = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const menuH = actionableCount * 42 + (items.some((i) => i.type === "separator") ? 13 : 0) + 16;
    const openUp = window.innerHeight - r.bottom < menuH + 12 && r.top > menuH;
    setPos({
      top: openUp ? Math.max(8, r.top - menuH - 8) : r.bottom + 8,
      right: Math.max(8, window.innerWidth - r.right),
    });
  }, [actionableCount, items]);

  useLayoutEffect(() => {
    if (!open) return;
    placeMenu();
    setActiveIndex(0);
  }, [open, placeMenu]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
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
  }, [open, placeMenu]);

  function runItem(item) {
    if (!item || item.type === "separator") return;
    setOpen(false);
    item.onClick?.();
  }

  function handleTriggerKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      closeAllTableDropdowns();
      setOpen((v) => !v);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      if (!open) {
        closeAllTableDropdowns();
        setOpen(true);
      }
    }
  }

  function handleMenuKeyDown(e) {
    const navigable = items.filter((i) => i.type !== "separator");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, navigable.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      runItem(navigable[activeIndex]);
    }
  }

  let navIndex = -1;

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        ref={btnRef}
        type="button"
        className={`bk-icon-btn${open ? " bk-icon-btn--open" : ""}`}
        title="Actions"
        aria-label="Booking actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          closeAllTableDropdowns();
          setOpen((v) => !v);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <MoreHorizontal size={16} strokeWidth={2} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Booking actions"
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            style={{
              position: "fixed",
              top: pos.top,
              right: pos.right,
              zIndex: 5000,
              width: 208,
              padding: 6,
              borderRadius: 11,
              background: t.cardBg,
              border: `1px solid ${t.border}`,
              boxShadow: t.cardShadowHover || t.cardShadow,
              overflow: "visible",
            }}
          >
            {items.map((item, i) => {
              if (item.type === "separator") {
                return (
                  <div
                    key={`sep-${i}`}
                    role="separator"
                    style={{ height: 1, background: t.border, margin: "6px 8px" }}
                  />
                );
              }
              navIndex += 1;
              const focused = navIndex === activeIndex;
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className="ui-press"
                  onMouseEnter={() => setActiveIndex(navIndex)}
                  onClick={(e) => {
                    e.stopPropagation();
                    runItem(item);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    height: 42,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "none",
                    background: focused ? t.rowHover : "transparent",
                    color: item.danger ? "#E11D48" : t.textPrimary,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    transition: "background 150ms ease",
                  }}
                >
                  <item.icon size={15} strokeWidth={2} />
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

function DrawerSection({ title, children, t }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: t.textMuted,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

function BookingDrawer({
  booking,
  bookings,
  invoices,
  onClose,
  onConfirm,
  onReject,
  onCompleted,
  onNotesSaved,
  onAmountSaved,
  onDepositSaved,
}) {
  const { theme: t } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState("details");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [depositDraft, setDepositDraft] = useState("");
  const [depositPaidDraft, setDepositPaidDraft] = useState(false);
  const [savingDeposit, setSavingDeposit] = useState(false);
  const { changeStatus, loadingId: paymentLoadingId } = usePaymentStatus();

  useEffect(() => {
    setTab("details");
    setCompleteOpen(false);
    setInvoiceAmount(booking?.amount != null && booking.amount !== "" ? String(booking.amount) : "");
    setPriceDraft(booking?.amount != null && booking.amount !== "" ? String(booking.amount) : "");
    setDepositDraft(
      booking?.deposit_amount != null && booking.deposit_amount !== ""
        ? String(booking.deposit_amount)
        : ""
    );
    setDepositPaidDraft(Boolean(booking?.deposit_paid));
    setNotes(booking?.Notes || "");
  }, [booking?.["Booking ID"], booking?.Notes, booking?.amount, booking?.deposit_amount, booking?.deposit_paid]);

  const tier = booking
    ? getCustomerTier(
        { phone: booking.Phone, customer_id: booking.customer_id },
        bookings,
        invoices
      )
    : null;

  const suggestions = useMemo(() => {
    if (!booking) return [];
    const list = [];
    if (booking.Status === "Pending") {
      list.push("Confirm this appointment to lock the slot and notify the customer.");
    }
    if ((booking["Payment Status"] || "Unpaid") === "Unpaid") {
      list.push("Collect payment on completion, or send an invoice reminder.");
    }
    if (isStalePending(booking)) {
      list.push("This booking has been pending for 4+ hours — prioritize a response.");
    }
    if (tier === "VIP") {
      list.push("VIP customer — prioritize scheduling and communication.");
    }
    if (booking.Status === "Confirmed" && !booking.deposit_paid) {
      list.push("Take a deposit before peak hours to cut no-shows.");
    }
    if (booking.Status === "No-show") {
      list.push(
        booking.deposit_paid
          ? "No-show with deposit on file — keep as forfeit or mark Refunded."
          : "No-show with no deposit — follow up before rebooking this phone."
      );
    }
    if (!booking.Notes) {
      list.push("Add internal notes about the booking or special requests.");
    }
    if (list.length === 0) {
      list.push("Workflow looks healthy — no urgent actions required.");
    }
    return list.slice(0, 3);
  }, [booking, tier]);

  if (!booking) return null;

  const notesDirty = (notes || "") !== (booking.Notes || "");
  const savedPrice = booking.amount != null && booking.amount !== "" ? String(booking.amount) : "";
  const priceDirty = (priceDraft || "") !== savedPrice;
  const canComplete = booking.Status === "Confirmed" || booking.Status === "Pending";
  const amountDisplay =
    booking.amount != null && booking.amount !== ""
      ? `Rs ${Number(booking.amount).toLocaleString()}`
      : null;

  async function handleSavePrice() {
    const amount = Number(priceDraft);
    if (priceDraft.trim() === "" || Number.isNaN(amount) || amount < 0) {
      showToast("Enter a valid price", "error");
      return;
    }
    setSavingPrice(true);
    try {
      await updateBooking(encodeURIComponent(booking["Booking ID"]), { amount });
      onAmountSaved?.(booking["Booking ID"], amount);
      showToast("Price saved");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to save price", "error");
    } finally {
      setSavingPrice(false);
    }
  }

  async function handleSaveDeposit() {
    const depositAmount =
      depositDraft.trim() === "" ? null : Number(depositDraft);
    if (depositDraft.trim() !== "" && (Number.isNaN(depositAmount) || depositAmount < 0)) {
      showToast("Enter a valid deposit", "error");
      return;
    }
    setSavingDeposit(true);
    try {
      await updateBooking(encodeURIComponent(booking["Booking ID"]), {
        deposit_amount: depositAmount,
        deposit_paid: depositPaidDraft,
      });
      onDepositSaved?.(booking["Booking ID"], {
        deposit_amount: depositAmount,
        deposit_paid: depositPaidDraft,
      });
      showToast("Deposit saved");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to save deposit", "error");
    } finally {
      setSavingDeposit(false);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await updateBooking(encodeURIComponent(booking["Booking ID"]), { notes: notes || null });
      onNotesSaved?.(booking["Booking ID"], notes || "");
      showToast("Notes saved");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to save notes", "error");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleGenerateInvoice() {
    const amount = Number(invoiceAmount);
    if (Number.isNaN(amount) || amount < 0) {
      showToast("Enter a valid amount", "error");
      return;
    }
    setSubmitting(true);
    try {
      await completeBookingWithInvoice(booking["Booking ID"], amount);
      showToast("Booking completed — invoice created");
      onCompleted?.(booking["Booking ID"], amount);
      setCompleteOpen(false);
      onClose();
      navigate("/invoices");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to complete booking", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const mapped = fromApiRow(booking);
  const metaRows = [
    { icon: Phone, label: "Phone", value: formatPhone(booking.Phone) },
    { icon: Users, label: "Players", value: mapped.playersLabel || booking.Device },
    { icon: Wrench, label: "Payment mode", value: mapped.paymentMode },
    { icon: Calendar, label: "Date", value: formatDate(booking.Date) },
    { icon: Clock, label: "Time", value: booking.Time },
  ].filter((r) => r.value);

  const footer =
    tab === "details" ? (
      <>
        {booking.Status === "Pending" && (
          <>
            <button
              type="button"
              className="ui-press"
              onClick={() => {
                onConfirm(booking["Booking ID"], booking.Name);
                onClose();
              }}
              {...primaryBtnHoverProps(t)}
              style={{ ...primaryBtnStyle(t), padding: "10px 16px", fontSize: 13, fontFamily: "inherit", flex: 1 }}
            >
              Confirm
            </button>
            <button
              type="button"
              className="ui-press"
              onClick={() => {
                onReject(booking["Booking ID"], booking.Name);
                onClose();
              }}
              style={{ ...secondaryBtnStyle(t), padding: "10px 16px", fontSize: 13, fontFamily: "inherit", flex: 1 }}
            >
              Reject
            </button>
          </>
        )}
        {canComplete && booking.Status !== "Pending" && (
          <button
            type="button"
            className="ui-press"
            onClick={() => {
              setInvoiceAmount(booking.amount != null && booking.amount !== "" ? String(booking.amount) : "");
              setCompleteOpen(true);
            }}
            {...primaryBtnHoverProps(t)}
            style={{ ...primaryBtnStyle(t), padding: "10px 16px", fontSize: 13, fontFamily: "inherit", width: "100%" }}
          >
            Mark Completed
          </button>
        )}
        {booking.Status === "Pending" && canComplete && (
          <button
            type="button"
            className="ui-press"
            onClick={() => {
              setInvoiceAmount(booking.amount != null && booking.amount !== "" ? String(booking.amount) : "");
              setCompleteOpen(true);
            }}
            style={{ ...secondaryBtnStyle(t), padding: "10px 16px", fontSize: 13, fontFamily: "inherit", width: "100%", marginTop: 0 }}
          >
            Complete & invoice
          </button>
        )}
        {booking.Status === "Completed" && (
          <div
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 400,
              textAlign: "center",
              color: t.textSecondary,
              border: `1px solid ${t.border}`,
              background: t.name === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.02)",
            }}
          >
            Completed — invoice generated
          </div>
        )}
      </>
    ) : null;

  return (
    <>
      <Sheet
        open={!!booking && !completeOpen}
        onClose={() => {
          setTab("details");
          onClose();
        }}
        title={booking.Name}
        subtitle={shortBookingId(booking["Booking ID"])}
        width={480}
        footer={footer}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          <StatusBadge status={booking.Status} pulse={booking.Status === "Pending"} />
          {tier && <StatusBadge status={tier} />}
          {booking.package_id && <StatusBadge status="Weekly package" />}
          {booking.Source && <StatusBadge status={booking.Source} />}
          <StatusBadge status={booking["Payment Status"] || "Unpaid"} />
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 3,
            marginBottom: 24,
            borderRadius: 10,
            background: t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)",
            border: `1px solid ${t.border}`,
          }}
        >
          {["details", "history"].map((id) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                className="ui-press"
                onClick={() => setTab(id)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  cursor: "pointer",
                  border: "none",
                  background: active ? t.cardBg : "transparent",
                  color: active ? t.textPrimary : t.textSecondary,
                  boxShadow: active ? t.cardShadow : "none",
                  fontFamily: "inherit",
                }}
              >
                {id === "details" ? "Details" : "Activity"}
              </button>
            );
          })}
        </div>

        {tab === "details" ? (
          <>
            <DrawerSection title="Customer" t={t}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <CustomerAvatar name={booking.Name} size={44} t={t} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: t.textPrimary }}>{booking.Name}</div>
                  <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
                    {formatPhone(booking.Phone)}
                    {booking.Email ? ` · ${booking.Email}` : ""}
                  </div>
                </div>
              </div>
            </DrawerSection>

            <DrawerSection title="Appointment" t={t}>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {metaRows.map((row, i) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 0",
                      borderBottom: i < metaRows.length - 1 ? `1px solid ${t.borderSub}` : "none",
                    }}
                  >
                    <row.icon size={15} strokeWidth={1.75} color={t.textMuted} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 400 }}>{row.label}</div>
                      <div style={{ fontSize: 14, color: t.textPrimary, fontWeight: 400, marginTop: 2 }}>{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </DrawerSection>

            <DrawerSection title="Timeline" t={t}>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingLeft: 4 }}>
                {[
                  { label: "Created", done: true },
                  { label: booking.Status || "Current", done: true, current: true },
                ].map((step, i, arr) => (
                  <div key={step.label + i} style={{ display: "flex", gap: 12, minHeight: i < arr.length - 1 ? 40 : 24 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 12 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: step.current ? t.accent : t.textMuted,
                          opacity: step.current ? 1 : 0.5,
                          flexShrink: 0,
                          marginTop: 2,
                          boxShadow: step.current ? `0 0 0 3px ${t.accentGlow || "rgba(225,29,72,0.15)"}` : "none",
                        }}
                      />
                      {i < arr.length - 1 && (
                        <span style={{ flex: 1, width: 1, background: t.border, marginTop: 4 }} />
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: step.current ? 500 : 400, color: t.textPrimary, paddingBottom: 8 }}>
                      {step.label}
                    </div>
                  </div>
                ))}
              </div>
            </DrawerSection>

            <DrawerSection title="Payment" t={t}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 8 }}>Payment</div>
                  <BookingPaymentDropdown
                    status={booking["Payment Status"]}
                    bookingId={booking["Booking ID"]}
                    onChange={changeStatus}
                    loading={paymentLoadingId === booking["Booking ID"]}
                  />
                </div>
                {amountDisplay && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: t.textMuted }}>Saved price</div>
                    <div
                      className="font-mono-data"
                      style={{ fontSize: 15, fontWeight: 500, color: t.textPrimary, marginTop: 4 }}
                    >
                      {amountDisplay}
                    </div>
                  </div>
                )}
              </div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 8, marginTop: 16 }}>
                Deposit (Rs)
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={depositDraft}
                  onChange={(e) => setDepositDraft(e.target.value)}
                  placeholder="0"
                  style={{
                    flex: 1,
                    minWidth: 120,
                    height: 42,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: `1px solid ${t.border}`,
                    background: t.cardBg2 || t.pageBg,
                    color: t.textPrimary,
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                />
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: t.textSecondary,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={depositPaidDraft}
                    onChange={(e) => setDepositPaidDraft(e.target.checked)}
                  />
                  Deposit paid
                </label>
                <button
                  type="button"
                  onClick={handleSaveDeposit}
                  disabled={savingDeposit}
                  style={{
                    ...secondaryBtnStyle(t),
                    height: 42,
                    padding: "0 14px",
                    opacity: savingDeposit ? 0.7 : 1,
                  }}
                >
                  {savingDeposit ? "Saving…" : "Save deposit"}
                </button>
              </div>

              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 8, marginTop: 16 }}>
                Price (Rs)
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  placeholder="Enter price"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 42,
                    padding: "0 12px",
                    borderRadius: 10,
                    background: t.inputBg,
                    border: `1px solid ${t.border}`,
                    fontSize: 14,
                    color: t.textPrimary,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  className="ui-press"
                  disabled={!priceDirty || savingPrice}
                  onClick={handleSavePrice}
                  style={{
                    ...secondaryBtnStyle(t),
                    height: 42,
                    padding: "0 14px",
                    fontSize: 12,
                    opacity: !priceDirty || savingPrice ? 0.5 : 1,
                    cursor: !priceDirty || savingPrice ? "default" : "pointer",
                    fontFamily: "inherit",
                    flexShrink: 0,
                  }}
                >
                  {savingPrice ? "Saving…" : "Save"}
                </button>
              </div>
            </DrawerSection>

            <DrawerSection title="Notes" t={t}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add internal notes about this customer or booking…"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  resize: "vertical",
                  background: t.inputBg,
                  border: `1px solid ${t.border}`,
                  fontSize: 13,
                  color: t.textPrimary,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                }}
              />
              <button
                type="button"
                className="ui-press"
                disabled={!notesDirty || savingNotes}
                onClick={handleSaveNotes}
                style={{
                  ...secondaryBtnStyle(t),
                  marginTop: 10,
                  padding: "8px 14px",
                  fontSize: 12,
                  opacity: !notesDirty || savingNotes ? 0.5 : 1,
                  cursor: !notesDirty || savingNotes ? "default" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {savingNotes ? "Saving…" : "Save notes"}
              </button>
            </DrawerSection>

            <DrawerSection title="Attachments" t={t}>
              <BookingAttachments
                bookingId={booking.id || booking["Booking ID"]}
                role="owner"
                allowVideo
              />
            </DrawerSection>

            <DrawerSection title="AI suggestions" t={t}>
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
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: t.accent,
                        marginTop: 6,
                        flexShrink: 0,
                        opacity: 0.7,
                      }}
                    />
                    {s}
                  </li>
                ))}
              </ul>
            </DrawerSection>

            <a
              href={whatsappLink(booking.Phone)}
              target="_blank"
              rel="noreferrer"
              className="ui-press"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px",
                borderRadius: 12,
                background: "transparent",
                color: t.textSecondary,
                fontWeight: 500,
                fontSize: 13,
                textDecoration: "none",
                border: `1px solid ${t.border}`,
                fontFamily: "inherit",
              }}
            >
              <MessageCircle size={15} strokeWidth={1.75} />
              WhatsApp {booking.Name}
            </a>
          </>
        ) : (
          <DrawerSection title="Conversation · read-only" t={t}>
            <div
              style={{
                background: t.name === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,17,21,0.02)",
                borderRadius: 12,
                border: `1px solid ${t.border}`,
                padding: 12,
              }}
            >
              <ConversationHistory bookingId={booking["Booking ID"]} />
            </div>
          </DrawerSection>
        )}
      </Sheet>

      <Modal open={completeOpen} onClose={() => !submitting && setCompleteOpen(false)} maxWidth={400} maxHeight="90vh">
        <div style={{ padding: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: t.textPrimary, marginBottom: 8, letterSpacing: -0.3 }}>
            Complete &amp; invoice
          </div>
          <p style={{ fontSize: 13, color: t.textSecondary, marginBottom: 20, lineHeight: 1.5, fontWeight: 400 }}>
            Set the final amount for <strong style={{ color: t.textPrimary, fontWeight: 500 }}>{booking.Name}</strong>
            {booking.Service ? ` · ${booking.Service}` : ""}. You can override the quoted price.
          </p>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: t.textMuted,
              marginBottom: 8,
            }}
          >
            Invoice amount (Rs)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={invoiceAmount}
            onChange={(e) => setInvoiceAmount(e.target.value)}
            placeholder="0"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              marginBottom: 20,
              background: t.inputBg,
              border: `1px solid ${t.border}`,
              fontSize: 16,
              fontWeight: 500,
              color: t.textPrimary,
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "var(--font-mono)",
            }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="ui-interactive"
              disabled={submitting}
              onClick={() => setCompleteOpen(false)}
              style={{ ...secondaryBtnStyle(t), flex: 1, padding: "12px", fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              className="ui-interactive"
              disabled={submitting}
              onClick={handleGenerateInvoice}
              {...primaryBtnHoverProps(t)}
              style={{
                ...primaryBtnStyle(t),
                flex: 1,
                padding: "12px",
                fontSize: 13,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Creating…" : "Confirm & Invoice"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function BookingsSkeleton() {
  const { theme: t } = useTheme();
  return (
    <PageShell title="Bookings" subtitle="See and manage all customer bookings.">
      <style>{`
        .sk-wave{position:relative;overflow:hidden;background:${t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"};border:1px solid ${t.border}}
        .sk-wave::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,${t.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)"},transparent);animation:skWave 1.4s ease-in-out infinite}
        @keyframes skWave{100%{transform:translateX(100%)}}
      `}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 32 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} height={128} radius={18} style={{ animationDelay: `${i * 50}ms` }} />
        ))}
      </div>
      <SkeletonBlock height={48} radius={14} style={{ marginBottom: 16, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }} />
      <SkeletonBlock height={36} radius={10} style={{ marginBottom: 24, width: 360 }} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonBlock key={i} height={64} radius={0} style={{ marginBottom: 1, animationDelay: `${i * 40}ms` }} />
      ))}
    </PageShell>
  );
}

export default function Bookings() {
  const bookings = useStore((s) => s.bookings);
  const invoices = useStore((s) => s.invoices);
  const loading = useStore((s) => s.loading);
  const storeConfirm = useStore((s) => s.confirmBooking);
  const storeReject = useStore((s) => s.rejectBooking);
  const fetchAll = useStore((s) => s.fetchAll);
  const { theme: t } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { changeStatus, loadingId } = usePaymentStatus();
  const deleteBooking = useStore((s) => s.deleteBooking);
  const updateBookingStatus = useStore((s) => s.updateBookingStatus);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [focusedRow, setFocusedRow] = useState(-1);
  const [statusLoadingId, setStatusLoadingId] = useState(null);
  const searchRef = useRef(null);
  const openedFromQuery = useRef(null);

  // Deep-link from notifications: /bookings?open=ID&filter=Pending
  useEffect(() => {
    const openId = searchParams.get("open");
    const filterParam = searchParams.get("filter");
    const allowed = new Set([
      "All",
      "Pending",
      "Confirmed",
      "Reschedule",
      "No-show",
      "Cancelled",
      "Completed",
      "Rejected",
      "Unpaid aging",
    ]);
    if (filterParam && allowed.has(filterParam)) {
      setFilter(filterParam);
    }
    if (!openId || loading || !bookings.length) return;
    if (openedFromQuery.current === openId) return;
    const match = bookings.find((b) => String(b["Booking ID"]) === String(openId));
    if (match) {
      openedFromQuery.current = openId;
      setSelected(match);
      const next = new URLSearchParams(searchParams);
      next.delete("open");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, bookings, loading, setSearchParams]);

  const handleStatusChange = useCallback(
    async (bookingId, apiStatus, displayStatus) => {
      setStatusLoadingId(bookingId);
      try {
        await updateBookingStatus(bookingId, apiStatus);
        showToast(`Status updated to ${displayStatus || apiStatus}`);
      } catch (err) {
        console.error(err);
        showToast(err?.message || "Failed to update status", "error");
        fetchAll(true, showToast);
      } finally {
        setStatusLoadingId(null);
      }
    },
    [updateBookingStatus, showToast, fetchAll]
  );

  async function confirmDeleteBooking() {
    if (!deleteTarget?.id) return;
    setDeleteBusy(true);
    try {
      await deleteBooking(deleteTarget.id);
      showToast("Booking deleted");
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to delete booking", "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  function handleCompleted(bookingId, amount) {
    useStore.setState((state) => ({
      bookings: state.bookings.map((b) =>
        b["Booking ID"] === bookingId ? { ...b, Status: "Completed", amount } : b
      ),
    }));
    setTimeout(() => fetchAll(true, showToast), 1500);
  }

  function handleNotesSaved(bookingId, notes) {
    useStore.setState((state) => ({
      bookings: state.bookings.map((b) =>
        b["Booking ID"] === bookingId ? { ...b, Notes: notes } : b
      ),
    }));
    setSelected((prev) =>
      prev && prev["Booking ID"] === bookingId ? { ...prev, Notes: notes } : prev
    );
  }

  function handleAmountSaved(bookingId, amount) {
    useStore.setState((state) => ({
      bookings: state.bookings.map((b) =>
        b["Booking ID"] === bookingId ? { ...b, amount } : b
      ),
    }));
    setSelected((prev) =>
      prev && prev["Booking ID"] === bookingId ? { ...prev, amount } : prev
    );
  }

  function handleDepositSaved(bookingId, deposit) {
    useStore.setState((state) => ({
      bookings: state.bookings.map((b) =>
        b["Booking ID"] === bookingId ? { ...b, ...deposit } : b
      ),
    }));
    setSelected((prev) =>
      prev && prev["Booking ID"] === bookingId ? { ...prev, ...deposit } : prev
    );
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const list = bookings.filter((b) => {
      const matchSearch =
        !s ||
        b.Name?.toLowerCase().includes(s) ||
        b.Phone?.toString().includes(s) ||
        b.Service?.toLowerCase().includes(s) ||
        b.Device?.toLowerCase().includes(s);
      const matchFilter =
        filter === "All"
          ? true
          : filter === "Unpaid aging"
            ? isUnpaidAging(b)
            : b.Status === filter;
      return matchSearch && matchFilter;
    });

    const todayKey = (() => {
      const now = new Date();
      return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");
    })();

    const closed = (status) =>
      status === "Completed" ||
      status === "Cancelled" ||
      status === "Rejected" ||
      status === "No-show";

    // Closed first, then closest date, then time
    return [...list].sort((a, b) => {
      const ca = closed(a.Status) ? 0 : 1;
      const cb = closed(b.Status) ? 0 : 1;
      if (ca !== cb) return ca - cb;
      const da = String(a.Date || "");
      const db = String(b.Date || "");
      if (da !== db) {
        const aUpcoming = da >= todayKey;
        const bUpcoming = db >= todayKey;
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        return aUpcoming ? da.localeCompare(db) : db.localeCompare(da);
      }
      const ta = String(a.Time || "");
      const tb = String(b.Time || "");
      if (ta !== tb) return ta.localeCompare(tb);
      const ida = String(a["Booking ID"] || "");
      const idb = String(b["Booking ID"] || "");
      return ida.localeCompare(idb);
    });
  }, [bookings, search, filter]);

  const summary = useMemo(() => {
    const today = bookings.filter((b) => isToday(b.Date));
    const todayCompleted = today.filter((b) => b.Status === "Completed" || b.Status === "Confirmed").length;
    const todayPending = today.filter((b) => b.Status === "Pending").length;
    const revenue = today
      .filter((b) => b.Status === "Completed" || b.Status === "Confirmed")
      .reduce((sum, b) => sum + bookingRevenue(b), 0);

    const vipKeys = new Set();
    for (const b of bookings) {
      const key = b.customer_id ? `c:${b.customer_id}` : phoneKey(b.Phone);
      if (!key || vipKeys.has(key)) continue;
      if (
        getCustomerTier(
          { phone: b.Phone, customer_id: b.customer_id },
          bookings,
          invoices
        ) === "VIP"
      ) {
        vipKeys.add(key);
      }
    }

    return {
      todayCount: today.length,
      completed: todayCompleted,
      pending: todayPending,
      revenue,
      vip: vipKeys.size,
      allPending: bookings.filter((b) => b.Status === "Pending").length,
    };
  }, [bookings, invoices]);

  const tierByPhoneKey = useMemo(() => {
    const map = new Map();
    for (const b of bookings) {
      const key = phoneKey(b.Phone);
      if (!key || map.has(key)) continue;
      map.set(
        key,
        getCustomerTier(
          { phone: b.Phone, customer_id: b.customer_id },
          bookings,
          invoices
        )
      );
    }
    return map;
  }, [bookings, invoices]);

  const stalePendingCount = bookings.filter((b) => isStalePending(b)).length;
  const unpaidAgingCount = bookings.filter((b) => isUnpaidAging(b)).length;

  const confirmBooking = useCallback(
    (id, name) => storeConfirm(id, name, showToast),
    [storeConfirm, showToast]
  );
  const rejectBooking = useCallback(
    (id, name) => storeReject(id, name, showToast),
    [storeReject, showToast]
  );

  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;
      if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (typing || selected || addOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedRow((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedRow((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && focusedRow >= 0 && filtered[focusedRow]) {
        e.preventDefault();
        setSelected(filtered[focusedRow]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, focusedRow, selected, addOpen]);

  if (loading) return <BookingsSkeleton />;

  const TH = {
    padding: "14px 20px",
    fontSize: 12,
    fontWeight: 400,
    color: t.thColor,
    textTransform: "none",
    letterSpacing: 0,
    textAlign: "left",
    background: t.cardBg,
    borderBottom: `1px solid ${t.borderSub}`,
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 2,
  };

  const TD = {
    padding: "18px 20px",
    fontSize: 14,
    color: t.tdColor,
    verticalAlign: "middle",
    borderBottom: `1px solid ${t.borderSub}`,
  };

  return (
    <PageShell
      title="Bookings"
      subtitle="See and manage all customer bookings."
      actions={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="ui-press"
            onClick={async () => {
              const url = `${window.location.origin}/book`;
              try {
                await navigator.clipboard.writeText(url);
                showToast("Booking link copied — share it with customers");
              } catch {
                showToast(url, "info");
              }
            }}
            style={{
              ...secondaryBtnStyle(t),
              padding: "0 16px",
              height: 40,
              fontSize: 13,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            <Link2 size={15} strokeWidth={2} />
            Share booking link
          </button>
          <button
            type="button"
            className="ui-press"
            onClick={() => exportToCSV(filtered, "bookings.csv")}
            style={{
              ...secondaryBtnStyle(t),
              padding: "0 16px",
              height: 40,
              fontSize: 13,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            <Download size={15} strokeWidth={2} />
            Export
          </button>
          <button
            type="button"
            className="ui-press"
            onClick={() => setPackageOpen(true)}
            style={{
              ...secondaryBtnStyle(t),
              padding: "0 16px",
              height: 40,
              fontSize: 13,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            <Calendar size={15} strokeWidth={2} />
            Weekly package
          </button>
          <button
            type="button"
            className="ui-press"
            onClick={() => setAddOpen(true)}
            {...primaryBtnHoverProps(t)}
            style={{
              ...primaryBtnStyle(t),
              padding: "0 16px",
              height: 40,
              fontSize: 13,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            <Plus size={15} strokeWidth={2.25} />
            Add Booking
          </button>
        </div>
      }
    >
      <style>{`
        @media(max-width:1100px){
          .bk-summary{grid-template-columns:repeat(3,1fr)!important}
        }
        @media(max-width:768px){
          .bk-summary{grid-template-columns:1fr 1fr!important}
          .bk-toolbar{flex-direction:column!important;align-items:stretch!important}
          .bk-search-wrap{max-width:none!important}
          .bk-table th:nth-child(3),.bk-table td:nth-child(3),
          .bk-table th:nth-child(4),.bk-table td:nth-child(4){display:none}
        }
        @media(max-width:520px){
          .bk-summary{grid-template-columns:1fr!important}
        }
        .bk-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          padding: 0;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: ${t.textMuted};
          cursor: pointer;
          opacity: 0;
          transition: color 150ms cubic-bezier(0.2, 0, 0, 1), background 150ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms cubic-bezier(0.2, 0, 0, 1);
        }
        .bk-row:hover .bk-icon-btn,
        .bk-row:focus-within .bk-icon-btn,
        .bk-row.bk-row--focused .bk-icon-btn,
        .bk-icon-btn.bk-icon-btn--open {
          opacity: 1;
        }
        .bk-icon-btn:hover {
          background: ${t.rowHover};
          color: ${t.textPrimary};
        }
        .bk-table-dd-trigger:hover:not(:disabled) {
          border-color: ${t.name === "dark" ? "rgba(255,255,255,0.16)" : "rgba(15,17,21,0.16)"};
          background: ${t.name === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,17,21,0.02)"};
        }
        .bk-table-dd-trigger:focus-visible {
          outline: 2px solid ${t.accent};
          outline-offset: 2px;
        }
        @keyframes bkDdSpin {
          to { transform: rotate(360deg); }
        }
        .bk-dd-spin {
          animation: bkDdSpin 0.8s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .bk-dd-spin { animation: none; }
        }
        .bk-table tbody tr.bk-row {
          transition: background 150ms cubic-bezier(0.2, 0, 0, 1);
          cursor: pointer;
        }
        .bk-table tbody tr.bk-row:hover,
        .bk-table tbody tr.bk-row.bk-row--focused {
          background: ${t.rowHover};
        }
        .bk-table tbody tr.bk-row.bk-row--stale {
          box-shadow: inset 3px 0 0 ${t.risk};
        }
        .bk-table tbody tr.bk-row:last-child td {
          border-bottom: none;
        }
        .bk-sticky-col {
          position: sticky;
          left: 0;
          z-index: 1;
          background: ${t.cardBg};
        }
        .bk-table thead .bk-sticky-col {
          z-index: 3;
        }
        .bk-table tbody tr.bk-row:hover .bk-sticky-col,
        .bk-table tbody tr.bk-row.bk-row--focused .bk-sticky-col {
          background: ${t.cardBg};
          box-shadow: 4px 0 12px rgba(0,0,0,0.04);
        }
        .bk-search:focus {
          border-color: ${t.borderHover} !important;
          box-shadow: 0 0 0 3px ${t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"} !important;
        }
      `}</style>

      <BookingDrawer
        booking={selected}
        bookings={bookings}
        invoices={invoices}
        onClose={() => setSelected(null)}
        onConfirm={confirmBooking}
        onReject={rejectBooking}
        onCompleted={handleCompleted}
        onNotesSaved={handleNotesSaved}
        onAmountSaved={handleAmountSaved}
        onDepositSaved={handleDepositSaved}
      />
      <AddBookingModal open={addOpen} onClose={() => setAddOpen(false)} />
      <CreateWeeklyPackageModal open={packageOpen} onClose={() => setPackageOpen(false)} />
      <CustomerHistory customer={customer} bookings={bookings} invoices={invoices} onClose={() => setCustomer(null)} />

      {/* Today's summary */}
      <div
        className="bk-summary"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <WalletCard label="Today's bookings" value={summary.todayCount.toLocaleString()} trend="Scheduled for today" icon={Calendar} t={t} />
        <WalletCard label="Completed" value={summary.completed.toLocaleString()} trend="Confirmed or done" icon={CheckCircle2} t={t} />
        <WalletCard label="Pending" value={summary.pending.toLocaleString()} trend={`${summary.allPending} total pending`} icon={Clock} t={t} />
        <WalletCard
          label="Revenue"
          value={`Rs ${summary.revenue.toLocaleString()}`}
          trend="Today's estimate"
          icon={FileText}
          t={t}
          emphasize
        />
        <WalletCard label="VIP customers" value={summary.vip.toLocaleString()} trend="Repeat customers" icon={Eye} t={t} />
      </div>

      {/* Spotlight search */}
      <div
        className="bk-search-wrap"
        style={{
          maxWidth: 520,
          margin: "0 auto 24px",
          width: "100%",
        }}
      >
        <div style={{ position: "relative" }}>
          <Search
            size={18}
            strokeWidth={1.75}
            style={{
              position: "absolute",
              left: 18,
              top: "50%",
              transform: "translateY(-50%)",
              color: t.textMuted,
              pointerEvents: "none",
            }}
          />
          <input
            ref={searchRef}
            className="bk-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setFocusedRow(-1);
            }}
            placeholder="Search name, phone, service…"
            aria-label="Search bookings"
            style={{
              width: "100%",
              height: 48,
              padding: "0 72px 0 48px",
              borderRadius: 14,
              background: t.cardBg,
              border: `1px solid ${t.border}`,
              fontSize: 15,
              color: t.textPrimary,
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
              boxShadow: t.cardShadow,
              transition: "border-color 150ms cubic-bezier(0.2, 0, 0, 1), box-shadow 150ms cubic-bezier(0.2, 0, 0, 1)",
            }}
          />
          <kbd
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11,
              fontWeight: 500,
              color: t.textMuted,
              padding: "3px 7px",
              borderRadius: 6,
              border: `1px solid ${t.border}`,
              background: t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.03)",
              fontFamily: "var(--font-mono)",
            }}
          >
            /
          </kbd>
        </div>
      </div>

      {/* Filters */}
      <div
        className="bk-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <SegmentedControl
          options={[
            "All",
            "Pending",
            "Confirmed",
            "Reschedule",
            "No-show",
            "Cancelled",
            "Completed",
            "Rejected",
          ]}
          value={filter === "Unpaid aging" ? "All" : filter}
          onChange={(v) => {
            setFilter(v);
            setFocusedRow(-1);
          }}
          layoutId="bookingsStatusTab"
        />
        <div style={{ fontSize: 13, color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      {stalePendingCount > 0 && (
        <div
          className="risk-banner"
          style={{
            marginBottom: 20,
            background: t.riskBg,
            border: `1px solid ${t.riskBorder}`,
            borderRadius: 14,
            padding: "14px 20px",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>
              {stalePendingCount} overdue pending booking{stalePendingCount === 1 ? "" : "s"}
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
              Pending for 4+ hours — review and confirm or reject
            </div>
          </div>
          <span className="risk-banner__action" style={{ color: t.risk }}>Needs attention</span>
        </div>
      )}

      {unpaidAgingCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setFilter("Unpaid aging");
            setFocusedRow(-1);
          }}
          style={{
            width: "100%",
            marginBottom: 20,
            background: t.cardBg2 || t.pageBg,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            padding: "14px 20px",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>
              {unpaidAgingCount} unpaid booking{unpaidAgingCount === 1 ? "" : "s"} past session date
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
              Chase money — Unpaid / Half / Onsite after the pitch day
              {filter === "Unpaid aging" ? " (filter on)" : ""}
            </div>
          </div>
          <span style={{ color: t.textSecondary, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
            View →
          </span>
        </button>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          illustration="bookings"
          title="No bookings found"
          subtitle={search || filter !== "All" ? "Try a different search or filter" : "Add your first booking to get started"}
          action="Add Booking"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <div
          style={{
            background: t.cardBg,
            borderRadius: 18,
            border: `1px solid ${t.border}`,
            boxShadow: t.cardShadow,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto", maxHeight: "min(70vh, 900px)" }}>
            <table className="bk-table data-table" style={{ width: "100%", minWidth: 880, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="bk-sticky-col" style={{ ...TH, minWidth: 240 }}>Customer</th>
                  <th style={TH}>Players</th>
                  <th style={TH}>Schedule</th>
                  <th style={TH}>Source</th>
                  <th style={TH}>Status</th>
                  <th style={TH}>Payment</th>
                  <th style={{ ...TH, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => {
                  const stale = isStalePending(b);
                  const fullId = b["Booking ID"] || "";
                  const tier = tierByPhoneKey.get(phoneKey(b.Phone));
                  const focused = focusedRow === i;
                  return (
                    <tr
                      key={fullId || i}
                      className={`bk-row${stale ? " bk-row--stale" : ""}${focused ? " bk-row--focused" : ""}`}
                      tabIndex={0}
                      onClick={() => setSelected(b)}
                      onFocus={() => setFocusedRow(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(b);
                        }
                      }}
                    >
                      <td className="bk-sticky-col" style={{ ...TD, minWidth: 240 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <CustomerAvatar name={b.Name} size={36} t={t} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCustomer(b);
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  cursor: "pointer",
                                  fontSize: 14,
                                  fontWeight: 500,
                                  color: t.textPrimary,
                                  fontFamily: "inherit",
                                  textAlign: "left",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: 140,
                                }}
                              >
                                {b.Name}
                              </button>
                              {tier && <StatusBadge status={tier} />}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginTop: 4,
                                fontSize: 12,
                                color: t.textMuted,
                              }}
                            >
                              <IdChip title={fullId}>{shortBookingId(fullId)}</IdChip>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {formatPhone(b.Phone?.toString() || "")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={TD}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)",
                              color: t.textMuted,
                              flexShrink: 0,
                            }}
                          >
                            <Users size={13} strokeWidth={1.75} />
                          </span>
                          <div style={{ minWidth: 0 }}>
                            {(() => {
                              const m = fromApiRow(b);
                              return (
                                <>
                                  <div
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 400,
                                      color: t.textPrimary,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      maxWidth: 160,
                                    }}
                                    title={m.playersLabel || b.Device || ""}
                                  >
                                    {m.playersLabel || b.Device || "—"}
                                  </div>
                                  {m.paymentMode && (
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: t.textMuted,
                                        marginTop: 2,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        maxWidth: 160,
                                      }}
                                    >
                                      {m.paymentMode}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...TD, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: 14, color: t.textPrimary }}>{formatDate(b.Date)}</div>
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2, fontFamily: "var(--font-mono)" }}>
                          {b.Time || "—"}
                        </div>
                      </td>
                      <td style={TD}>
                        {b.Source ? <StatusBadge status={b.Source} /> : <span style={{ color: t.textMuted }}>—</span>}
                      </td>
                      <td
                        style={TD}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <BookingStatusDropdown
                          status={b.Status}
                          bookingId={b["Booking ID"]}
                          disabled={b.Status === "Completed" || b.Status === "Cancelled"}
                          loading={statusLoadingId === b["Booking ID"]}
                          onChange={handleStatusChange}
                        />
                      </td>
                      <td style={TD} onClick={(e) => e.stopPropagation()}>
                        <BookingPaymentDropdown
                          status={b["Payment Status"]}
                          bookingId={b["Booking ID"]}
                          onChange={changeStatus}
                          loading={loadingId === b["Booking ID"]}
                        />
                      </td>
                      <td
                        style={{ ...TD, textAlign: "right", whiteSpace: "nowrap" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: "inline-flex", gap: 2, alignItems: "center", justifyContent: "flex-end" }}>
                          <RowActionsMenu
                            booking={b}
                            onView={(bk) => setSelected(bk)}
                            onViewCustomer={(bk) => setCustomer(bk)}
                            onComplete={(bk) => setSelected(bk)}
                            onInvoice={() => navigate("/invoices")}
                            onDelete={(bk) => setDeleteTarget({ id: bk["Booking ID"], name: bk.Name })}
                            onConfirm={confirmBooking}
                            onReject={rejectBooking}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => !deleteBusy && setDeleteTarget(null)}
        onConfirm={confirmDeleteBooking}
        busy={deleteBusy}
        title="Delete this booking?"
        message={
          deleteTarget?.name
            ? `Delete the booking for ${deleteTarget.name}? This can't be undone.`
            : "Are you sure? This can't be undone."
        }
        confirmLabel="Delete booking"
      />
    </PageShell>
  );
}
