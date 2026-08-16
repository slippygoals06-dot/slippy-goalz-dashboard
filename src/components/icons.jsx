import {
  LayoutDashboard,
  ClipboardList,
  Receipt,
  Clock,
  Users,
  Hourglass,
  MessageSquare,
  BarChart3,
  ScrollText,
  Shield,
  Settings,
  LogOut,
  CircleDot,
  X,
  Banknote,
  UserRound,
  CalendarClock,
  Plus,
} from "lucide-react";

/** Single icon style for the whole app — Lucide 20 / stroke 2 */
export const ICON_STROKE = 2;
export const ICON_SIZE_NAV = 20;
export const ICON_SIZE_STAT = 20;
export const ICON_SIZE_FAB = 20;

const strokeProps = { strokeWidth: ICON_STROKE, absoluteStrokeWidth: false };

export const NAV_ICONS = {
  "/": LayoutDashboard,
  "/bookings": ClipboardList,
  "/invoices": Receipt,
  "/cash": Banknote,
  "/slots": Clock,
  "/leads": Users,
  "/waitlist": Hourglass,
  "/chats": MessageSquare,
  "/analytics": BarChart3,
  "/audit": ScrollText,
  "/security": Shield,
  "/settings": Settings,
};

export function NavIcon({ path, size = ICON_SIZE_NAV, color = "currentColor" }) {
  const Icon = NAV_ICONS[path] || LayoutDashboard;
  return <Icon size={size} color={color} {...strokeProps} />;
}

export function BrandSparkle({ size = 20, color = "currentColor" }) {
  return <CircleDot size={size} color={color} {...strokeProps} />;
}

export function LogoutIcon({ size = ICON_SIZE_NAV }) {
  return <LogOut size={size} {...strokeProps} />;
}

export function CloseIcon({ size = 18 }) {
  return <X size={size} {...strokeProps} />;
}

export function StatIconBookings({ size = ICON_SIZE_STAT }) {
  return <ClipboardList size={size} color="currentColor" {...strokeProps} />;
}

export function StatIconLeads({ size = ICON_SIZE_STAT }) {
  return <UserRound size={size} color="currentColor" {...strokeProps} />;
}

export function StatIconSlots({ size = ICON_SIZE_STAT }) {
  return <CalendarClock size={size} color="currentColor" {...strokeProps} />;
}

export function StatIconRevenue({ size = ICON_SIZE_STAT }) {
  return <Banknote size={size} color="currentColor" {...strokeProps} />;
}

export function StatIconCash({ size = ICON_SIZE_STAT }) {
  return <Banknote size={size} color="currentColor" {...strokeProps} />;
}

export function FabSparkle({ size = ICON_SIZE_FAB }) {
  return <Plus size={size} {...strokeProps} />;
}
