/**
 * Captures Slippy Goalz owner-portal screenshots for the case study page.
 * Usage: node scripts/capture-case-study.mjs
 * Optional: CASE_STUDY_USER / CASE_STUDY_PASS for a live logged-in session.
 */
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "case-study");
const BASE = process.env.CASE_STUDY_URL || "http://127.0.0.1:5173";
const USER = process.env.CASE_STUDY_USER || "";
const PASS = process.env.CASE_STUDY_PASS || "";

const PAGES = [
  { id: "01-login", path: "/login", auth: false },
  { id: "02-dashboard", path: "/", auth: true },
  { id: "03-bookings", path: "/bookings", auth: true },
  { id: "04-invoices", path: "/invoices", auth: true },
  { id: "05-cash", path: "/cash", auth: true },
  { id: "06-slots", path: "/slots", auth: true },
  { id: "07-parts-scan", path: "/parts/scan", auth: true },
  { id: "08-leads", path: "/leads", auth: true },
  { id: "09-waitlist", path: "/waitlist", auth: true },
  { id: "10-chats", path: "/chats", auth: true },
  { id: "11-analytics", path: "/analytics", auth: true },
  { id: "12-audit", path: "/audit", auth: true },
  { id: "13-security", path: "/security", auth: true },
  { id: "14-settings", path: "/settings", auth: true },
];

async function ensureAuth(page) {
  if (USER && PASS) {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="text"], input:not([type])', USER).catch(() => {});
    const userInput = page.locator('input').nth(0);
    const passInput = page.locator('input[type="password"]');
    await userInput.fill(USER);
    await passInput.fill(PASS);
    await page.getByRole("button", { name: /sign in|log in|continue/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 });
    return;
  }

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem("auth", "true");
    // Avoid PIN lock during capture
    localStorage.removeItem("slippy_pin_set");
  });
}

async function shot(page, id) {
  const file = path.join(OUT, `${id}.png`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: file, fullPage: false });
  console.log("saved", file);
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

// Login page first (unauthenticated)
{
  const item = PAGES[0];
  await page.goto(`${BASE}${item.path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, item.id);
}

await ensureAuth(page);

for (const item of PAGES.slice(1)) {
  await page.goto(`${BASE}${item.path}`, { waitUntil: "domcontentloaded" });
  // Let skeletons resolve / empty states appear
  await page.waitForTimeout(2500);
  await shot(page, item.id);
}

await browser.close();
console.log("Done. Screenshots in", OUT);
