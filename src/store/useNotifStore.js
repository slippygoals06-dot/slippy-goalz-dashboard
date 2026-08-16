import { create } from "zustand";

let notifId = 0;

export const useNotifStore = create((set, get) => ({
  notifications: [],
  unread: 0,

  push: (title, body, type = "info", link = null) => {
    const n = {
      id: ++notifId,
      title, body, type, link,
      time: new Date(),
      read: false,
    };
    set(state => ({
      notifications: [n, ...state.notifications].slice(0, 50),
      unread: state.unread + 1,
    }));

    // Browser push
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`Slippy Goalz Arena — ${title}`, { body });
    }

    // Sound (subtle)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 800;
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.3);
    } catch {}
  },

  markAllRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unread: 0,
  })),

  markRead: (id) => set(state => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    unread: Math.max(0, state.unread - 1),
  })),

  clear: () => set({ notifications: [], unread: 0 }),
}));
