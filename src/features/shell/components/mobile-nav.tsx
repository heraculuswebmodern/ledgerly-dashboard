"use client";

import {
  ArrowLeftRightIcon,
  CreditCardIcon,
  EllipsisIcon,
  LayoutDashboardIcon,
  SendIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { isActive, NAV_ITEMS } from "../nav";

const PRIMARY = [
  { href: "/overview", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/transactions", label: "Activity", icon: ArrowLeftRightIcon },
  { href: "/payments", label: "Pay", icon: SendIcon, featured: true },
  { href: "/cards", label: "Cards", icon: CreditCardIcon },
];

/** Bottom tab bar for small screens, with a sheet for the remaining sections. */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = !PRIMARY.some((item) => isActive(pathname, item.href));

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
          {PRIMARY.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.featured ? (
                    <span className="flex size-9 items-center justify-center rounded-full bg-brand-gradient text-brand-foreground shadow-card">
                      <item.icon className="size-4" aria-hidden="true" />
                    </span>
                  ) : (
                    <item.icon className="size-5" aria-hidden="true" />
                  )}
                  <span className={cn(item.featured && "sr-only")}>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                moreActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <EllipsisIcon className="size-5" aria-hidden="true" />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Navigate</SheetTitle>
            <SheetDescription className="sr-only">All sections of Ledgerly</SheetDescription>
          </SheetHeader>
          <ul className="grid grid-cols-3 gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-xs font-medium aria-[current=page]:border-foreground/30 aria-[current=page]:bg-accent"
                >
                  <item.icon className="size-5 text-muted-foreground" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
