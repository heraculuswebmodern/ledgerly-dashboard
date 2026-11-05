import { z } from "zod";

import { MAX_CENTS } from "@/lib/money";

/** Resource ids look like `txn_4fJk29aLq0`. */
export const idSchema = z.string().regex(/^[a-z]{2,6}_[A-Za-z0-9]{6,32}$/, "Invalid id");

export const centsSchema = z.number().int().safe();

export const positiveCentsSchema = z
  .number({ error: "Enter an amount" })
  .int("Amount must be in whole cents")
  .positive("Amount must be greater than zero")
  .max(MAX_CENTS, "Amount is too large");

export const isoDateTimeSchema = z.iso.datetime({ offset: true });
export const isoDateSchema = z.iso.date();

/** Free text from users: trimmed, control characters and angle brackets stripped, length-capped. */
export function safeText(max: number) {
  return z
    .string()
    .transform((value) => sanitizeText(value))
    .pipe(z.string().max(max, `Must be ${max} characters or fewer`));
}

export function sanitizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type ApiErrorBody = {
  error: { code: string; message: string; fields?: Record<string, string> };
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
