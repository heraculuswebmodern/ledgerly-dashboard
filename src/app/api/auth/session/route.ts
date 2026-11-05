import { handler } from "@/server/http/handler";
import { sessionUser } from "@/server/services/auth";

export const GET = handler(({ db }) => ({
  user: sessionUser({
    ...db.user,
    name: db.settings.profile.name,
    email: db.settings.profile.email,
  }),
}));
