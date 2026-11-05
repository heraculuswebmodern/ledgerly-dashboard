import { recipientUpdateSchema } from "@/lib/contracts";
import { handler, idParam } from "@/server/http/handler";
import { deleteRecipient, updateRecipient } from "@/server/services/recipients";

export const PATCH = handler(async (ctx) =>
  updateRecipient(ctx, idParam(ctx), await ctx.body(recipientUpdateSchema)),
);

export const DELETE = handler((ctx) => {
  deleteRecipient(ctx, idParam(ctx));
});
