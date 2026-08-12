export const BASE_URL = "http://localhost:5678/webhook";

/**
 * Semantic status tokens (chip + leading dot).
 * Brand red reserved for important/negative. Neutrals + amber + green elsewhere.
 */
export const STATUS_COLORS = {
  Pending: {
    bg: "#FFFBEB",
    color: "#B45309",
    border: "#FDE68A",
    dot: "#F59E0B",
    shadow: "none",
  },
  Confirmed: {
    bg: "#F1F3F5",
    color: "#3F4450",
    border: "rgba(15,17,21,0.10)",
    dot: "#5C6370",
    shadow: "none",
  },
  Completed: {
    bg: "#ECFDF5",
    color: "#047857",
    border: "#A7F3D0",
    dot: "#059669",
    shadow: "none",
  },
  Rejected: {
    bg: "#FFF1F2",
    color: "#BE123C",
    border: "#FECDD3",
    dot: "#E11D48",
    shadow: "none",
  },
  Cancelled: {
    bg: "#FFF1F2",
    color: "#BE123C",
    border: "#FECDD3",
    dot: "#E11D48",
    shadow: "none",
  },
  "Repeat customer": {
    bg: "#F1F3F5",
    color: "#3F4450",
    border: "rgba(15,17,21,0.10)",
    dot: "#5C6370",
    shadow: "none",
  },
  New: {
    bg: "rgba(92,99,112,0.10)",
    color: "#5C6370",
    border: "rgba(92,99,112,0.20)",
    dot: "#5C6370",
    shadow: "none",
  },
  Returning: {
    bg: "#F1F3F5",
    color: "#3F4450",
    border: "rgba(15,17,21,0.10)",
    dot: "#5C6370",
    shadow: "none",
  },
  Loyal: {
    bg: "#ECFDF5",
    color: "#047857",
    border: "#A7F3D0",
    dot: "#059669",
    shadow: "none",
  },
  VIP: {
    bg: "#FFF1F2",
    color: "#BE123C",
    border: "#FECDD3",
    dot: "#E11D48",
    shadow: "none",
  },
  "At risk": {
    bg: "#FFF1F2",
    color: "#BE123C",
    border: "#FECDD3",
    dot: "#E11D48",
    shadow: "none",
  },
  Available: {
    bg: "#ECFDF5",
    color: "#047857",
    border: "#A7F3D0",
    dot: "#059669",
    shadow: "none",
  },
  Booked: {
    bg: "#FFF1F2",
    color: "#BE123C",
    border: "#FECDD3",
    dot: "#E11D48",
    shadow: "none",
  },
  Website: {
    bg: "rgba(95,99,104,0.08)",
    color: "#5F6368",
    border: "rgba(95,99,104,0.16)",
    dot: "#5F6368",
    shadow: "none",
  },
  WhatsApp: {
    bg: "rgba(37,211,102,0.10)",
    color: "#1B7A3D",
    border: "rgba(37,211,102,0.22)",
    dot: "#25d366",
    shadow: "none",
  },
  Instagram: {
    bg: "#FDF2F8",
    color: "#DB2777",
    border: "#FBCFE8",
    dot: "#E1306C",
    shadow: "none",
  },
  Facebook: {
    bg: "#FFFFFF",
    color: "#1877F2",
    border: "#BFDBFE",
    dot: "#1877F2",
    shadow: "none",
  },
  Messenger: {
    bg: "#EFF6FF",
    color: "#0866FF",
    border: "#BFDBFE",
    dot: "#0084FF",
    shadow: "none",
  },
  default: {
    bg: "rgba(113,113,122,0.10)",
    color: "#71717A",
    border: "rgba(113,113,122,0.20)",
    dot: "#A1A1AA",
    shadow: "none",
  },
};

export const PAYMENT_COLORS = {
  "Full Payment": {
    bg: "#ECFDF5",
    color: "#047857",
    border: "#A7F3D0",
    dot: "#059669",
    shadow: "none",
  },
  Paid: {
    bg: "#ECFDF5",
    color: "#047857",
    border: "#A7F3D0",
    dot: "#059669",
    shadow: "none",
  },
  "Half Payment": {
    bg: "#EFF6FF",
    color: "#1D4ED8",
    border: "#BFDBFE",
    dot: "#3B82F6",
    shadow: "none",
  },
  Unpaid: {
    bg: "#FFFBEB",
    color: "#B45309",
    border: "#FDE68A",
    dot: "#F59E0B",
    shadow: "none",
  },
  Onsite: {
    bg: "rgba(95,99,104,0.10)",
    color: "#5F6368",
    border: "rgba(95,99,104,0.20)",
    dot: "#5F6368",
    shadow: "none",
  },
};

export const SERVICE_PRICES = {
  "Screen Repair":       5000,
  "Battery Replacement": 2500,
  "Software Fix":        1500,
  "Water Damage":        8000,
  "Charging Port":       3000,
  "Camera Repair":       4000,
};

export const NAV_ITEMS = [
  { path:"/",            label:"Dashboard",  badge:false },
  { path:"/bookings",    label:"Bookings",   badge:true },
  { path:"/invoices",    label:"Invoices" },
  { path:"/cash",        label:"Cash Ledger" },
  { path:"/slots",       label:"Slots" },
  { path:"/parts/scan",  label:"Parts Scan" },
  { path:"/leads",       label:"Leads" },
  { path:"/waitlist",    label:"Waitlist" },
  { path:"/chats",       label:"Chats" },
  { path:"/analytics",   label:"Analytics" },
  { path:"/audit",       label:"Audit Log" },
  { path:"/security",    label:"Security" },
  { path:"/settings",    label:"Settings" },
];

export const DATE_RANGES = ["Today", "This Week", "This Month", "All Time"];

export const CASH_ENTRY_TYPES = [
  { value: "cash_drop", label: "Cash Drop" },
  { value: "expense", label: "Expense" },
  { value: "payout", label: "Payout" },
];

export const CASH_ENTRY_COLORS = {
  cash_drop: {
    bg: "#ECFDF5",
    color: "#047857",
    border: "rgba(5,150,105,0.22)",
    label: "Cash Drop",
  },
  expense: {
    bg: "rgba(225,29,72,0.08)",
    color: "#BE123C",
    border: "rgba(225,29,72,0.22)",
    label: "Expense",
  },
  payout: {
    bg: "rgba(217,119,6,0.10)",
    color: "#B45309",
    border: "rgba(217,119,6,0.24)",
    label: "Payout",
  },
};
