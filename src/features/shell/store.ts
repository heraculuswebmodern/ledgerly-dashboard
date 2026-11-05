import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ShellState = {
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  toggleSidebar: () => void;
  setCommandOpen: (open: boolean) => void;
};

/** Light UI state only. Server data lives in TanStack Query. */
export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      commandOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
    }),
    {
      name: "ledgerly-shell",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
