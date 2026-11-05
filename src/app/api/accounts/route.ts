import { handler } from "@/server/http/handler";
import { listAccounts } from "@/server/services/accounts";

export const GET = handler((ctx) => listAccounts(ctx));
