# OIDC-Integration ins lernen-media-studio — Plan

> Briefing-Dokument für die nächste Arbeits-Session. Ersetzt das bisherige
> Shared-Password-Auth durch OIDC gegen `https://auth.loschke.ai`.

## Status (Stand 2026-04-24)

### Was steht (loschke-auth, fertig deployed)
- `auth.loschke.ai` läuft in Prod auf Vercel, Neon `main`-Branch als Prod-DB
- 6 Orgs in Prod geseedet: `build-jetzt`, `lernen-diy`, `loschke-ai-tools` (ecosystem-Pool), `workshop-media-studio`, `aok-san`, `queo` (client-Pool)
- OAuth-Client `lernen-media-studio` in `workshop-media-studio`-Org, `allow_public_signup=false` (Invite-only)
- Redirect-URIs enthalten sowohl `localhost:3001` (Dev) als auch die live-URL (Prod)
- Admin-Dashboard (`/admin`), Invite-Flow, `/signin` funktional getestet
- Prod Client-Secret im Passwort-Manager unter „OIDC Client Secret — lernen-media-studio (PROD)"

### Was noch kommt (hier im media-studio)
- OIDC-Client-Integration via `arctic` + `jose`
- Cookie-only Sessions (keine eigene DB initial — Phase 2 bringt Credits-DB)
- Ersetzen: das alte `APP_PASSWORD`-System
- R2-Storage-Keys: von Session-UUID auf OIDC `sub` umstellen (neue User only, alte ephemeral-Daten ignorieren)

## Architektur-Entscheidungen (bereits getroffen)

| Bereich | Entscheidung | Warum |
|---|---|---|
| OIDC-Client-Lib | `arctic` (Pilcrow) + `jose` für JWT-Verify | Schlank, typesafe, kein Framework-Lock-in |
| Session-Storage | HttpOnly Cookies, keine DB | Workshop-Sessions sind kurz, kein Server-Revoke-Bedarf v1 |
| Access-Token TTL | 15 min (BA-Default) | |
| ID-Token TTL | 1 h | |
| Refresh-Token TTL | 7 d | Workshop + 1 Woche Nachspielen |
| Credits-System | Phase 2 — eigene Neon-DB, Tabelle `user_credits(sub, remaining)` | Persistent, atomar per UPDATE RETURNING |
| Zugang-Revoke | Phase 1: manual Bulk-Revoke-Button im Auth-Admin (Rico klickt „Workshop beenden"); Phase 2: Auto-TTL pro Invite via `member.expires_at` | |
| Pool-Isolation | Workshop-Teilnehmer in `client`-Pool (isoliert, keine Auto-Joins in andere Apps) | |

## 4-Batch-Plan

### Batch 1 — Foundation
```bash
pnpm add arctic jose
```
- `.env.example` updaten:
  - Raus: `APP_PASSWORD`
  - Rein: `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`
- `lib/oidc.ts` neu — arctic-Provider-Konfig gegen `https://auth.loschke.ai`
- `pnpm tsc` prüfen

### Batch 2 — API-Routes
- `app/api/auth/login/route.ts` — PKCE-Verifier + `state` generieren, in HttpOnly-Cookie ablegen, Redirect zu `/oauth2/authorize`
- `app/api/auth/callback/route.ts` — Code-Tausch via arctic, id_token via jose+JWKS verifizieren, Session-Cookies setzen, Redirect zu `/`
- `app/api/auth/logout/route.ts` — Cookies löschen, optional RP-initiated Logout gegen `/oauth2/end-session`

### Batch 3 — Session-Handling
- `lib/session.ts` umschreiben:
  - Cookies lesen (`media_studio_id`, `media_studio_refresh`)
  - id_token verifizieren (JWKS-Cache in-memory)
  - Falls abgelaufen: silent Refresh via Refresh-Token
  - Rückgabe: `{ sub, email, name, organizations }` oder `null`
- `proxy.ts` umschreiben:
  - `APP_PASSWORD`-Check raus
  - Session-Cookie-Check rein
  - Bei fehlender Session → Redirect zu `/api/auth/login` (statt Shared-Passcode-Page)
- Löschen:
  - `app/login/page.tsx` (alte Shared-Passcode-Form)
  - `app/api/login/route.ts` (altes Password-Match)

### Batch 4 — Browser-Test
1. Media-Studio lokal: `pnpm dev` auf Port 3001
2. `http://localhost:3001` aufrufen → Proxy redirected zu `/api/auth/login`
3. → `auth.loschke.ai/oauth2/authorize` → Login mit `rico@sevenx.de` → Consent (falls noch nicht angenommen) → Redirect zurück
4. Landet auf `http://localhost:3001/api/auth/callback?code=...&state=...` → Cookies werden gesetzt → Redirect zu `/`
5. Media-Studio-UI sichtbar, `lib/session.ts` liefert `sub`
6. Galerie-Item erzeugen → R2 Storage-Key verwendet `sub`

## ENV-Variablen — was in `.env.local` zu setzen ist

```
OIDC_ISSUER=https://auth.loschke.ai
OIDC_CLIENT_ID=lernen-media-studio
OIDC_CLIENT_SECRET=<aus Passwort-Manager „OIDC Client Secret — lernen-media-studio (PROD)">
OIDC_REDIRECT_URI=http://localhost:3001/api/auth/callback
```

**Prod-Deploy später:** `OIDC_REDIRECT_URI` in Vercel-ENV auf die finale Live-URL umstellen.

## Abhängigkeiten & Stolpersteine

- **BA-Endpoints im Issuer-Pfad:** Better-Auth hostet OIDC-Discovery unter `/api/auth/.well-known/openid-configuration`, nicht unter `/.well-known/...`. Heißt: arctic muss mit expliziten Endpoints konfiguriert werden statt Auto-Discovery, oder Discovery-URL manuell angeben.
- **CSP:** auth.loschke.ai hat strikte CSP (nonce-based script-src). Media-Studio macht nur Redirects zu auth, keine iframes — sollte kein Problem sein.
- **TRUSTED_ORIGINS in auth-Vercel:** muss sowohl `http://localhost:3001` als auch live-URL enthalten. Bereits von Rico geprüft.
- **JWKS-Caching:** jose's `createRemoteJWKSet` macht eigenes Caching — einfach nutzen.
- **Refresh-Token-Rotation:** BA rotiert Refresh-Tokens. Der alte wird nach Refresh invalidiert. Heißt: Cookie muss nach jedem Refresh frisch gesetzt werden, alte Cookie-Werte sind tot.

## Offene Punkte nach der Integration (Folge-Schritte)

1. **R2 Storage-Key-Migration** — neue Uploads hängen an `sub`. Alte Session-UUID-basierte Galerie-Daten bleiben „verwaist" oder werden beim nächsten Workshop-Reset gelöscht.
2. **Credits-DB** (Phase 2) — eigene Neon-DB für `user_credits(sub text primary key, remaining int, reset_at timestamp)`. Lazy-Init beim ersten Login, Decrement atomar per `UPDATE ... RETURNING`.
3. **Media-Studio-Deploy** (wenn so weit):
   - `OIDC_REDIRECT_URI` auf Live-URL setzen
   - Redirect-URI in `oauth_client` (Prod-DB, Neon) ergänzen (ist teilweise schon vorhanden)
   - `TRUSTED_ORIGINS` in auth-Vercel final prüfen
4. **Bulk-Revoke-Button im Auth-Admin** — neuer Commit in `loschke-auth` Repo: `/admin/organizations/<id>` bekommt Button „Alle Members entfernen", Server-Action deleted alle `member`-Rows der Org in einer Transaktion.

## Hinweise für die nächste Session

- Nicht vergessen: `.env.local` des media-studio enthält nach Setup das Prod-Secret → **NICHT** committen. `.env.local` ist in der Standard Next.js `.gitignore` drin.
- Falls Shared-Password-User (frühere Workshop-Teilnehmer) noch Session-Cookies haben: die werden beim ersten Aufruf automatisch ungültig (neuer Proxy-Check ignoriert sie).
- BA-Docs für den OAuth-Provider-Plugin-Endpoint-Pfad: `/api/auth/oauth2/authorize`, `/api/auth/oauth2/token`, `/api/auth/userinfo`.
- Die Integration passiert vollständig in diesem Repo — in `loschke-auth` ist nichts mehr zu tun.

## Rollback-Pfad

Falls irgendwas schief geht: Git-revert + `APP_PASSWORD`-Flow war bis dahin committed. Seeds des alten Systems (R2 mit Session-UUIDs) sind weiterhin zugreifbar, Rico kann über Umwege (manual SQL, falls DB existieren sollte) zurück.
