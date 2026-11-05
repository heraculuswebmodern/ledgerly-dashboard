"use client";

import { CheckIcon, CopyIcon, PaperclipIcon, UploadCloudIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Amount } from "@/components/shared/amount";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/features/accounts/api";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  METHOD_LABELS,
  type Category,
  type Transaction,
} from "@/lib/contracts";
import { formatDate, formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { useTransaction, useUpdateTransaction } from "../api";

export function TransactionDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading, isError, refetch } = useTransaction(id);
  return (
    <Sheet open={!!id} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[440px]">
        <SheetHeader>
          <SheetTitle>Transaction details</SheetTitle>
          <SheetDescription className="sr-only">
            Details, status timeline, category and notes
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {isError ? (
            <ErrorState
              title="Transaction not found"
              description="It may have been removed, or the link is out of date."
              onRetry={() => refetch()}
            />
          ) : isLoading || !data ? (
            <DrawerSkeleton />
          ) : (
            <DrawerBody key={data.id} transaction={data} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ transaction: t }: { transaction: Transaction }) {
  const { data: accounts } = useAccounts();
  const update = useUpdateTransaction(t.id);
  const [note, setNote] = useState(t.note);
  const [copied, setCopied] = useState(false);
  const account = accounts?.find((a) => a.id === t.accountId);
  const noteDirty = note.trim() !== t.note;

  const details: [string, React.ReactNode][] = [
    ["Date", formatDate(t.date)],
    ["Account", account ? `${account.name} ••${account.last4}` : "—"],
    [
      "Method",
      t.method === "card" && t.cardLast4 ? `Card ••${t.cardLast4}` : METHOD_LABELS[t.method],
    ],
    ["Description", t.description],
  ];

  return (
    <div className="space-y-7 p-5">
      <div className="flex flex-col items-center text-center">
        <Avatar name={t.counterparty} size="lg" />
        <p className="mt-3 text-sm font-medium">{t.counterparty}</p>
        <Amount
          cents={t.amountCents}
          className={cn(
            "mt-1 text-3xl font-semibold tracking-tight",
            t.status === "failed" && "line-through decoration-2",
          )}
        />
        <div className="mt-2">
          <StatusBadge status={t.status} />
        </div>
      </div>

      <dl className="divide-y rounded-xl border text-sm">
        {details.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="truncate text-right font-medium">{value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted-foreground">Reference</dt>
          <dd>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={async () => {
                await navigator.clipboard?.writeText(t.id).catch(() => undefined);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              aria-label="Copy transaction reference"
            >
              {t.id}
              {copied ? (
                <CheckIcon className="size-3.5 text-positive" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
            </button>
          </dd>
        </div>
      </dl>

      <section aria-labelledby="timeline-title">
        <h3 id="timeline-title" className="mb-3 text-sm font-semibold">
          Status
        </h3>
        <ol className="relative space-y-4 pl-6">
          {t.timeline.map((event, i) => (
            <li key={`${event.label}-${i}`} className="relative">
              {i < t.timeline.length - 1 && (
                <span
                  className="absolute top-4 -bottom-3 -left-[17px] w-px bg-input"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "absolute top-1 -left-[21px] size-[9px] rounded-full ring-4 ring-popover",
                  event.state === "done" && "bg-emerald",
                  event.state === "current" && "animate-pulse bg-amber-400",
                  event.state === "failed" && "bg-negative",
                )}
                aria-hidden="true"
              />
              <p className={cn("text-sm font-medium", event.state === "failed" && "text-negative")}>
                {event.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {event.state === "current" ? "Expected " : ""}
                {formatDateTime(event.at)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div className="space-y-2">
        <Label htmlFor="txn-category">Category</Label>
        <Select
          value={t.category}
          onValueChange={(category) => {
            update.mutate(
              { category: category as Category },
              { onSuccess: () => toast.success("Category updated") },
            );
          }}
          disabled={t.category === "transfer"}
        >
          <SelectTrigger id="txn-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.filter((c) => c !== "transfer" || t.category === "transfer").map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {t.category === "transfer" && (
          <p className="text-xs text-muted-foreground">
            Transfers between your own accounts keep their category.
          </p>
        )}
      </div>

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({ note }, { onSuccess: () => toast.success("Note saved") });
        }}
      >
        <Label htmlFor="txn-note">Note</Label>
        <Textarea
          id="txn-note"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add context for your accountant…"
        />
        <div className="flex items-center justify-between">
          <span className="tabular text-xs text-muted-foreground">{note.length}/500</span>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={!noteDirty || update.isPending}
          >
            Save note
          </Button>
        </div>
      </form>

      <section aria-labelledby="attachments-title" className="space-y-2">
        <h3 id="attachments-title" className="text-sm font-semibold">
          Attachments
        </h3>
        {t.attachments.map((a) => (
          <div key={a.name} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
            <PaperclipIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1 truncate">{a.name}</span>
            <span className="tabular text-xs text-muted-foreground">{a.sizeKb} KB</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed bg-subtle px-4 py-5 text-center">
          <UploadCloudIcon className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Drop a receipt or invoice</p>
          <p className="text-xs text-muted-foreground">Uploads are disabled in this demo</p>
        </div>
      </section>
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="space-y-6 p-5" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-40" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
