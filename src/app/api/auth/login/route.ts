import { NextResponse } from "next/server";

import { loginSchema } from "@/lib/contracts";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/token";
import { publicHandler } from "@/server/http/handler";
import { assertLoginAllowed, authenticate } from "@/server/services/auth";

export const POST = publicHandler(async ({ req, body }) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  assertLoginAllowed(ip);
  const { email, password } = await body(loginSchema);
  const { token } = await authenticate(email, password);
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
});
