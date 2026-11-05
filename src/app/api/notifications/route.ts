import { handler } from "@/server/http/handler";
import { notificationsRepo } from "@/server/repositories";

export const GET = handler(({ db }) => notificationsRepo.list(db));
