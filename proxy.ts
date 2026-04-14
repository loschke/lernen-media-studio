import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Wenn der Pfad /_next oder /favicon.ico ist, ignorieren wir ihn
  if (request.nextUrl.pathname.startsWith("/_next") || request.nextUrl.pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }

  // Passwort-Check via Cookie
  const isAuthenticated = request.cookies.get("media_studio_auth")?.value === process.env.APP_PASSWORD;

  // Login-Route
  if (request.nextUrl.pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Falls nicht authentifiziert und nicht auf Login, redirect oder 401
  if (!isAuthenticated && process.env.APP_PASSWORD) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/login|_next/static|_next/image|favicon.ico).*)"],
};
