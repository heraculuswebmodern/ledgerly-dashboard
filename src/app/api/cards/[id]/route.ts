import { updateCardSchema } from "@/lib/contracts";
import { handler, idParam } from "@/server/http/handler";
import { updateCard } from "@/server/services/cards";

export const PATCH = handler(async (ctx) =>
  updateCard(ctx, idParam(ctx), await ctx.body(updateCardSchema)),
);
