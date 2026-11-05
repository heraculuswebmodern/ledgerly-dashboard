import type {
  CashFlowPoint,
  CashFlowRange,
  CashFlowSeries,
  Category,
  CategorySpend,
  MerchantSpend,
  MonthlyFlow,
} from "@/lib/contracts";
import { divideCents, shareInBps, sumCents } from "@/lib/money";

import type { QueryableTransaction } from "./transactions-query";

/**
 * Pure aggregation functions for the overview and analytics pages.
 * "Operating" flows exclude failed items and internal transfers between own accounts.
 */

const DAY_MS = 86_400_000;

export function isOperating(t: Pick<QueryableTransaction, "status" | "category">): boolean {
  return t.status !== "failed" && t.category !== "transfer";
}

export function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysUtc(day: string, days: number): string {
  return toDay(new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS));
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function addMonths(day: string, months: number): string {
  const d = new Date(`${startOfMonth(day)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return toDay(d);
}

export function flows(transactions: readonly QueryableTransaction[]) {
  const operating = transactions.filter(isOperating);
  const inCents = sumCents(operating.filter((t) => t.amountCents > 0).map((t) => t.amountCents));
  const outCents = sumCents(operating.filter((t) => t.amountCents < 0).map((t) => -t.amountCents));
  return { inCents, outCents, netCents: inCents - outCents };
}

export function inWindow<T extends Pick<QueryableTransaction, "date">>(
  transactions: readonly T[],
  fromDay: string,
  toDayInclusive: string,
): T[] {
  return transactions.filter((t) => {
    const day = t.date.slice(0, 10);
    return day >= fromDay && day <= toDayInclusive;
  });
}

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const dayLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const RANGE_CONFIG: Record<CashFlowRange, { days: number; bucket: CashFlowSeries["bucket"] }> = {
  "7d": { days: 7, bucket: "day" },
  "30d": { days: 30, bucket: "day" },
  "90d": { days: 91, bucket: "week" },
  "1y": { days: 365, bucket: "month" },
};

/** Buckets operating cash flow into day, week or month points for the chart. */
export function buildCashFlow(
  transactions: readonly QueryableTransaction[],
  range: CashFlowRange,
  today: string,
): CashFlowSeries {
  const { days, bucket } = RANGE_CONFIG[range];
  const starts: string[] = [];

  if (bucket === "month") {
    for (let i = 11; i >= 0; i--) starts.push(addMonths(today, -i));
  } else {
    const step = bucket === "week" ? 7 : 1;
    const first = addDaysUtc(today, -(days - 1));
    for (let day = first; day <= today; day = addDaysUtc(day, step)) starts.push(day);
  }

  const points: CashFlowPoint[] = starts.map((start, i) => {
    const next = starts[i + 1];
    const end = next ? addDaysUtc(next, -1) : today;
    const f = flows(inWindow(transactions, start, end));
    return {
      start,
      label:
        bucket === "month"
          ? monthLabel.format(new Date(`${start}T00:00:00Z`))
          : dayLabel.format(new Date(`${start}T00:00:00Z`)),
      inCents: f.inCents,
      outCents: f.outCents,
      netCents: f.netCents,
    };
  });

  const windowStart = starts[0] ?? today;
  return { range, bucket, points, totals: flows(inWindow(transactions, windowStart, today)) };
}

export function spendByCategory(
  transactions: readonly QueryableTransaction[],
  { top = 6 }: { top?: number } = {},
): CategorySpend[] {
  const totals = new Map<Category, { amount: number; count: number }>();
  for (const t of transactions) {
    if (!isOperating(t) || t.amountCents >= 0) continue;
    const entry = totals.get(t.category) ?? { amount: 0, count: 0 };
    entry.amount += -t.amountCents;
    entry.count += 1;
    totals.set(t.category, entry);
  }
  const all = sumCents([...totals.values()].map((v) => v.amount));
  const sorted = [...totals.entries()].sort((a, b) => b[1].amount - a[1].amount);
  return sorted.slice(0, top).map(([category, v]) => ({
    category,
    amountCents: v.amount,
    count: v.count,
    shareBps: shareInBps(v.amount, all),
  }));
}

export function topMerchants(
  transactions: readonly QueryableTransaction[],
  limit = 8,
): MerchantSpend[] {
  const totals = new Map<string, MerchantSpend>();
  for (const t of transactions) {
    if (!isOperating(t) || t.amountCents >= 0) continue;
    const entry = totals.get(t.counterparty) ?? {
      counterparty: t.counterparty,
      amountCents: 0,
      count: 0,
    };
    entry.amountCents += -t.amountCents;
    entry.count += 1;
    totals.set(t.counterparty, entry);
  }
  return [...totals.values()].sort((a, b) => b.amountCents - a.amountCents).slice(0, limit);
}

/** Money in/out per calendar month for the last `months` months, oldest first. */
export function monthlyFlows(
  transactions: readonly QueryableTransaction[],
  today: string,
  months: number,
): MonthlyFlow[] {
  const result: MonthlyFlow[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = addMonths(today, -i);
    const end = i === 0 ? today : addDaysUtc(addMonths(today, -i + 1), -1);
    const f = flows(inWindow(transactions, start, end));
    result.push({
      month: start.slice(0, 7),
      label: monthLabel.format(new Date(`${start}T00:00:00Z`)),
      inCents: f.inCents,
      outCents: f.outCents,
    });
  }
  return result;
}

/**
 * Burn rate: average monthly net outflow over the last `months` complete months.
 * Returns 0 when the business was net cash-flow positive over that period.
 */
export function burnRate(
  transactions: readonly QueryableTransaction[],
  today: string,
  months = 3,
): number {
  const start = addMonths(today, -months);
  const end = addDaysUtc(startOfMonth(today), -1);
  const { netCents } = flows(inWindow(transactions, start, end));
  return netCents >= 0 ? 0 : divideCents(-netCents, months);
}

/** Whole months of runway at the given burn; null when not burning. */
export function runwayMonths(cashCents: number, burnCents: number): number | null {
  if (burnCents <= 0) return null;
  const remainder = cashCents % burnCents;
  return Math.max(0, (cashCents - remainder) / burnCents);
}
