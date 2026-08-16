import { useState } from "react";
import { useStore } from "../store/useStore";

export function usePaymentStatus() {
  const [loading, setLoading] = useState(null);
  const updateBookingPayment = useStore((s) => s.updateBookingPayment);

  async function changeStatus(bookingId, nextStatus) {
    if (!bookingId || !nextStatus) return;
    setLoading(bookingId);
    try {
      await updateBookingPayment(bookingId, nextStatus);
    } finally {
      setLoading(null);
    }
  }

  return { changeStatus, loadingId: loading };
}
