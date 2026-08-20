import { create } from "zustand";

const STORAGE_KEY = "slippy_notifications_v1";
const MAX_NOTIFICATIONS = 40;

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { notifications: [], unread: 0, nextId: 1 };
    const parsed = JSON.parse(raw);
    const notifications = Array.isArray(parsed.notifications)
      ? parsed.notifications.map((n) => ({
          ...n,
          time: n.time ? new Date(n.time) : new Date(),
        }))
      : [];
    const unread = notifications.filter((n) => !n.read).length;
    const nextId = Number(parsed.nextId) || notifications.reduce((m, n) => Math.max(m, Number(n.id) || 0), 0) + 1;
    return { notifications, unread, nextId };
  } catch {
    return { notifications: [], unread: 0, nextId: 1 };
  }
}

function persist(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        notifications: state.notifications.slice(0, MAX_NOTIFICATIONS),
        nextId: state.nextId,
      })
    );
  } catch {
    /* ignore quota */
  }
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 800;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.28);
  } catch {
    /* ignore */
  }
}

const initial = loadStored();

export const useNotifStore = create((set, get) => ({
  notifications: initial.notifications,
  unread: initial.unread,
  nextId: initial.nextId,

  /**
   * @param {string} title
   * @param {string} body
   * @param {string} [type] booking | payment | invoice | security | success | warning | error | info
   * @param {string|null} [link] route e.g. /bookings?open=CUST-xxx
   * @param {object} [meta] optional { bookingId, bookingName, filter }
   */
  push: (title, body, type = "info", link = null, meta = null) => {
    const id = get().nextId;
    const n = {
      id,
      title,
      body,
      type,
      link,
      meta: meta && typeof meta === "object" ? meta : null,
      time: new Date(),
      read: false,
    };
    set((state) => {
      const next = {
        nextId: id + 1,
        notifications: [n, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
        unread: state.unread + 1,
      };
      persist(next);
      return next;
    });

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`Slippy Goalz Arena — ${title}`, { body });
      } catch {
        /* ignore */
      }
    }
    playChime();
    return id;
  },

  markAllRead: () =>
    set((state) => {
      const next = {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unread: 0,
      };
      persist(next);
      return next;
    }),

  markRead: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id);
      if (!target || target.read) return state;
      const next = {
        ...state,
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        unread: Math.max(0, state.unread - 1),
      };
      persist(next);
      return next;
    }),

  remove: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id);
      const next = {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== id),
        unread: target && !target.read ? Math.max(0, state.unread - 1) : state.unread,
      };
      persist(next);
      return next;
    }),

  clear: () => {
    const next = { notifications: [], unread: 0, nextId: get().nextId };
    persist(next);
    set(next);
  },
}));
