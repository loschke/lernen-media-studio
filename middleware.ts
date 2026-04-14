import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  // Match everything except static assets and Next internals. The matcher
  // runs first; inside middleware we still allow specific public routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|woff2?)).*)"],
};

const AUTH_COOKIE = "media_studio_auth";
const PUBLIC_PATHS = new Set<string>(["/login", "/api/login", "/robots.txt"]);

function securityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Discourage indexing at the response level in addition to <meta> tags.
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return securityHeaders(NextResponse.next());
  }

  const expected = process.env.APP_PASSWORD;
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;

  // No APP_PASSWORD configured → fail closed to prevent accidental open access.
  if (!expected) {
    if (pathname.startsWith("/api/")) {
      return securityHeaders(
        new NextResponse(
          JSON.stringify({ error: "Server nicht konfiguriert." }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return securityHeaders(NextResponse.redirect(url));
  }

  if (cookie !== expected) {
    if (pathname.startsWith("/api/")) {
      return securityHeaders(
        new NextResponse(
          JSON.stringify({ error: "Nicht autorisiert." }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return securityHeaders(NextResponse.redirect(url));
  }

  return securityHeaders(NextResponse.next());
}
