import {
  ArrowDownLeftIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  FlameIcon,
  HourglassIcon,
  ScaleIcon,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import type { OverviewSummary } from "@/lib/contracts";
import { changeInBps, formatBps, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Kpi = {
  label: string;
  icon: LucideIcon;
  value: string;
  hint: string;
  /** Change vs previous period and whether "up" is good for this metric. */
  delta?: { bps: number | null; upIsGood: boolean };
  tone?: "default" | "positive" | "negative";
};

function Delta({ bps, upIsGood }: { bps: number | null; upIsGood: boolean }) {
  if (bps === null) return null;
  const up = bps >= 0;
  const good = up === upIsGood;
  const Icon = up ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular text-xs font-medium",
        good ? "text-positive" : "text-negative",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {formatBps(bps, { sign: false }).replace("-", "")}
      <span className="sr-only">{up ? "increase" : "decrease"}</span>
    </span>
  );
}

export function KpiGrid({ data }: { data: OverviewSummary }) {
  const { kpis } = data;
  const items: Kpi[] = [
    {
      label: "Money in",
      icon: ArrowDownLeftIcon,
      value: formatMoney(kpis.moneyInCents, { hideCents: true }),
      hint: "Month to date",
      delta: { bps: changeInBps(kpis.moneyInCents, kpis.previous.moneyInCents), upIsGood: true },
    },
    {
      label: "Money out",
      icon: ArrowUpRightIcon,
      value: formatMoney(kpis.moneyOutCents, { hideCents: true }),
      hint: "Month to date",
      delta: { bps: changeInBps(kpis.moneyOutCents, kpis.previous.moneyOutCents), upIsGood: false },
    },
    {
      label: "Net cash flow",
      icon: ScaleIcon,
      value: formatMoney(kpis.netCents, { hideCents: true, sign: "always" }),
      hint: `Last month: ${formatMoney(kpis.previous.netCents, { hideCents: true, sign: "always" })}`,
      tone: kpis.netCents >= 0 ? "positive" : "default",
    },
    {
      label: "Burn rate",
      icon: FlameIcon,
      value: kpis.burnRateCents ? formatMoney(kpis.burnRateCents, { hideCents: true }) : "$0",
      hint: kpis.burnRateCents ? "Avg. net outflow / month, last 3 mo." : "Cash-flow positive",
    },
    {
      label: "Runway",
      icon: HourglassIcon,
      value: kpis.runwayMonths === null ? "∞" : `${kpis.runwayMonths} mo`,
      hint: kpis.runwayMonths === null ? "Not burning cash" : "At current burn rate",
      tone: kpis.runwayMonths !== null && kpis.runwayMonths < 12 ? "negative" : "default",
    },
  ];

  return (
    <section
      aria-label="Key metrics"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
    >
      {items.map((kpi, i) => (
        <Card
          key={kpi.label}
          className={cn("p-4", i === items.length - 1 && "col-span-2 md:col-span-1")}
        >
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">{kpi.label}</p>
            <kpi.icon className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p
              className={cn(
                "tabular text-xl font-semibold tracking-tight sm:text-[22px]",
                kpi.tone === "positive" && "text-positive",
                kpi.tone === "negative" && "text-negative",
              )}
            >
              {kpi.value}
            </p>
            {kpi.delta && <Delta {...kpi.delta} />}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{kpi.hint}</p>
        </Card>
      ))}
    </section>
  );
}
