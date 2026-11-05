import { transferInputSchema } from "@/lib/contracts";
import { handler } from "@/server/http/handler";
import { createTransfer } from "@/server/services/transfers";

export const POST = handler(
  async (ctx) => createTransfer(ctx, await ctx.body(transferInputSchema)),
  {
    status: 201,
  },
);
