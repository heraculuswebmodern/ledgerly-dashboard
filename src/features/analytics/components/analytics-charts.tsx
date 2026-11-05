"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { ChartTooltipCard } from "@/components/shared/chart-tooltip";
import { CATEGORY_LABELS, type AnalyticsReport, type Category } from "@/lib/contracts";
import { formatBps, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { CATEGORY_SERIES_COLORS } from "../../overview/components/category-donut";

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };
const compact = (v: number) => formatMoney(Math.round(v), { compact: true });

function LegendList({
  items,
  active,
  onActive,
}: {
  items: { key: string; label: string; color: string }[];
  active?: string | null;
  onActive?: (key: string | null) => void;
}) {
  return (
    <ul
      className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground"
      aria-label="Legend"
    >
      {items.map((i) => (
        <li key={i.key}>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded px-1 py-0.5 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active && active !== i.key && "opacity-40",
              !onActive && "cursor-default",
            )}
            onMouseEnter={() => onActive?.(i.key)}
            onMouseLeave={() => onActive?.(null)}
            onFocus={() => onActive?.(i.key)}
            onBlur={() => onActive?.(null)}
          >
            <span
              className="size-2.5 rounded-[3px]"
              style={{ background: i.color }}
              aria-hidden="true"
            />
            {i.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- income vs expenses */

type MonthRow = AnalyticsReport["months"][number];

function FlowTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const m = payload[0]!.payload as MonthRow;
  return (
    <ChartTooltipCard
      title={m.label}
      rows={[
        { label: "Income", cents: m.inCents, color: "var(--chart-in)" },
        { label: "Expenses", cents: m.outCents, color: "var(--chart-out)" },
        { label: "Net", cents: m.inCents - m.outCents, emphasis: true },
      ]}
    />
  );
}

export function IncomeExpensesChart({ months }: { months: MonthRow[] }) {
  return (
    <div className="space-y-3">
      <div
        className="h-64"
        role="img"
        aria-label={`Income versus expenses by month, ${months[0]?.label} to ${months.at(-1)?.label}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={months}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap="22%"
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tick={axisTick}
              tickFormatter={compact}
            />
            <Tooltip content={FlowTooltip} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
            <Bar
              dataKey="inCents"
              fill="var(--chart-in)"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
              isAnimationActive={false}
            />
            <Bar
              dataKey="outCents"
              fill="var(--chart-out)"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <LegendList
        items={[
          { key: "in", label: "Income", color: "var(--chart-in)" },
          { key: "out", label: "Expenses", color: "var(--chart-out)" },
        ]}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- category trend */

type Series = { key: string; label: string; color: string };

function TrendTooltip({
  active,
  payload,
  label,
  series,
}: TooltipContentProps & { series: Series[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]!.payload as Record<string, number>;
  return (
    <ChartTooltipCard
      title={label}
      rows={series.map((s) => ({ label: s.label, cents: row[s.key] ?? 0, color: s.color }))}
    />
  );
}

export function CategoryTrendChart({
  trend,
  categories,
}: {
  trend: AnalyticsReport["categoryTrend"];
  categories: Category[];
}) {
  const [active, setActive] = useState<string | null>(null);
  const rows = trend.map((t) => ({ label: t.label, ...t.values }));
  const series: Series[] = categories.map((c, i) => ({
    key: c,
    label: CATEGORY_LABELS[c],
    color: CATEGORY_SERIES_COLORS[i]!,
  }));

  return (
    <div className="space-y-3">
      <div
        className="h-64"
        role="img"
        aria-label={`Monthly spend for ${series.map((s) => s.label).join(", ")}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tick={axisTick}
              tickFormatter={compact}
            />
            <Tooltip
              content={(p) => <TrendTooltip {...p} series={series} />}
              cursor={{ stroke: "var(--border)" }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                strokeOpacity={active && active !== s.key ? 0.2 : 1}
                dot={false}
                activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <LegendList items={series} active={active} onActive={setActive} />
    </div>
  );
}

/* ---------------------------------------------------------------- ranked bars (HTML) */

export function RankedBars({
  rows,
}: {
  rows: { key: string; label: string; cents: number; detail: string; href: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.cents));
  return (
    <ul className="space-y-1">
      {rows.map((r) => (
        <li key={r.key}>
          <Link
            href={r.href}
            className="group block rounded-lg px-2 py-2 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">{r.label}</span>
              <span className="shrink-0 tabular">{formatMoney(r.cents, { hideCents: true })}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--chart-1)] transition-opacity group-hover:opacity-80"
                  style={{ width: `${Math.max(2, (r.cents / max) * 100)}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right tabular text-xs text-muted-foreground">
                {r.detail}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function categoryRows(categories: AnalyticsReport["categories"]) {
  return categories.slice(0, 8).map((c) => ({
    key: c.category,
    label: CATEGORY_LABELS[c.category],
    cents: c.amountCents,
    detail: formatBps(c.shareBps, { sign: false }),
    href: `/transactions?category=${c.category}&direction=out`,
  }));
}

export function merchantRows(merchants: AnalyticsReport["topMerchants"]) {
  return merchants.map((m) => ({
    key: m.counterparty,
    label: m.counterparty,
    cents: m.amountCents,
    detail: `${m.count} txn${m.count === 1 ? "" : "s"}`,
    href: `/transactions?q=${encodeURIComponent(m.counterparty)}`,
  }));
}
