/**
 * DEPRECATED — do not use for reads/writes.
 * All data access goes through the FastAPI backend (service role).
 * Kept only so accidental imports fail loudly in development.
 */
export function getSupabase() {
  throw new Error(
    "Direct Supabase anon client is disabled. Use the Slippy Goalz API instead."
  );
}

export const supabase = new Proxy(
  {},
  {
    get() {
      throw new Error(
        "Direct Supabase anon client is disabled. Use the Slippy Goalz API instead."
      );
    },
  }
);
