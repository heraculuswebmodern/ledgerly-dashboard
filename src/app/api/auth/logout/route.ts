import { NextResponse } from "next/server";

import { SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/token";
import { dropDatabase } from "@/server/db/store";
import { handler } from "@/server/http/handler";

export const POST = handler(({ session }) => {
  dropDatabase(session.sid);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return response;
});
