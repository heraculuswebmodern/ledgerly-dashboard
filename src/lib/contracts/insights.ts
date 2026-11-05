import { z } from "zod";

import type { Account } from "./accounts";
import { idSchema, isoDateTimeSchema } from "./common";
import type { TransferRail } from "./recipients";
import type { Category, Transaction } from "./transactions";

export const CASH_FLOW_RANGES = ["7d", "30d", "90d", "1y"] as const;
export const cashFlowRangeSchema = z.enum(CASH_FLOW_RANGES);
export type CashFlowRange = z.infer<typeof cashFlowRangeSchema>;

export type CashFlowPoint = {
  /** Bucket start date (YYYY-MM-DD). */
  start: string;
  label: string;
  inCents: number;
  outCents: number;
  netCents: number;
};

export type CashFlowSeries = {
  range: CashFlowRange;
  bucket: "day" | "week" | "month";
  points: CashFlowPoint[];
  totals: { inCents: number; outCents: number; netCents: number };
};

export type CategorySpend = {
  category: Category;
  amountCents: number;
  count: number;
  /** Share of total spend, in basis points. */
  shareBps: number;
};

export type ScheduledPayment = {
  id: string;
  recipientId: string;
  recipientName: string;
  fromAccountId: string;
  amountCents: number;
  rail: TransferRail;
  dueDate: string;
  memo: string;
};

export type OverviewSummary = {
  asOf: string;
  totalCents: number;
  monthStartTotalCents: number;
  /** Month-over-month change in total cash, in basis points. */
  momChangeBps: number | null;
  accounts: Account[];
  /** End-of-day total posted balance for the last 90 days, oldest first. */
  balanceHistory: { date: string; totalCents: number }[];
  kpis: {
    /** Current calendar month to date. */
    moneyInCents: number;
    moneyOutCents: number;
    netCents: number;
    /** Same window last month, for comparison. */
    previous: { moneyInCents: number; moneyOutCents: number; netCents: number };
    /** Average monthly net outflow over the last three full months (0 if cash-flow positive). */
    burnRateCents: number;
    /** Months of runway at the current burn; null when cash-flow positive. */
    runwayMonths: number | null;
  };
  recent: Transaction[];
  pending: Transaction[];
  upcoming: ScheduledPayment[];
};

export type MonthlyFlow = { month: string; label: string; inCents: number; outCents: number };

export type MerchantSpend = { counterparty: string; amountCents: number; count: number };

export type AnalyticsReport = {
  months: MonthlyFlow[];
  categories: CategorySpend[];
  /** Monthly spend per top category, for the trend chart. */
  categoryTrend: { month: string; label: string; values: Partial<Record<Category, number>> }[];
  trendCategories: Category[];
  topMerchants: MerchantSpend[];
  averages: { monthlyInCents: number; monthlyOutCents: number; savingsRateBps: number | null };
};

export const ANALYTICS_PERIODS = ["3m", "6m", "12m"] as const;
export const analyticsPeriodSchema = z.enum(ANALYTICS_PERIODS);
export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;

export const notificationSchema = z.object({
  id: idSchema,
  kind: z.enum(["payment", "card", "security", "info"]),
  title: z.string(),
  body: z.string(),
  createdAt: isoDateTimeSchema,
  read: z.boolean(),
  href: z.string().nullable(),
});
export type Notification = z.infer<typeof notificationSchema>;

export type SearchResults = {
  transactions: Pick<Transaction, "id" | "counterparty" | "amountCents" | "date" | "status">[];
  recipients: { id: string; name: string; bankName: string }[];
  cards: { id: string; nickname: string; last4: string }[];
};
