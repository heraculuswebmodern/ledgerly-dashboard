import {
  ArrowLeftRightIcon,
  BriefcaseIcon,
  Building2Icon,
  CloudIcon,
  LandmarkIcon,
  MegaphoneIcon,
  MonitorSmartphoneIcon,
  PercentIcon,
  PlaneIcon,
  ShieldIcon,
  TrendingUpIcon,
  UsersIcon,
  UtensilsIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import type { Category } from "@/lib/contracts";
import { cn } from "@/lib/utils";

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  revenue: TrendingUpIcon,
  payroll: UsersIcon,
  software: MonitorSmartphoneIcon,
  infrastructure: CloudIcon,
  rent: Building2Icon,
  marketing: MegaphoneIcon,
  travel: PlaneIcon,
  meals: UtensilsIcon,
  office: WrenchIcon,
  professional: BriefcaseIcon,
  insurance: ShieldIcon,
  taxes: LandmarkIcon,
  interest: PercentIcon,
  transfer: ArrowLeftRightIcon,
};

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon className={cn("size-4", className)} aria-hidden="true" />;
}
