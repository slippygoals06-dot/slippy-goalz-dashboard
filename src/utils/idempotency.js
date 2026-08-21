/** Stable Idempotency-Key helpers for booking creates (double-submit safe). */

export function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`.slice(0, 64);
}

/**
 * One key per booking intent fingerprint (phone|date|time).
 * Retries of the same intent reuse the key; changing slot/phone mints a new one.
 */
export function idempotencyKeyForIntent(fingerprint, storeRef) {
  const fp = String(fingerprint || "").trim();
  if (!storeRef.current || storeRef.current.fingerprint !== fp) {
    storeRef.current = { fingerprint: fp, key: newIdempotencyKey() };
  }
  return storeRef.current.key;
}
