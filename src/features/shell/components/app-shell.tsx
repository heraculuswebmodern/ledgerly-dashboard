import type { ReactNode } from "react";

import { CommandPalette } from "./command-palette";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-card px-4 py-2 text-sm font-medium shadow-pop focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          id="main"
          className="mx-auto w-full max-w-[1320px] flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-12"
        >
          {children}
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
