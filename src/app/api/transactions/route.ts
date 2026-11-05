import { transactionQuerySchema } from "@/lib/contracts";
import { handler } from "@/server/http/handler";
import { listTransactions } from "@/server/services/transactions";

export const GET = handler((ctx) => listTransactions(ctx, ctx.query(transactionQuerySchema)));
