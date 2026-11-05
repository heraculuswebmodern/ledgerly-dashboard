import { settingsPatchSchema } from "@/lib/contracts";
import { handler } from "@/server/http/handler";
import { getSettings, updateSettings } from "@/server/services/settings";

export const GET = handler((ctx) => getSettings(ctx));

export const PATCH = handler(async (ctx) =>
  updateSettings(ctx, await ctx.body(settingsPatchSchema)),
);
