import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Eye,
  Check,
  Plus,
  Search,
  Send,
  MoreHorizontal,
  FileText,
  TrendingUp,
  AlertCircle,
  Wallet,
  Receipt,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useTheme, primaryBtnStyle, primaryBtnHoverProps, secondaryBtnStyle, cardHoverProps } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useStore } from "../store/useStore";
import EmptyState from "../components/EmptyState";
import { SkeletonBlock } from "../components/Skeleton";
import SegmentedControl from "../components/SegmentedControl";
import IdChip from "../components/IdChip";
import PageShell from "../components/PageShell";
import Sheet from "../components/Sheet";
import { formatDate, getInitials, formatPhone, whatsappLink } from "../utils/format";
import { exportToCSV } from "../utils/export";
import {
  getInvoices,
  updateInvoiceStatus,
  downloadInvoicePdf,
  openInvoicePdf,
} from "../api";

const OVERDUE_DAYS = 14;

function formatRs(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return "Rs 0";
  return `Rs ${num.toLocaleString()}`;
}

function shortInvoiceId(id) {
  if (!id) return "—";
  const s = String(id).trim();
  const hex = s.match(/([A-Fa-f0-9]{6,})(?!.*[A-Fa-f0-9])/);
  if (hex) return `#${hex[1].slice(0, 6).toUpperCase()}`;
  const cleaned = s.replace(/^(INV|INVOICE)[-_]?/i, "");
  if (cleaned.length <= 8) return `#${cleaned}`;
  return `#${cleaned.slice(-6).toUpperCase()}`;
}

function parseCreated(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d) ? null : d;
}

function isOverdue(inv) {
  if ((inv.status || "").toLowerCase() !== "unpaid") return false;
  const d = parseCreated(inv.created_at);
  if (!d) return false;
  const age = (Date.now() - d.getTime()) / 86400000;
  return age >= OVERDUE_DAYS;
}

/** Display label mapped from backend paid/unpaid (+ overdue heuristic). */
function displayStatus(inv) {
  const raw = (inv.status || "").toLowerCase();
  if (raw === "paid") return "Paid";
  if (raw === "cancelled" || raw === "canceled") return "Cancelled";
  if (raw === "refunded") return "Refunded";
  if (raw === "unpaid" && isOverdue(inv)) return "Overdue";
  if (raw === "unpaid") return "Pending";
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Pending";
}

function matchesFilter(inv, filter) {
  if (filter === "All") return true;
  const label = displayStatus(inv);
  if (filter === "Paid") return label === "Paid";
  if (filter === "Pending") return label === "Pending";
  if (filter === "Overdue") return label === "Overdue";
  if (filter === "Cancelled") return label === "Cancelled";
  return true;
}

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
        color: t.textSecondary,
        background: t.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,17,21,0.05)",
        border: `1px solid ${t.border}`,
      }}
    >
      {initials}
    </div>
  );
}

function InvoiceStatusBadge({ inv, onClick, busy }) {
  const { dark } = useTheme();
  const label = displayStatus(inv);

  const styles = {
    Paid: {
      bg: dark ? "rgba(16,185,129,0.14)" : "#ECFDF5",
      color: dark ? "#34D399" : "#047857",
      ring: dark ? "rgba(16,185,129,0.28)" : "#A7F3D0",
      dot: dark ? "#34D399" : "#059669",
      icon: "check",
    },
    Pending: {
      bg: dark ? "rgba(245,158,11,0.12)" : "#FFFBEB",
      color: dark ? "#FBBF24" : "#B45309",
      ring: dark ? "rgba(245,158,11,0.28)" : "#FDE68A",
      dot: dark ? "#FBBF24" : "#F59E0B",
      icon: "dot",
    },
    Overdue: {
      bg: dark ? "rgba(244,63,94,0.12)" : "#FFF1F2",
      color: dark ? "#FDA4AF" : "#BE123C",
      ring: dark ? "rgba(244,63,94,0.28)" : "#FECDD3",
      dot: dark ? "#F43F5E" : "#E11D48",
      icon: "dot",
    },
    Cancelled: {
      bg: dark ? "rgba(92,99,112,0.14)" : "#F1F3F5",
      color: dark ? "#A1A8B3" : "#5C6370",
      ring: dark ? "rgba(92,99,112,0.28)" : "rgba(15,17,21,0.10)",
      dot: dark ? "#A1A8B3" : "#5C6370",
      icon: "dot",
    },
    Refunded: {
      bg: dark ? "rgba(59,130,246,0.14)" : "#EFF6FF",
      color: dark ? "#93C5FD" : "#1D4ED8",
      ring: dark ? "rgba(59,130,246,0.28)" : "#BFDBFE",
      dot: dark ? "#60A5FA" : "#3B82F6",
      icon: "dot",
    },
  };

  const cfg = styles[label] || styles.Pending;
  const canToggle = inv.status === "paid" || inv.status === "unpaid";

  return (
    <button
      type="button"
      className="ui-press inv-status-badge"
      onClick={canToggle ? onClick : undefined}
      disabled={busy || !canToggle}
      title={
        canToggle
          ? inv.status === "paid"
            ? "Click to mark unpaid"
            : "Click to mark paid"
          : label
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
        background: cfg.bg,
        border: `1px solid ${cfg.ring}`,
        color: cfg.color,
        cursor: busy ? "wait" : canToggle ? "pointer" : "default",
        opacity: busy ? 0.6 : 1,
        fontFamily: "inherit",
        transition: "opacity 150ms cubic-bezier(0.2, 0, 0, 1), background 150ms cubic-bezier(0.2, 0, 0, 1)",
      }}
    >
      {cfg.icon === "check" ? (
        <Check size={12} strokeWidth={2.5} color={cfg.dot} aria-hidden />
      ) : (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
      )}
      {label}
    </button>
  );
}

function WalletCard({ label, value, trend, icon: Icon, t, warn, children }) {
  const hover = cardHoverProps(t);
  return (
    <div
      className="inv-wallet"
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
              color: warn ? (t.warning || "#F59E0B") : t.textMuted,
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
            fontSize: 28,
            fontWeight: 500,
            color: warn ? (t.warning || "#F59E0B") : t.textPrimary,
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
        {children}
      </div>
    </div>
  );
}

function MiniSparkline({ data, color, t }) {
  if (!data?.length) return null;
  return (
    <div style={{ height: 36, marginTop: 12, marginLeft: -4, marginRight: -4 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color || t.accent}
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

function RowActionsMenu({ inv, busy, onView, onPreview, onDownload, onMarkPaid, onSend }) {
  const { theme: t } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const items = [
    { label: "View", icon: Eye, onClick: () => onView?.(inv) },
    { label: "Preview PDF", icon: FileText, onClick: () => onPreview?.(inv) },
    { label: "Download PDF", icon: Download, onClick: () => onDownload?.(inv) },
    inv.status === "unpaid" && {
      label: "Mark paid",
      icon: Check,
      onClick: () => onMarkPaid?.(inv),
    },
    { label: "Send invoice", icon: Send, onClick: () => onSend?.(inv) },
  ].filter(Boolean);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="inv-icon-btn"
        title="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreHorizontal size={16} strokeWidth={2} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: 6,
            minWidth: 168,
            padding: 6,
            borderRadius: 12,
            background: t.cardBg,
            border: `1px solid ${t.border}`,
            boxShadow: t.cardShadowHover || t.cardShadow,
            zIndex: 30,
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="ui-press"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick?.();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                color: t.textPrimary,
                fontSize: 13,
                fontWeight: 400,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = t.rowHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <item.icon size={14} strokeWidth={2} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InvoiceDrawer({
  invoice,
  bookings,
  onClose,
  busy,
  onToggleStatus,
  onDownload,
  onPreview,
  onSend,
}) {
  const { theme: t } = useTheme();
  if (!invoice) return null;

  const label = displayStatus(invoice);
  const tax = Number(invoice.tax) || 0;
  const discount = Number(invoice.discount) || 0;
  const amount = Number(invoice.amount) || 0;
  const subtotal = Math.max(amount - tax + discount, 0);

  const relatedBookings = (bookings || []).filter(
    (b) =>
      b["Booking ID"] === invoice.booking_id ||
      (invoice.phone && b.Phone && String(b.Phone) === String(invoice.phone))
  ).slice(0, 5);

  const aiSummary = (() => {
    const bits = [];
    if (label === "Overdue") {
      bits.push(`This invoice is overdue by ${OVERDUE_DAYS}+ days. Follow up with the customer to clear the balance.`);
    } else if (label === "Pending") {
      bits.push("Payment is outstanding. Send a reminder or mark paid when collected.");
    } else if (label === "Paid") {
      bits.push("Payment received. No action required unless a refund is needed.");
    }
    if (amount > 0) {
      bits.push(`Invoice total is ${formatRs(amount)}.`);
    }
    if (invoice.service) {
      bits.push(`Related service: ${invoice.service}${invoice.device ? ` on ${invoice.device}` : ""}.`);
    }
    if (bits.length === 0) bits.push("Invoice looks complete and ready for review.");
    return bits;
  })();

  const footer = (
    <>
      <button
        type="button"
        className="ui-press"
        disabled={busy}
        onClick={() => onPreview?.(invoice)}
        style={{ ...secondaryBtnStyle(t), padding: "10px 14px", fontSize: 13, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <Eye size={14} /> Preview
      </button>
      <button
        type="button"
        className="ui-press"
        disabled={busy}
        onClick={() => onDownload?.(invoice)}
        style={{ ...secondaryBtnStyle(t), padding: "10px 14px", fontSize: 13, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <Download size={14} /> PDF
      </button>
      <button
        type="button"
        className="ui-press"
        disabled={busy}
        onClick={() => onSend?.(invoice)}
        style={{ ...secondaryBtnStyle(t), padding: "10px 14px", fontSize: 13, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <Send size={14} /> Send
      </button>
      {invoice.status === "unpaid" && (
        <button
          type="button"
          className="ui-press"
          disabled={busy}
          onClick={() => onToggleStatus?.(invoice)}
          {...primaryBtnHoverProps(t)}
          style={{ ...primaryBtnStyle(t), padding: "10px 14px", fontSize: 13, fontFamily: "inherit", marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Check size={14} /> Mark paid
        </button>
      )}
      {invoice.status === "paid" && (
        <button
          type="button"
          className="ui-press"
          disabled={busy}
          onClick={() => onToggleStatus?.(invoice)}
          style={{ ...secondaryBtnStyle(t), padding: "10px 14px", fontSize: 13, fontFamily: "inherit", marginLeft: "auto" }}
        >
          Mark unpaid
        </button>
      )}
    </>
  );

  return (
    <Sheet
      open={!!invoice}
      onClose={onClose}
      title={invoice.customer_name || "Invoice"}
      subtitle={invoice.invoice_number || shortInvoiceId(invoice.id)}
      width={480}
      footer={footer}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8, alignItems: "center" }}>
        <InvoiceStatusBadge inv={invoice} busy={busy} onClick={() => onToggleStatus?.(invoice)} />
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 500,
          color: t.textPrimary,
          letterSpacing: -1.6,
          fontVariantNumeric: "tabular-nums",
          fontFamily: "var(--font-mono)",
          marginBottom: 28,
          lineHeight: 1.1,
        }}
      >
        {formatRs(amount)}
      </div>

      <DrawerSection title="Timeline" t={t}>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingLeft: 4 }}>
          {[
            { label: "Invoice created", meta: formatDate(invoice.created_at), done: true },
            {
              label: label === "Paid" ? "Payment received" : label === "Overdue" ? "Payment overdue" : "Awaiting payment",
              meta: label,
              done: true,
              current: true,
            },
          ].map((step, i, arr) => (
            <div key={step.label} style={{ display: "flex", gap: 12, minHeight: i < arr.length - 1 ? 44 : 24 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 12 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: step.current ? t.accent : t.textMuted,
                    opacity: step.current ? 1 : 0.45,
                    marginTop: 2,
                    boxShadow: step.current ? `0 0 0 3px ${t.accentGlow || "rgba(225,29,72,0.15)"}` : "none",
                  }}
                />
                {i < arr.length - 1 && <span style={{ flex: 1, width: 1, background: t.border, marginTop: 4 }} />}
              </div>
              <div style={{ paddingBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: step.current ? 500 : 400, color: t.textPrimary }}>{step.label}</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{step.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </DrawerSection>

      <DrawerSection title="Customer" t={t}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <CustomerAvatar name={invoice.customer_name} size={44} t={t} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: t.textPrimary }}>
              {invoice.customer_name || "—"}
            </div>
            <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
              {invoice.phone ? formatPhone(invoice.phone) : "No phone on file"}
            </div>
          </div>
        </div>
      </DrawerSection>

      <DrawerSection title="Repair" t={t}>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            ["Service", invoice.service],
            ["Device", invoice.device],
            ["Booking", invoice.booking_id],
            ["Booking date", invoice.booking_date ? formatDate(invoice.booking_date) : null],
          ]
            .filter(([, v]) => v)
            .map(([label, value], i, arr) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: i < arr.length - 1 ? `1px solid ${t.borderSub}` : "none",
                }}
              >
                <span style={{ fontSize: 13, color: t.textMuted }}>{label}</span>
                <span
                  style={{
                    fontSize: 13,
                    color: t.textPrimary,
                    fontWeight: 400,
                    textAlign: "right",
                    maxWidth: "60%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          {!invoice.service && !invoice.device && (
            <div style={{ fontSize: 13, color: t.textMuted }}>No repair details attached</div>
          )}
        </div>
      </DrawerSection>

      {relatedBookings.length > 0 && (
        <DrawerSection title="Repair history" t={t}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {relatedBookings.map((b, i) => (
              <div
                key={b["Booking ID"] || i}
                style={{
                  padding: "12px 0",
                  borderBottom: i < relatedBookings.length - 1 ? `1px solid ${t.borderSub}` : "none",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>
                  {b.Service || "Repair"}
                </div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 3 }}>
                  {formatDate(b.Date)} · {b.Status}
                </div>
              </div>
            ))}
          </div>
        </DrawerSection>
      )}

      <DrawerSection title="Payment breakdown" t={t}>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            ["Subtotal", formatRs(subtotal || amount)],
            ["Tax", formatRs(tax)],
            ["Discount", discount ? `−${formatRs(discount)}` : formatRs(0)],
            ["Total", formatRs(amount), true],
          ].map(([label, value, strong], i, arr) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: i < arr.length - 1 ? `1px solid ${t.borderSub}` : "none",
              }}
            >
              <span style={{ fontSize: 13, color: strong ? t.textPrimary : t.textMuted, fontWeight: strong ? 500 : 400 }}>
                {label}
              </span>
              <span
                className="font-mono-data"
                style={{
                  fontSize: strong ? 15 : 13,
                  fontWeight: strong ? 500 : 400,
                  color: t.textPrimary,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </DrawerSection>

      {(invoice.notes || invoice.Notes) && (
        <DrawerSection title="Notes" t={t}>
          <p style={{ margin: 0, fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>
            {invoice.notes || invoice.Notes}
          </p>
        </DrawerSection>
      )}

      <DrawerSection title="AI summary" t={t}>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {aiSummary.map((s, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: 10,
                padding: "10px 0",
                borderBottom: i < aiSummary.length - 1 ? `1px solid ${t.borderSub}` : "none",
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
    </Sheet>
  );
}

function InvoicesSkeleton() {
  const { theme: t } = useTheme();
  return (
    <PageShell
      title="Invoices"
      subtitle="Track payments, outstanding balances and customer billing."
    >
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
      <SkeletonBlock height={36} radius={10} style={{ marginBottom: 24, width: 400 }} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <SkeletonBlock key={i} height={64} radius={0} style={{ marginBottom: 1, animationDelay: `${i * 40}ms` }} />
      ))}
    </PageShell>
  );
}

function TrendTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: t.cardShadow,
        fontSize: 12,
      }}
    >
      <div style={{ color: t.textMuted, marginBottom: 4 }}>{label}</div>
      <div className="font-mono-data" style={{ fontWeight: 500, color: t.textPrimary }}>
        {formatRs(payload[0].value)}
      </div>
    </div>
  );
}

export default function Invoices() {
  const { theme: t } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const bookings = useStore((s) => s.bookings);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [focusedRow, setFocusedRow] = useState(-1);
  const searchRef = useRef(null);

  async function load() {
    try {
      const data = await getInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load invoices", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return invoices.filter((inv) => {
      if (!matchesFilter(inv, filter)) return false;
      if (!s) return true;
      return (
        inv.customer_name?.toLowerCase().includes(s) ||
        inv.invoice_number?.toLowerCase().includes(s) ||
        inv.phone?.toString().includes(s) ||
        inv.device?.toLowerCase().includes(s) ||
        inv.service?.toLowerCase().includes(s) ||
        shortInvoiceId(inv.invoice_number).toLowerCase().includes(s)
      );
    });
  }, [invoices, filter, search]);

  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalRevenue = 0;
    let outstanding = 0;
    let paidThisMonth = 0;
    let overdueAmt = 0;
    let overdueCount = 0;

    invoices.forEach((inv) => {
      const amt = Number(inv.amount) || 0;
      totalRevenue += amt;
      if (inv.status === "unpaid") {
        outstanding += amt;
        if (isOverdue(inv)) {
          overdueAmt += amt;
          overdueCount += 1;
        }
      }
      if (inv.status === "paid") {
        const d = parseCreated(inv.created_at) || parseCreated(inv.paid_at);
        if (d && d >= monthStart) paidThisMonth += amt;
      }
    });

    const avg = invoices.length ? totalRevenue / invoices.length : 0;
    const paidCount = invoices.filter((i) => i.status === "paid").length;
    const successRate = invoices.length ? Math.round((paidCount / invoices.length) * 100) : 0;

    // Revenue trend by day (last 14 days of invoice amounts)
    const byDay = {};
    invoices.forEach((inv) => {
      const d = parseCreated(inv.created_at);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      byDay[key] = (byDay[key] || 0) + (Number(inv.amount) || 0);
    });
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        amount: byDay[key] || 0,
        v: byDay[key] || 0,
      });
    }

    // Top customers by paid amount
    const byCustomer = {};
    invoices.forEach((inv) => {
      const name = inv.customer_name || "Unknown";
      if (!byCustomer[name]) byCustomer[name] = { name, total: 0, paid: 0, count: 0 };
      const amt = Number(inv.amount) || 0;
      byCustomer[name].total += amt;
      byCustomer[name].count += 1;
      if (inv.status === "paid") byCustomer[name].paid += amt;
    });
    const topCustomers = Object.values(byCustomer)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      totalRevenue,
      outstanding,
      paidThisMonth,
      overdueAmt,
      overdueCount,
      avg,
      successRate,
      paidCount,
      trend: days,
      spark: days,
      topCustomers,
    };
  }, [invoices]);

  const toggleStatus = useCallback(
    async (inv) => {
      const next = inv.status === "paid" ? "unpaid" : "paid";
      setBusyId(inv.id);
      try {
        const updated = await updateInvoiceStatus(inv.id, next);
        setInvoices((list) => list.map((i) => (i.id === inv.id ? { ...i, ...updated } : i)));
        setSelected((prev) => (prev && prev.id === inv.id ? { ...prev, ...updated } : prev));
        showToast(`Invoice marked ${next}`);
      } catch (err) {
        console.error(err);
        showToast("Failed to update status", "error");
      } finally {
        setBusyId(null);
      }
    },
    [showToast]
  );

  async function handleDownload(inv) {
    setBusyId(inv.id);
    try {
      await downloadInvoicePdf(inv.id, `${inv.invoice_number || "invoice"}.pdf`);
    } catch (err) {
      console.error(err);
      showToast("Failed to download PDF", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePreview(inv) {
    setBusyId(inv.id);
    try {
      await openInvoicePdf(inv.id);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to open PDF", "error");
    } finally {
      setBusyId(null);
    }
  }

  function handleSend(inv) {
    const amount = formatRs(inv.amount);
    const no = inv.invoice_number || shortInvoiceId(inv.id);
    const text = `Hi${inv.customer_name ? ` ${inv.customer_name}` : ""}, your invoice ${no} for ${amount} is ready. Thank you for choosing us.`;
    if (inv.phone) {
      window.open(`${whatsappLink(inv.phone)}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      showToast("Opening WhatsApp…");
    } else {
      const mailto = `mailto:?subject=${encodeURIComponent(`Invoice ${no}`)}&body=${encodeURIComponent(text)}`;
      window.open(mailto, "_blank");
      showToast("Opening email…");
    }
  }

  function handleExport() {
    const rows = filtered.map((inv) => ({
      "Invoice #": inv.invoice_number,
      Customer: inv.customer_name || "",
      Phone: inv.phone || "",
      Service: inv.service || "",
      Device: inv.device || "",
      Amount: inv.amount,
      Date: inv.created_at,
      Status: displayStatus(inv),
      "Booking ID": inv.booking_id || "",
    }));
    exportToCSV(rows, "invoices.csv");
  }

  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;
      if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (typing || selected) return;
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
  }, [filtered, focusedRow, selected]);

  if (loading) return <InvoicesSkeleton />;

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

  const panel = {
    background: t.cardBg,
    border: `1px solid ${t.border}`,
    borderRadius: 18,
    boxShadow: t.cardShadow,
  };

  const gridStroke = t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)";

  return (
    <PageShell
      title="Invoices"
      subtitle="Track payments, outstanding balances and customer billing."
      actions={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="ui-press"
            onClick={handleExport}
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
            onClick={() => {
              showToast("Complete a booking to create an invoice");
              navigate("/bookings");
            }}
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
            Create Invoice
          </button>
        </div>
      }
    >
      <style>{`
        @media(max-width:1100px){
          .inv-summary{grid-template-columns:repeat(3,1fr)!important}
          .inv-insights{grid-template-columns:1fr!important}
        }
        @media(max-width:768px){
          .inv-summary{grid-template-columns:1fr 1fr!important}
          .inv-search-wrap{max-width:none!important}
          .inv-table th:nth-child(3),.inv-table td:nth-child(3),
          .inv-table th:nth-child(4),.inv-table td:nth-child(4){display:none}
        }
        @media(max-width:520px){
          .inv-summary{grid-template-columns:1fr!important}
        }
        .inv-table tbody tr.inv-row {
          transition: background 150ms cubic-bezier(0.2, 0, 0, 1);
          cursor: pointer;
        }
        .inv-table tbody tr.inv-row:hover,
        .inv-table tbody tr.inv-row.inv-row--focused {
          background: ${t.rowHover};
        }
        .inv-table tbody tr.inv-row:last-child td {
          border-bottom: none;
        }
        .inv-icon-btn {
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
          transition: opacity 150ms cubic-bezier(0.2, 0, 0, 1), color 150ms cubic-bezier(0.2, 0, 0, 1), background 150ms cubic-bezier(0.2, 0, 0, 1);
        }
        .inv-row:hover .inv-icon-btn,
        .inv-row:focus-within .inv-icon-btn,
        .inv-row.inv-row--focused .inv-icon-btn {
          opacity: 1;
        }
        .inv-icon-btn:hover:not(:disabled) {
          background: ${t.rowHover};
          color: ${t.textPrimary};
        }
        .inv-icon-btn:disabled {
          cursor: wait;
          opacity: 0.4;
        }
        .inv-search:focus {
          border-color: ${t.borderHover} !important;
          box-shadow: 0 0 0 3px ${t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"} !important;
        }
      `}</style>

      <InvoiceDrawer
        invoice={selected}
        bookings={bookings}
        onClose={() => setSelected(null)}
        busy={selected ? busyId === selected.id : false}
        onToggleStatus={toggleStatus}
        onDownload={handleDownload}
        onPreview={handlePreview}
        onSend={handleSend}
      />

      {/* Financial overview */}
      <div
        className="inv-summary"
        style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 32 }}
      >
        <WalletCard
          label="Total revenue"
          value={formatRs(metrics.totalRevenue)}
          trend={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
          icon={TrendingUp}
          t={t}
        >
          <MiniSparkline data={metrics.spark} color={t.accent} t={t} />
        </WalletCard>
        <WalletCard
          label="Outstanding"
          value={formatRs(metrics.outstanding)}
          trend="Awaiting payment"
          icon={Wallet}
          t={t}
          warn={metrics.outstanding > 0}
        />
        <WalletCard
          label="Paid this month"
          value={formatRs(metrics.paidThisMonth)}
          trend="Collected in period"
          icon={Check}
          t={t}
        />
        <WalletCard
          label="Overdue"
          value={formatRs(metrics.overdueAmt)}
          trend={`${metrics.overdueCount} invoice${metrics.overdueCount === 1 ? "" : "s"} · ${OVERDUE_DAYS}d+`}
          icon={AlertCircle}
          t={t}
          warn={metrics.overdueCount > 0}
        />
        <WalletCard
          label="Average invoice"
          value={formatRs(Math.round(metrics.avg))}
          trend="Across all invoices"
          icon={Receipt}
          t={t}
        />
      </div>

      {/* Spotlight search */}
      <div className="inv-search-wrap" style={{ maxWidth: 520, margin: "0 auto 24px", width: "100%" }}>
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
            className="inv-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setFocusedRow(-1);
            }}
            placeholder="Search customer, invoice #, phone, device…"
            aria-label="Search invoices"
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
          options={["All", "Paid", "Pending", "Overdue", "Cancelled"]}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setFocusedRow(-1);
          }}
          layoutId="invoicesStatusTab"
        />
        <div style={{ fontSize: 13, color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          illustration="default"
          title={invoices.length === 0 ? "No invoices yet" : "No matching invoices"}
          subtitle={
            invoices.length === 0
              ? "Mark a booking as Completed to generate an invoice"
              : "Try a different search or filter"
          }
          action={invoices.length === 0 ? "Go to Bookings" : undefined}
          onAction={invoices.length === 0 ? () => navigate("/bookings") : undefined}
        />
      ) : (
        <div style={{ ...panel, overflow: "hidden", marginBottom: 40 }}>
          <div style={{ overflowX: "auto", maxHeight: "min(62vh, 800px)" }}>
            <table className="inv-table data-table" style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={TH}>Invoice</th>
                  <th style={TH}>Customer</th>
                  <th style={TH}>Device</th>
                  <th style={TH}>Service</th>
                  <th style={{ ...TH, textAlign: "right" }}>Amount</th>
                  <th style={TH}>Date</th>
                  <th style={TH}>Status</th>
                  <th style={{ ...TH, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, i) => {
                  const busy = busyId === inv.id;
                  const focused = focusedRow === i;
                  const fullNo = inv.invoice_number || "";
                  return (
                    <tr
                      key={inv.id}
                      className={`inv-row${focused ? " inv-row--focused" : ""}`}
                      tabIndex={0}
                      onClick={() => setSelected(inv)}
                      onFocus={() => setFocusedRow(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(inv);
                        }
                      }}
                    >
                      <td style={{ ...TD, whiteSpace: "nowrap" }} title={fullNo || undefined}>
                        <IdChip title={fullNo}>{shortInvoiceId(fullNo)}</IdChip>
                      </td>
                      <td style={TD}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <CustomerAvatar name={inv.customer_name} size={36} t={t} />
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 500,
                                color: t.textPrimary,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 160,
                              }}
                            >
                              {inv.customer_name || "—"}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: t.textMuted,
                                marginTop: 3,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {inv.phone ? formatPhone(inv.phone) : "No phone"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          ...TD,
                          maxWidth: 120,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: inv.device ? t.tdColor : t.textMuted,
                        }}
                      >
                        {inv.device || "—"}
                      </td>
                      <td
                        style={{
                          ...TD,
                          maxWidth: 140,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: inv.service ? t.tdColor : t.textMuted,
                        }}
                      >
                        {inv.service || "—"}
                      </td>
                      <td
                        style={{
                          ...TD,
                          textAlign: "right",
                          fontWeight: 500,
                          fontSize: 16,
                          letterSpacing: -0.4,
                          fontVariantNumeric: "tabular-nums",
                          fontFamily: "var(--font-mono)",
                          color: t.textPrimary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatRs(inv.amount)}
                      </td>
                      <td style={{ ...TD, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontSize: 13, color: t.textMuted }}>
                        {formatDate(inv.created_at)}
                      </td>
                      <td style={TD} onClick={(e) => e.stopPropagation()}>
                        <InvoiceStatusBadge
                          inv={inv}
                          busy={busy}
                          onClick={() => toggleStatus(inv)}
                        />
                      </td>
                      <td style={{ ...TD, textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", gap: 2, alignItems: "center", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="inv-icon-btn"
                            disabled={busy}
                            title="Preview PDF"
                            aria-label="Preview PDF"
                            onClick={() => handlePreview(inv)}
                          >
                            <Eye size={16} strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            className="inv-icon-btn"
                            disabled={busy}
                            title="Download PDF"
                            aria-label="Download PDF"
                            onClick={() => handleDownload(inv)}
                          >
                            <Download size={16} strokeWidth={2} />
                          </button>
                          <RowActionsMenu
                            inv={inv}
                            busy={busy}
                            onView={setSelected}
                            onPreview={handlePreview}
                            onDownload={handleDownload}
                            onMarkPaid={toggleStatus}
                            onSend={handleSend}
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

      {/* Payment insights */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: t.textPrimary, letterSpacing: -0.3 }}>
          Payment insights
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, marginTop: 6 }}>
          Revenue trend and collection health
        </div>
      </div>

      <div
        className="inv-insights"
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}
      >
        <div style={{ ...panel, padding: "28px 28px 20px" }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: t.textPrimary, marginBottom: 4 }}>
            Revenue trend
          </div>
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 20 }}>Last 14 days</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={metrics.trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: t.textMuted, fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: t.textMuted, fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
              />
              <Tooltip content={<TrendTooltip t={t} />} cursor={{ stroke: t.border, strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={t.accent}
                strokeWidth={1.75}
                fill="transparent"
                isAnimationActive
                animationDuration={600}
                dot={false}
                activeDot={{ r: 3.5, strokeWidth: 2, stroke: t.cardBg, fill: t.accent }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...panel, padding: "24px" }}>
            <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 8 }}>Payment success rate</div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 500,
                color: t.textPrimary,
                letterSpacing: -1.2,
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {metrics.successRate}%
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 8 }}>
              {metrics.paidCount} of {invoices.length} paid
            </div>
          </div>
          <div style={{ ...panel, padding: "24px" }}>
            <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 8 }}>Outstanding balance</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: metrics.outstanding > 0 ? (t.warning || "#F59E0B") : t.textPrimary,
                letterSpacing: -1,
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatRs(metrics.outstanding)}
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 8 }}>
              Avg invoice {formatRs(Math.round(metrics.avg))}
            </div>
          </div>
          <div style={{ ...panel, padding: "20px 24px 16px", flex: 1 }}>
            <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>Top customers</div>
            {metrics.topCustomers.length === 0 ? (
              <div style={{ fontSize: 13, color: t.textMuted, padding: "12px 0" }}>No data yet</div>
            ) : (
              metrics.topCustomers.map((c, i) => (
                <div
                  key={c.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom:
                      i < metrics.topCustomers.length - 1 ? `1px solid ${t.borderSub}` : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <CustomerAvatar name={c.name} size={28} t={t} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: t.textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 120,
                        }}
                      >
                        {c.name}
                      </div>
                      <div style={{ fontSize: 11, color: t.textMuted }}>{c.count} invoice{c.count === 1 ? "" : "s"}</div>
                    </div>
                  </div>
                  <div
                    className="font-mono-data"
                    style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatRs(c.total)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
