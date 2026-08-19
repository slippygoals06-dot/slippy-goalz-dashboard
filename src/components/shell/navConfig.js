import { NAV_ITEMS } from "../../constants";

export const NAV_GROUPS = [
  { label: "Daily work", paths: ["/", "/bookings", "/invoices", "/cash", "/slots", "/parts/scan"] },
  { label: "Customers", paths: ["/leads", "/waitlist", "/chats"] },
  { label: "More", paths: ["/analytics", "/audit", "/security", "/settings"] },
];

export const MOBILE_BP = 860;
export const SIDEBAR_W = 280;
export const SIDEBAR_COLLAPSED = 72;
export const TOPBAR_H = 72;
export const SEARCH_MAX = 640;

const PATH_META = Object.fromEntries(NAV_ITEMS.map((item) => [item.path, item]));

export function getNavItem(path) {
  return PATH_META[path] || null;
}

export function getPageTitle(pathname) {
  const item = PATH_META[pathname];
  if (item) return item.label;
  if (pathname.startsWith("/bookings")) return "Bookings";
  if (pathname.startsWith("/parts")) return "Parts Scan";
  return "Dashboard";
}

/** Breadcrumb crumbs for current route */
export function getBreadcrumbs(pathname) {
  const title = getPageTitle(pathname);
  if (pathname === "/") {
    return [{ label: "Home", path: "/" }];
  }
  return [
    { label: "Home", path: "/" },
    { label: title, path: pathname },
  ];
}

export function navByPath() {
  const map = {};
  NAV_ITEMS.forEach((item) => {
    map[item.path] = item;
  });
  return map;
}
