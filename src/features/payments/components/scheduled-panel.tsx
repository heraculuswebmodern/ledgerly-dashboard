"use client";

import { CalendarClockIcon, XIcon } from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDueIn } from "@/lib/dates";

import { useCancelScheduled, useScheduled } from "../api";

export function ScheduledPanel() {
  const { data, isLoading, isError, refetch } = useScheduled();
  const cancel = useCancelScheduled();

  return (
    <Card>
      <div className="border-b px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight">Scheduled</h2>
        <p className="text-[13px] text-muted-foreground">Future-dated payments, in send order.</p>
      </div>
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : data?.length === 0 ? (
        <EmptyState
          icon={CalendarClockIcon}
          title="Nothing scheduled"
          description="Choose “Schedule” when sending money to pay later."
        />
      ) : (
        <ul className="divide-y">
          {data?.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.recipientName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(p.dueDate)} · {formatDueIn(p.dueDate)} · {p.rail.toUpperCase()}
                  {p.memo ? ` · ${p.memo}` : ""}
                </p>
              </div>
              <Amount cents={-p.amountCents} className="text-sm font-medium" />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Cancel payment to ${p.recipientName} on ${formatDate(p.dueDate)}`}
                onClick={() => cancel.mutate(p.id)}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
