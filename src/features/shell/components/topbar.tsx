"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

import { useShellStore } from "../store";
import { NotificationsMenu } from "./notifications-menu";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function Topbar() {
  const setCommandOpen = useShellStore((s) => s.setCommandOpen);
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/overview" className="rounded-lg lg:hidden" aria-label="Ledgerly home">
          <LogoMark title={null} />
        </Link>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="group hidden h-9 w-full max-w-md items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-card transition-colors outline-none hover:border-input hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:flex"
          aria-label="Search or jump to (Command K)"
        >
          <SearchIcon className="size-4" aria-hidden="true" />
          <span className="flex-1 text-left">Search or jump to…</span>
          <kbd className="rounded border bg-subtle px-1.5 py-0.5 font-sans text-[11px] font-medium">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            aria-label="Search"
            onClick={() => setCommandOpen(true)}
          >
            <SearchIcon aria-hidden="true" />
          </Button>
          <NotificationsMenu />
          <ThemeToggle />
          <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
