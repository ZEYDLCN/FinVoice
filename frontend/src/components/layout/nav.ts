import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Mic, Settings, SlidersHorizontal, Workflow } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/console", label: "Voice Console", icon: Mic },
  { href: "/workflows", label: "İş Akışları", icon: Workflow },
  { href: "/dashboard", label: "Dashboard", icon: SlidersHorizontal },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];
