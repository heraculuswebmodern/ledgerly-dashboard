import {
  ArrowLeftRightIcon,
  ChartColumnIcon,
  CreditCardIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  SendIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; shortcut?: string };

export const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/accounts", label: "Accounts", icon: LandmarkIcon },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRightIcon },
  { href: "/cards", label: "Cards", icon: CreditCardIcon },
  { href: "/payments", label: "Payments", icon: SendIcon },
  { href: "/analytics", label: "Analytics", icon: ChartColumnIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
