import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "media_studio_auth";
const PUBLIC_PATHS = new Set<string>(["/login", "/api/login", "/robots.txt"]);

function securityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  res.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet"
  );
  return res;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and Next internals — pass through but add headers.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return securityHeaders(NextResponse.next());
  }

  const expected = process.env.APP_PASSWORD;
  const isAuthenticated =
    expected !== undefined &&
    request.cookies.get(AUTH_COOKIE)?.value === expected;

  // Fail closed if no APP_PASSWORD is configured — never serve open.
  if (!expected) {
    if (pathname.startsWith("/api/")) {
      return securityHeaders(
        NextResponse.json(
          { error: "Server nicht konfiguriert." },
          { status: 500 }
        )
      );
    }
    if (pathname !== "/login") {
      return securityHeaders(
        NextResponse.redirect(new URL("/login", request.url))
      );
    }
    return securityHeaders(NextResponse.next());
  }

  // Already authenticated and hitting /login → bounce to home.
  if (pathname === "/login" && isAuthenticated) {
    return securityHeaders(NextResponse.redirect(new URL("/", request.url)));
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return securityHeaders(NextResponse.next());
  }

  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return securityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }
    return securityHeaders(
      NextResponse.redirect(new URL("/login", request.url))
    );
  }

  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|woff2?)).*)",
  ],
};
