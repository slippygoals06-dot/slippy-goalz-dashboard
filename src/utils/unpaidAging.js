import { normalizePaymentStatus } from "./bookingFields";

const OPEN_PAYMENT = new Set(["Unpaid", "Half Payment", "Onsite"]);
const CLOSED_STATUS = new Set(["Cancelled", "Rejected", "Completed", "No-show"]);

/**
 * Days since booking Date that still owe money (Unpaid / Half / Onsite).
 * Returns null if not aging unpaid.
 */
export function unpaidAgingDays(booking, now = new Date()) {
  if (!booking) return null;
  if (CLOSED_STATUS.has(booking.Status)) return null;
  const pay = normalizePaymentStatus(booking["Payment Status"] || booking.payment_status);
  if (!OPEN_PAYMENT.has(pay)) return null;
  const dateStr = String(booking.Date || "").slice(0, 10);
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  const days = Math.floor((start.getTime() - d.getTime()) / 86400000);
  if (days < 1) return null;
  return days;
}

export function isUnpaidAging(booking, minDays = 1) {
  const days = unpaidAgingDays(booking);
  return days != null && days >= minDays;
}
