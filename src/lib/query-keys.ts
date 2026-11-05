import type { AnalyticsPeriod, CashFlowRange, TransactionQueryInput } from "@/lib/contracts";

/** Central TanStack Query keys, so invalidation after a mutation is explicit and greppable. */
export const queryKeys = {
  session: ["session"] as const,
  accounts: ["accounts"] as const,
  overview: ["overview"] as const,
  cashFlow: (range: CashFlowRange) => ["cash-flow", range] as const,
  spending: (days: number) => ["spending", days] as const,
  transactions: ["transactions"] as const,
  transactionList: (query: TransactionQueryInput) => ["transactions", "list", query] as const,
  transaction: (id: string) => ["transactions", "detail", id] as const,
  cards: ["cards"] as const,
  recipients: ["recipients"] as const,
  scheduled: ["scheduled"] as const,
  analytics: (period: AnalyticsPeriod) => ["analytics", period] as const,
  notifications: ["notifications"] as const,
  settings: ["settings"] as const,
  search: (q: string) => ["search", q] as const,
};

/** Everything derived from the ledger. Invalidate after any money movement. */
export const ledgerKeys = [
  queryKeys.accounts,
  queryKeys.overview,
  ["cash-flow"],
  ["spending"],
  queryKeys.transactions,
  queryKeys.cards,
  queryKeys.recipients,
  queryKeys.scheduled,
  ["analytics"],
  queryKeys.notifications,
] as const;
