"use client";

import { ArrowLeftRightIcon, ArrowUpRightIcon, LandmarkIcon, ListIcon } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ACCOUNT_KIND_LABELS, type Account } from "@/lib/contracts";
import { formatDate } from "@/lib/dates";
import { changeInBps, formatBps, formatMoney, shareInBps, sumCents } from "@/lib/money";
import { cn } from "@/lib/utils";

import { useTransactions } from "../../transactions/api";
import { TransactionListItem } from "../../transactions/components/transaction-list-item";
import { useAccounts } from "../api";

export function AccountsView() {
  const { data, isLoading, isError, refetch } = useAccounts();
  const total = data ? sumCents(data.map((a) => a.balanceCents)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Balances, account details and recent activity for each account."
        actions={
          <Button asChild variant="outline">
            <Link href="/payments?new=1&kind=internal">
              <ArrowLeftRightIcon aria-hidden="true" />
              Move money
            </Link>
          </Button>
        }
      />

      {isError ? (
        <Card>
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : isLoading || !data ? (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState icon={LandmarkIcon} title="No accounts yet" />
        </Card>
      ) : (
        <>
          <AllocationBar accounts={data} total={total} />
          <ul className="space-y-6" aria-label="Accounts">
            {data.map((account) => (
              <li key={account.id}>
                <AccountCard account={account} total={total} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const ACCOUNT_COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-5)", "var(--chart-2)"];

function AllocationBar({ accounts, total }: { accounts: Account[]; total: number }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">Total across {accounts.length} accounts</p>
        <p className="tabular text-2xl font-semibold tracking-tight">{formatMoney(total)}</p>
      </div>
      <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {accounts.map((a, i) => (
          <div
            key={a.id}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${shareInBps(a.balanceCents, total) / 100}%`,
              background: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
            }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        {accounts.map((a, i) => (
          <li key={a.id} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-[3px]"
              style={{ background: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }}
              aria-hidden="true"
            />
            {a.name}
            <span className="tabular text-foreground">
              {formatBps(shareInBps(a.balanceCents, total), { sign: false })}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AccountCard({ account: a, total }: { account: Account; total: number }) {
  const change = changeInBps(a.balanceCents, a.monthStartBalanceCents);
  const activity = useTransactions({ account: a.id, pageSize: "25" });
  const recent = activity.data?.items.slice(0, 5) ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                {a.name}
                <Badge variant="neutral">{ACCOUNT_KIND_LABELS[a.kind]}</Badge>
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ••{a.last4} · opened {formatDate(a.openedAt)}
              </p>
            </div>
            {a.apyBps > 0 && (
              <Badge variant="positive">{formatBps(a.apyBps, { sign: false })} APY</Badge>
            )}
          </div>

          <div>
            <p className="tabular text-3xl font-semibold tracking-tight">
              {formatMoney(a.balanceCents)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {change === null ? (
                "New this month"
              ) : (
                <>
                  <span
                    className={cn(
                      "tabular font-medium",
                      change >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {formatBps(change)}
                  </span>{" "}
                  since the 1st · {formatBps(shareInBps(a.balanceCents, total), { sign: false })} of
                  total cash
                </>
              )}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Available</dt>
              <dd className="tabular font-medium">{formatMoney(a.availableCents)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pending</dt>
              <dd className="tabular font-medium">
                {a.pendingCents === 0 ? "None" : formatMoney(a.pendingCents, { sign: "always" })}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Routing number</dt>
              <dd className="font-mono tabular text-[13px]">{a.routingNumber}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Account number</dt>
              <dd className="font-mono tabular text-[13px]">•••• {a.last4}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/transactions?account=${a.id}`}>
                <ListIcon aria-hidden="true" />
                All transactions
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/payments?new=1&kind=internal`}>
                <ArrowUpRightIcon aria-hidden="true" />
                Transfer
              </Link>
            </Button>
          </div>
        </div>

        <section
          aria-label={`Recent activity in ${a.name}`}
          className="border-t bg-muted/30 p-3 sm:p-4 lg:border-t-0 lg:border-l"
        >
          <h3 className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Recent activity
          </h3>
          {activity.isLoading ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="px-2 py-6 text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul>
              {recent.map((t) => (
                <li key={t.id}>
                  <TransactionListItem transaction={t} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Card>
  );
}
