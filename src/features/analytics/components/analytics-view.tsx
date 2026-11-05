"use client";

import { BarChart3Icon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { ANALYTICS_PERIODS, CATEGORY_LABELS, type AnalyticsPeriod } from "@/lib/contracts";
import { formatBps, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { useAnalytics } from "../api";
import {
  CategoryTrendChart,
  IncomeExpensesChart,
  RankedBars,
  categoryRows,
  merchantRows,
} from "./analytics-charts";

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = { "3m": "3M", "6m": "6M", "12m": "12M" };
const PERIOD_TEXT: Record<AnalyticsPeriod, string> = {
  "3m": "last 3 months",
  "6m": "last 6 months",
  "12m": "last 12 months",
};

function isPeriod(v: string | null): v is AnalyticsPeriod {
  return !!v && (ANALYTICS_PERIODS as readonly string[]).includes(v);
}

export function AnalyticsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("period");
  const period: AnalyticsPeriod = isPeriod(raw) ? raw : "6m";
  const { data, isLoading, isError, refetch, isFetching } = useAnalytics(period);

  const setPeriod = (p: AnalyticsPeriod) =>
    router.replace(p === "6m" ? pathname : `${pathname}?period=${p}`, { scroll: false });

  const top = data?.categories[0];
  const tiles: [string, string | null, string?][] = [
    [
      "Avg. monthly income",
      data ? formatMoney(data.averages.monthlyInCents, { hideCents: true }) : null,
    ],
    [
      "Avg. monthly spend",
      data ? formatMoney(data.averages.monthlyOutCents, { hideCents: true }) : null,
    ],
    [
      "Net margin",
      data
        ? data.averages.savingsRateBps === null
          ? "n/a"
          : formatBps(data.averages.savingsRateBps)
        : null,
      data && (data.averages.savingsRateBps ?? 0) < 0 ? "text-negative" : "text-positive",
    ],
    ["Largest category", data ? (top ? CATEGORY_LABELS[top.category] : "None") : null],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Where money comes from and where it goes, ${PERIOD_TEXT[period]}. Averages use complete months.`}
        actions={
          <Segmented
            aria-label="Analytics period"
            value={period}
            onValueChange={setPeriod}
            options={ANALYTICS_PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
          />
        }
      />

      {isError ? (
        <Card>
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : (
        <div
          className={cn("space-y-6 transition-opacity", isFetching && !isLoading && "opacity-70")}
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map(([label, value, tone]) => (
              <Card key={label} className="p-4">
                <p className="text-[13px] text-muted-foreground">{label}</p>
                {value === null ? (
                  <Skeleton className="mt-2 h-6 w-24" />
                ) : (
                  <p
                    className={cn(
                      "mt-1 truncate tabular text-xl font-semibold tracking-tight",
                      tone,
                    )}
                  >
                    {value}
                  </p>
                )}
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Income vs expenses</CardTitle>
                  <CardDescription>
                    Monthly totals, internal transfers excluded. This month is to date.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {!data ? (
                  <Skeleton className="h-72" />
                ) : (
                  <IncomeExpensesChart months={data.months} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Spending trend</CardTitle>
                  <CardDescription>
                    Largest categories after payroll. Hover the legend to focus one.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {!data ? (
                  <Skeleton className="h-72" />
                ) : data.trendCategories.length === 0 ? (
                  <EmptyState icon={BarChart3Icon} title="No spending in this period" />
                ) : (
                  <CategoryTrendChart
                    trend={data.categoryTrend}
                    categories={data.trendCategories}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Category breakdown</CardTitle>
                  <CardDescription>
                    Share of total spend. Select one to see its transactions.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {!data ? (
                  <Skeleton className="h-80" />
                ) : data.categories.length === 0 ? (
                  <EmptyState icon={BarChart3Icon} title="No spending in this period" />
                ) : (
                  <RankedBars rows={categoryRows(data.categories)} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Top merchants</CardTitle>
                  <CardDescription>Where the most money went</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {!data ? (
                  <Skeleton className="h-80" />
                ) : data.topMerchants.length === 0 ? (
                  <EmptyState icon={BarChart3Icon} title="No merchants in this period" />
                ) : (
                  <RankedBars rows={merchantRows(data.topMerchants)} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
