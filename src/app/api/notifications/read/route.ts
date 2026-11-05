import { handler } from "@/server/http/handler";
import { notificationsRepo } from "@/server/repositories";

export const POST = handler(({ db }) => {
  notificationsRepo.markAllRead(db);
});
