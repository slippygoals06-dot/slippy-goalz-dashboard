/** Pending bookings older than this many hours need attention. */
export const SLA_PENDING_HOURS = 4;

/**
 * True when booking is Pending and status_changed_at is older than SLA threshold.
 * Missing status_changed_at → false (column not migrated / not yet stamped).
 */
export function isStalePending(booking) {
  if (!booking || booking.Status !== "Pending") return false;
  const raw = booking.status_changed_at;
  if (!raw) return false;
  const changed = new Date(raw).getTime();
  if (Number.isNaN(changed)) return false;
  return Date.now() - changed >= SLA_PENDING_HOURS * 60 * 60 * 1000;
}
