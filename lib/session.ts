import { cookies } from "next/headers";

export const SESSION_COOKIE = "media_studio_session";
export const AUTH_COOKIE = "media_studio_auth";
export const COOKIE_MAX_AGE_DAYS = 7;
export const COOKIE_MAX_AGE_SECONDS = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;

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
