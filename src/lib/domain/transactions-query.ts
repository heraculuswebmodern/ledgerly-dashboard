import {
  CATEGORY_LABELS,
  METHOD_LABELS,
  type Category,
  type PaymentMethod,
  type SortDirection,
  type SortField,
  type TransactionQuery,
  type TransactionStatus,
} from "@/lib/contracts";
import { centsToDecimalString, sumCents } from "@/lib/money";

/** The minimal shape the query engine needs, so it works on records and DTOs alike. */
export type QueryableTransaction = {
  id: string;
  accountId: string;
  date: string;
  counterparty: string;
  description: string;
  category: Category;
  amountCents: number;
  status: TransactionStatus;
  method: PaymentMethod;
  note: string;
};

export type TransactionFilters = Omit<TransactionQuery, "sort" | "dir" | "page" | "pageSize">;

function matchesSearch(t: QueryableTransaction, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    t.counterparty,
    t.description,
    t.note,
    CATEGORY_LABELS[t.category],
    METHOD_LABELS[t.method],
  ]
    .join(" ")
    .toLowerCase();
  if (haystack.includes(needle)) return true;
  // Numeric searches ("1200", "1,200.50") also match amounts.
  const digits = needle.replace(/[$,\s]/g, "");
  if (/^\d+(\.\d{0,2})?$/.test(digits)) {
    return centsToDecimalString(Math.abs(t.amountCents)).startsWith(digits);
  }
  return false;
}

export function filterTransactions<T extends QueryableTransaction>(
  transactions: readonly T[],
  filters: Partial<TransactionFilters>,
): T[] {
  const {
    q = "",
    from,
    to,
    category = [],
    status = [],
    method = [],
    account = [],
    min,
    max,
    direction = "all",
  } = filters;

  return transactions.filter((t) => {
    const day = t.date.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (category.length && !category.includes(t.category)) return false;
    if (status.length && !status.includes(t.status)) return false;
    if (method.length && !method.includes(t.method)) return false;
    if (account.length && !account.includes(t.accountId)) return false;
    if (direction === "in" && t.amountCents <= 0) return false;
    if (direction === "out" && t.amountCents >= 0) return false;
    const abs = Math.abs(t.amountCents);
    if (min !== undefined && abs < min) return false;
    if (max !== undefined && abs > max) return false;
    return matchesSearch(t, q);
  });
}

export function sortTransactions<T extends QueryableTransaction>(
  transactions: readonly T[],
  field: SortField,
  dir: SortDirection,
): T[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...transactions].sort((a, b) => {
    let result = 0;
    if (field === "amount") result = a.amountCents - b.amountCents;
    else if (field === "counterparty") result = a.counterparty.localeCompare(b.counterparty);
    else result = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    // Stable tie-breakers: newest first, then id.
    if (result === 0)
      result = a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id);
    return result * factor;
  });
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page: current, pageSize, pageCount };
}

/** Filter, sort, paginate and summarize in one pass. Powers the list endpoint and export. */
export function queryTransactions<T extends QueryableTransaction>(
  transactions: readonly T[],
  query: TransactionQuery,
) {
  const filtered = filterTransactions(transactions, query);
  const sorted = sortTransactions(filtered, query.sort, query.dir);
  const counted = filtered.filter((t) => t.status !== "failed");
  return {
    ...paginate(sorted, query.page, query.pageSize),
    sorted,
    summary: {
      inCents: sumCents(counted.filter((t) => t.amountCents > 0).map((t) => t.amountCents)),
      outCents: sumCents(counted.filter((t) => t.amountCents < 0).map((t) => -t.amountCents)),
    },
  };
}

/** Counts active filters (excluding search, sort and paging), for the filter button badge. */
export function countActiveFilters(filters: Partial<TransactionFilters>): number {
  let count = 0;
  if (filters.from || filters.to) count++;
  if (filters.category?.length) count++;
  if (filters.status?.length) count++;
  if (filters.method?.length) count++;
  if (filters.account?.length) count++;
  if (filters.min !== undefined || filters.max !== undefined) count++;
  if (filters.direction && filters.direction !== "all") count++;
  return count;
}
