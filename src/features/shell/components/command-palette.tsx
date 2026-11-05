"use client";

import {
  ArrowLeftRightIcon,
  CreditCardIcon,
  MoonIcon,
  PlusIcon,
  SendIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Amount } from "@/components/shared/amount";
import { formatShortDate } from "@/lib/dates";
import { useDebouncedValue } from "@/lib/use-debounced-value";

import { useSearch } from "../api";
import { NAV_ITEMS } from "../nav";
import { useShellStore } from "../store";

type StaticCommand = {
  id: string;
  label: string;
  icon: typeof SendIcon;
  keywords: string;
  run: () => void;
};

export function CommandPalette() {
  const open = useShellStore((s) => s.commandOpen);
  const setOpen = useShellStore((s) => s.setCommandOpen);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 200);
  const { data: results } = useSearch(debounced);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useShellStore.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const actions: StaticCommand[] = [
    {
      id: "send",
      label: "Send money",
      icon: SendIcon,
      keywords: "pay wire ach transfer",
      run: () => go("/payments?new=1"),
    },
    {
      id: "move",
      label: "Move money between accounts",
      icon: ArrowLeftRightIcon,
      keywords: "internal transfer",
      run: () => go("/payments?new=1&kind=internal"),
    },
    {
      id: "recipient",
      label: "Add a recipient",
      icon: PlusIcon,
      keywords: "vendor payee",
      run: () => go("/payments?tab=recipients&add=1"),
    },
    {
      id: "cards",
      label: "Manage cards",
      icon: CreditCardIcon,
      keywords: "freeze limit",
      run: () => go("/cards"),
    },
    {
      id: "theme",
      label: resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode",
      icon: resolvedTheme === "dark" ? SunIcon : MoonIcon,
      keywords: "theme appearance",
      run: () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        setOpen(false);
      },
    },
  ];

  const needle = query.trim().toLowerCase();
  const pages = NAV_ITEMS.filter((p) => !needle || p.label.toLowerCase().includes(needle));
  const matchingActions = actions.filter(
    (a) => !needle || a.label.toLowerCase().includes(needle) || a.keywords.includes(needle),
  );
  const hasLive = needle.length >= 2 && results;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogContent
        hideClose
        className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Search Ledgerly</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to a page, run an action, or search transactions, recipients and cards.
        </DialogDescription>
        <Command shouldFilter={false} loop>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search transactions, recipients, cards, or jump to…"
          />
          <CommandList>
            <CommandEmpty>No results for “{query}”.</CommandEmpty>
            {hasLive && results.transactions.length > 0 && (
              <CommandGroup heading="Transactions">
                {results.transactions.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`txn-${t.id}`}
                    onSelect={() => go(`/transactions?txn=${t.id}`)}
                  >
                    <ArrowLeftRightIcon aria-hidden="true" />
                    <span className="flex-1 truncate">{t.counterparty}</span>
                    <span className="text-xs text-muted-foreground">{formatShortDate(t.date)}</span>
                    <Amount cents={t.amountCents} className="w-28 text-right text-sm" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {hasLive && results.recipients.length > 0 && (
              <CommandGroup heading="Recipients">
                {results.recipients.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`rcp-${r.id}`}
                    onSelect={() => go(`/payments?new=1&recipient=${r.id}`)}
                  >
                    <UserIcon aria-hidden="true" />
                    <span className="flex-1 truncate">Pay {r.name}</span>
                    <span className="text-xs text-muted-foreground">{r.bankName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {hasLive && results.cards.length > 0 && (
              <CommandGroup heading="Cards">
                {results.cards.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`card-${c.id}`}
                    onSelect={() => go(`/cards?card=${c.id}`)}
                  >
                    <CreditCardIcon aria-hidden="true" />
                    <span className="flex-1 truncate">{c.nickname}</span>
                    <span className="tabular text-xs text-muted-foreground">••{c.last4}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {matchingActions.length > 0 && (
              <CommandGroup heading="Actions">
                {matchingActions.map((a) => (
                  <CommandItem key={a.id} value={a.id} onSelect={a.run}>
                    <a.icon aria-hidden="true" />
                    {a.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {pages.length > 0 && (
              <CommandGroup heading="Go to">
                {pages.map((p) => (
                  <CommandItem key={p.href} value={p.href} onSelect={() => go(p.href)}>
                    <p.icon aria-hidden="true" />
                    {p.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          <div className="flex items-center gap-4 border-t px-4 py-2.5 text-[11px] text-muted-foreground">
            <span>
              <kbd className="font-sans">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-sans">↵</kbd> select
            </span>
            <span>
              <kbd className="font-sans">esc</kbd> close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
