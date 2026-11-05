import { z } from "zod";

import { centsSchema, idSchema, positiveCentsSchema, safeText } from "./common";

export const cardKindSchema = z.enum(["virtual", "physical"]);
export type CardKind = z.infer<typeof cardKindSchema>;

export const cardStatusSchema = z.enum(["active", "frozen"]);
export type CardStatus = z.infer<typeof cardStatusSchema>;

export const CARD_THEMES = ["ink", "emerald", "slate", "teal"] as const;
export type CardTheme = (typeof CARD_THEMES)[number];

export const cardSchema = z.object({
  id: idSchema,
  nickname: z.string(),
  holder: z.string(),
  kind: cardKindSchema,
  status: cardStatusSchema,
  last4: z.string().length(4),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/),
  network: z.literal("Visa"),
  accountId: idSchema,
  theme: z.enum(CARD_THEMES),
  monthlyLimitCents: centsSchema,
  /** Posted + pending card spend in the current calendar month. */
  spentThisMonthCents: centsSchema,
});
export type Card = z.infer<typeof cardSchema>;

/** Full card credentials, only returned by the explicit reveal endpoint. */
export type CardSecrets = { cardId: string; pan: string; cvc: string; expiry: string };

export const MAX_CARD_LIMIT_CENTS = 50_000_000; // $500,000 / month

export const updateCardSchema = z
  .object({
    status: cardStatusSchema.optional(),
    monthlyLimitCents: positiveCentsSchema
      .max(MAX_CARD_LIMIT_CENTS, "Limit can be at most $500,000 per month")
      .optional(),
    nickname: safeText(40).pipe(z.string().min(1)).optional(),
  })
  .refine(
    (v) => v.status !== undefined || v.monthlyLimitCents !== undefined || v.nickname !== undefined,
    "Nothing to update",
  );
export type UpdateCardInput = z.input<typeof updateCardSchema>;

export const cardIdParam = z.object({ id: idSchema });
