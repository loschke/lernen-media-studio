import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ID_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from "@/lib/session";

function buildEndSessionUrl(idToken: string | undefined, origin: string): string | null {
  const base = process.env.OIDC_END_SESSION_URL;
  if (!base) return null;
  const url = new URL(base);
  if (idToken) url.searchParams.set("id_token_hint", idToken);
  url.searchParams.set("post_logout_redirect_uri", origin);
  url.searchParams.set("client_id", process.env.OIDC_CLIENT_ID ?? "");
  return url.toString();
}

async function handle(req: Request): Promise<Response> {
  const cookieStore = await cookies();
  const idToken = cookieStore.get(ID_TOKEN_COOKIE)?.value;

  const origin = new URL(req.url).origin;
  const target = buildEndSessionUrl(idToken, origin) ?? origin;
  const response = NextResponse.redirect(target);

  const clear = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
  response.cookies.set(ID_TOKEN_COOKIE, "", clear);
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", clear);
  response.cookies.set(OAUTH_STATE_COOKIE, "", clear);
  response.cookies.set(OAUTH_VERIFIER_COOKIE, "", clear);

  return response;
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
