import { z } from "zod";

import {
  checkTransfer,
  transferInputSchema,
  type ParsedTransferInput,
  type TransferContext,
} from "@/lib/contracts";
import { parseMoney } from "@/lib/money";

/** The wizard's form values: strings as typed, converted into a TransferInput on submit. */
export const transferFormSchema = z.object({
  kind: z.enum(["external", "internal"]),
  fromAccountId: z.string(),
  toAccountId: z.string(),
  recipientId: z.string(),
  rail: z.enum(["ach", "wire"]),
  amount: z.string(),
  when: z.enum(["now", "later"]),
  scheduledFor: z.string(),
  memo: z.string().max(140, "Keep the memo under 140 characters"),
});
export type TransferFormValues = z.infer<typeof transferFormSchema>;

/** Maps form field names to API field names for error display. */
const FIELD_MAP: Record<string, keyof TransferFormValues> = {
  amountCents: "amount",
  fromAccountId: "fromAccountId",
  toAccountId: "toAccountId",
  recipientId: "recipientId",
  scheduledFor: "scheduledFor",
  memo: "memo",
  rail: "rail",
};

export type TransferFormResult =
  | { ok: true; input: ParsedTransferInput }
  | { ok: false; errors: Partial<Record<keyof TransferFormValues, string>> };

/**
 * Converts and validates wizard values: string → cents, schema validation, then the shared
 * business rules (balance, limits, dates). Same rules the server applies.
 */
export function buildTransfer(
  values: TransferFormValues,
  ctx: TransferContext,
): TransferFormResult {
  const errors: Partial<Record<keyof TransferFormValues, string>> = {};
  const amountCents = parseMoney(values.amount);
  if (!values.amount.trim()) errors.amount = "Enter an amount";
  else if (amountCents === null) errors.amount = "Enter a valid amount, e.g. 1,250.00";
  else if (amountCents <= 0) errors.amount = "Amount must be greater than zero";
  if (!values.fromAccountId) errors.fromAccountId = "Choose an account to send from";
  if (values.kind === "internal" && !values.toAccountId)
    errors.toAccountId = "Choose an account to send to";
  if (values.kind === "external" && !values.recipientId) errors.recipientId = "Choose a recipient";
  if (values.kind === "external" && values.when === "later" && !values.scheduledFor) {
    errors.scheduledFor = "Pick a date";
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  const raw =
    values.kind === "internal"
      ? {
          kind: "internal" as const,
          fromAccountId: values.fromAccountId,
          toAccountId: values.toAccountId,
          amountCents: amountCents!,
          memo: values.memo,
        }
      : {
          kind: "external" as const,
          fromAccountId: values.fromAccountId,
          recipientId: values.recipientId,
          rail: values.rail,
          amountCents: amountCents!,
          memo: values.memo,
          scheduledFor: values.when === "later" ? values.scheduledFor : undefined,
        };

  const parsed = transferInputSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = FIELD_MAP[String(issue.path[0])] ?? "amount";
      errors[field] ??= issue.message;
    }
    return { ok: false, errors };
  }

  for (const issue of checkTransfer(parsed.data, ctx)) {
    const field = FIELD_MAP[issue.field] ?? "amount";
    errors[field] ??= issue.message;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, input: parsed.data };
}
