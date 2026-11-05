import { z } from "zod";

import { centsSchema, idSchema, isoDateSchema, isoDateTimeSchema, safeText } from "./common";

export const CATEGORIES = [
  "revenue",
  "payroll",
  "software",
  "infrastructure",
  "rent",
  "marketing",
  "travel",
  "meals",
  "office",
  "professional",
  "insurance",
  "taxes",
  "interest",
  "transfer",
] as const;
export const categorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof categorySchema>;

export const CATEGORY_LABELS: Record<Category, string> = {
  revenue: "Revenue",
  payroll: "Payroll",
  software: "Software",
  infrastructure: "Cloud & infrastructure",
  rent: "Rent & facilities",
  marketing: "Marketing",
  travel: "Travel",
  meals: "Meals",
  office: "Office & equipment",
  professional: "Professional services",
  insurance: "Insurance",
  taxes: "Taxes",
  interest: "Interest",
  transfer: "Internal transfer",
};

export const TRANSACTION_STATUSES = ["posted", "pending", "failed"] as const;
export const transactionStatusSchema = z.enum(TRANSACTION_STATUSES);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  posted: "Posted",
  pending: "Pending",
  failed: "Failed",
};

export const PAYMENT_METHODS = ["card", "ach", "wire", "transfer"] as const;
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "Card",
  ach: "ACH",
  wire: "Wire",
  transfer: "Transfer",
};

export const timelineEventSchema = z.object({
  label: z.string(),
  at: isoDateTimeSchema,
  state: z.enum(["done", "current", "failed"]),
});
export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const transactionSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  /** When the transaction was initiated. */
  date: isoDateTimeSchema,
  counterparty: z.string(),
  description: z.string(),
  category: categorySchema,
  /** Signed: negative is money out, positive is money in. */
  amountCents: centsSchema,
  status: transactionStatusSchema,
  method: paymentMethodSchema,
  cardId: idSchema.nullable(),
  cardLast4: z.string().nullable(),
  recipientId: idSchema.nullable(),
  note: z.string(),
  attachments: z.array(z.object({ name: z.string(), sizeKb: z.number().int() })),
  timeline: z.array(timelineEventSchema),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const SORT_FIELDS = ["date", "amount", "counterparty"] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortDirection = "asc" | "desc";

export const PAGE_SIZES = [25, 50, 100] as const;

/** Comma-separated query values ("posted,pending") become validated arrays. */
function csvEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z
    .string()
    .optional()
    .transform((raw) => (raw ? raw.split(",").filter(Boolean) : []))
    .pipe(z.array(z.enum(values)));
}

const csvIds = z
  .string()
  .optional()
  .transform((raw) => (raw ? raw.split(",").filter(Boolean) : []))
  .pipe(z.array(idSchema));

const optionalCents = z
  .string()
  .optional()
  .transform((raw) => (raw === undefined || raw === "" ? undefined : Number(raw)))
  .pipe(centsSchema.nonnegative().optional());

/**
 * Transaction query, parsed from URL search params on the server.
 * The same shape (after parsing) drives filtering, CSV export and the UI state.
 */
export const transactionQuerySchema = z
  .object({
    q: safeText(80).optional().default(""),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    category: csvEnum(CATEGORIES),
    status: csvEnum(TRANSACTION_STATUSES),
    method: csvEnum(PAYMENT_METHODS),
    account: csvIds,
    min: optionalCents,
    max: optionalCents,
    direction: z.enum(["all", "in", "out"]).optional().default("all"),
    sort: z.enum(SORT_FIELDS).optional().default("date"),
    dir: z.enum(["asc", "desc"]).optional().default("desc"),
    page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
    pageSize: z.coerce
      .number()
      .int()
      .refine((n) => (PAGE_SIZES as readonly number[]).includes(n), "Invalid page size")
      .optional()
      .default(25),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "Start date must be before end date",
    path: ["from"],
  })
  .refine((q) => q.min === undefined || q.max === undefined || q.min <= q.max, {
    message: "Minimum must be less than maximum",
    path: ["min"],
  });

export type TransactionQuery = z.output<typeof transactionQuerySchema>;
/** What the client sends: every query value as a URL string. */
export type TransactionQueryInput = Partial<Record<keyof TransactionQuery, string>>;

export type TransactionPage = {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  summary: { inCents: number; outCents: number };
};

export const updateTransactionSchema = z
  .object({
    category: categorySchema.optional(),
    note: safeText(500).optional(),
  })
  .refine((v) => v.category !== undefined || v.note !== undefined, "Nothing to update");
export type UpdateTransactionInput = z.input<typeof updateTransactionSchema>;
