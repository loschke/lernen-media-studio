import { NextResponse } from "next/server";
import { generateState, generateCodeVerifier } from "arctic";
import { createAuthorizationUrl } from "@/lib/oidc";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  OAUTH_TRANSIENT_MAX_AGE_SECONDS,
} from "@/lib/session";

export async function GET() {
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = createAuthorizationUrl(state, verifier);

  const response = NextResponse.redirect(url);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: OAUTH_TRANSIENT_MAX_AGE_SECONDS,
    path: "/",
  };
  response.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(OAUTH_VERIFIER_COOKIE, verifier, cookieOptions);

  return response;
}
