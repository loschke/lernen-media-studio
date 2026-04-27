import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, verifyIdToken, decodeIdTokenClaims } from "@/lib/oidc";
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

function errorRedirect(url: URL, reason: string, detail?: string): NextResponse {
  const target = new URL("/api/auth/error", url);
  target.searchParams.set("reason", reason);
  if (detail) target.searchParams.set("detail", detail);
  return NextResponse.redirect(target);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    console.error("OAuth authorize returned error", { error, errorDescription });
    return errorRedirect(url, error, errorDescription ?? undefined);
  }
  if (!code || !state) {
    return errorRedirect(url, "missing_code_or_state");
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = cookieStore.get(OAUTH_VERIFIER_COOKIE)?.value;

  if (!storedState || !verifier || storedState !== state) {
    return errorRedirect(url, "invalid_state");
  }

  let tokens;
  try {
    tokens = await exchangeCode(code, verifier);
  } catch (err) {
    console.error("Token exchange failed", err);
    return errorRedirect(url, "token_exchange_failed", err instanceof Error ? err.message : String(err));
  }

  const idToken = tokens.idToken();
  let claims;
  try {
    claims = await verifyIdToken(idToken);
  } catch (err) {
    let unverifiedClaims: unknown = null;
    try {
      unverifiedClaims = decodeIdTokenClaims(idToken);
    } catch {
      // ignore
    }
    console.error("id_token verification failed", {
      error: err instanceof Error ? err.message : String(err),
      unverifiedClaims,
      expectedIssuer: process.env.OIDC_ISSUER,
      expectedAudience: process.env.OIDC_CLIENT_ID,
    });
    return errorRedirect(url, "invalid_id_token", err instanceof Error ? err.message : String(err));
  }

  if (!claims.email) {
    return errorRedirect(url, "missing_email_claim");
  }

  try {
    await db
      .insert(users)
      .values({
        sub: claims.sub,
        email: claims.email,
        name: claims.name ?? null,
        credits: defaultCredits(),
      })
      .onConflictDoNothing({ target: users.sub });
  } catch (err) {
    console.error("User upsert failed", err);
    return errorRedirect(url, "db_insert_failed", err instanceof Error ? err.message : String(err));
  }

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
