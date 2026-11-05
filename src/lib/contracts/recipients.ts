import { z } from "zod";

import { idSchema, isoDateTimeSchema, safeText } from "./common";

/** ABA routing numbers carry a weighted checksum (3-7-1); reject typos before they hit the network. */
export function isValidRoutingNumber(value: string): boolean {
  if (!/^\d{9}$/.test(value)) return false;
  const d = value.split("").map(Number);
  const sum =
    3 * (d[0]! + d[3]! + d[6]!) + 7 * (d[1]! + d[4]! + d[7]!) + 1 * (d[2]! + d[5]! + d[8]!);
  return sum % 10 === 0;
}

export const transferRailSchema = z.enum(["ach", "wire"]);
export type TransferRail = z.infer<typeof transferRailSchema>;

export const recipientSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string(),
  bankName: z.string(),
  routingNumber: z.string(),
  accountLast4: z.string().length(4),
  defaultRail: transferRailSchema,
  createdAt: isoDateTimeSchema,
  lastPaidAt: isoDateTimeSchema.nullable(),
});
export type Recipient = z.infer<typeof recipientSchema>;

export const recipientInputSchema = z.object({
  name: safeText(80).pipe(z.string().min(2, "Enter the recipient's legal name")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.union([z.literal(""), z.email("Enter a valid email address").max(120)])),
  bankName: safeText(80).pipe(z.string().min(2, "Enter the bank name")),
  routingNumber: z
    .string()
    .trim()
    .refine(isValidRoutingNumber, "Enter a valid 9-digit ABA routing number"),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{4,17}$/, "Account numbers are 4 to 17 digits"),
  defaultRail: transferRailSchema,
});
export type RecipientInput = z.input<typeof recipientInputSchema>;

/** Editing keeps the stored account number unless a new one is provided. */
export const recipientUpdateSchema = recipientInputSchema.extend({
  accountNumber: z
    .string()
    .trim()
    .regex(/^(\d{4,17})?$/, "Account numbers are 4 to 17 digits")
    .optional(),
});
export type RecipientUpdateInput = z.input<typeof recipientUpdateSchema>;

export const recipientIdParam = z.object({ id: idSchema });
