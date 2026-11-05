"use client";

import { AlertCircleIcon, ArrowDownIcon, Loader2Icon } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { RAIL_ETA, type Account, type ParsedTransferInput, type Recipient } from "@/lib/contracts";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export function TransferReviewStep({
  input,
  accounts,
  recipients,
  today,
  pending,
  error,
  onBack,
  onConfirm,
}: {
  input: ParsedTransferInput;
  accounts: Account[];
  recipients: Recipient[];
  today: string;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const from = accounts.find((a) => a.id === input.fromAccountId)!;
  const to =
    input.kind === "internal"
      ? accounts.find((a) => a.id === input.toAccountId)
      : recipients.find((r) => r.id === input.recipientId);
  const toLabel = to ? ("bankName" in to ? to.name : `${to.name} ••${to.last4}`) : "—";
  const toMeta =
    to && "bankName" in to ? `${to.bankName} ••${to.accountLast4}` : "Ledgerly account";
  const scheduled = input.kind === "external" && input.scheduledFor && input.scheduledFor > today;
  const rail = input.kind === "internal" ? "internal" : input.rail;

  const rows: [string, string][] = [
    [
      "Method",
      input.kind === "internal"
        ? "Internal transfer"
        : input.rail === "wire"
          ? "Domestic wire"
          : "ACH",
    ],
    ["Arrives", scheduled ? `Initiated ${formatDate(input.scheduledFor!)}` : RAIL_ETA[rail]],
    ["Fee", "$0.00"],
    [`${from.name} after`, formatMoney(from.availableCents - input.amountCents)],
  ];
  if (input.memo) rows.push(["Memo", input.memo]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-subtle p-5">
        <p className="text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {scheduled ? "You're scheduling" : "You're sending"}
        </p>
        <p className="mt-1 text-center tabular text-4xl font-semibold tracking-[-0.03em]">
          {formatMoney(input.amountCents)}
        </p>

        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <Avatar name={from.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">From</p>
              <p className="truncate text-sm font-medium">
                {from.name} <span className="tabular text-muted-foreground">••{from.last4}</span>
              </p>
            </div>
          </div>
          <div className="flex justify-center" aria-hidden="true">
            <ArrowDownIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <Avatar name={toLabel} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">To</p>
              <p className="truncate text-sm font-medium">{toLabel}</p>
              <p className="truncate text-xs text-muted-foreground">{toMeta}</p>
            </div>
          </div>
        </div>
      </div>

      <dl className="divide-y rounded-xl border text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="truncate text-right tabular font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-negative-soft px-3 py-2.5 text-sm text-negative"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onBack} disabled={pending}>
          Back
        </Button>
        <Button type="button" variant="brand" onClick={onConfirm} disabled={pending}>
          {pending ? (
            <>
              <Loader2Icon className="animate-spin" aria-hidden="true" /> Sending…
            </>
          ) : scheduled ? (
            `Schedule ${formatMoney(input.amountCents)}`
          ) : (
            `Send ${formatMoney(input.amountCents)}`
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}
