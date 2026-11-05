"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import type { TransactionQueryInput } from "@/lib/contracts";
import { parseMoney } from "@/lib/money";

/** URL keys that hold filter state. Amounts are stored in dollars in the URL for readability. */
export const FILTER_KEYS = [
  "q",
  "from",
  "to",
  "category",
  "status",
  "method",
  "account",
  "min",
  "max",
  "direction",
] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
type UrlState = Partial<Record<FilterKey | "sort" | "dir" | "page" | "pageSize" | "txn", string>>;

function list(value: string | undefined) {
  return value ? value.split(",").filter(Boolean) : [];
}

function dollarsToCents(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cents = parseMoney(value);
  return cents === null || cents < 0 ? undefined : String(cents);
}

/**
 * Transaction list state lives in the URL, so filtered views are shareable and survive
 * reloads and back/forward navigation. This hook reads it and exposes typed setters.
 */
export function useTransactionFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state: UrlState = useMemo(() => Object.fromEntries(params.entries()), [params]);

  const apiQuery: TransactionQueryInput = useMemo(
    () => ({
      q: state.q,
      from: state.from,
      to: state.to,
      category: state.category,
      status: state.status,
      method: state.method,
      account: state.account,
      min: dollarsToCents(state.min),
      max: dollarsToCents(state.max),
      direction: state.direction ?? "all",
      sort: state.sort ?? "date",
      dir: state.dir ?? "desc",
      page: state.page ?? "1",
      pageSize: state.pageSize ?? "25",
    }),
    [state],
  );

  const update = useCallback(
    (patch: UrlState, { resetPage = true }: { resetPage?: boolean } = {}) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "" || value === null) next.delete(key);
        else next.set(key, value);
      }
      if (resetPage && !("page" in patch)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const clearFilters = useCallback(() => {
    update(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])));
  }, [update]);

  return {
    state,
    apiQuery,
    selected: {
      category: list(state.category),
      status: list(state.status),
      method: list(state.method),
      account: list(state.account),
    },
    update,
    clearFilters,
  };
}

export type TransactionFiltersApi = ReturnType<typeof useTransactionFilters>;
