import { cookies } from "next/headers";

// Legacy password-based cookies — entfallen sobald der OIDC-Flow den
// APP_PASSWORD-Pfad ersetzt.
export const SESSION_COOKIE = "media_studio_session";
export const AUTH_COOKIE = "media_studio_auth";
export const COOKIE_MAX_AGE_DAYS = 7;
export const COOKIE_MAX_AGE_SECONDS = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;

// OIDC-Session-Cookies (gesetzt im /api/auth/callback, gelesen vom Proxy +
// API-Routes ab dem Session-Cutover).
export const ID_TOKEN_COOKIE = "ms_id_token";
export const REFRESH_TOKEN_COOKIE = "ms_refresh";
export const ID_TOKEN_MAX_AGE_SECONDS = 60 * 60; // 1h, matches id_token TTL
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7d

// Transient PKCE/State-Cookies während des Authorization-Code-Flows.
export const OAUTH_STATE_COOKIE = "ms_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "ms_oauth_verifier";
export const OAUTH_TRANSIENT_MAX_AGE_SECONDS = 10 * 60; // 10min

/**
 * Reads the session UUID from cookies. Returns null if missing.
 * Use this in API routes to scope operations to the current participant.
 */
export async function getSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function requireSessionId(): Promise<string> {
  const id = await getSessionId();
  if (!id) {
    throw new Error("No session — login required");
  }
  return id;
}
