import "server-only";

import {
  CATEGORY_LABELS,
  METHOD_LABELS,
  STATUS_LABELS,
  type Transaction,
  type TransactionPage,
  type TransactionQuery,
  type UpdateTransactionInput,
} from "@/lib/contracts";
import { toCsv } from "@/lib/csv";
import { queryTransactions } from "@/lib/domain/transactions-query";
import { centsToDecimalString } from "@/lib/money";
import { ApiError, notFound } from "@/server/http/handler";
import { accountsRepo, transactionsRepo } from "@/server/repositories";

import type { ServiceContext } from "./context";
import { toTransaction } from "./mappers";

export function listTransactions(ctx: ServiceContext, query: TransactionQuery): TransactionPage {
  const result = queryTransactions(transactionsRepo.list(ctx.db, ctx.now), query);
  return {
    items: result.items.map((t) => toTransaction(t, ctx.db)),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    pageCount: result.pageCount,
    summary: result.summary,
  };
}

export function getTransaction(ctx: ServiceContext, id: string): Transaction {
  const record = transactionsRepo.get(ctx.db, id, ctx.now);
  if (!record) throw notFound("Transaction");
  return toTransaction(record, ctx.db);
}

export function updateTransaction(
  ctx: ServiceContext,
  id: string,
  input: { category?: UpdateTransactionInput["category"]; note?: string },
): Transaction {
  const record = transactionsRepo.get(ctx.db, id, ctx.now);
  if (!record) throw notFound("Transaction");
  if (input.category && record.category === "transfer" && input.category !== "transfer") {
    throw new ApiError(422, "not_allowed", "Internal transfers can't be recategorized");
  }
  transactionsRepo.update(ctx.db, id, input);
  return toTransaction(record, ctx.db);
}

export const EXPORT_LIMIT = 10_000;

export function exportTransactionsCsv(ctx: ServiceContext, query: TransactionQuery): string {
  const { sorted } = queryTransactions(transactionsRepo.list(ctx.db, ctx.now), query);
  const accountName = new Map(
    accountsRepo.list(ctx.db).map((a) => [a.id, `${a.name} ••${a.last4}`]),
  );
  return toCsv(
    [
      "Date",
      "Counterparty",
      "Description",
      "Category",
      "Method",
      "Status",
      "Account",
      "Amount (USD)",
      "Note",
    ],
    sorted
      .slice(0, EXPORT_LIMIT)
      .map((t) => [
        t.date.slice(0, 10),
        t.counterparty,
        t.description,
        CATEGORY_LABELS[t.category],
        METHOD_LABELS[t.method],
        STATUS_LABELS[t.status],
        accountName.get(t.accountId) ?? "",
        centsToDecimalString(t.amountCents),
        t.note,
      ]),
  );
}
