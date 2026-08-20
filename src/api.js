import { API_URL } from "./config";

// Store token in localStorage
const getToken = () => localStorage.getItem("slippy_token");
const setToken = (token) => localStorage.setItem("slippy_token", token);

// Base fetch with auth
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
          : `API error ${res.status}`;
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

// Auth
export async function login(username, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.access_token);
  return data;
}

// Bookings
export const getBookings = () => apiFetch("/bookings/");
export const getBookingHistory = (bookingId) =>
  apiFetch(`/bookings/${encodeURIComponent(bookingId)}/history`);
export const createBooking = (booking) =>
  apiFetch("/bookings/", { method: "POST", body: JSON.stringify(booking) });
export const updateBooking = (id, data) =>
  apiFetch(`/bookings/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteBooking = (id) =>
  apiFetch(`/bookings/${id}`, { method: "DELETE" });

// Customers (permanent identity)
export const getCustomer = (id) =>
  apiFetch(`/customers/${encodeURIComponent(id)}`);
export const getCustomerBookings = (id) =>
  apiFetch(`/customers/${encodeURIComponent(id)}/bookings`);

// Slots
export const getSlots = () => apiFetch("/slots/");
export const createSlot = (data) =>
  apiFetch("/slots/", { method: "POST", body: JSON.stringify(data) });
export const createSlotsBulk = (data) =>
  apiFetch("/slots/bulk", { method: "POST", body: JSON.stringify(data) });
export const copySlotsDay = (data) =>
  apiFetch("/slots/copy-day", { method: "POST", body: JSON.stringify(data) });
export const updateSlot = (id, data) =>
  apiFetch(`/slots/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteSlot = (id) =>
  apiFetch(`/slots/${encodeURIComponent(id)}`, { method: "DELETE" });

// Leads
export const getLeads = () => apiFetch("/leads/");
export const createLead = (lead) =>
  apiFetch("/leads/", { method: "POST", body: JSON.stringify(lead) });
export const deleteLead = (id) =>
  apiFetch(`/leads/${encodeURIComponent(id)}`, { method: "DELETE" });

// Chat
export const getChatSessions = (limit = 100) =>
  apiFetch(`/chat/sessions?limit=${encodeURIComponent(limit)}`);
export const ownerChat = (messages) =>
  apiFetch("/chat/owner", { method: "POST", body: JSON.stringify({ messages }) });
export const suggestChatReply = ({ sessionId, history, customerName, channel }) =>
  apiFetch("/chat/suggest-reply", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId || null,
      history: history || [],
      customer_name: customerName || null,
      channel: channel || null,
    }),
  });
export const customerChat = (message) =>
  apiFetch("/chat/customer", {
    method: "POST",
    body: JSON.stringify({ message }),
  });

// Invoices
export const getInvoices = () => apiFetch("/invoices/");
export const completeBookingWithInvoice = (bookingId, amount) =>
  apiFetch(`/invoices/from-booking/${encodeURIComponent(bookingId)}`, {
    method: "POST",
    body: JSON.stringify({ amount: Number(amount) }),
  });
export const updateInvoiceStatus = (id, status) =>
  apiFetch(`/invoices/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });

async function fetchInvoicePdfBlob(invoiceId) {
  const token = getToken();
  const res = await fetch(`${API_URL}/invoices/${invoiceId}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`PDF download failed (${res.status})`);
  return res.blob();
}

export async function downloadInvoicePdf(invoiceId, filename) {
  const blob = await fetchInvoicePdfBlob(invoiceId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "invoice.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function openInvoicePdf(invoiceId) {
  const blob = await fetchInvoicePdfBlob(invoiceId);
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error("Popup blocked — allow popups to preview invoices");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Audit
export const getAuditEvents = (limit = 200) =>
  apiFetch(`/audit-events/?limit=${encodeURIComponent(limit)}`);

// Cash ledger
export const getCashLedger = (limit = 200) =>
  apiFetch(`/cash-ledger/?limit=${encodeURIComponent(limit)}`);
export const createCashLedgerEntry = (entry) =>
  apiFetch("/cash-ledger/", {
    method: "POST",
    body: JSON.stringify(entry),
  });

// Quick PIN
export const getPinStatus = () => apiFetch("/auth/pin/status");
export const setPin = (pin, password) =>
  apiFetch("/auth/pin/set", {
    method: "POST",
    body: JSON.stringify({ pin, password }),
  });
export const clearPin = (password) =>
  apiFetch("/auth/pin/clear", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
export const verifyPin = (pin) =>
  apiFetch("/auth/pin/verify", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
export const unlockWithPassword = (password) =>
  apiFetch("/auth/pin/unlock-password", {
    method: "POST",
    body: JSON.stringify({ password }),
  });

export const testWhatsApp = (to, templateName = "hello_world") =>
  apiFetch("/test-whatsapp", {
    method: "POST",
    body: JSON.stringify({ to, template_name: templateName }),
  });

export const sendWhatsAppText = (to, text) =>
  apiFetch("/whatsapp/send", {
    method: "POST",
    body: JSON.stringify({ to, text }),
  });

export const getWhatsAppIntegrationStatus = () =>
  apiFetch("/integrations/whatsapp/status");

export const connectWhatsApp = (phoneNumberId, accessToken) =>
  apiFetch("/integrations/whatsapp/connect", {
    method: "POST",
    body: JSON.stringify({
      phone_number_id: phoneNumberId,
      access_token: accessToken,
    }),
  });

export const receiveParts = (body) =>
  apiFetch("/parts/receive", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const installParts = (body) =>
  apiFetch("/parts/install", {
    method: "POST",
    body: JSON.stringify(body),
  });

// Staff management (matches backend /auth/staff endpoints)
export const getStaffMembers = () => apiFetch("/auth/staff");
export const createStaffMember = (data) =>
  apiFetch("/auth/staff", { method: "POST", body: JSON.stringify(data) });
export const setStaffActive = (username, is_active) =>
  apiFetch(`/auth/staff/${encodeURIComponent(username)}/active`, {
    method: "POST",
    body: JSON.stringify({ is_active }),
  });
export const updateStaffPermissions = (username, permissions) =>
  apiFetch(`/auth/staff/${encodeURIComponent(username)}/permissions`, {
    method: "POST",
    body: JSON.stringify({ permissions }),
  });
export const getMe = () => apiFetch("/auth/me");
export const getStaffSetupSql = () => apiFetch("/auth/staff/setup-sql");

export { API_URL };
