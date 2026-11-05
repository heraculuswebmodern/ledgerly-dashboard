"use client";

import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { ACCOUNT_KIND_LABELS, type OverviewSummary } from "@/lib/contracts";
import { formatDate } from "@/lib/dates";
import { formatBps, formatMoney, shareInBps, splitCents } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Segment colors for the account split, tuned for the navy hero surface. */
const SPLIT_COLORS = { checking: "#2dd4bf", savings: "#10b981", treasury: "#c7d2e0" } as const;

function HeroNumber({ cents }: { cents: number }) {
  const { negative, whole, fraction } = splitCents(cents);
  const dollars = formatMoney(negative ? -whole * 100 : whole * 100, { hideCents: true });
  return (
    <p className="tabular text-[2.6rem] leading-none font-semibold tracking-[-0.035em] sm:text-[3.25rem]">
      {dollars}
      <span className="text-[0.55em] text-hero-muted">.{fraction}</span>
    </p>
  );
}

function SparkTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload as { date: string; totalCents: number };
  return (
    <div className="rounded-md bg-white px-2.5 py-1.5 text-xs text-ink shadow-pop">
      <p className="text-[11px] text-[#5b6676]">{formatDate(point.date)}</p>
      <p className="tabular font-semibold">{formatMoney(point.totalCents)}</p>
    </div>
  );
}

export function CashPositionHero({ data }: { data: OverviewSummary }) {
  const up = (data.momChangeBps ?? 0) >= 0;
  const Trend = up ? ArrowUpRightIcon : ArrowDownRightIcon;
  const total = data.accounts.reduce((sum, a) => sum + Math.max(0, a.availableCents), 0);

  return (
    <section
      aria-labelledby="cash-position-title"
      className="relative isolate overflow-hidden rounded-2xl bg-hero text-hero-foreground shadow-pop"
    >
      <div className="absolute inset-0 -z-10 ledger-lines" aria-hidden="true" />
      <div
        className="absolute -top-24 right-0 -z-10 h-72 w-[38rem] bg-[radial-gradient(closest-side,rgba(14,165,164,0.18),transparent)]"
        aria-hidden="true"
      />

      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10">
        <div className="flex flex-col">
          <h2 id="cash-position-title" className="text-sm font-medium text-hero-muted">
            Total cash position
          </h2>
          <div className="mt-3">
            <HeroNumber cents={data.totalCents} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {data.momChangeBps !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                  up ? "bg-emerald/15 text-[#6ee7b7]" : "bg-[#f87171]/15 text-[#fca5a5]",
                )}
              >
                <Trend className="size-3.5" aria-hidden="true" />
                {formatBps(data.momChangeBps)}
              </span>
            )}
            <span className="text-hero-muted">
              <span className="tabular">
                {formatMoney(data.totalCents - data.monthStartTotalCents, { sign: "always" })}
              </span>{" "}
              since the 1st of the month
            </span>
          </div>

          {/* Account split: one bar, three ledgers. */}
          <div className="mt-8">
            <div className="flex h-2 gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
              {data.accounts.map((a) => (
                <span
                  key={a.id}
                  style={{
                    flexGrow: Math.max(1, shareInBps(Math.max(0, a.availableCents), total)),
                    background: SPLIT_COLORS[a.kind],
                  }}
                />
              ))}
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {data.accounts.map((a) => (
                <li key={a.id} className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs text-hero-muted">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: SPLIT_COLORS[a.kind] }}
                      aria-hidden="true"
                    />
                    {ACCOUNT_KIND_LABELS[a.kind]} <span className="tabular">••{a.last4}</span>
                  </p>
                  <p className="mt-1 truncate tabular text-[15px] font-semibold">
                    {formatMoney(a.availableCents)}
                  </p>
                  <p className="tabular text-[11px] text-hero-muted">
                    {formatBps(shareInBps(Math.max(0, a.availableCents), total), { sign: false })}{" "}
                    of cash
                    {a.apyBps > 0 && ` · ${formatBps(a.apyBps, { sign: false })} APY`}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <figure className="flex min-h-48 flex-col">
          <figcaption className="flex items-center justify-between text-xs text-hero-muted">
            <span>Balance, last 90 days</span>
            <span className="tabular">
              {formatMoney(data.balanceHistory[0]?.totalCents ?? 0, { compact: true })} →{" "}
              {formatMoney(data.balanceHistory.at(-1)?.totalCents ?? 0, { compact: true })}
            </span>
          </figcaption>
          <div
            className="mt-2 min-h-44 flex-1"
            role="img"
            aria-label="Line chart of total balance over the last 90 days"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.balanceHistory}
                margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={["dataMin - 2000000", "dataMax + 2000000"]} />
                <Tooltip
                  content={SparkTooltip}
                  cursor={{ stroke: "rgba(255,255,255,0.35)", strokeDasharray: "3 3" }}
                />
                <Area
                  type="monotone"
                  dataKey="totalCents"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#hero-fill)"
                  activeDot={{ r: 4, fill: "#34d399", stroke: "#0b1b33", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </figure>
      </div>
    </section>
  );
}
