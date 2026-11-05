import { z } from "zod";

import { centsSchema, idSchema, isoDateTimeSchema } from "./common";

export const ACCOUNT_KINDS = ["checking", "savings", "treasury"] as const;
export const accountKindSchema = z.enum(ACCOUNT_KINDS);
export type AccountKind = z.infer<typeof accountKindSchema>;

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  checking: "Checking",
  savings: "Savings",
  treasury: "Treasury",
};

export const accountSchema = z.object({
  id: idSchema,
  kind: accountKindSchema,
  name: z.string(),
  last4: z.string().length(4),
  routingNumber: z.string().length(9),
  /** Posted balance. */
  balanceCents: centsSchema,
  /** Posted balance minus pending outflows. */
  availableCents: centsSchema,
  pendingCents: centsSchema,
  /** Annual yield in basis points (0 for checking). */
  apyBps: z.number().int().nonnegative(),
  openedAt: isoDateTimeSchema,
  /** Balance at the start of the current calendar month, for month-over-month change. */
  monthStartBalanceCents: centsSchema,
});
export type Account = z.infer<typeof accountSchema>;
