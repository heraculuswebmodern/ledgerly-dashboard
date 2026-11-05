import "server-only";

import {
  CATEGORY_LABELS,
  type AnalyticsPeriod,
  type AnalyticsReport,
  type CashFlowRange,
  type CashFlowSeries,
  type Category,
  type OverviewSummary,
  type SearchResults,
} from "@/lib/contracts";
import {
  addDaysUtc,
  addMonths,
  buildCashFlow,
  burnRate,
  flows,
  inWindow,
  monthlyFlows,
  runwayMonths,
  spendByCategory,
  startOfMonth,
  topMerchants,
} from "@/lib/domain/insights";
import { changeInBps, divideCents, shareInBps, sumCents } from "@/lib/money";
import { accountsRepo, cardsRepo, recipientsRepo, transactionsRepo } from "@/server/repositories";

import { listAccounts } from "./accounts";
import type { ServiceContext } from "./context";
import { toTransaction } from "./mappers";
import { listScheduled } from "./transfers";

export function getOverview(ctx: ServiceContext): OverviewSummary {
  const transactions = transactionsRepo.list(ctx.db, ctx.now);
  const accounts = listAccounts(ctx);
  const totalCents = sumCents(accounts.map((a) => a.availableCents));
  const monthStartTotalCents = sumCents(accounts.map((a) => a.monthStartBalanceCents));

  // Month to date vs the same number of days last month.
  const monthStart = startOfMonth(ctx.today);
  const dayOfMonth = Number(ctx.today.slice(8, 10));
  const prevStart = addMonths(ctx.today, -1);
  const prevEnd = addDaysUtc(prevStart, dayOfMonth - 1);
  const current = flows(inWindow(transactions, monthStart, ctx.today));
  const previous = flows(
    inWindow(transactions, prevStart, prevEnd < monthStart ? prevEnd : addDaysUtc(monthStart, -1)),
  );

  const burn = burnRate(transactions, ctx.today, 3);

  // Daily total balance history (posted), walking back from today's balance.
  const openingTotal = sumCents(accountsRepo.list(ctx.db).map((a) => a.openingBalanceCents));
  const posted = transactions.filter((t) => t.status === "posted");
  const historyStart = addDaysUtc(ctx.today, -89);
  let running =
    openingTotal +
    sumCents(posted.filter((t) => t.date.slice(0, 10) < historyStart).map((t) => t.amountCents));
  const byDay = new Map<string, number>();
  for (const t of posted) {
    const day = t.date.slice(0, 10);
    if (day >= historyStart) byDay.set(day, (byDay.get(day) ?? 0) + t.amountCents);
  }
  const balanceHistory: OverviewSummary["balanceHistory"] = [];
  for (let day = historyStart; day <= ctx.today; day = addDaysUtc(day, 1)) {
    running += byDay.get(day) ?? 0;
    balanceHistory.push({ date: day, totalCents: running });
  }

  return {
    asOf: ctx.now.toISOString(),
    totalCents,
    monthStartTotalCents,
    momChangeBps: changeInBps(totalCents, monthStartTotalCents),
    accounts,
    balanceHistory,
    kpis: {
      moneyInCents: current.inCents,
      moneyOutCents: current.outCents,
      netCents: current.netCents,
      previous: {
        moneyInCents: previous.inCents,
        moneyOutCents: previous.outCents,
        netCents: previous.netCents,
      },
      burnRateCents: burn,
      runwayMonths: runwayMonths(totalCents, burn),
    },
    recent: transactions
      .filter((t) => t.status !== "pending")
      .slice(0, 6)
      .map((t) => toTransaction(t, ctx.db)),
    pending: transactions
      .filter((t) => t.status === "pending")
      .map((t) => toTransaction(t, ctx.db)),
    upcoming: listScheduled(ctx).slice(0, 5),
  };
}

export function getCashFlow(ctx: ServiceContext, range: CashFlowRange): CashFlowSeries {
  return buildCashFlow(transactionsRepo.list(ctx.db, ctx.now), range, ctx.today);
}

export function getCategorySpend(ctx: ServiceContext, days: number) {
  const transactions = transactionsRepo.list(ctx.db, ctx.now);
  return spendByCategory(inWindow(transactions, addDaysUtc(ctx.today, -(days - 1)), ctx.today));
}

const PERIOD_MONTHS: Record<AnalyticsPeriod, number> = { "3m": 3, "6m": 6, "12m": 12 };

export function getAnalytics(ctx: ServiceContext, period: AnalyticsPeriod): AnalyticsReport {
  const transactions = transactionsRepo.list(ctx.db, ctx.now);
  const monthCount = PERIOD_MONTHS[period];
  const start = addMonths(ctx.today, -(monthCount - 1));
  const windowed = inWindow(transactions, start, ctx.today);

  const months = monthlyFlows(transactions, ctx.today, monthCount);
  const categories = spendByCategory(windowed, { top: 14 });
  // Payroll dwarfs every other line, so the trend tracks the next four (the ones a team can steer).
  const trendCategories = categories
    .filter((c) => c.category !== "payroll")
    .slice(0, 4)
    .map((c) => c.category);

  const categoryTrend = months.map((m) => {
    const monthStart = `${m.month}-01`;
    const monthEnd = addDaysUtc(addMonths(monthStart, 1), -1);
    const spend = spendByCategory(inWindow(transactions, monthStart, monthEnd), { top: 14 });
    const values: Partial<Record<Category, number>> = {};
    for (const category of trendCategories) {
      values[category] = spend.find((s) => s.category === category)?.amountCents ?? 0;
    }
    return { month: m.month, label: m.label, values };
  });

  // Averages use complete months only, so a few days into a month don't drag them down.
  const complete = monthlyFlows(transactions, addDaysUtc(startOfMonth(ctx.today), -1), monthCount);
  const totalIn = sumCents(complete.map((m) => m.inCents));
  const totalOut = sumCents(complete.map((m) => m.outCents));
  return {
    months,
    categories,
    categoryTrend,
    trendCategories,
    topMerchants: topMerchants(windowed, 8),
    averages: {
      monthlyInCents: divideCents(totalIn, monthCount),
      monthlyOutCents: divideCents(totalOut, monthCount),
      savingsRateBps: totalIn === 0 ? null : shareInBps(totalIn - totalOut, totalIn),
    },
  };
}

export function search(ctx: ServiceContext, q: string): SearchResults {
  const needle = q.trim().toLowerCase();
  if (!needle) return { transactions: [], recipients: [], cards: [] };
  const transactions = transactionsRepo
    .list(ctx.db, ctx.now)
    .filter(
      (t) =>
        t.counterparty.toLowerCase().includes(needle) ||
        t.description.toLowerCase().includes(needle) ||
        CATEGORY_LABELS[t.category].toLowerCase().includes(needle),
    )
    .slice(0, 6)
    .map(({ id, counterparty, amountCents, date, status }) => ({
      id,
      counterparty,
      amountCents,
      date,
      status,
    }));
  const recipients = recipientsRepo
    .list(ctx.db)
    .filter((r) => r.name.toLowerCase().includes(needle))
    .slice(0, 4)
    .map(({ id, name, bankName }) => ({ id, name, bankName }));
  const cards = cardsRepo
    .list(ctx.db)
    .filter((c) => c.nickname.toLowerCase().includes(needle) || c.pan.endsWith(needle))
    .slice(0, 4)
    .map((c) => ({ id: c.id, nickname: c.nickname, last4: c.pan.slice(-4) }));
  return { transactions, recipients, cards };
}
