import { useState, useMemo, useRef, useEffect } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Download,
  Search,
  Wallet,
  TrendingUp,
  TrendingDown,
  Banknote,
  MoreHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useStore } from "../store/useStore";
import {
  useTheme,
  primaryBtnStyle,
  primaryBtnHoverProps,
  secondaryBtnStyle,
  cardHoverProps,
} from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import EmptyState from "../components/EmptyState";
import { SkeletonBlock } from "../components/Skeleton";
import SegmentedControl from "../components/SegmentedControl";
import PageShell from "../components/PageShell";
import Sheet from "../components/Sheet";
import { formatDate, inRange } from "../utils/format";
import { exportToCSV } from "../utils/export";
import { CASH_ENTRY_TYPES } from "../constants";

/** Soft colour system — income green, expense orange, payout blue */
const TYPE_META = {
  cash_drop: {
    label: "Cash In",
    filterLabel: "Income",
    color: "#059669",
    bg: "rgba(5,150,105,0.10)",
    ring: "rgba(5,150,105,0.22)",
    Icon: ArrowUpRight,
  },
  expense: {
    label: "Expense",
    filterLabel: "Expenses",
    color: "#D97706",
    bg: "rgba(217,119,6,0.10)",
    ring: "rgba(217,119,6,0.22)",
    Icon: ArrowDownRight,
  },
  payout: {
    label: "Payout",
    filterLabel: "Payouts",
    color: "#2563EB",
    bg: "rgba(37,99,235,0.10)",
    ring: "rgba(37,99,235,0.22)",
    Icon: ArrowLeftRight,
  },
};

const TYPE_FILTERS = ["All", "Income", "Expenses", "Payouts"];
const DATE_FILTERS = ["Today", "This Week", "This Month", "All Time"];

function formatRs(n) {
  return Math.abs(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatAmount(n) {
  const num = Number(n) || 0;
  const abs = formatRs(num);
  if (num > 0) return `+Rs ${abs}`;
  if (num < 0) return `−Rs ${abs}`;
  return `Rs ${abs}`;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d) ? null : d;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function typeFromFilter(filter) {
  if (filter === "Income") return "cash_drop";
  if (filter === "Expenses") return "expense";
  if (filter === "Payouts") return "payout";
  return null;
}

function EntryTypeBadge({ type, dark }) {
  const meta = TYPE_META[type] || TYPE_META.expense;
  const Icon = meta.Icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
        background: dark ? `${meta.color}22` : meta.bg,
        border: `1px solid ${dark ? `${meta.color}44` : meta.ring}`,
        color: dark ? meta.color : meta.color,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={12} strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}

function WalletCard({ label, value, trend, icon: Icon, t, tone }) {
  const hover = cardHoverProps(t);
  const valueColor =
    tone === "in"
      ? "#059669"
      : tone === "out"
        ? "#D97706"
        : tone === "warn"
          ? t.warning || "#F59E0B"
          : t.textPrimary;

  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: 18,
        boxShadow: t.cardShadow,
        padding: "24px 24px 20px",
        minHeight: 132,
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
            fontSize: 28,
            fontWeight: 500,
            color: valueColor,
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

function groupEntries(entries) {
  const today = startOfDay();
  const yesterday = startOfDay();
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = startOfDay();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = { Today: [], Yesterday: [], "This Week": [], Older: [] };

  entries.forEach((e) => {
    const d = parseDate(e.created_at);
    if (!d) {
      groups.Older.push(e);
      return;
    }
    if (isSameDay(d, today)) groups.Today.push(e);
    else if (isSameDay(d, yesterday)) groups.Yesterday.push(e);
    else if (d >= weekAgo) groups["This Week"].push(e);
    else groups.Older.push(e);
  });

  return Object.entries(groups).filter(([, list]) => list.length > 0);
}

function CashSkeleton() {
  const { theme: t } = useTheme();
  return (
    <PageShell
      title="Cash Ledger"
      subtitle="Track cash in and cash out."
    >
      <style>{`
        .sk-wave{position:relative;overflow:hidden;background:${t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"};border:1px solid ${t.border}}
        .sk-wave::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,${t.name === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)"},transparent);animation:skWave 1.4s ease-in-out infinite}
        @keyframes skWave{100%{transform:translateX(100%)}}
      `}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 32 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} height={132} radius={18} style={{ animationDelay: `${i * 50}ms` }} />
        ))}
      </div>
      <SkeletonBlock height={200} radius={18} style={{ marginBottom: 32 }} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <SkeletonBlock key={i} height={72} radius={14} style={{ marginBottom: 8, animationDelay: `${i * 40}ms` }} />
      ))}
    </PageShell>
  );
}

function EntryDrawer({ entry, onClose, t, dark }) {
  if (!entry) return null;

  const meta = TYPE_META[entry.entry_type] || TYPE_META.expense;
  const amt = Number(entry.amount) || 0;
  const timeStr = entry.created_at
    ? new Date(entry.created_at).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  const aiSummary = (() => {
    const bits = [];
    if (entry.entry_type === "cash_drop") {
      bits.push("Cash came into the drawer. Confirm the till matches this deposit.");
    } else if (entry.entry_type === "expense") {
      bits.push("Shop expense logged. Keep the receipt with this entry for audit.");
    } else if (entry.entry_type === "payout") {
      bits.push("Payout recorded. Verify the recipient and purpose if reviewing later.");
    }
    bits.push(`Amount: ${formatAmount(amt)}.`);
    if (entry.reason) bits.push(`Reason: ${entry.reason}.`);
    bits.push(`Logged by ${entry.logged_by || "unknown"}.`);
    return bits;
  })();

  return (
    <Sheet
      open={!!entry}
      onClose={onClose}
      title={meta.label}
      subtitle={formatAmount(amt)}
      width={440}
    >
      <div style={{ marginBottom: 24 }}>
        <EntryTypeBadge type={entry.entry_type} dark={dark} />
      </div>

      <div
        style={{
          fontSize: 36,
          fontWeight: 500,
          color: amt > 0 ? "#059669" : amt < 0 ? meta.color : t.textPrimary,
          letterSpacing: -1.6,
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
          marginBottom: 28,
          lineHeight: 1.1,
        }}
      >
        {formatAmount(amt)}
      </div>

      <DrawerSection title="Timeline" t={t}>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingLeft: 4 }}>
          {[
            { label: "Entry created", meta: timeStr, current: true },
            { label: "Recorded in ledger", meta: "Synced", done: true },
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

      <DrawerSection title="Details" t={t}>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            ["Category", meta.label],
            ["Reason", entry.reason || "—"],
            ["Employee", entry.logged_by || "—"],
            ["Date", formatDate(entry.created_at)],
            ["Status", "Posted"],
          ].map(([label, value], i, arr) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                padding: "12px 0",
                borderBottom: i < arr.length - 1 ? `1px solid ${t.borderSub}` : "none",
              }}
            >
              <span style={{ fontSize: 13, color: t.textMuted }}>{label}</span>
              <span style={{ fontSize: 13, color: t.textPrimary, textAlign: "right", maxWidth: "60%" }}>{value}</span>
            </div>
          ))}
        </div>
      </DrawerSection>

      <DrawerSection title="Notes" t={t}>
        <p style={{ margin: 0, fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>
          {entry.notes || entry.reason || "No additional notes."}
        </p>
      </DrawerSection>

      <DrawerSection title="Links" t={t}>
        <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
          {entry.invoice_id || entry.booking_id
            ? [
                entry.invoice_id && `Invoice: ${entry.invoice_id}`,
                entry.booking_id && `Booking: ${entry.booking_id}`,
              ]
                .filter(Boolean)
                .join(" · ")
            : "No invoice or booking linked to this entry."}
        </div>
      </DrawerSection>

      <DrawerSection title="Attachments" t={t}>
        <div style={{ fontSize: 13, color: t.textMuted }}>No attachments on this entry.</div>
      </DrawerSection>

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

      <DrawerSection title="Audit history" t={t}>
        <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
          Created {timeStr} by {entry.logged_by || "unknown"}. Entries are immutable once posted.
        </div>
      </DrawerSection>
    </Sheet>
  );
}

function ChartTooltip({ active, payload, label, t }) {
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
        Rs {formatRs(payload[0].value)}
      </div>
    </div>
  );
}

export default function CashLedger() {
  const cashLedger = useStore((s) => s.cashLedger);
  const invoices = useStore((s) => s.invoices);
  const loading = useStore((s) => s.loading);
  const addCashLedgerEntry = useStore((s) => s.addCashLedgerEntry);
  const { theme: t, dark } = useTheme();
  const { showToast } = useToast();

  const [range, setRange] = useState("All Time");
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [cashReason, setCashReason] = useState("");
  const [cashType, setCashType] = useState("cash_drop");
  const [cashSaving, setCashSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const searchRef = useRef(null);
  const amountRef = useRef(null);

  async function handleCashSave() {
    const amount = Number(cashAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Enter a positive amount", "error");
      return;
    }
    if (!cashReason.trim()) {
      showToast("Reason is required", "error");
      return;
    }
    setCashSaving(true);
    try {
      const saved = await addCashLedgerEntry({
        amount,
        entry_type: cashType,
        reason: cashReason.trim(),
      });
      if (!saved?.id) {
        throw new Error("Save succeeded but no entry was returned — check the cash_ledger table");
      }
      setCashAmount("");
      setCashReason("");
      setTypeFilter("All");
      showToast("Cash entry saved");
      amountRef.current?.focus();
    } catch (err) {
      console.error("Cash ledger save failed:", err);
      const msg = err?.message || "Failed to save entry";
      if (err?.status === 404 || /404|Not Found/i.test(msg)) {
        showToast("Cash ledger API not found — deploy backend with /cash-ledger and run migration 007", "error");
      } else {
        showToast(msg, "error");
      }
    } finally {
      setCashSaving(false);
    }
  }

  const metrics = useMemo(() => {
    const todayStart = startOfDay();
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const all = cashLedger || [];
    const ranged = all.filter((e) => inRange(e.created_at, range));

    const sumType = (list, type) =>
      list
        .filter((e) => e.entry_type === type)
        .reduce((s, e) => s + Math.abs(Number(e.amount || 0)), 0);

    const ledgerNetAll = all.reduce((s, e) => s + Number(e.amount || 0), 0);
    const paidAll = (invoices || [])
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const cashOnHand = ledgerNetAll + paidAll;

    const todayEntries = all.filter((e) => {
      const d = parseDate(e.created_at);
      return d && d >= todayStart;
    });
    const todayIncome = sumType(todayEntries, "cash_drop");
    const todayExpenses =
      sumType(todayEntries, "expense") + sumType(todayEntries, "payout");
    const todayNet = todayEntries.reduce((s, e) => s + Number(e.amount || 0), 0);

    const monthEntries = all.filter((e) => {
      const d = parseDate(e.created_at);
      return d && d >= monthStart;
    });
    const monthIncome = sumType(monthEntries, "cash_drop");
    const monthOut =
      sumType(monthEntries, "expense") + sumType(monthEntries, "payout");
    const monthlyProfit = monthIncome - monthOut;

    const rangeIncome = sumType(ranged, "cash_drop");
    const rangeExpenses = sumType(ranged, "expense");
    const rangePayouts = sumType(ranged, "payout");
    const rangeNet = ranged.reduce((s, e) => s + Number(e.amount || 0), 0);

    // 14-day cash flow spark / trend
    const byDay = {};
    all.forEach((e) => {
      const d = parseDate(e.created_at);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      byDay[key] = (byDay[key] || 0) + Number(e.amount || 0);
    });
    const trend = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trend.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        net: byDay[key] || 0,
        v: byDay[key] || 0,
      });
    }

    // Expense breakdown by reason (top categories)
    const expenseCats = {};
    all
      .filter((e) => e.entry_type === "expense")
      .forEach((e) => {
        const key = (e.reason || "Other").trim() || "Other";
        expenseCats[key] = (expenseCats[key] || 0) + Math.abs(Number(e.amount || 0));
      });
    const topExpenses = Object.entries(expenseCats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const incomeSources = [
      { name: "Cash In", value: sumType(ranged.length ? ranged : all, "cash_drop"), color: "#059669" },
      {
        name: "Paid invoices",
        value: (invoices || [])
          .filter((i) => i.status === "paid" && (range === "All Time" || inRange(i.created_at, range)))
          .reduce((s, i) => s + Number(i.amount || 0), 0),
        color: "#10B981",
      },
    ].filter((x) => x.value > 0);

    const breakdown = [
      { name: "Income", value: rangeIncome || sumType(all, "cash_drop"), color: "#059669" },
      { name: "Expenses", value: rangeExpenses || sumType(all, "expense"), color: "#D97706" },
      { name: "Payouts", value: rangePayouts || sumType(all, "payout"), color: "#2563EB" },
    ].filter((x) => x.value > 0);

    return {
      cashOnHand,
      todayIncome,
      todayExpenses,
      todayNet,
      monthlyProfit,
      rangeIncome,
      rangeExpenses,
      rangePayouts,
      rangeNet,
      trend,
      topExpenses,
      incomeSources,
      breakdown,
    };
  }, [cashLedger, invoices, range]);

  const filtered = useMemo(() => {
    const type = typeFromFilter(typeFilter);
    const s = search.toLowerCase().trim();
    return (cashLedger || [])
      .filter((e) => inRange(e.created_at, range))
      .filter((e) => (type ? e.entry_type === type : true))
      .filter((e) => {
        if (!s) return true;
        return (
          e.reason?.toLowerCase().includes(s) ||
          e.logged_by?.toLowerCase().includes(s) ||
          e.entry_type?.toLowerCase().includes(s) ||
          String(e.amount).includes(s)
        );
      });
  }, [cashLedger, range, typeFilter, search]);

  const grouped = useMemo(() => groupEntries(filtered), [filtered]);

  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;
      if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleExport() {
    const rows = filtered.map((e) => ({
      Date: e.created_at,
      Type: TYPE_META[e.entry_type]?.label || e.entry_type,
      Amount: e.amount,
      Reason: e.reason,
      Employee: e.logged_by,
    }));
    exportToCSV(rows, "cash-ledger.csv");
  }

  function handleDownloadReport() {
    const rows = [
      {
        Metric: "Cash on hand",
        Value: metrics.cashOnHand,
        Period: "All time",
      },
      {
        Metric: "Today's income",
        Value: metrics.todayIncome,
        Period: "Today",
      },
      {
        Metric: "Today's expenses",
        Value: metrics.todayExpenses,
        Period: "Today",
      },
      {
        Metric: "Net cash flow (today)",
        Value: metrics.todayNet,
        Period: "Today",
      },
      {
        Metric: "Monthly profit",
        Value: metrics.monthlyProfit,
        Period: "This month",
      },
      {
        Metric: `Income (${range})`,
        Value: metrics.rangeIncome,
        Period: range,
      },
      {
        Metric: `Expenses (${range})`,
        Value: metrics.rangeExpenses,
        Period: range,
      },
      {
        Metric: `Payouts (${range})`,
        Value: metrics.rangePayouts,
        Period: range,
      },
    ];
    exportToCSV(rows, "cash-ledger-report.csv");
    showToast("Report downloaded");
  }

  if (loading && (!cashLedger || cashLedger.length === 0)) {
    return <CashSkeleton />;
  }

  const panel = {
    background: t.cardBg,
    border: `1px solid ${t.border}`,
    borderRadius: 18,
    boxShadow: t.cardShadow,
  };

  const inputStyle = {
    width: "100%",
    height: 48,
    padding: "0 16px",
    borderRadius: 12,
    fontSize: 15,
    background: t.inputBg || (dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.03)"),
    border: `1px solid ${t.border}`,
    color: t.textPrimary,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const gridStroke = dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)";

  return (
    <PageShell
      title="Cash Ledger"
      subtitle="Track cash in and cash out."
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
            onClick={handleDownloadReport}
            style={{
              ...secondaryBtnStyle(t),
              padding: "0 16px",
              height: 40,
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            <Download size={15} strokeWidth={2} />
            Download Report
          </button>
        </div>
      }
    >
      <style>{`
        @media(max-width:1100px){
          .cash-summary{grid-template-columns:repeat(3,1fr)!important}
          .cash-insights{grid-template-columns:1fr!important}
          .cash-entry-grid{grid-template-columns:1fr!important}
        }
        @media(max-width:768px){
          .cash-summary{grid-template-columns:1fr 1fr!important}
          .cash-filters{flex-direction:column!important;align-items:stretch!important}
          .cash-search-wrap{max-width:none!important}
        }
        @media(max-width:520px){
          .cash-summary{grid-template-columns:1fr!important}
        }
        .cash-row {
          transition: background 150ms cubic-bezier(0.2, 0, 0, 1), transform 150ms cubic-bezier(0.2, 0, 0, 1);
          cursor: pointer;
        }
        .cash-row:hover {
          background: ${t.rowHover};
        }
        .cash-search:focus {
          border-color: ${t.borderHover} !important;
          box-shadow: 0 0 0 3px ${dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)"} !important;
        }
      `}</style>

      <EntryDrawer entry={selected} onClose={() => setSelected(null)} t={t} dark={dark} />

      {/* Financial summary */}
      <div
        className="cash-summary"
        style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 32 }}
      >
        <div style={{ ...panel, padding: "24px 24px 16px", minHeight: 132, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: 13, color: t.textMuted }}>Cash on hand</div>
            <Wallet size={14} color={t.textMuted} strokeWidth={1.75} />
          </div>
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: t.textPrimary,
                letterSpacing: -1.2,
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Rs {formatRs(metrics.cashOnHand)}
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 8 }}>Ledger + paid invoices</div>
            <MiniSparkline data={metrics.trend} color={t.accent} />
          </div>
        </div>
        <WalletCard
          label="Today's income"
          value={`Rs ${formatRs(metrics.todayIncome)}`}
          trend="Cash in today"
          icon={TrendingUp}
          t={t}
          tone="in"
        />
        <WalletCard
          label="Today's expenses"
          value={`Rs ${formatRs(metrics.todayExpenses)}`}
          trend="Expenses + payouts"
          icon={TrendingDown}
          t={t}
          tone="out"
        />
        <WalletCard
          label="Net cash flow"
          value={`${metrics.todayNet >= 0 ? "+" : "−"}Rs ${formatRs(metrics.todayNet)}`}
          trend="Today"
          icon={Banknote}
          t={t}
          tone={metrics.todayNet >= 0 ? "in" : "out"}
        />
        <WalletCard
          label="Monthly profit"
          value={`${metrics.monthlyProfit >= 0 ? "" : "−"}Rs ${formatRs(metrics.monthlyProfit)}`}
          trend="Income − outflows"
          icon={TrendingUp}
          t={t}
          tone={metrics.monthlyProfit >= 0 ? "in" : "out"}
        />
      </div>

      {/* Quick cash entry */}
      <div
        style={{
          ...panel,
          padding: "28px",
          marginBottom: 32,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 500, color: t.textPrimary, letterSpacing: -0.3 }}>
            Quick cash entry
          </div>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 6 }}>
            Cash in adds · expense &amp; payout subtract
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 10 }}>Type</div>
          <div
            role="group"
            aria-label="Entry type"
            style={{
              display: "flex",
              gap: 4,
              padding: 4,
              borderRadius: 14,
              background: dark ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)",
              border: `1px solid ${t.border}`,
            }}
          >
            {CASH_ENTRY_TYPES.map((opt) => {
              const meta = TYPE_META[opt.value];
              const active = cashType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className="ui-press"
                  onClick={() => setCashType(opt.value)}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    fontFamily: "inherit",
                    background: active ? t.cardBg : "transparent",
                    color: active ? meta.color : t.textSecondary,
                    boxShadow: active ? t.cardShadow : "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "color 150ms cubic-bezier(0.2, 0, 0, 1), background 150ms cubic-bezier(0.2, 0, 0, 1)",
                  }}
                >
                  <meta.Icon size={14} strokeWidth={2} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="cash-entry-grid"
          style={{ display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 12, alignItems: "end" }}
        >
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 8 }}>
              Amount
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 13,
                  color: t.textMuted,
                  fontFamily: "var(--font-mono)",
                  pointerEvents: "none",
                }}
              >
                Rs
              </span>
              <input
                ref={amountRef}
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCashSave();
                }}
                style={{
                  ...inputStyle,
                  paddingLeft: 44,
                  fontFamily: "var(--font-mono)",
                  fontSize: 18,
                  fontWeight: 500,
                  letterSpacing: -0.4,
                }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 8 }}>
              Reason
            </label>
            <input
              type="text"
              placeholder="What is this for?"
              value={cashReason}
              onChange={(e) => setCashReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCashSave();
              }}
              style={inputStyle}
            />
          </div>
          <button
            type="button"
            className="ui-press"
            disabled={cashSaving}
            onClick={handleCashSave}
            {...primaryBtnHoverProps(t)}
            style={{
              ...primaryBtnStyle(t),
              height: 48,
              padding: "0 28px",
              fontSize: 14,
              fontWeight: 500,
              opacity: cashSaving ? 0.7 : 1,
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {cashSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="cash-search-wrap" style={{ maxWidth: 480, margin: "0 auto 20px", width: "100%" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={18}
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
            className="cash-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reason, employee, amount…"
            aria-label="Search transactions"
            style={{
              width: "100%",
              height: 48,
              padding: "0 64px 0 48px",
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
              fontFamily: "var(--font-mono)",
            }}
          >
            /
          </kbd>
        </div>
      </div>

      <div
        className="cash-filters"
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
          options={TYPE_FILTERS}
          value={typeFilter}
          onChange={setTypeFilter}
          layoutId="cashTypeTab"
        />
        <SegmentedControl
          options={DATE_FILTERS}
          value={range}
          onChange={setRange}
          layoutId="cashRangeTab"
        />
      </div>

      <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 16, lineHeight: 1.4 }}>
        Payment method (cash vs digital) is not tracked separately — known simplification.
      </div>

      {/* Transaction timeline */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: t.textPrimary, letterSpacing: -0.3 }}>
          Transaction timeline
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, marginTop: 6 }}>
          {filtered.length} entr{filtered.length === 1 ? "y" : "ies"} · newest first
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          compact
          illustration="default"
          title="No ledger entries"
          subtitle="Use quick cash entry above to log a cash in, expense, or payout"
          action="Add cash in"
          onAction={() => {
            setCashType("cash_drop");
            amountRef.current?.focus();
          }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28, marginBottom: 48 }}>
          {grouped.map(([groupLabel, items]) => (
            <div key={groupLabel}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: t.textMuted,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                  paddingLeft: 4,
                }}
              >
                {groupLabel}
              </div>
              <div style={{ ...panel, overflow: "hidden", padding: "6px 0" }}>
                {items.map((e, idx) => {
                  const amt = Number(e.amount) || 0;
                  const meta = TYPE_META[e.entry_type] || TYPE_META.expense;
                  const Icon = meta.Icon;
                  const timeStr = e.created_at
                    ? new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "";
                  return (
                    <button
                      key={e.id}
                      type="button"
                      className="cash-row ui-press"
                      onClick={() => setSelected(e)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        width: "100%",
                        padding: "16px 20px",
                        background: "none",
                        border: "none",
                        borderBottom: idx < items.length - 1 ? `1px solid ${t.borderSub}` : "none",
                        textAlign: "left",
                        fontFamily: "inherit",
                        color: "inherit",
                      }}
                    >
                      <span
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: dark ? `${meta.color}18` : meta.bg,
                          color: meta.color,
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <EntryTypeBadge type={e.entry_type} dark={dark} />
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: t.textMuted,
                              padding: "2px 8px",
                              borderRadius: 9999,
                              border: `1px solid ${t.border}`,
                            }}
                          >
                            Posted
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: t.textPrimary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {e.reason || "—"}
                        </div>
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 3 }}>
                          {e.logged_by || "—"}
                          {timeStr ? ` · ${timeStr}` : ""}
                          {groupLabel === "Older" || groupLabel === "This Week"
                            ? ` · ${formatDate(e.created_at)}`
                            : ""}
                        </div>
                      </div>
                      <div
                        className="font-mono-data"
                        style={{
                          fontSize: 16,
                          fontWeight: 500,
                          letterSpacing: -0.4,
                          color: amt > 0 ? "#059669" : meta.color,
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {formatAmount(amt)}
                      </div>
                      <MoreHorizontal size={16} color={t.textMuted} strokeWidth={1.75} style={{ opacity: 0.5, flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insights */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: t.textPrimary, letterSpacing: -0.3 }}>
          Insights
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, marginTop: 6 }}>
          Cash flow, sources, and expense categories
        </div>
      </div>

      <div
        className="cash-insights"
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}
      >
        <div style={{ ...panel, padding: "28px 28px 20px" }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: t.textPrimary, marginBottom: 4 }}>
            Cash flow trend
          </div>
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 20 }}>Net movement · last 14 days</div>
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
                tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : v)}
              />
              <Tooltip content={<ChartTooltip t={t} />} cursor={{ stroke: t.border, strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="net"
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
            <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 16 }}>Expense breakdown</div>
            {metrics.breakdown.length === 0 ? (
              <div style={{ fontSize: 13, color: t.textMuted }}>No data yet</div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 100, height: 100, flexShrink: 0, position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.breakdown}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius="70%"
                        outerRadius="92%"
                        paddingAngle={2}
                        stroke="none"
                        isAnimationActive
                        animationDuration={500}
                      >
                        {metrics.breakdown.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 0 }}>
                  {metrics.breakdown.map((d) => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: t.textSecondary }}>{d.name}</span>
                      <span className="font-mono-data" style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary }}>
                        {formatRs(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ ...panel, padding: "24px" }}>
            <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>Income sources</div>
            {metrics.incomeSources.length === 0 ? (
              <div style={{ fontSize: 13, color: t.textMuted }}>No income in range</div>
            ) : (
              metrics.incomeSources.map((s, i) => (
                <div
                  key={s.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: i < metrics.incomeSources.length - 1 ? `1px solid ${t.borderSub}` : "none",
                  }}
                >
                  <span style={{ fontSize: 13, color: t.textSecondary }}>{s.name}</span>
                  <span className="font-mono-data" style={{ fontSize: 13, fontWeight: 500, color: "#059669" }}>
                    Rs {formatRs(s.value)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div style={{ ...panel, padding: "20px 24px 16px", flex: 1 }}>
            <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>Top expense categories</div>
            {metrics.topExpenses.length === 0 ? (
              <div style={{ fontSize: 13, color: t.textMuted, padding: "8px 0" }}>No expenses yet</div>
            ) : (
              metrics.topExpenses.map((c, i) => (
                <div
                  key={c.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: i < metrics.topExpenses.length - 1 ? `1px solid ${t.borderSub}` : "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: t.textPrimary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.name}
                  </span>
                  <span
                    className="font-mono-data"
                    style={{ fontSize: 13, fontWeight: 500, color: "#D97706", flexShrink: 0 }}
                  >
                    Rs {formatRs(c.value)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
