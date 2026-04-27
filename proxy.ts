import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ID_TOKEN_COOKIE = "ms_id_token";
const PUBLIC_PATHS = new Set<string>([
  "/api/auth/login",
  "/api/auth/callback",
  "/api/auth/logout",
  "/api/auth/error",
  "/robots.txt",
]);

function securityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return res;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and Next internals — pass through but add headers.
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico")) {
    return securityHeaders(NextResponse.next());
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return securityHeaders(NextResponse.next());
  }

  const hasIdToken = Boolean(request.cookies.get(ID_TOKEN_COOKIE)?.value);
  if (hasIdToken) {
    return securityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/api/")) {
    return securityHeaders(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
  }

  return securityHeaders(
    NextResponse.redirect(new URL("/api/auth/login", request.url)),
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|woff2?)).*)",
  ],
};
