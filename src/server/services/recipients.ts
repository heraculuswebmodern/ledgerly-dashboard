import "server-only";

import type { Recipient, recipientInputSchema, recipientUpdateSchema } from "@/lib/contracts";
import { ApiError, notFound } from "@/server/http/handler";
import { newId, recipientsRepo, scheduledRepo, transactionsRepo } from "@/server/repositories";

import type { ServiceContext } from "./context";
import { toRecipient } from "./mappers";

import type { z } from "zod";

type CreateInput = z.output<typeof recipientInputSchema>;
type UpdateInput = z.output<typeof recipientUpdateSchema>;

export function listRecipients(ctx: ServiceContext): Recipient[] {
  const transactions = transactionsRepo.list(ctx.db, ctx.now);
  return [...recipientsRepo.list(ctx.db)]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => toRecipient(r, transactions));
}

function assertUniqueName(ctx: ServiceContext, name: string, exceptId?: string) {
  const clash = recipientsRepo
    .list(ctx.db)
    .some((r) => r.id !== exceptId && r.name.toLowerCase() === name.toLowerCase());
  if (clash) {
    throw new ApiError(409, "duplicate", "A recipient with this name already exists", {
      name: "A recipient with this name already exists",
    });
  }
}

export function createRecipient(ctx: ServiceContext, input: CreateInput): Recipient {
  assertUniqueName(ctx, input.name);
  const record = recipientsRepo.insert(ctx.db, {
    id: newId("rcp"),
    name: input.name,
    email: input.email,
    bankName: input.bankName,
    routingNumber: input.routingNumber,
    accountNumber: input.accountNumber,
    defaultRail: input.defaultRail,
    createdAt: ctx.now.toISOString(),
  });
  return toRecipient(record, transactionsRepo.list(ctx.db, ctx.now));
}

export function updateRecipient(ctx: ServiceContext, id: string, input: UpdateInput): Recipient {
  if (!recipientsRepo.get(ctx.db, id)) throw notFound("Recipient");
  assertUniqueName(ctx, input.name, id);
  const { accountNumber, ...rest } = input;
  const record = recipientsRepo.update(
    ctx.db,
    id,
    accountNumber ? { ...rest, accountNumber } : rest,
  )!;
  return toRecipient(record, transactionsRepo.list(ctx.db, ctx.now));
}

export function deleteRecipient(ctx: ServiceContext, id: string): void {
  if (!recipientsRepo.remove(ctx.db, id)) throw notFound("Recipient");
  // Scheduled payments to a deleted recipient are cancelled with it.
  scheduledRepo.removeForRecipient(ctx.db, id);
}
