import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, verifyIdToken } from "@/lib/oidc";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  ID_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ID_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "@/lib/session";

function defaultCredits(): number {
  const raw = process.env.DEFAULT_CREDITS;
  const parsed = raw ? Number.parseInt(raw, 10) : 250;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 250;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(error)}`, url));
  }
  if (!code || !state) {
    return NextResponse.json({ error: "missing_code_or_state" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = cookieStore.get(OAUTH_VERIFIER_COOKIE)?.value;

  if (!storedState || !verifier || storedState !== state) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  let tokens;
  try {
    tokens = await exchangeCode(code, verifier);
  } catch (err) {
    console.error("Token exchange failed", err);
    return NextResponse.json({ error: "token_exchange_failed" }, { status: 502 });
  }

  const idToken = tokens.idToken();
  let claims;
  try {
    claims = await verifyIdToken(idToken);
  } catch (err) {
    console.error("id_token verification failed", err);
    return NextResponse.json({ error: "invalid_id_token" }, { status: 401 });
  }

  if (!claims.email) {
    return NextResponse.json({ error: "missing_email_claim" }, { status: 400 });
  }

  await db
    .insert(users)
    .values({
      sub: claims.sub,
      email: claims.email,
      name: claims.name ?? null,
      credits: defaultCredits(),
    })
    .onConflictDoNothing({ target: users.sub });

  const response = NextResponse.redirect(new URL("/", url));
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  response.cookies.set(ID_TOKEN_COOKIE, idToken, {
    ...baseOptions,
    maxAge: ID_TOKEN_MAX_AGE_SECONDS,
  });
  if (tokens.hasRefreshToken()) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken(), {
      ...baseOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    });
  }
  response.cookies.set(OAUTH_STATE_COOKIE, "", { ...baseOptions, maxAge: 0 });
  response.cookies.set(OAUTH_VERIFIER_COOKIE, "", { ...baseOptions, maxAge: 0 });

  return response;
}
