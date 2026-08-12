/**
 * Single API base for the Slippy Goalz dashboard.
 * Override locally with VITE_API_URL in .env.local
 * e.g. VITE_API_URL=http://127.0.0.1:8000
 */
export const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://irepair-backend-production-2418.up.railway.app";
