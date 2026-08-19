/**
 * Permission system — matches backend ASSIGNABLE_PERMISSIONS.
 * Each permission controls access to a page/section.
 * Owner always has all permissions (not editable).
 */

export const PERMISSIONS = {
  dashboard:  { label: "Dashboard",   description: "View the main dashboard with stats and overview" },
  bookings:   { label: "Bookings",    description: "View and manage customer bookings" },
  invoices:   { label: "Invoices",    description: "View and create invoices" },
  cash:       { label: "Cash",        description: "View the cash ledger and record entries" },
  slots:      { label: "Slots",       description: "View and manage time slots" },
  leads:      { label: "Leads",       description: "View and manage leads" },
  waitlist:   { label: "Waitlist",    description: "View the customer waitlist" },
  chats:      { label: "Chats",       description: "View and respond to customer chats" },
  analytics:  { label: "Analytics",   description: "View analytics, charts, and reports" },
};

export const ALL_PERMISSION_KEYS = Object.keys(PERMISSIONS);

export const DEFAULT_STAFF_PERMISSIONS = [
  "dashboard",
  "bookings",
  "slots",
  "leads",
  "waitlist",
  "chats",
];

export const MAX_STAFF_MEMBERS = 10;
