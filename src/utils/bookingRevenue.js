/**
 * Money from bookings — never invent phone-repair catalog prices.
 * Prefer saved booking.amount; otherwise 0.
 */
export function bookingRevenue(b) {
  if (!b) return 0;
  if (b.amount != null && b.amount !== "") {
    const n = Number(b.amount);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

export function sumBookingRevenue(bookings, predicate) {
  return (bookings || []).reduce((sum, b) => {
    if (predicate && !predicate(b)) return sum;
    return sum + bookingRevenue(b);
  }, 0);
}
