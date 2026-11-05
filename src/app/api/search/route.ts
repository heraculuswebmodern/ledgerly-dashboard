import { z } from "zod";

import { safeText } from "@/lib/contracts";
import { handler } from "@/server/http/handler";
import { search } from "@/server/services/insights";

const querySchema = z.object({ q: safeText(80).default("") });

export const GET = handler((ctx) => search(ctx, ctx.query(querySchema).q));
