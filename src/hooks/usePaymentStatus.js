import { useState } from "react";
import { useStore } from "../store/useStore";
import { useToast } from "../context/ToastContext";

export function usePaymentStatus() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(null);
  const updateBookingPayment = useStore((s) => s.updateBookingPayment);
  const fetchAll = useStore((s) => s.fetchAll);

  async function changeStatus(bookingId, nextStatus) {
    if (!bookingId || !nextStatus) return;
    setLoading(bookingId);
    try {
      await updateBookingPayment(bookingId, nextStatus);
    } catch (err) {
      console.error("Payment status update failed:", err);
      showToast(err?.message || "Failed to update payment status", "error");
      // Re-sync from server to revert any optimistic UI.
      fetchAll(true, showToast);
    } finally {
      setLoading(null);
    }
  }

  return { changeStatus, loadingId: loading };
}
