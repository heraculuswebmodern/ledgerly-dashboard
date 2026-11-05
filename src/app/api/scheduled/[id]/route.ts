import { handler, idParam } from "@/server/http/handler";
import { cancelScheduled } from "@/server/services/transfers";

export const DELETE = handler((ctx) => {
  cancelScheduled(ctx, idParam(ctx));
});
