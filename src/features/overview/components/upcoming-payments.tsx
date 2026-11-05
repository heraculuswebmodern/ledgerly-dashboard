import { ArrowRightIcon, CalendarClockIcon, ClockIcon } from "lucide-react";
import Link from "next/link";

import { Amount } from "@/components/shared/amount";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScheduledPayment, Transaction } from "@/lib/contracts";
import { formatDueIn, formatShortDate } from "@/lib/dates";

export function UpcomingPayments({
  upcoming,
  pending,
}: {
  upcoming: ScheduledPayment[];
  pending: Transaction[];
}) {
  const empty = upcoming.length === 0 && pending.length === 0;
  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle>Upcoming & pending</CardTitle>
        <Button asChild variant="ghost" size="sm" className="-mr-2 text-muted-foreground">
          <Link href="/payments">
            Payments <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-3 pt-2 pb-3">
        {empty ? (
          <EmptyState
            icon={CalendarClockIcon}
            title="Nothing scheduled"
            description="Scheduled and in-flight payments appear here."
          />
        ) : (
          <ul>
            {pending.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/transactions?txn=${t.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pending-soft">
                    <ClockIcon className="size-4 text-pending" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.counterparty}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.method.toUpperCase()} · started {formatShortDate(t.date)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Amount cents={t.amountCents} className="text-sm font-medium" />
                    <Badge variant="pending">In flight</Badge>
                  </div>
                </Link>
              </li>
            ))}
            {upcoming.map((p) => (
              <li key={p.id}>
                <Link
                  href="/payments?tab=scheduled"
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg border bg-subtle leading-none">
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase">
                      {formatShortDate(p.dueDate).split(" ")[0]}
                    </span>
                    <span className="tabular text-sm font-semibold">
                      {formatShortDate(p.dueDate).split(" ")[1]}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.recipientName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDueIn(p.dueDate)} · {p.rail.toUpperCase()} · {p.memo}
                    </p>
                  </div>
                  <Amount cents={-p.amountCents} className="text-sm font-medium" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
