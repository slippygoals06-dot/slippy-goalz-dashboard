/**
 * Slippy Goalz Arena API (Railway).
 * Override locally with VITE_API_URL in .env.local
 * e.g. VITE_API_URL=http://127.0.0.1:8000
 */
const RAILWAY_API = "https://slippy-goalz-backend-production.up.railway.app";

export const API_URL = import.meta.env.VITE_API_URL || RAILWAY_API;
