import { handler } from "@/server/http/handler";
import { getOverview } from "@/server/services/insights";

export const GET = handler((ctx) => getOverview(ctx));
