import { z } from "zod";

import { handler } from "@/server/http/handler";
import { getCategorySpend } from "@/server/services/insights";

const querySchema = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });

export const GET = handler((ctx) => getCategorySpend(ctx, ctx.query(querySchema).days));
