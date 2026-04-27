import { OAuth2Client, CodeChallengeMethod, decodeIdToken } from "arctic";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function buildClient(): OAuth2Client {
  return new OAuth2Client(
    requireEnv("OIDC_CLIENT_ID"),
    requireEnv("OIDC_CLIENT_SECRET"),
    requireEnv("OIDC_REDIRECT_URI"),
  );
}

export const oidcScopes = ["openid", "profile", "email", "offline_access"];

export function createAuthorizationUrl(state: string, codeVerifier: string): URL {
  const client = buildClient();
  return client.createAuthorizationURLWithPKCE(
    requireEnv("OIDC_AUTHORIZE_URL"),
    state,
    CodeChallengeMethod.S256,
    codeVerifier,
    oidcScopes,
  );
}

export async function exchangeCode(code: string, codeVerifier: string) {
  const client = buildClient();
  return client.validateAuthorizationCode(requireEnv("OIDC_TOKEN_URL"), code, codeVerifier);
}

export async function refreshTokens(refreshToken: string) {
  const client = buildClient();
  return client.refreshAccessToken(requireEnv("OIDC_TOKEN_URL"), refreshToken, oidcScopes);
}

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let _jwksUrlPromise: Promise<URL> | null = null;

async function resolveJwksUrl(): Promise<URL> {
  if (_jwksUrlPromise) return _jwksUrlPromise;
  _jwksUrlPromise = (async () => {
    const issuer = requireEnv("OIDC_ISSUER");
    const discoveryUrl = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
    const res = await fetch(discoveryUrl);
    if (!res.ok) {
      _jwksUrlPromise = null;
      throw new Error(`OIDC discovery failed: ${res.status}`);
    }
    const config = (await res.json()) as { jwks_uri?: string };
    if (!config.jwks_uri) {
      _jwksUrlPromise = null;
      throw new Error("OIDC discovery doc missing jwks_uri");
    }
    return new URL(config.jwks_uri);
  })();
  return _jwksUrlPromise;
}

async function getJwks() {
  if (_jwks) return _jwks;
  _jwks = createRemoteJWKSet(await resolveJwksUrl());
  return _jwks;
}

export type IdTokenClaims = JWTPayload & {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  organizations?: Array<{ id: string; slug: string; type: string; role: string }>;
};

export async function verifyIdToken(idToken: string): Promise<IdTokenClaims> {
  const jwks = await getJwks();
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: requireEnv("OIDC_ISSUER"),
    audience: requireEnv("OIDC_CLIENT_ID"),
  });
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("id_token has no sub");
  }
  return payload as IdTokenClaims;
}

export function decodeIdTokenClaims(idToken: string): IdTokenClaims {
  return decodeIdToken(idToken) as IdTokenClaims;
}
