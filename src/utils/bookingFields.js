/** Map Slippy Goalz booking UI <-> existing /bookings API columns. */

export const PAYMENT_STATUSES = ["Unpaid", "Half Payment", "Full Payment"];
export const PAYMENT_MODES = ["Cash", "Online"];
export const HEARD_FROM_OPTIONS = [
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Google",
  "TikTok",
  "Friend",
  "Walked past",
  "Other",
];
export const SERVICE_LABEL = "Pitch booking";
export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 10;

const PLAYERS_RE = /^(\d+)\s*players?$/i;

export function clampPlayers(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return MIN_PLAYERS;
  return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.round(n)));
}

export function playersToDevice(players) {
  return `${clampPlayers(players)} players`;
}

export function parsePlayers(device) {
  if (device == null || device === "") return null;
  const m = String(device).trim().match(PLAYERS_RE);
  if (m) return Number(m[1]);
  const asNum = Number(device);
  if (Number.isFinite(asNum) && asNum > 0) return asNum;
  return null;
}

export function parsePaymentMode(issue, service) {
  const raw = String(issue || service || "").trim();
  if (/^cash$/i.test(raw)) return "Cash";
  if (/^online$/i.test(raw)) return "Online";
  return raw || null;
}

export function normalizePaymentStatus(status) {
  const s = String(status || "Unpaid").trim();
  if (/^full(\s*payment)?$/i.test(s) || /^paid$/i.test(s)) return "Full Payment";
  if (/^half(\s*payment)?$/i.test(s)) return "Half Payment";
  if (/^onsite$/i.test(s)) return "Unpaid";
  if (PAYMENT_STATUSES.includes(s)) return s;
  return "Unpaid";
}

/** Admin / public form -> API body */
export function toApiPayload({
  name,
  firstName,
  lastName,
  phone,
  players,
  paymentMode,
  paymentStatus = "Unpaid",
  date,
  time,
  notes,
  status = "Confirmed",
  source,
  amount,
}) {
  const fullName =
    (name && String(name).trim()) ||
    [firstName, lastName].filter(Boolean).map((x) => String(x).trim()).join(" ");
  const mode = paymentMode === "Online" ? "Online" : "Cash";
  const body = {
    name: fullName,
    phone: String(phone || "").trim(),
    device: playersToDevice(players),
    service: SERVICE_LABEL,
    issue: mode,
    payment_mode: mode,
    date: String(date || "").trim(),
    time: String(time || "").trim(),
    payment_status: paymentStatus || "Unpaid",
    notes: notes ? String(notes).trim() : null,
    status: "Pending",
  };
  if (source) body.source = source;
  if (amount != null && amount !== "") {
    const n = Number(amount);
    if (Number.isFinite(n) && n >= 0) body.amount = n;
  }
  return body;
}

/** API / store row -> UI helpers */
export function fromApiRow(row) {
  if (!row) return { players: null, paymentMode: null, paymentStatus: "Unpaid" };
  const device = row.Device ?? row.device;
  const issue = row.Issue ?? row.issue;
  const service = row.Service ?? row.service;
  return {
    players: parsePlayers(device),
    playersLabel: parsePlayers(device) != null ? `${parsePlayers(device)} players` : device || null,
    paymentMode: parsePaymentMode(issue, service),
    paymentStatus: normalizePaymentStatus(row["Payment Status"] ?? row.payment_status ?? row.paymentStatus),
  };
}

export function joinName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).map((x) => String(x).trim()).join(" ").trim();
}
