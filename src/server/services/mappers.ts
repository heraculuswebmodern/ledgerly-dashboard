import "server-only";

import type { Account, Card, Recipient, TimelineEvent, Transaction } from "@/lib/contracts";
import { sumCents } from "@/lib/money";
import type {
  AccountRecord,
  CardRecord,
  Database,
  RecipientRecord,
  TransactionRecord,
} from "@/server/db/types";

/** Mapping from storage records to API DTOs. Sensitive fields are dropped here. */

export function computeAccount(
  account: AccountRecord,
  transactions: readonly TransactionRecord[],
  today: string,
): Account {
  const own = transactions.filter((t) => t.accountId === account.id && t.status !== "failed");
  const posted = own.filter((t) => t.status === "posted");
  const pendingOut = own.filter((t) => t.status === "pending" && t.amountCents < 0);
  const monthStart = `${today.slice(0, 7)}-01`;

  const balanceCents = account.openingBalanceCents + sumCents(posted.map((t) => t.amountCents));
  const pendingCents = sumCents(
    own.filter((t) => t.status === "pending").map((t) => t.amountCents),
  );
  return {
    id: account.id,
    kind: account.kind,
    name: account.name,
    last4: account.last4,
    routingNumber: account.routingNumber,
    balanceCents,
    availableCents: balanceCents + sumCents(pendingOut.map((t) => t.amountCents)),
    pendingCents,
    apyBps: account.apyBps,
    openedAt: account.openedAt,
    monthStartBalanceCents:
      account.openingBalanceCents +
      sumCents(posted.filter((t) => t.date.slice(0, 10) < monthStart).map((t) => t.amountCents)),
  };
}

function addMinutes(iso: string, minutes: number) {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

export function buildTimeline(t: TransactionRecord): TimelineEvent[] {
  const incoming = t.amountCents > 0;
  const first: TimelineEvent = {
    label:
      t.method === "card"
        ? "Authorized"
        : incoming
          ? t.method === "wire"
            ? "Wire received"
            : "Deposit initiated"
          : t.method === "transfer"
            ? "Transfer created"
            : `${t.method === "wire" ? "Wire" : "ACH"} initiated`,
    at: t.date,
    state: "done",
  };

  if (t.status === "failed") {
    return [
      first,
      { label: t.failureReason ?? "Failed", at: addMinutes(t.date, 90), state: "failed" },
    ];
  }

  if (t.method === "transfer") {
    return [first, { label: "Completed", at: t.postedAt ?? t.date, state: "done" }];
  }

  const middle: TimelineEvent = {
    label:
      t.method === "card"
        ? "Clearing with merchant"
        : t.method === "wire"
          ? "Sent via Fedwire"
          : "Processing with ACH network",
    at: addMinutes(t.date, t.method === "wire" ? 1 : 30),
    state: t.status === "pending" ? "current" : "done",
  };
  const last: TimelineEvent =
    t.status === "pending"
      ? { label: "Expected to settle", at: t.settlesAt ?? t.date, state: "current" }
      : { label: "Posted", at: t.postedAt ?? t.date, state: "done" };

  return [first, middle, last];
}

export function toTransaction(t: TransactionRecord, db: Database): Transaction {
  const card = t.cardId ? db.cards.find((c) => c.id === t.cardId) : undefined;
  return {
    id: t.id,
    accountId: t.accountId,
    date: t.date,
    counterparty: t.counterparty,
    description: t.description,
    category: t.category,
    amountCents: t.amountCents,
    status: t.status,
    method: t.method,
    cardId: t.cardId,
    cardLast4: card ? card.pan.slice(-4) : null,
    recipientId: t.recipientId,
    note: t.note,
    attachments: t.attachments,
    timeline: buildTimeline(t),
  };
}

export function toCard(
  card: CardRecord,
  transactions: readonly TransactionRecord[],
  today: string,
): Card {
  const month = today.slice(0, 7);
  const spent = transactions.filter(
    (t) =>
      t.cardId === card.id &&
      t.status !== "failed" &&
      t.amountCents < 0 &&
      t.date.startsWith(month),
  );
  return {
    id: card.id,
    nickname: card.nickname,
    holder: card.holder,
    kind: card.kind,
    status: card.status,
    last4: card.pan.slice(-4),
    expiry: card.expiry,
    network: "Visa",
    accountId: card.accountId,
    theme: card.theme,
    monthlyLimitCents: card.monthlyLimitCents,
    spentThisMonthCents: -sumCents(spent.map((t) => t.amountCents)),
  };
}

export function toRecipient(
  r: RecipientRecord,
  transactions: readonly TransactionRecord[],
): Recipient {
  const last = transactions.find((t) => t.recipientId === r.id && t.status !== "failed");
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    bankName: r.bankName,
    routingNumber: r.routingNumber,
    accountLast4: r.accountNumber.slice(-4),
    defaultRail: r.defaultRail,
    createdAt: r.createdAt,
    lastPaidAt: last?.date ?? null,
  };
}
