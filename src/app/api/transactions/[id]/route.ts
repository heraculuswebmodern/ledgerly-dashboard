import { updateTransactionSchema } from "@/lib/contracts";
import { handler, idParam } from "@/server/http/handler";
import { getTransaction, updateTransaction } from "@/server/services/transactions";

export const GET = handler((ctx) => getTransaction(ctx, idParam(ctx)));

export const PATCH = handler(async (ctx) =>
  updateTransaction(ctx, idParam(ctx), await ctx.body(updateTransactionSchema)),
);
