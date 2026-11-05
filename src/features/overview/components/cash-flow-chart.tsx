"use client";

import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { ChartTooltipCard } from "@/components/shared/chart-tooltip";
import { ErrorState } from "@/components/shared/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { CASH_FLOW_RANGES, type CashFlowPoint, type CashFlowRange } from "@/lib/contracts";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { useCashFlow } from "../api";

const RANGE_LABELS: Record<CashFlowRange, string> = {
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
  "1y": "1Y",
};
const RANGE_DESCRIPTIONS: Record<CashFlowRange, string> = {
  "7d": "Daily, last 7 days",
  "30d": "Daily, last 30 days",
  "90d": "Weekly, last 90 days",
  "1y": "Monthly, last 12 months",
};

type ChartPoint = CashFlowPoint & { outNegative: number };

function CashFlowTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0]!.payload as ChartPoint;
  return (
    <ChartTooltipCard
      title={p.label}
      rows={[
        { label: "Money in", cents: p.inCents, color: "var(--chart-in)" },
        { label: "Money out", cents: p.outCents, color: "var(--chart-out)" },
        { label: "Net", cents: p.netCents, emphasis: true },
      ]}
    />
  );
}

function Legend() {
  const items = [
    { label: "Money in", swatch: "bg-[var(--chart-in)] rounded-[3px] size-2.5" },
    { label: "Money out", swatch: "bg-[var(--chart-out)] rounded-[3px] size-2.5" },
  ];
  return (
    <ul
      className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground"
      aria-label="Legend"
    >
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className={i.swatch} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function CashFlowChart() {
  const [range, setRange] = useState<CashFlowRange>("30d");
  const { data, isLoading, isError, refetch, isFetching } = useCashFlow(range);
  const points: ChartPoint[] = data?.points.map((p) => ({ ...p, outNegative: -p.outCents })) ?? [];
  const tickInterval = range === "30d" ? 4 : range === "90d" ? 1 : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-wrap">
        <div>
          <CardTitle>Cash flow</CardTitle>
          <CardDescription>{RANGE_DESCRIPTIONS[range]}</CardDescription>
        </div>
        <Segmented
          aria-label="Cash flow range"
          value={range}
          onValueChange={setRange}
          options={CASH_FLOW_RANGES.map((r) => ({ value: r, label: RANGE_LABELS[r] }))}
        />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </>
        ) : (
          <>
            <dl className="grid grid-cols-3 gap-4">
              {[
                ["In", data.totals.inCents, "text-positive"],
                ["Out", -data.totals.outCents, ""],
                [
                  "Net",
                  data.totals.netCents,
                  data.totals.netCents >= 0 ? "text-positive" : "text-negative",
                ],
              ].map(([label, cents, cls]) => (
                <div key={label as string}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd
                    className={cn(
                      "mt-0.5 tabular text-base font-semibold sm:text-lg",
                      cls as string,
                    )}
                  >
                    {formatMoney(cents as number, {
                      hideCents: true,
                      sign: label === "In" ? "auto" : "always",
                    })}
                  </dd>
                </div>
              ))}
            </dl>
            <div
              className={cn("h-64 transition-opacity", isFetching && "opacity-60")}
              role="img"
              aria-label={`Cash flow chart, ${RANGE_DESCRIPTIONS[range]}: ${formatMoney(data.totals.inCents, { hideCents: true })} in, ${formatMoney(data.totals.outCents, { hideCents: true })} out.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={points}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  stackOffset="sign"
                  barCategoryGap={range === "7d" ? "30%" : "18%"}
                >
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval={tickInterval}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(v: number) => formatMoney(Math.round(v), { compact: true })}
                  />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Tooltip
                    content={CashFlowTooltip}
                    cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                  />
                  <Bar
                    dataKey="inCents"
                    stackId="flow"
                    fill="var(--chart-in)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="outNegative"
                    stackId="flow"
                    fill="var(--chart-out)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <Legend />
          </>
        )}
      </CardContent>
    </Card>
  );
}
