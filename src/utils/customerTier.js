import { phonesMatch } from "./format";

const EXCLUDED_STATUSES = new Set(["Cancelled", "Rejected", "No-show"]);
const VIP_PAID_THRESHOLD = 15000;
const AT_RISK_DAYS = 60;

/**
 * Resolve identity: phone string, or { phone, customerId / customer_id }.
 */
function resolveIdentity(identity) {
  if (identity == null) return { phone: null, customerId: null };
  if (typeof identity === "string") return { phone: identity, customerId: null };
  return {
    phone: identity.phone || identity.Phone || null,
    customerId: identity.customerId || identity.customer_id || null,
  };
}

function belongsToCustomer(b, phone, customerId) {
  if (customerId && b.customer_id) {
    return String(b.customer_id) === String(customerId);
  }
  return phonesMatch(b.Phone, phone);
}

/**
 * Compute automatic customer tier from bookings + invoices.
 * Prefer permanent customer_id when present; fall back to phonesMatch.
 * Priority: VIP > At risk > Loyal > Returning > New
 * Returns null if no countable bookings.
 */
export function getCustomerTier(identity, bookings = [], invoices = []) {
  const { phone, customerId } = resolveIdentity(identity);
  if (!phone && !customerId) return null;

  const countable = (bookings || []).filter(
    (b) =>
      belongsToCustomer(b, phone, customerId) &&
      !EXCLUDED_STATUSES.has(b.Status)
  );

  const count = countable.length;
  if (count === 0) return null;

  const customerBookingIds = new Set(
    (bookings || [])
      .filter((b) => belongsToCustomer(b, phone, customerId) && b["Booking ID"])
      .map((b) => b["Booking ID"])
  );

  let paidTotal = 0;
  for (const inv of invoices || []) {
    if (inv.status !== "paid") continue;
    const byPhone = phone && inv.phone && phonesMatch(inv.phone, phone);
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

/** Stable map key for VIP / tier caches — prefer customer_id. */
export function customerIdentityKey(bookingOrPhone) {
  if (!bookingOrPhone) return "";
  if (typeof bookingOrPhone === "string") return `p:${bookingOrPhone}`;
  if (bookingOrPhone.customer_id) return `c:${bookingOrPhone.customer_id}`;
  const phone = bookingOrPhone.Phone || bookingOrPhone.phone || "";
  return phone ? `p:${phone}` : "";
}
