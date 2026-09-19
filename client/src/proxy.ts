import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route protection only.
 *
 * This reads a non-sensitive presence cookie so we can redirect before render.
 * It is *not* an authorization boundary — the API verifies every request
 * against Cognito's JWKS, and pages re-check the session via the DAL. Someone
 * who forges this cookie still gets nothing: their requests are rejected.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/u"];
const GUEST_ONLY = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.get("openhr_session")?.value === "1";

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && GUEST_ONLY.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
