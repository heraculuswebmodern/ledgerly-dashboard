import { handler } from "@/server/http/handler";
import { listCards } from "@/server/services/cards";

export const GET = handler((ctx) => listCards(ctx));
