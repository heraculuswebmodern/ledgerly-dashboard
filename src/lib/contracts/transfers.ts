import { z } from "zod";

import { formatMoney, type Cents } from "@/lib/money";

import { idSchema, isoDateSchema, positiveCentsSchema, safeText } from "./common";
import { transferRailSchema, type TransferRail } from "./recipients";

/** Per-transfer limits by rail, in cents. */
export const RAIL_LIMITS: Record<TransferRail | "internal", Cents> = {
  ach: 25_000_000, // $250,000
  wire: 500_000_000, // $5,000,000
  internal: 999_999_999_999,
};

export const RAIL_ETA: Record<TransferRail | "internal", string> = {
  ach: "1–2 business days",
  wire: "Same business day",
  internal: "Instant",
};

const memo = safeText(140).optional().default("");

export const internalTransferSchema = z.object({
  kind: z.literal("internal"),
  fromAccountId: idSchema,
  toAccountId: idSchema,
  amountCents: positiveCentsSchema,
  memo,
});

export const externalPaymentSchema = z.object({
  kind: z.literal("external"),
  fromAccountId: idSchema,
  recipientId: idSchema,
  rail: transferRailSchema,
  amountCents: positiveCentsSchema,
  memo,
  /** ISO date; omitted or today means "send now", a future date schedules the payment. */
  scheduledFor: isoDateSchema.optional(),
});

export const transferInputSchema = z.discriminatedUnion("kind", [
  internalTransferSchema,
  externalPaymentSchema,
]);
export type TransferInput = z.input<typeof transferInputSchema>;
export type ParsedTransferInput = z.output<typeof transferInputSchema>;

export type TransferIssue = { field: string; message: string };

export type TransferContext = {
  accounts: readonly { id: string; name: string; availableCents: Cents }[];
  recipients: readonly { id: string }[];
  /** Today's date (YYYY-MM-DD) in the bank's timezone. */
  today: string;
};

export const MAX_SCHEDULE_DAYS = 90;

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Business-rule validation for a transfer, shared by the client (instant feedback)
 * and the server (the source of truth). Schema-level checks happen before this.
 */
export function checkTransfer(input: ParsedTransferInput, ctx: TransferContext): TransferIssue[] {
  const issues: TransferIssue[] = [];
  const from = ctx.accounts.find((a) => a.id === input.fromAccountId);
  if (!from) {
    issues.push({ field: "fromAccountId", message: "Choose an account to send from" });
  }

  if (input.kind === "internal") {
    if (!ctx.accounts.some((a) => a.id === input.toAccountId)) {
      issues.push({ field: "toAccountId", message: "Choose an account to send to" });
    } else if (input.toAccountId === input.fromAccountId) {
      issues.push({ field: "toAccountId", message: "Choose a different account" });
    }
  } else {
    if (!ctx.recipients.some((r) => r.id === input.recipientId)) {
      issues.push({ field: "recipientId", message: "Choose a recipient" });
    }
    if (input.scheduledFor) {
      if (input.scheduledFor < ctx.today) {
        issues.push({ field: "scheduledFor", message: "Pick today or a future date" });
      } else if (input.scheduledFor > addDays(ctx.today, MAX_SCHEDULE_DAYS)) {
        issues.push({
          field: "scheduledFor",
          message: `Payments can be scheduled up to ${MAX_SCHEDULE_DAYS} days ahead`,
        });
      }
    }
  }

  const rail = input.kind === "internal" ? "internal" : input.rail;
  if (input.amountCents > RAIL_LIMITS[rail]) {
    issues.push({
      field: "amountCents",
      message: `${rail === "ach" ? "ACH" : "Wire"} transfers are limited to ${formatMoney(RAIL_LIMITS[rail], { hideCents: true })}`,
    });
  } else if (from && input.amountCents > from.availableCents) {
    issues.push({
      field: "amountCents",
      message: `Exceeds the available balance of ${formatMoney(from.availableCents)} in ${from.name}`,
    });
  }

  return issues;
}

export function isScheduled(input: ParsedTransferInput, today: string): boolean {
  return input.kind === "external" && !!input.scheduledFor && input.scheduledFor > today;
}

export type TransferResult = {
  kind: "sent" | "scheduled";
  transactionIds: string[];
  scheduledPaymentId: string | null;
  amountCents: Cents;
  eta: string;
};
