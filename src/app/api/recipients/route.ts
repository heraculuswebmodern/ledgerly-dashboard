import { recipientInputSchema } from "@/lib/contracts";
import { handler } from "@/server/http/handler";
import { createRecipient, listRecipients } from "@/server/services/recipients";

export const GET = handler((ctx) => listRecipients(ctx));

export const POST = handler(
  async (ctx) => createRecipient(ctx, await ctx.body(recipientInputSchema)),
  { status: 201 },
);
