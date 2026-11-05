"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon, SendIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoMark, Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { isActive, NAV_ITEMS } from "../nav";
import { useShellStore } from "../store";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useShellStore((s) => s.sidebarCollapsed);
  const toggle = useShellStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-[68px]" : "w-[240px]",
      )}
    >
      <div className={cn("flex h-16 items-center", collapsed ? "justify-center" : "px-5")}>
        <Link
          href="/overview"
          aria-label="Ledgerly home"
          className="rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {collapsed ? <LogoMark title={null} /> : <Wordmark />}
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 px-3 pt-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const link = (
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                {active && (
                  <span
                    className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-brand-gradient"
                    aria-hidden="true"
                  />
                )}
                <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                <span className={cn(collapsed && "sr-only")}>{item.label}</span>
              </Link>
            );
            return (
              <li key={item.href}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={cn(
          "space-y-2 border-t border-sidebar-border p-3",
          collapsed && "flex flex-col items-center",
        )}
      >
        <Button asChild variant="brand" className={cn("w-full", collapsed && "size-9 px-0")}>
          <Link href="/payments?new=1" aria-label={collapsed ? "Send money" : undefined}>
            <SendIcon aria-hidden="true" />
            {!collapsed && "Send money"}
          </Link>
        </Button>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={toggle}
          className={cn("text-muted-foreground", !collapsed && "w-full justify-start")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <PanelLeftOpenIcon aria-hidden="true" />
          ) : (
            <PanelLeftCloseIcon aria-hidden="true" />
          )}
          {!collapsed && "Collapse"}
        </Button>
      </div>
    </aside>
  );
}
