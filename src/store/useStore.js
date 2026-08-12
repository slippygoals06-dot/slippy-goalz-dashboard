import { create } from "zustand";
import { useNotifStore } from "./useNotifStore";
import { devtools } from "zustand/middleware";
import { toApiPayload } from "../utils/bookingFields";

const API =
  import.meta.env.VITE_API_URL || "https://irepair-backend-production-2418.up.railway.app";

let fetchingRef = false;
let prevPending = null;

const LOCAL_SLOTS_KEY = "slippy_local_slots";

function weekdayName(dateStr) {
  try {
    const d = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
    return d.toLocaleDateString("en-US", { weekday: "long" });
  } catch {
    return "";
  }
}

function readLocalSlots() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_SLOTS_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeLocalSlots(rows) {
  localStorage.setItem(LOCAL_SLOTS_KEY, JSON.stringify(rows));
}

function upsertLocalSlot(row) {
  const all = readLocalSlots().filter((s) => !(s.Date === row.Date && s.Time === row.Time));
  all.push(row);
  writeLocalSlots(all);
  return row;
}

function patchLocalSlot(id, patch) {
  const all = readLocalSlots().map((s) =>
    String(s.id ?? s.ID) === String(id) ? { ...s, ...patch } : s
  );
  writeLocalSlots(all);
  return all.find((s) => String(s.id ?? s.ID) === String(id));
}

function removeLocalSlot(id) {
  writeLocalSlots(readLocalSlots().filter((s) => String(s.id ?? s.ID) !== String(id)));
}

function mergeSlots(remote, local) {
  const map = new Map();
  (remote || []).forEach((s) => {
    if (!s?.Date || !s?.Time) return;
    map.set(`${s.Date}|${s.Time}`, s);
  });
  (local || []).forEach((s) => {
    if (!s?.Date || !s?.Time) return;
    map.set(`${s.Date}|${s.Time}`, s);
  });
  return [...map.values()];
}

function isMissingSlotApi(err) {
  const status = err?.status;
  const msg = String(err?.message || "");
  return status === 404 || status === 405 || /not found|method not allowed/i.test(msg);
}

function makeLocalSlot({ date, time, status = "Available" }) {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    Date: String(date).slice(0, 10),
    Time: String(time).trim(),
    Day: weekdayName(date),
    Status: status,
    "Booked By": status === "Blocked" ? "BLOCKED" : "EMPTY",
    Phone: "EMPTY",
    "Booking ID": "",
    _local: true,
  };
}

// ── Auth helper ───────────────────────────────────────────────────────────────
const apiCall = async (path, options = {}) => {
  const token = localStorage.getItem("slippy_token");
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
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
    // Include status so callers can detect 404/401 even when detail is generic
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export const useStore = create(devtools((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  bookings:  [],
  slots:     [],
  leads:     [],
  invoices:  [],
  cashLedger: [],
  waitlist:  [],
  chats:     [],
  loading:   true,
  newBadge:  0,
  isPaused:  false,
  lastFetch: null,

  // ── Derived ────────────────────────────────────────────────────────────────
  get pendingCount() { return get().bookings.filter(b => b.Status === "Pending").length; },
  get availableSlots() { return get().slots.filter(s => s.Status === "Available").length; },

  // ── Fetch all from FastAPI ─────────────────────────────────────────────────
  fetchAll: async (silent = false, showToast = null) => {
    if (fetchingRef) return;
    fetchingRef = true;
    if (!silent) set({ loading: true });
    try {
      const [b, s, l, inv, cash] = await Promise.all([
        apiCall("/bookings").catch(e => { console.error("Bookings error:", e); return []; }),
        apiCall("/slots").catch(e => { console.error("Slots error:", e); return []; }),
        apiCall("/leads").catch(e => { console.error("Leads error:", e); return []; }),
        apiCall("/invoices").catch(e => { console.error("Invoices error:", e); return []; }),
        apiCall("/cash-ledger/").catch(e => { console.error("Cash ledger error:", e); return []; }),
      ]);

      const safeB = Array.isArray(b) ? b : [];
      const pendingNow = safeB.filter(x => x.Status === "Pending").length;

      if (prevPending !== null && pendingNow > prevPending && showToast) {
        const diff = pendingNow - prevPending;
        set({ newBadge: diff });
        showToast(`${diff} new booking${diff > 1 ? "s" : ""} received!`);
        useNotifStore.getState().push(
          "New Booking",
          `${diff} new pending booking${diff > 1 ? "s" : ""} received`,
          "booking",
          "/bookings"
        );
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Slippy Goalz — New Booking", {
            body: `${diff} new pending booking${diff > 1 ? "s" : ""}`,
          });
        }
      }
      prevPending = pendingNow;

      set({
        bookings:   safeB.length > 0 ? safeB : get().bookings,
        slots:      mergeSlots(Array.isArray(s) ? s : [], readLocalSlots()),
        leads:      Array.isArray(l) && l.length > 0 ? l : get().leads,
        invoices:   Array.isArray(inv) ? inv : get().invoices,
        cashLedger: Array.isArray(cash) ? cash : get().cashLedger,
        lastFetch:  new Date(),
      });
    } catch (err) {
      console.error("Store fetch error:", err);
    } finally {
      fetchingRef = false;
      if (!silent) set({ loading: false });
    }
  },

  // ── Confirm booking ────────────────────────────────────────────────────────
  confirmBooking: async (bookingId, name, showToast) => {
    set(state => ({
      bookings: state.bookings.map(b =>
        b["Booking ID"] === bookingId ? { ...b, Status: "Confirmed" } : b
      ),
    }));
    try {
      await apiCall(`/bookings/${encodeURIComponent(bookingId)}/status`, {
        method: "PUT",
        body: JSON.stringify({ Status: "Confirmed" }),
      });
      if (showToast) showToast("Booking confirmed!");
      setTimeout(() => get().fetchAll(true, showToast), 2000);
    } catch (err) {
      console.error("Confirm error:", err);
      if (showToast) showToast("Failed to confirm booking", "error");
      get().fetchAll(true, showToast);
    }
  },

  // ── Reject booking ─────────────────────────────────────────────────────────
  rejectBooking: async (bookingId, name, showToast) => {
    set(state => ({
      bookings: state.bookings.map(b =>
        b["Booking ID"] === bookingId ? { ...b, Status: "Rejected" } : b
      ),
    }));
    try {
      await apiCall(`/bookings/${encodeURIComponent(bookingId)}/status`, {
        method: "PUT",
        body: JSON.stringify({ Status: "Rejected" }),
      });
      if (showToast) showToast("Booking rejected.", "error");
      setTimeout(() => get().fetchAll(true, showToast), 2000);
    } catch (err) {
      console.error("Reject error:", err);
      if (showToast) showToast("Failed to reject booking", "error");
      get().fetchAll(true, showToast);
    }
  },

  // ── Payment status ─────────────────────────────────────────────────────────
  updateBookingPayment: async (bookingId, paymentStatus) => {
    set(state => ({
      bookings: state.bookings.map(b =>
        b["Booking ID"] === bookingId ? { ...b, "Payment Status": paymentStatus } : b
      ),
    }));
    try {
      await apiCall(`/bookings/${encodeURIComponent(bookingId)}/payment`, {
        method: "PUT",
        body: JSON.stringify({ payment_status: paymentStatus }),
      });
    } catch (err) {
      console.error("Payment update error:", err);
    }
  },

  // ── Add booking ────────────────────────────────────────────────────────────
  addBooking: async (booking) => {
    try {
      const payload = booking._api
        ? booking._api
        : toApiPayload({
            name: booking.name,
            phone: booking.phone,
            players: booking.players ?? booking.device,
            paymentMode: booking.paymentMode || booking.issue || "Cash",
            paymentStatus: booking.paymentStatus || "Unpaid",
            date: booking.date,
            time: booking.time,
            notes: booking.notes,
            status: booking.status || "Confirmed",
            source: booking.source,
          });
      const saved = await apiCall("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const row = {
        "Booking ID":     saved?.["Booking ID"] || booking.id,
        "Name":           payload.name,
        "Phone":          saved?.Phone || payload.phone,
        "Device":         payload.device,
        "Service":        payload.service,
        "Issue":          payload.issue,
        "Date":           payload.date,
        "Time":           payload.time,
        "Payment Status": payload.payment_status || "Unpaid",
        "Notes":          payload.notes || "",
        "Status":         payload.status || "Confirmed",
        "Source":         payload.source || saved?.Source || "",
      };
      set(state => ({ bookings: [row, ...state.bookings] }));
      return saved;
    } catch (err) {
      console.error("Add booking error:", err);
      throw err;
    }
  },

  // ── Slots mutations ────────────────────────────────────────────────────────
  createSlot: async ({ date, time, status = "Available" }) => {
    try {
      const saved = await apiCall("/slots/", {
        method: "POST",
        body: JSON.stringify({ date, time, status }),
      });
      if (saved && (saved.Date || saved.id)) {
        set((state) => ({
          slots: mergeSlots(
            [...state.slots.filter((s) => !(s.Date === saved.Date && s.Time === saved.Time)), saved],
            readLocalSlots()
          ),
        }));
      } else {
        await get().fetchAll(true);
      }
      return saved;
    } catch (err) {
      if (!isMissingSlotApi(err)) throw err;
      const row = upsertLocalSlot(makeLocalSlot({ date, time, status }));
      set((state) => ({ slots: mergeSlots(state.slots, readLocalSlots()) }));
      return row;
    }
  },

  createSlotsBulk: async ({ date, times }) => {
    try {
      const result = await apiCall("/slots/bulk", {
        method: "POST",
        body: JSON.stringify({ date, times }),
      });
      await get().fetchAll(true);
      return result;
    } catch (err) {
      if (!isMissingSlotApi(err)) throw err;
      const created = [];
      const skipped = [];
      for (const time of times || []) {
        const exists = get().slots.some((s) => s.Date === date && s.Time === time);
        if (exists) {
          skipped.push(time);
          continue;
        }
        created.push(upsertLocalSlot(makeLocalSlot({ date, time, status: "Available" })));
      }
      set((state) => ({ slots: mergeSlots(state.slots, readLocalSlots()) }));
      return { created, skipped, date };
    }
  },

  copySlotsDay: async ({ from_date, to_date }) => {
    try {
      const result = await apiCall("/slots/copy-day", {
        method: "POST",
        body: JSON.stringify({ from_date, to_date }),
      });
      await get().fetchAll(true);
      return result;
    } catch (err) {
      if (!isMissingSlotApi(err)) throw err;
      const times = get()
        .slots.filter((s) => s.Date === from_date)
        .map((s) => s.Time)
        .filter(Boolean);
      return get().createSlotsBulk({ date: to_date, times });
    }
  },

  updateSlotStatus: async (slotId, status) => {
    const id = String(slotId);
    const applyLocal = () => {
      const patch = {
        Status: status,
        "Booked By": status === "Blocked" ? "BLOCKED" : status === "Available" ? "EMPTY" : undefined,
        Phone: status === "Available" || status === "Blocked" ? "EMPTY" : undefined,
      };
      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
      if (String(id).startsWith("local-")) {
        patchLocalSlot(id, patch);
      } else {
        // also mirror remote id changes locally so refresh keeps them until API supports Status
        const current = get().slots.find((s) => String(s.id ?? s.ID) === id);
        if (current) upsertLocalSlot({ ...current, ...patch, id: current.id ?? current.ID ?? id, _local: true });
      }
      set((state) => ({
        slots: state.slots.map((s) =>
          String(s.id ?? s.ID) === id ? { ...s, ...patch } : s
        ),
      }));
    };

    applyLocal();
    try {
      const saved = await apiCall(`/slots/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ Status: status }),
      });
      if (saved && (saved.id || saved.Date)) {
        set((state) => ({
          slots: state.slots.map((s) => (String(s.id ?? s.ID) === id ? { ...s, ...saved } : s)),
        }));
      }
      return saved;
    } catch (err) {
      if (isMissingSlotApi(err) || String(id).startsWith("local-")) {
        return get().slots.find((s) => String(s.id ?? s.ID) === id);
      }
      await get().fetchAll(true);
      throw err;
    }
  },

  deleteSlot: async (slotId) => {
    const id = String(slotId);
    set((state) => ({
      slots: state.slots.filter((s) => String(s.id ?? s.ID) !== id),
    }));
    removeLocalSlot(id);
    try {
      await apiCall(`/slots/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (err) {
      if (isMissingSlotApi(err) || id.startsWith("local-")) return;
      await get().fetchAll(true);
      throw err;
    }
  },

  // ── Update booking ─────────────────────────────────────────────────────────
  updateBooking: async (bookingId, updates) => {
    set(state => ({
      bookings: state.bookings.map(b =>
        b["Booking ID"] === bookingId ? { ...b, ...updates } : b
      ),
    }));
    try {
      await apiCall(`/bookings/${encodeURIComponent(bookingId)}`, {
        method: "PUT",
        body: JSON.stringify({
          "Name":           updates.name,
          "Phone":          updates.phone,
          "Device":         updates.device,
          "Issue":          updates.issue,
          "Date":           updates.date,
          "Time":           updates.time,
          "Payment Status": updates.paymentStatus,
          "Notes":          updates.notes,
        }),
      });
    } catch (err) {
      console.error("Update booking error:", err);
    }
  },

  // ── Delete booking ─────────────────────────────────────────────────────────
  deleteBooking: async (bookingId) => {
    set(state => ({
      bookings: state.bookings.filter(b => b["Booking ID"] !== bookingId),
    }));
    try {
      await apiCall(`/bookings/${encodeURIComponent(bookingId)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Delete booking error:", err);
    }
  },

  // ── Update booking status ──────────────────────────────────────────────────
  updateBookingStatus: async (bookingId, status) => {
    set(state => ({
      bookings: state.bookings.map(b =>
        b["Booking ID"] === bookingId ? { ...b, Status: status } : b
      ),
    }));
    try {
      await apiCall(`/bookings/${encodeURIComponent(bookingId)}/status`, {
        method: "PUT",
        body: JSON.stringify({ Status: status }),
      });
    } catch (err) {
      console.error("Status update error:", err);
    }
  },

  // ── Cash ledger ────────────────────────────────────────────────────────────
  fetchCashLedger: async () => {
    try {
      const data = await apiCall("/cash-ledger/");
      set({ cashLedger: Array.isArray(data) ? data : [] });
      return data;
    } catch (err) {
      console.error("Cash ledger fetch error:", err);
      throw err;
    }
  },

  addCashLedgerEntry: async ({ amount, entry_type, reason }) => {
    const saved = await apiCall("/cash-ledger/", {
      method: "POST",
      body: JSON.stringify({
        amount: Number(amount),
        entry_type,
        reason,
      }),
    });
    if (!saved || typeof saved !== "object") {
      throw new Error("Invalid response from cash ledger API");
    }
    set((state) => ({
      cashLedger: [saved, ...(Array.isArray(state.cashLedger) ? state.cashLedger : [])],
    }));
    // Re-sync from server so list stays consistent if another tab/device wrote too
    try {
      const fresh = await apiCall("/cash-ledger/");
      if (Array.isArray(fresh)) set({ cashLedger: fresh });
    } catch (e) {
      console.warn("Cash ledger re-fetch after save failed:", e);
    }
    return saved;
  },

  // ── UI actions ─────────────────────────────────────────────────────────────
  clearBadge:  () => set({ newBadge: 0 }),
  setIsPaused: (v) => set({ isPaused: v }),

}), { name: "SlippyGoalzStore" }));