"use client";

import Link from "next/link";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { EmptyState, ErrorState } from "@/components/shared/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS, type CategorySpend } from "@/lib/contracts";
import { formatBps, formatMoney, sumCents } from "@/lib/money";
import { cn } from "@/lib/utils";

import { useSpending } from "../api";

/** Validated categorical order (see globals.css); slot 7 is the neutral "Other". */
export const CATEGORY_SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

type Slice = {
  key: string;
  label: string;
  cents: number;
  shareBps: number;
  count: number;
  color: string;
  href: string;
};

export function toSlices(spend: CategorySpend[], max = 5): Slice[] {
  const head = spend.slice(0, max);
  const tail = spend.slice(max);
  const slices: Slice[] = head.map((s, i) => ({
    key: s.category,
    label: CATEGORY_LABELS[s.category],
    cents: s.amountCents,
    shareBps: s.shareBps,
    count: s.count,
    color: CATEGORY_SERIES_COLORS[i]!,
    href: `/transactions?category=${s.category}&direction=out`,
  }));
  if (tail.length) {
    slices.push({
      key: "other",
      label: "Other",
      cents: sumCents(tail.map((t) => t.amountCents)),
      shareBps: tail.reduce((sum, t) => sum + t.shareBps, 0),
      count: tail.reduce((sum, t) => sum + t.count, 0),
      color: "var(--chart-other)",
      href: "/transactions?direction=out",
    });
  }
  return slices;
}

export function CategoryDonut() {
  const { data, isLoading, isError, refetch } = useSpending(30);
  const [active, setActive] = useState<number | null>(null);
  const slices = data ? toSlices(data) : [];
  const total = sumCents(slices.map((s) => s.cents));
  const focus = active !== null ? slices[active] : null;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Spending by category</CardTitle>
          <CardDescription>Last 30 days, excluding internal transfers</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="flex flex-col items-center gap-6">
            <Skeleton className="size-44 rounded-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : slices.length === 0 ? (
          <EmptyState
            title="No spending yet"
            description="Card and bill payments will show up here."
          />
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div
              className="relative size-48"
              role="img"
              aria-label={`Donut chart of spending by category, ${formatMoney(total, { hideCents: true })} total.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="cents"
                    nameKey="label"
                    innerRadius="70%"
                    outerRadius="100%"
                    paddingAngle={1.5}
                    cornerRadius={3}
                    stroke="var(--card)"
                    strokeWidth={2}
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={false}
                    onMouseEnter={(_, index) => setActive(index)}
                    onMouseLeave={() => setActive(null)}
                  >
                    {slices.map((s, i) => (
                      <Cell
                        key={s.key}
                        fill={s.color}
                        opacity={active === null || active === i ? 1 : 0.3}
                        className="outline-none"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
                aria-live="polite"
              >
                <p className="max-w-28 truncate text-xs text-muted-foreground">
                  {focus ? focus.label : "Total spend"}
                </p>
                <p className="tabular text-lg font-semibold tracking-tight">
                  {formatMoney(focus ? focus.cents : total, { hideCents: true })}
                </p>
                {focus && (
                  <p className="tabular text-[11px] text-muted-foreground">
                    {formatBps(focus.shareBps, { sign: false })} · {focus.count} txns
                  </p>
                )}
              </div>
            </div>
            <ul className="w-full space-y-0.5" onMouseLeave={() => setActive(null)}>
              {slices.map((s, i) => (
                <li key={s.key}>
                  <Link
                    href={s.href}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                      active === i && "bg-accent",
                    )}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-[3px]"
                      style={{ background: s.color }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate">{s.label}</span>
                    <span className="w-12 text-right tabular text-xs text-muted-foreground">
                      {formatBps(s.shareBps, { sign: false })}
                    </span>
                    <span className="w-20 text-right tabular font-medium">
                      {formatMoney(s.cents, { hideCents: true })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
