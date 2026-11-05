import "server-only";

import {
  RAIL_ETA,
  checkTransfer,
  isScheduled,
  type ParsedTransferInput,
  type ScheduledPayment,
  type TransferResult,
} from "@/lib/contracts";
import { formatMoney } from "@/lib/money";
import type { TransactionRecord } from "@/server/db/types";
import { ApiError, notFound } from "@/server/http/handler";
import {
  accountsRepo,
  newId,
  notificationsRepo,
  recipientsRepo,
  scheduledRepo,
  transactionsRepo,
} from "@/server/repositories";

import { listAccounts } from "./accounts";
import type { ServiceContext } from "./context";

/** How long a demo payment stays pending before it settles (lazily, on the next read). */
const SETTLE_AFTER_MS = { ach: 3 * 60_000, wire: 60_000 } as const;

function baseRecord(
  ctx: ServiceContext,
): Omit<
  TransactionRecord,
  | "id"
  | "accountId"
  | "counterparty"
  | "amountCents"
  | "category"
  | "method"
  | "status"
  | "postedAt"
  | "settlesAt"
  | "description"
> {
  return {
    date: ctx.now.toISOString(),
    cardId: null,
    recipientId: null,
    transferGroupId: null,
    failureReason: null,
    note: "",
    attachments: [],
  };
}

export function createTransfer(ctx: ServiceContext, input: ParsedTransferInput): TransferResult {
  const accounts = listAccounts(ctx);
  const issues = checkTransfer(input, {
    accounts,
    recipients: recipientsRepo.list(ctx.db),
    today: ctx.today,
  });
  if (issues.length) {
    throw new ApiError(
      422,
      "transfer_rejected",
      issues[0]!.message,
      Object.fromEntries(issues.map((i) => [i.field, i.message])),
    );
  }

  const from = accountsRepo.get(ctx.db, input.fromAccountId)!;
  const nowIso = ctx.now.toISOString();

  if (input.kind === "internal") {
    const to = accountsRepo.get(ctx.db, input.toAccountId)!;
    const group = newId("xfr");
    const description = input.memo || `Transfer to ${to.name}`;
    const legs: TransactionRecord[] = [
      {
        ...baseRecord(ctx),
        id: newId("txn"),
        accountId: from.id,
        counterparty: `${to.name} ••${to.last4}`,
        description,
        category: "transfer",
        amountCents: -input.amountCents,
        method: "transfer",
        status: "posted",
        postedAt: nowIso,
        settlesAt: null,
        transferGroupId: group,
      },
      {
        ...baseRecord(ctx),
        id: newId("txn"),
        accountId: to.id,
        counterparty: `${from.name} ••${from.last4}`,
        description,
        category: "transfer",
        amountCents: input.amountCents,
        method: "transfer",
        status: "posted",
        postedAt: nowIso,
        settlesAt: null,
        transferGroupId: group,
      },
    ];
    transactionsRepo.insert(ctx.db, legs);
    return {
      kind: "sent",
      transactionIds: legs.map((l) => l.id),
      scheduledPaymentId: null,
      amountCents: input.amountCents,
      eta: RAIL_ETA.internal,
    };
  }

  const recipient = recipientsRepo.get(ctx.db, input.recipientId)!;

  if (isScheduled(input, ctx.today)) {
    const record = scheduledRepo.insert(ctx.db, {
      id: newId("sch"),
      recipientId: recipient.id,
      fromAccountId: from.id,
      amountCents: input.amountCents,
      rail: input.rail,
      dueDate: input.scheduledFor!,
      memo: input.memo,
    });
    notificationsRepo.push(ctx.db, {
      kind: "payment",
      title: "Payment scheduled",
      body: `${formatMoney(input.amountCents)} to ${recipient.name} on ${input.scheduledFor}.`,
      createdAt: nowIso,
      href: "/payments",
    });
    return {
      kind: "scheduled",
      transactionIds: [],
      scheduledPaymentId: record.id,
      amountCents: input.amountCents,
      eta: `Scheduled for ${input.scheduledFor}`,
    };
  }

  const previous = ctx.db.transactions.find((t) => t.recipientId === recipient.id);
  const record: TransactionRecord = {
    ...baseRecord(ctx),
    id: newId("txn"),
    accountId: from.id,
    counterparty: recipient.name,
    description:
      input.memo || `${input.rail === "wire" ? "Wire" : "ACH"} payment to ${recipient.name}`,
    category: previous?.category ?? "professional",
    amountCents: -input.amountCents,
    method: input.rail,
    status: "pending",
    postedAt: null,
    settlesAt: new Date(ctx.now.getTime() + SETTLE_AFTER_MS[input.rail]).toISOString(),
    recipientId: recipient.id,
  };
  transactionsRepo.insert(ctx.db, [record]);
  notificationsRepo.push(ctx.db, {
    kind: "payment",
    title: input.rail === "wire" ? "Wire sent" : "ACH payment sent",
    body: `${formatMoney(input.amountCents)} to ${recipient.name} from ${from.name}.`,
    createdAt: nowIso,
    href: `/transactions?q=${encodeURIComponent(recipient.name)}`,
  });
  return {
    kind: "sent",
    transactionIds: [record.id],
    scheduledPaymentId: null,
    amountCents: input.amountCents,
    eta: RAIL_ETA[input.rail],
  };
}

export function listScheduled(ctx: ServiceContext): ScheduledPayment[] {
  return scheduledRepo
    .list(ctx.db)
    .filter((s) => s.dueDate >= ctx.today)
    .map((s) => ({
      id: s.id,
      recipientId: s.recipientId,
      recipientName: recipientsRepo.get(ctx.db, s.recipientId)?.name ?? "Unknown recipient",
      fromAccountId: s.fromAccountId,
      amountCents: s.amountCents,
      rail: s.rail,
      dueDate: s.dueDate,
      memo: s.memo,
    }));
}

export function cancelScheduled(ctx: ServiceContext, id: string): void {
  if (!scheduledRepo.remove(ctx.db, id)) throw notFound("Scheduled payment");
}
