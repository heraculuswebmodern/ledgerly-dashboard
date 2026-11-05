"use client";

import { ArrowLeftRightIcon, SendIcon } from "lucide-react";
import Link from "next/link";

import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/shell/api";
import { formatWeekdayDate } from "@/lib/dates";
import { useNow } from "@/lib/use-now";

import { useOverview } from "../api";
import { CashFlowChart } from "./cash-flow-chart";
import { CashPositionHero } from "./cash-position-hero";
import { CategoryDonut } from "./category-donut";
import { KpiGrid } from "./kpi-grid";
import { RecentTransactions } from "./recent-transactions";
import { UpcomingPayments } from "./upcoming-payments";

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function OverviewView() {
  const { data, isLoading, isError, refetch } = useOverview();
  const { data: user } = useSession();
  const now = useNow();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="h-5 text-sm text-muted-foreground">
            {now ? formatWeekdayDate(now.toISOString()) : ""}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.025em]">
            {now ? greeting(now) : "Welcome"}
            {user ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/payments?new=1&kind=internal">
              <ArrowLeftRightIcon aria-hidden="true" /> Move money
            </Link>
          </Button>
          <Button asChild variant="brand">
            <Link href="/payments?new=1">
              <SendIcon aria-hidden="true" /> Send money
            </Link>
          </Button>
        </div>
      </header>

      {isError ? (
        <Card>
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : isLoading || !data ? (
        <OverviewSkeleton />
      ) : (
        <>
          <CashPositionHero data={data} />
          <KpiGrid data={data} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
            <CashFlowChart />
            <CategoryDonut />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <RecentTransactions transactions={data.recent} />
            <UpcomingPayments upcoming={data.upcoming} pending={data.pending} />
          </div>
        </>
      )}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading overview">
      <Skeleton className="h-[22rem] w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[6.5rem] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
