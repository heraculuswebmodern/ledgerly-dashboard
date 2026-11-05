import { z } from "zod";

import { cashFlowRangeSchema } from "@/lib/contracts";
import { handler } from "@/server/http/handler";
import { getCashFlow } from "@/server/services/insights";

const querySchema = z.object({ range: cashFlowRangeSchema.default("30d") });

export const GET = handler((ctx) => getCashFlow(ctx, ctx.query(querySchema).range));
