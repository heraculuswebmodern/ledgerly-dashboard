import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError, type ZodType } from "zod";

import type { ApiErrorBody } from "@/lib/contracts";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/server/auth/token";
import { getDatabase } from "@/server/db/store";
import type { Database } from "@/server/db/types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new ApiError(404, "not_found", `${what} not found`);

export type RequestContext = {
  req: NextRequest;
  now: Date;
  /** Today as YYYY-MM-DD (UTC). */
  today: string;
  session: SessionPayload;
  db: Database;
  params: Record<string, string>;
  /** Parses and validates the JSON body. */
  body: <S extends ZodType>(schema: S) => Promise<z.output<S>>;
  /** Parses and validates search params. */
  query: <S extends ZodType>(schema: S) => z.output<S>;
};

type PublicContext = Omit<RequestContext, "session" | "db">;

const MAX_BODY_BYTES = 32 * 1024;
const NO_STORE = { "Cache-Control": "no-store" };

function fieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

export function errorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, fields: error.fields } },
      { status: error.status, headers: NO_STORE },
    );
  }
  if (error instanceof ZodError) {
    const fields = fieldErrors(error);
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: Object.values(fields)[0] ?? "Invalid request",
          fields,
        },
      },
      { status: 400, headers: NO_STORE },
    );
  }
  console.error("[api] unhandled error", error);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Something went wrong. Please try again." } },
    { status: 500, headers: NO_STORE },
  );
}

/** Rejects cross-site state-changing requests (defense in depth on top of SameSite cookies). */
function assertSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "forbidden", "Invalid origin");
  }
  if (originHost !== host) throw new ApiError(403, "forbidden", "Cross-origin request blocked");
}

async function readJson(req: NextRequest): Promise<unknown> {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES)
    throw new ApiError(413, "payload_too_large", "Request body is too large");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES)
    throw new ApiError(413, "payload_too_large", "Request body is too large");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON");
  }
}

async function baseContext(
  req: NextRequest,
  routeCtx: { params: Promise<Record<string, string>> } | undefined,
): Promise<PublicContext> {
  const now = new Date();
  return {
    req,
    now,
    today: now.toISOString().slice(0, 10),
    params: (await routeCtx?.params) ?? {},
    body: async (schema) => schema.parse(await readJson(req)),
    query: (schema) => schema.parse(Object.fromEntries(req.nextUrl.searchParams)),
  };
}

function respond(result: unknown, status = 200): Response {
  if (result instanceof Response) return result;
  if (result === undefined) return new NextResponse(null, { status: 204, headers: NO_STORE });
  return NextResponse.json(result, { status, headers: NO_STORE });
}

type RouteCtx = { params: Promise<Record<string, string>> };

/** Wraps an authenticated route handler: origin check, session, scoped DB, validation, errors. */
export function handler(
  fn: (ctx: RequestContext) => Promise<unknown> | unknown,
  opts: { status?: number } = {},
) {
  return async (req: NextRequest, routeCtx: RouteCtx): Promise<Response> => {
    try {
      assertSameOrigin(req);
      const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
      if (!session)
        throw new ApiError(401, "unauthorized", "Your session has expired. Please sign in again.");
      const base = await baseContext(req, routeCtx);
      const db = getDatabase(session.sid, base.now);
      return respond(await fn({ ...base, session, db }), opts.status);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Wraps a public route handler (login). */
export function publicHandler(fn: (ctx: PublicContext) => Promise<unknown> | unknown) {
  return async (req: NextRequest, routeCtx: RouteCtx): Promise<Response> => {
    try {
      assertSameOrigin(req);
      return respond(await fn(await baseContext(req, routeCtx)));
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export function idParam(ctx: Pick<RequestContext, "params">): string {
  return z
    .string()
    .regex(/^[a-z]{2,6}_[A-Za-z0-9]{6,32}$/)
    .parse(ctx.params.id, { error: () => "Invalid id" });
}
