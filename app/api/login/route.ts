import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE,
  SESSION_COOKIE,
  COOKIE_MAX_AGE_SECONDS,
} from "@/lib/session";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }

  const cookieStore = await cookies();

  // Reuse existing session UUID if present (handles login re-entry without
  // losing the user's gallery). Generate a new one only if none exists.
  const existingSession = cookieStore.get(SESSION_COOKIE)?.value;
  const sessionId = existingSession || crypto.randomUUID();

  const response = NextResponse.json({ success: true, sessionId });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  };

  response.cookies.set(AUTH_COOKIE, password, cookieOptions);
  response.cookies.set(SESSION_COOKIE, sessionId, cookieOptions);

  return response;
}
