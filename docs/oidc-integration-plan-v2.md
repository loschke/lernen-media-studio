# OIDC + Persistent Credits — Plan v2

> **Version 2 des Integrationsplans für lernen-media-studio.** Ersetzt
> `oidc-integration-plan.md` (v1). Status: zur Team-Abstimmung, **noch
> nicht zur Umsetzung freigegeben**.
>
> **Stand:** 2026-04-26
> **Ändert ggü. v1:**
> 1. Signup-Modus: `approval_required` statt `invite_only` (neues Feature in `loschke-auth`).
> 2. Credits werden **server-seitig** in einer eigenen Neon-DB persistiert (statt nur Phase-2-Andeutung). Vorbereitung für Credit-Pakete / Kommerzialisierung.
> 3. Pricing aus existierendem `lib/models.ts` (Image 1/2/5, Video 10/20/40) wird ans Backend gezogen.

---

## 1. Context

Das media-studio gated heute via shared `APP_PASSWORD` und vergibt jeder Browser-Session 250 Credits in `localStorage`. Beides soll ersetzt werden:

- **Auth.** Migration auf den zentralen `loschke-auth` OIDC-Provider (`https://auth.loschke.ai`). Workshop-Teilnehmer registrieren sich selbst, Rico schaltet im Auth-Admin manuell frei (Modus `approval_required`).
- **Credits.** Heute reine `localStorage`-Logik (per Browser, vom Nutzer manipulierbar via DevTools). Mit echter User-Identität (`sub`) wird die Credit-Bilanz **server-seitig in einer eigenen Neon-DB** persistiert. Begründung: Rico plant perspektivisch Kommerzialisierung mit Credit-Paketen — `localStorage` ist dafür unbrauchbar. PRD § NG8 verbietet Billing/Credits in `loschke-auth`, deshalb bekommt das media-studio eine **eigene** Neon-DB.
- **Outcome.** Persistente, fälschungssichere Credit-Bilanz pro User; Workshop-Teilnehmer registrieren sich selbst und werden von Rico freigeschaltet; R2-Storage wandert von Session-UUID auf OIDC-`sub`.

## 2. Architektur-Entscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Signup-Modus | `approval_required` für `lernen-media-studio` OAuth-Client | Selbst-Registrierung mit Freischaltung — neues Feature in `loschke-auth` |
| Sessions | HttpOnly-Cookies, JWT-only, **keine** Session-DB | Aus v1 übernommen |
| User-DB | **Eigene** Neon-DB, separat von `loschke-auth` | PRD § NG8: Billing/Credits gehören in Client-Apps |
| Credit-Storage | Postgres-Tabelle `users(sub PK, email, name, credits, created_at, updated_at)` | Atomar, persistent, multi-device |
| Credit-Decrement | Server-seitig, atomar via `UPDATE … WHERE credits >= cost RETURNING`. Kosten pro Modell aus existierendem `lib/models.ts` (`getModelCost`). | Race-safe, nicht umgehbar; Pricing-Quelle existiert bereits |
| Credit-Refund | Bei Modell-Call-Failure (z. B. Google 429 wie in `90259ca`) wird der vorab abgezogene Betrag wieder gutgeschrieben | User zahlt nur für tatsächlich erbrachte Leistung |
| Credit-API-Shape | Generate/Edit/Video-Routes geben Post-Decrement-Stand im Response zurück | UI verlässt sich auf Server-Wert, keine optimistic guess mehr |
| User-Provisioning | Lazy: `INSERT … ON CONFLICT (sub) DO NOTHING` im OIDC-Callback | Atomar, kein Race zwischen Login und erstem Generate |
| Default-Credits | `DEFAULT_CREDITS=250` in env, Code-Default ebenfalls 250 (heute Code-Default 100, lokal 150) | User-Vorgabe |
| R2-Prefix | Neue Uploads: `sessions/{sub}/…`. Alte Session-UUID-Daten werden ignoriert (ephemere Workshop-Daten) | Aus v1 übernommen |
| OIDC-Lib | `arctic` + `jose` mit **expliziten Endpoints** (kein Auto-Discovery) | Better-Auth mounted unter `/api/auth/*`; Discovery liegt nicht auf root-`/.well-known/…` (im Code verifiziert: kein root-Handler vorhanden) |

## 3. Verifizierte Fakten (Stand 2026-04-26)

- **Discovery-URL.** `https://auth.loschke.ai/api/auth/.well-known/openid-configuration`. Kein root-`/.well-known/`-Handler im Auth-Code vorhanden — der einzige Routenhandler ist die Better-Auth-Catch-All `src/app/api/auth/[...all]/route.ts`. PRD § 7.4 Z. 412–413 ist aspirational; v1 hatte das in Z. 87 bereits korrekt vermerkt.
- **OAuth/OIDC-Endpoints** (Better-Auth oauthProvider-Plugin):
  - `GET  /api/auth/oauth2/authorize`
  - `POST /api/auth/oauth2/token`
  - `GET  /api/auth/oauth2/userinfo`
  - `POST /api/auth/oauth2/end-session`
  - JWKS: per Discovery-Doc auflösen (`jose.createRemoteJWKSet`)
- **ID-Token-Claims** (PRD FR-13): `sub`, `email`, `email_verified`, `name`, `organizations: [{id, slug, type, role}]`.
- **Approval-Flow blockt server-seitig im Auth-Service.** Pending-User landen auf `auth.loschke.ai/pending`. Das media-studio bekommt nie einen Code zum Tauschen → **kein Code-Pfad im media-studio nötig** für Pending-State.
- **OAuth-Client `lernen-media-studio`** (laut v1): Owner-Org `workshop-media-studio` (Pool-Typ `client`), aktuell `signup_mode='invite_only'`. Wird in Phase 0 auf `approval_required` umgesetzt.
- **`signupMode`-Edit-UI in `loschke-auth`** existiert nicht — `/admin/clients` ist nur Listen-Ansicht. Switch erfolgt via Neon Studio.
- **Aktueller media-studio-Stand** (verifiziert):
  - Proxy: `proxy.ts` (Next.js 16 Convention, ersetzt `middleware.ts`)
  - Login: `app/login/page.tsx` + `app/api/login/route.ts`
  - Session: `lib/session.ts` mit Cookies `media_studio_auth` (Passwort) und `media_studio_session` (UUID)
  - R2: `lib/r2.ts`, Prefix `sessions/{sessionId}/…`
  - Credits-Default: `app/api/config/route.ts` liest `DEFAULT_CREDITS` (Fallback 100)
  - Credits-Storage: `hooks/useGallery.ts`, Key `media_studio_count` in localStorage
  - Credit-Verbraucher (heute alle clientseitig): `/api/generate`, `/api/edit`, `/api/generate-video/start`. Chat (`/api/chat`) verbraucht nichts.
  - **Pricing-Quelle**: `lib/models.ts` mit `cost` pro Modell + `getModelCost(modelId)` Helper (Image: 1/2/5, Video: 10/20/40)
  - Keine DB im Repo (kein `drizzle.config.ts`, kein `drizzle/`, keine ORM-Deps)
  - Stack: Next.js 16.2.3, React 19.2.4, AI SDK 6, AWS S3 SDK 3, **noch keine** `arctic`/`jose`/`drizzle-orm`/`@neondatabase/serverless`

## 4. Voraussetzung in `loschke-auth` (Phase 0)

Rico setzt selbst im Neon Studio (Prod-DB):

```sql
UPDATE oauth_client SET signup_mode = 'approval_required'
WHERE client_id = 'lernen-media-studio';
```

Außerdem prüfen (laut v1 bereits OK): `oauth_client.redirect_uris` enthält `http://localhost:3001/api/auth/callback` und die Live-URL.

Optional als Folge-PR an `loschke-auth`: ein Edit-Form für `signupMode` auf `/admin/clients` für künftige Switches.

## 5. Phasenplan

### Phase 0 — `loschke-auth` umflaggen (außerhalb dieses Repos)
- [ ] `signup_mode = 'approval_required'` für Client `lernen-media-studio` setzen (Rico, Neon Studio)
- [ ] Verifizieren: `auth.loschke.ai/admin/users` zeigt nach Test-Signup eine Pending-Sektion mit Approval-Buttons

### Phase 1 — DB-Foundation im media-studio
**Files (neu):**
- `drizzle.config.ts`
- `drizzle/schema.ts` — Tabelle:
  ```ts
  users {
    sub: text primary key,
    email: text not null,
    name: text,
    credits: integer not null default 250,
    created_at: timestamptz default now(),
    updated_at: timestamptz default now(),
  }
  ```
- `lib/db.ts` — Neon-HTTP-Client + Drizzle-Connector
- `drizzle/0000_init.sql` — generierte Migration

**Deps:**
```bash
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```

**Env (.env.example, neu):**
- `DATABASE_URL=postgres://…@…neon.tech/media_studio?sslmode=require`

**Aktion:**
- [ ] Neue Neon-DB anlegen (Projekt `media-studio`, EU-Region, separat von `loschke-auth`)
- [ ] Drizzle-Schema schreiben, `pnpm drizzle-kit generate` + `pnpm drizzle-kit migrate`
- [ ] `lib/db.ts` mit `drizzle({ client: neon(env.DATABASE_URL), schema })` exportieren

**Reservierung für v3 (nicht jetzt anlegen, nur planerisch):**
- `credit_transactions(id, sub, delta, reason, ref, created_at)` für Audit-Log künftiger Credit-Pakete (Stripe-Webhook → +Credits, Generate → −Credits). Ermöglicht Saldo-Reconstruction.
- `credit_packs(id, sub, stripe_session_id, credits, paid_at)` als Einkaufs-History.

**Hinweis Next.js 16:** Per `AGENTS.md` hat Next 16 Breaking Changes. Vor Commit: `pnpm tsc` und `pnpm build` laufen lassen, ggf. `node_modules/next/dist/docs/` für Edge/Node-Runtime-Constraints konsultieren. Drizzle + Neon-HTTP-Driver läuft auf beiden Runtimes.

### Phase 2 — OIDC-Foundation + API-Routes
Übernimmt Batches 1+2 aus v1 fast unverändert.

**Deps:**
```bash
pnpm add arctic jose
```

**Env (.env.example, neu):**
```
OIDC_ISSUER=https://auth.loschke.ai/api/auth
OIDC_AUTHORIZE_URL=https://auth.loschke.ai/api/auth/oauth2/authorize
OIDC_TOKEN_URL=https://auth.loschke.ai/api/auth/oauth2/token
OIDC_USERINFO_URL=https://auth.loschke.ai/api/auth/oauth2/userinfo
OIDC_END_SESSION_URL=https://auth.loschke.ai/api/auth/oauth2/end-session
OIDC_CLIENT_ID=lernen-media-studio
OIDC_CLIENT_SECRET=<aus Passwort-Manager>
OIDC_REDIRECT_URI=http://localhost:3001/api/auth/callback
DEFAULT_CREDITS=250
```

**Env (zu entfernen):** `APP_PASSWORD`

**Files (neu):**
- `lib/oidc.ts` — arctic-Provider mit expliziten Endpoints (kein Auto-Discovery, Better-Auth-Pfad ist nonstandard)
- `app/api/auth/login/route.ts` — PKCE-Verifier + `state` in HttpOnly-Cookie, Redirect zu `OIDC_AUTHORIZE_URL`
- `app/api/auth/callback/route.ts`:
  - Code via arctic gegen `OIDC_TOKEN_URL` tauschen
  - id_token via `jose.jwtVerify` gegen `createRemoteJWKSet` validieren
  - **Lazy User-Insert**: `INSERT INTO users (sub, email, name, credits) VALUES (…, $DEFAULT_CREDITS) ON CONFLICT (sub) DO NOTHING`
  - Cookies setzen, Redirect zu `/`
- `app/api/auth/logout/route.ts` — Cookies löschen + RP-initiated Logout zu `OIDC_END_SESSION_URL`

**Cookies** (HttpOnly, Secure-in-Prod, SameSite=Lax):
- `ms_id_token` (id_token JWT)
- `ms_refresh` (refresh_token, langlebiger)

**Lifetimes** (laut v1): id_token 1 h, refresh 7 d. Refresh-Token-Rotation: nach Refresh neuer Cookie-Wert, alter ist tot.

### Phase 3 — Session + Proxy umstellen
**Files (geändert):**
- `lib/session.ts`:
  - Cookie-Namen: `ms_id_token`, `ms_refresh` (alte raus)
  - JWT verifizieren (`jose.jwtVerify` gegen `createRemoteJWKSet`, JWKS-Cache in-memory)
  - Bei abgelaufenem id_token: silent Refresh via Refresh-Token (Rotation: neuer Refresh-Cookie setzen)
  - Rückgabe: `{ sub: string, email: string, name?: string, organizations: Org[] } | null`
  - Helper `requireUser()` → `Response 401` für API, `redirect('/api/auth/login')` für Pages
- `proxy.ts`:
  - `APP_PASSWORD`-Check raus
  - Public Paths: `/api/auth/login`, `/api/auth/callback`, `/api/auth/logout`, `/robots.txt`
  - Alles andere: Session-Check via `lib/session.ts`. Fehlt → Redirect zu `/api/auth/login`
- `lib/r2.ts`:
  - Storage-Key-Prefix von `sessions/{sessionId}` auf `sessions/{sub}` umstellen (Z. 40–45)
  - Alle Caller anpassen: `app/api/generate/route.ts:82`, `app/api/edit/route.ts:144`, `app/api/gallery/list/route.ts:20`, `app/api/gallery/delete/route.ts:23`, video-routes

**Files (löschen):**
- `app/login/page.tsx`
- `app/api/login/route.ts`
- `app/api/config/route.ts` (wird durch `/api/credits` ersetzt, siehe Phase 4)

### Phase 4 — Credits server-seitig
**Pricing-Quelle:** existierendes `lib/models.ts` mit `cost`-Feld pro Modell. Image: 1/2/5 Credits (Standard / Flash 3.1 / Pro). Video: 10/20/40 Credits (Veo 3.1 Lite / Fast / full). `getModelCost(modelId)` ist bereits exportiert und wird heute clientseitig genutzt — wandert jetzt **zusätzlich** in die Server-Routes. Single source of truth bleibt erhalten.

**Files (neu):**
- `lib/credits.ts`:
  ```ts
  export async function getCredits(sub: string): Promise<number>

  export async function spendCredits(sub: string, cost: number):
    Promise<{ ok: true; remaining: number }
           | { ok: false; remaining: number }>

  export async function refundCredits(sub: string, amount: number): Promise<number>
  ```
  - `spendCredits`: atomar `UPDATE users SET credits = credits - $cost, updated_at = NOW() WHERE sub = $sub AND credits >= $cost RETURNING credits`. Wenn `rowCount === 0` → `{ ok: false, remaining: <SELECT current> }`.
  - `refundCredits`: `UPDATE users SET credits = credits + $amount, updated_at = NOW() WHERE sub = $sub RETURNING credits`. Für Modell-Call-Failure-Pfade.
- `app/api/credits/route.ts` — `GET` liefert `{ credits: number }`. Ersetzt `/api/config`.

**Files (geändert):**
- `app/api/generate/route.ts`, `app/api/edit/route.ts`, `app/api/generate-video/start/route.ts`:
  - Modell-ID aus Request-Body lesen, gegen `ALLOWED_*_MODEL_IDS` validieren (existiert)
  - **Vor** Modell-Call: `const cost = getModelCost(modelId); const result = await spendCredits(sub, cost)`
  - Bei `ok: false` → `Response 402 Payment Required` mit `{ error: 'insufficient_credits', remaining, cost }`
  - Bei Erfolg: Modell-Call ausführen
  - **Bei Modell-Call-Failure** (catch-Block, inkl. 429 wie in commit `90259ca`): `await refundCredits(sub, cost)` → Error-Response mit aktuellem Stand. Sonst zahlt der User für nicht erbrachte Leistung.
  - Bei Modell-Erfolg: Response um `credits: remaining` erweitern
- `hooks/useGallery.ts`:
  - `localStorage`-Init-Logik raus (Z. 22–48)
  - Initial-Load über `GET /api/credits`
  - Nach jedem Generate/Edit/Video: Server-Wert aus Response übernehmen, kein optimistic local decrement mehr (Z. 95–103 wegfallen lassen oder zu `setCount(serverValue)` umbauen)
  - Bei 402: Banner „Keine Credits mehr" rendern, Generate-Buttons disablen
  - localStorage-Key `media_studio_count` löschen (alte Werte sind irrelevant)

### Phase 5 — Browser-E2E-Test (lokal)
1. `pnpm dev` auf Port 3001
2. `http://localhost:3001` → Proxy redirected zu `/api/auth/login` → `auth.loschke.ai/oauth2/authorize`
3. Mit nicht-registrierter E-Mail signupen → OTP eingeben → Pending-Page auf `auth.loschke.ai/pending` (kein Code an media-studio!)
4. Als Rico in `auth.loschke.ai/admin/users` Pending-User freischalten
5. Nochmal Login → Callback fired → User-Row in DB angelegt mit 250 Credits → media-studio-UI sichtbar, Credit-Counter zeigt 250
6. Bild generieren (Standardmodell, Cost 1) → Server-Decrement, UI zeigt 249, R2-Key prefixed mit `sub`
7. Pro-Modell wählen (Cost 5) → UI zeigt 244
8. DevTools → `localStorage.setItem('media_studio_count', 9999)` → Reload: Server-Wert (244) gewinnt
9. Bei 0 Credits Generate triggern → 402-Banner
10. Logout → Cookies weg, `/api/auth/end-session` aufgerufen, Redirect zu `auth.loschke.ai`

### Phase 6 — Prod-Deploy (separates Followup)
- `OIDC_REDIRECT_URI` in Vercel auf Live-URL umstellen
- `DATABASE_URL` (Neon-Prod-Branch der media-studio-DB) in Vercel-Env
- `DEFAULT_CREDITS=250` in Vercel-Env
- Migration in Prod-DB anwenden (`drizzle-kit migrate` gegen Prod-Branch)
- `TRUSTED_ORIGINS` in `loschke-auth`-Vercel checken
- Smoke-Test in Prod

## 6. Critical Files

**Zu ändern:**
- `proxy.ts:1-84` — APP_PASSWORD raus, Session-Check rein
- `lib/session.ts:1-23` — komplett umschreiben (JWT-basiert)
- `lib/r2.ts:40-45,148-168,183-201,216-257` — Prefix `sub` statt `sessionId`
- `app/api/generate/route.ts:82` (R2-Call) + Pre-Decrement-Hook + Refund-on-Failure
- `app/api/edit/route.ts:144` + Pre-Decrement + Refund-on-Failure
- `app/api/generate-video/start/route.ts` + Pre-Decrement + Refund-on-Failure
- `app/api/gallery/list/route.ts:20`, `app/api/gallery/delete/route.ts:23` — `sub` statt `sessionId`
- `hooks/useGallery.ts:1-115` — localStorage-Init raus, Server-Source-of-Truth rein
- `app/page.tsx:147-156` — Counter-Display gegen Server-Wert
- `.env.example` — APP_PASSWORD raus, `OIDC_*`/`DATABASE_URL`/`DEFAULT_CREDITS=250` rein

**Neu:**
- `drizzle.config.ts`, `drizzle/schema.ts`, `drizzle/0000_init.sql`, `lib/db.ts`, `lib/credits.ts`
- `lib/oidc.ts`
- `app/api/auth/login/route.ts`, `app/api/auth/callback/route.ts`, `app/api/auth/logout/route.ts`
- `app/api/credits/route.ts`

**Zu löschen:**
- `app/login/page.tsx`, `app/api/login/route.ts`, `app/api/config/route.ts`

## 7. Wiederverwendete Patterns

- `docs/oidc-integration-plan.md` (v1) — Vorlage für arctic-Setup, Cookie-Strategie, JWKS-Caching, Refresh-Token-Rotation. Abweichungen sind in diesem Plan dokumentiert.
- `lib/models.ts` mit `getModelCost()` — bestehende Pricing-Quelle, server-seitig wiederverwenden.
- Better-Auth-Endpoints in `loschke-auth/docs/PRD.md` § 7.4.
- `loschke-auth/src/app/admin/users/_components/approval-actions.tsx` — Rico nutzt diesen UI-Pfad zum Freischalten, kein Code im media-studio dafür nötig.

## 8. Rollback-Pfad

`APP_PASSWORD`-Flow ist bis dahin im Git-History. Revert auf den letzten Commit vor Phase 2 stellt das alte System wieder her. Die neue `users`-Tabelle in der separaten media-studio-DB stört nicht (wird vom alten Code nicht gelesen). R2-Daten unter altem Session-UUID-Prefix bleiben erreichbar.

## 9. Verification (End-to-End)

Nach Phase 5 lokal ausführen:
1. **Auth-Flow**: Signup → Pending → Admin-Approval → Login → media-studio sichtbar.
2. **Credits-Persistenz**: 1 Bild generieren (Cost 1), Cookies löschen, neu einloggen → Counter zeigt 249, nicht zurück auf 250.
3. **Pricing-Sync**: Pro-Modell wählen (Cost 5) → Decrement um 5; Veo-Lite (Cost 10) → Decrement um 10.
4. **Race-Safety**: 5 parallele Generate-Requests bei Credits=3 (Cost 1) absetzen — genau 3 erfolgreich, 2× HTTP 402.
5. **Refund-on-Failure**: Künstlich Google-API-Failure provozieren (z. B. ungültiger API-Key) → Credits werden zurückerstattet, kein Verlust.
6. **localStorage-Bypass blockt**: `localStorage.setItem('media_studio_count', 9999)` setzen → Server-Endpoint zählt korrekt weiter.
7. **R2-Prefix**: Neue Uploads landen unter `sessions/<sub>/…`, alte UUID-prefixed Objekte bleiben unangetastet.
8. **`pnpm tsc && pnpm build`** grün.

## 10. Bestätigte Entscheidungen (Q&A 2026-04-26)

- **DEFAULT_CREDITS**: 250 (Code-Default + env-Default).
- **Phase 0 Switch**: Rico setzt `signup_mode='approval_required'` selbst im Neon Studio.
- **Pricing**: Existiert bereits in `lib/models.ts` (Image 1/2/5, Video 10/20/40). Server-Routes nutzen `getModelCost()`.

## 11. Offene Punkte (für Team-Abstimmung)

- **Migration alter Workshop-Daten?** R2-Objekte unter `sessions/<UUID>/…` bleiben verwaist. Soll ein einmaliges Cleanup-Skript sie löschen (Bucket-Listing nach `sessions/[uuid-pattern]/`), oder im Bucket belassen? Kostenfaktor je nach Datenmenge gering.
- **Audit-Log für Credit-Bewegungen jetzt schon?** v1 nur `credits` int (siehe Phasenplan Phase 1). v2 mit `credit_transactions`-Tabelle wäre ehrlicher für Buchhaltung — aber späteres Hinzufügen ist easy. Empfehlung: erst bei erstem Credit-Pack-Kauf.
- **Server-seitiger Bulk-Revoke** (Workshop-Ende-Button): laut v1 Phase-1 manuell im Auth-Admin geplant. Bleibt unverändert in Auth-Service.
- **Chat-Credits**: aktuell frei (`/api/chat`). Soll das so bleiben, oder mit gleichziehen? Vorschlag: bei Kommerzialisierung mit gleichziehen, aber nicht jetzt.
