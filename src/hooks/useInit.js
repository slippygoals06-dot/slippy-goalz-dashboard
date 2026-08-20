import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { useToast } from "../context/ToastContext";
import { getMe } from "../api";
import { saveSession, loadSession } from "../constants/permissions";

export function useInit() {
  const fetchAll = useStore(s => s.fetchAll);
  const isPaused = useStore(s => s.isPaused);
  const { showToast } = useToast();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Refresh role/permissions from API (staff may have been updated)
    (async () => {
      try {
        const me = await getMe();
        const prev = loadSession();
        saveSession({
          username: me.username || prev.user,
          role: me.role || prev.role,
          permissions: me.permissions,
        });
      } catch {
        // Token invalid / offline — leave existing session; PrivateRoute handles auth
      }
    })();

    // Initial fetch
    fetchAll(false, showToast);

    // Notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [fetchAll, showToast]);

  // Smart auto-refresh: pauses when tab hidden
  useEffect(() => {
    let id;
    const tick = () => { if (!useStore.getState().isPaused) fetchAll(true, showToast); };
    const start = () => { id = setInterval(tick, 30000); };
    const stop  = () => clearInterval(id);
    const onVis = () => document.hidden ? stop() : (tick(), start());

    document.addEventListener("visibilitychange", onVis);
    start();
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [fetchAll, showToast]);
}
