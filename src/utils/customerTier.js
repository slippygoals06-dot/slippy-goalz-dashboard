import { phonesMatch } from "./format";

const EXCLUDED_STATUSES = new Set(["Cancelled", "Rejected"]);
const VIP_PAID_THRESHOLD = 15000;
const AT_RISK_DAYS = 60;

/**
 * Compute automatic customer tier from bookings + invoices.
 * Priority: VIP > At risk > Loyal > Returning > New
 * Returns null if phone has no countable bookings.
 */
export function getCustomerTier(phone, bookings = [], invoices = []) {
  if (!phone) return null;

  const countable = (bookings || []).filter(
    (b) =>
      phonesMatch(b.Phone, phone) &&
      !EXCLUDED_STATUSES.has(b.Status)
  );

  const count = countable.length;
  if (count === 0) return null;

  // Lifetime paid: invoices.status === "paid", matched by phone or booking_id
  const customerBookingIds = new Set(
    (bookings || [])
      .filter((b) => phonesMatch(b.Phone, phone) && b["Booking ID"])
      .map((b) => b["Booking ID"])
  );

  let paidTotal = 0;
  for (const inv of invoices || []) {
    if (inv.status !== "paid") continue;
    const byPhone = inv.phone && phonesMatch(inv.phone, phone);
    const byBooking = inv.booking_id && customerBookingIds.has(inv.booking_id);
    if (byPhone || byBooking) {
      paidTotal += Number(inv.amount) || 0;
    }
  }

  if (paidTotal >= VIP_PAID_THRESHOLD) return "VIP";

  let latest = null;
  for (const b of countable) {
    if (!b.Date) continue;
    const d = new Date(b.Date);
    if (Number.isNaN(d.getTime())) continue;
    if (!latest || d > latest) latest = d;
  }
  if (count >= 3 && latest) {
    const daysSince = (Date.now() - latest.getTime()) / 86400000;
    if (daysSince > AT_RISK_DAYS) return "At risk";
  }

  if (count >= 3) return "Loyal";
  if (count === 2) return "Returning";
  return "New";
}
