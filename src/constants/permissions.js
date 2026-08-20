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

const SESSION_KEY = "slippy_session";

/** path prefix → permission key, or "owner" for owner-only, or null = any logged-in user */
export const PATH_PERMISSION = {
  "/": "dashboard",
  "/bookings": "bookings",
  "/invoices": "invoices",
  "/cash": "cash",
  "/slots": "slots",
  "/parts/scan": "owner",
  "/leads": "leads",
  "/waitlist": "waitlist",
  "/chats": "chats",
  "/analytics": "analytics",
  "/audit": "owner",
  "/security": "owner",
  "/settings": null,
};

export function saveSession({ username, role, permissions }) {
  let prev = {};
  try {
    prev = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}") || {};
  } catch {
    prev = {};
  }
  const payload = {
    ...prev,
    user: username || prev.user || "Owner",
    role: role || prev.role || "staff",
    permissions: Array.isArray(permissions) ? permissions : prev.permissions || [],
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  return payload;
}

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSessionPermissions() {
  const s = loadSession();
  if (s.role === "owner") return ALL_PERMISSION_KEYS;
  return Array.isArray(s.permissions) ? s.permissions : [];
}

export function isOwnerSession() {
  return loadSession().role === "owner";
}

export function canAccessPath(pathname, { role, permissions } = loadSession()) {
  const path =
    pathname.startsWith("/bookings") ? "/bookings"
    : pathname.startsWith("/parts") ? "/parts/scan"
    : pathname;

  const req = Object.prototype.hasOwnProperty.call(PATH_PERMISSION, path)
    ? PATH_PERMISSION[path]
    : null;

  if (role === "owner") return true;
  if (req === "owner") return false;
  if (req == null) return true;
  const perms = Array.isArray(permissions) ? permissions : [];
  return perms.includes(req);
}

export function filterNavPaths(paths, session = loadSession()) {
  return (paths || []).filter((p) => canAccessPath(p, session));
}
