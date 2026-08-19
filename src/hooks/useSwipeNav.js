import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Pages in swipe order - matches your NAV_ITEMS order
const PAGES = [
  "/",
  "/bookings",
  "/invoices",
  "/cash",
  "/slots",
  "/leads",
  "/waitlist",
  "/chats",
  "/audit",
  "/analytics",
  "/settings",
  "/security",
];

export function useSwipeNav() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  useEffect(() => {
    const onTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchEnd = (e) => {
      if (touchStartX.current === null) return;

      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;

      // Only trigger if swipe is more horizontal than vertical
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      const currentIdx = PAGES.indexOf(location.pathname);
      if (currentIdx === -1) return;

      if (dx < 0 && currentIdx < PAGES.length - 1) {
        // Swipe left → next page
        navigate(PAGES[currentIdx + 1]);
      } else if (dx > 0 && currentIdx > 0) {
        // Swipe right → previous page
        navigate(PAGES[currentIdx - 1]);
      }

      touchStartX.current = null;
      touchStartY.current = null;
    };

    // Only on mobile
    if (window.innerWidth <= 768) {
      document.addEventListener("touchstart", onTouchStart, { passive: true });
      document.addEventListener("touchend", onTouchEnd, { passive: true });
    }

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [location.pathname, navigate]);
}
