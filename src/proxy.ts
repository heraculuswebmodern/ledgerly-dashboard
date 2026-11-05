import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/server/auth/token";

const PUBLIC_PATHS = ["/login"];

/**
 * Route protection. Unauthenticated page requests are redirected to /login, and signed-in
 * users skip the login page. API routes enforce the session themselves and answer with 401.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (pathname === "/") {
    return NextResponse.redirect(new URL(session ? "/overview" : "/login", request.url));
  }

  if (!session && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);
    if (request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals and static files.
    "/((?!api|_next/static|_next/image|brand|icon|apple-icon|opengraph-image|favicon|robots.txt).*)",
  ],
};
