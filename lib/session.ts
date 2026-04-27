import { cookies } from "next/headers";
import { verifyIdToken, refreshTokens, type IdTokenClaims } from "@/lib/oidc";

// OIDC-Session-Cookies (gesetzt im /api/auth/callback, gelesen vom Proxy +
// API-Routes).
export const ID_TOKEN_COOKIE = "ms_id_token";
export const REFRESH_TOKEN_COOKIE = "ms_refresh";
export const ID_TOKEN_MAX_AGE_SECONDS = 60 * 60; // 1h, matches id_token TTL
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7d

// Transient PKCE/State-Cookies während des Authorization-Code-Flows.
export const OAUTH_STATE_COOKIE = "ms_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "ms_oauth_verifier";
export const OAUTH_TRANSIENT_MAX_AGE_SECONDS = 10 * 60; // 10min

const sessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
});

/**
 * Liefert die verifizierten id_token-Claims aus dem Cookie. Bei abgelaufenem
 * id_token wird via Refresh-Token-Cookie ein neues Paar geholt und die Cookies
 * werden rotiert. Funktioniert nur in Kontexten mit mutierbaren Cookies
 * (Route-Handlern, Server-Actions). In Server-Components ohne Mutationsrecht
 * fällt der Refresh-Pfad still zurück auf null.
 */
export async function getCurrentUser(): Promise<IdTokenClaims | null> {
  const store = await cookies();
  const idToken = store.get(ID_TOKEN_COOKIE)?.value;
  if (idToken) {
    try {
      return await verifyIdToken(idToken);
    } catch {
      // weiter zum Refresh-Pfad
    }
  }

  const refresh = store.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refresh) return null;

  try {
    const tokens = await refreshTokens(refresh);
    const newIdToken = tokens.idToken();
    const claims = await verifyIdToken(newIdToken);

    const opts = sessionCookieOptions();
    try {
      store.set(ID_TOKEN_COOKIE, newIdToken, {
        ...opts,
        maxAge: ID_TOKEN_MAX_AGE_SECONDS,
      });
      if (tokens.hasRefreshToken()) {
        store.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken(), {
          ...opts,
          maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
        });
      }
    } catch {
      // Server-Component-Kontext: Cookies sind read-only. Claims liefern wir
      // trotzdem zurück, der Refresh greift dann beim nächsten Route-Handler.
    }

    return claims;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<IdTokenClaims> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/**
 * Legacy-Helper für Code, der noch nicht auf `sub` migriert ist. Nach Phase 3
 * werden die letzten Caller umgestellt und diese Funktion entfernt.
 */
export async function getSessionId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.sub ?? null;
}

export async function requireSessionId(): Promise<string> {
  const id = await getSessionId();
  if (!id) {
    throw new Error("No session — login required");
  }
  return id;
}
