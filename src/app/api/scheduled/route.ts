import { handler } from "@/server/http/handler";
import { listScheduled } from "@/server/services/transfers";

export const GET = handler((ctx) => listScheduled(ctx));
