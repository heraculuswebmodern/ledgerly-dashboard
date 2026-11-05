import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import type { SessionUser } from "@/lib/contracts";
import { DEMO_CREDENTIALS } from "@/lib/demo";
import { SESSION_TTL_SECONDS, signSession } from "@/server/auth/token";
import { ApiError } from "@/server/http/handler";

const WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

/** Small in-memory rate limiter for login attempts, keyed by client IP. */
export function assertLoginAllowed(key: string, now = Date.now()) {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    throw new ApiError(
      429,
      "rate_limited",
      "Too many sign-in attempts. Try again in a few minutes.",
    );
  }
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function safeEqual(a: string, b: string) {
  return timingSafeEqual(digest(a), digest(b));
}

export function demoUserCredentials() {
  return {
    email: (process.env.DEMO_EMAIL ?? DEMO_CREDENTIALS.email).toLowerCase(),
    password: process.env.DEMO_PASSWORD ?? DEMO_CREDENTIALS.password,
  };
}

export async function authenticate(email: string, password: string) {
  const expected = demoUserCredentials();
  const ok = safeEqual(email, expected.email) && safeEqual(password, expected.password);
  if (!ok)
    throw new ApiError(
      401,
      "invalid_credentials",
      "That email and password don't match our records.",
    );

  const sid = crypto.randomUUID();
  const token = await signSession({
    sid,
    uid: "usr_demo",
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
  return { token, sid };
}

export function sessionUser(user: SessionUser): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company,
  };
}
