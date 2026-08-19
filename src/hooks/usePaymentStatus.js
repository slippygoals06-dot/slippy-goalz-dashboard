import { useState } from "react";
import { useStore } from "../store/useStore";

const STATUSES = ["Unpaid", "Half Payment", "Full Payment"];

export function usePaymentStatus() {
  const [loading, setLoading] = useState(null);
  const updateBookingPayment = useStore(s => s.updateBookingPayment);

  async function changeStatus(bookingId, currentStatus) {
    const currentIndex = STATUSES.indexOf(currentStatus) ?? 0;
    const nextStatus = STATUSES[(currentIndex + 1) % STATUSES.length];

    setLoading(bookingId);
    await updateBookingPayment(bookingId, nextStatus);
    setLoading(null);
  }

  return { changeStatus, loadingId: loading };
}