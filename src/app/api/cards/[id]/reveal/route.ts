import { handler, idParam } from "@/server/http/handler";
import { revealCard } from "@/server/services/cards";

/** POST (not GET) so card numbers never land in caches, prefetches or browser history. */
export const POST = handler((ctx) => revealCard(ctx, idParam(ctx)));
