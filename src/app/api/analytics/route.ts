import { z } from "zod";

import { analyticsPeriodSchema } from "@/lib/contracts";
import { handler } from "@/server/http/handler";
import { getAnalytics } from "@/server/services/insights";

const querySchema = z.object({ period: analyticsPeriodSchema.default("6m") });

export const GET = handler((ctx) => getAnalytics(ctx, ctx.query(querySchema).period));
