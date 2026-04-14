# Auth & Persistierung — Roadmap

Stand: April 2026. Dokumentiert die aktuelle Lösung, ihre Grenzen und zwei
realistische Ausbaustufen für kommende Workshops.

---

## Ist-Zustand (Workshop-MVP)

### Auth
- **Ein globales `APP_PASSWORD`** in Env-Vars.
- Login setzt zwei Cookies: `media_studio_auth` (enthält das Passwort im Klartext) und `media_studio_session` (UUID v4).
- `middleware.ts` prüft bei jedem Request, ob `media_studio_auth === APP_PASSWORD`.
- Alle Teilnehmer teilen sich dasselbe Passwort.

### Persistierung
- **R2-Bucket** für Bilder und Videos, geordnet nach `sessions/{sessionId}/{id}.{ext}`.
- Metadaten im `.json`-Sidecar.
- **Credits laufen client-seitig** im `localStorage` — User kann per DevTools resetten.
- Kein DB-Backend, keine Zuordnung Session ↔ Teilnehmer.

### Was gut funktioniert
- Null Infra-Overhead, Setup in einer Minute.
- Für geschlossene Gruppen (Workshop-Teilnehmer, die das Passwort bekommen) ausreichend.
- R2-Speicher skaliert problemlos.

### Was wackelt
- Das **Passwort wandert im Klartext** als Cookie durch den Browser — bei kompromittierter Session direkt leakable.
- Ein abgelaufener/durchgesickerter Workshop-Zugang kann nicht einzeln widerrufen werden — nur Passwortwechsel für alle.
- **Credits sind client-side Theater** — jeder technisch interessierte Teilnehmer kann sie resetten. In der Praxis bei Workshop-Teilnehmern kein Problem, öffentlich absolut inakzeptabel.
- Kein Usage-Tracking pro Teilnehmer (wer hat wie viele Videos generiert?).
- Sessions halten 7 Tage, danach verliert der Teilnehmer Zugang zu seiner eigenen Bibliothek.

---

## Stufe 1: Magic-Link-Auth mit Teilnehmerliste

**Ziel:** Teilnehmer individuell identifizieren, ohne Passwörter zu verteilen.

### Konzept
1. Vor dem Workshop legst du eine Teilnehmerliste an: E-Mail-Adressen + optional Name.
2. Login-Seite fragt nur nach E-Mail.
3. Backend prüft, ob Mail in Allowlist → schickt Magic Link via Resend/Postmark.
4. Link enthält signiertes Token (JWT oder `@vercel/kv`-Session-ID) mit 24-h-Gültigkeit.
5. Klick öffnet App, signed-Cookie wird gesetzt.

### Umsetzung (konkret)
- **Allowlist-Storage:** Für den Anfang ein `participants.json` im Repo oder als Env-Var. Später Vercel KV.
- **Mail-Versand:** [Resend](https://resend.com) — 100 Mails/Tag gratis, sauberes Next.js-SDK.
- **Session-Cookie:** signiertes JWT mit `iron-session` oder `next-auth` (Email-Provider).
- **Teilnehmer-ID = Mail-Adresse** wird zur `sessionId` für R2 — persistent über Geräte hinweg.

### Aufwand
- ~4 h Implementierung.
- Resend-Account + Custom Domain für Mail-From verifizieren.
- Vercel KV ~0 € bei Workshop-Volumen.

### Vorteile gegenüber Stand heute
- Einzelne Teilnehmer sperrbar (aus Liste entfernen).
- Kein Passwort-Teilen via Slack-DM etc.
- Bibliothek überlebt Geräte-Wechsel (Laptop → Handy).
- Basis für echte Usage-Quotas (siehe Stufe 2).

### Nachteile
- E-Mail-Versand kann wackeln (Spam-Filter, Typos).
- Etwas mehr Friction beim ersten Login — für Workshops eher Pro.

---

## Stufe 2: Serverseitige Credits + Usage-Dashboard

**Ziel:** Credit-System abusefest machen und pro Teilnehmer Auswertung ermöglichen.

### Konzept
- **Vercel KV** (Redis-kompatibel) als State-Store.
- Schema:
  ```
  user:{email} → { credits: number, createdAt, lastSeen }
  usage:{email}:{YYYY-MM-DD} → { imageGens: n, videoGens: n, editCalls: n }
  ```
- Jeder API-Call in `/api/generate|edit|generate-video/start` liest Credits, validiert, dekrementiert **atomar** (Redis `DECRBY` oder Lua-Script).
- Client bekommt nur den aktuellen Wert per `/api/credits` zurück.
- `localStorage` entfällt als Quelle — rein optionaler UI-Cache.

### Umsetzung
- ~2 h zusätzlich zu Stufe 1.
- Vercel KV Free-Tier: 30k Commands/Monat, reicht für ~100 aktive Teilnehmer.
- Admin-Route `/admin/usage` mit Tabelle pro Teilnehmer — durch die bestehende Middleware mit zusätzlichem Admin-Check abgesichert.

### Bonus: Rate-Limiting
Gleicher KV-Store macht auch Rate-Limiting trivial:
```
ratelimit:{email} → sliding window counter
```
Einfache Implementierung mit [`@upstash/ratelimit`](https://github.com/upstash/ratelimit).

### Vorteile
- Kein Credit-Abuse mehr möglich.
- Auswertung nach dem Workshop: wer hat wie viel genutzt, welche Modelle beliebt.
- Rate-Limiting schützt gegen versehentliche Endlosschleifen im Client-Code.
- Basis für abrechenbare Tiers, falls Workshop-Konzept skaliert.

---

## Alternative: Cloudflare Access statt Eigenbau

Falls Magic-Link zu viel Custom-Code ist: **Cloudflare Access** vor Vercel schalten.

- Gratis bis 50 User.
- E-Mail-Allowlist im Cloudflare-Dashboard pflegen.
- Teilnehmer klickt Mail mit Magic Link → kommt rein.
- Kein eigener Code, keine eigene Mail-Infra.

**Nachteil:** Du bekommst keine Teilnehmer-ID in der App — Cloudflare Access liefert zwar Identity-Headers, aber das mit deiner App zu verdrahten kostet ähnlich viel wie ein eigener Magic-Link. Wenn du User-IDs nicht brauchst (z. B. wenn anonyme Sessions ausreichen), ist Cloudflare Access die schnellste Lösung.

---

## Empfehlung für die nächsten Workshops

| Workshop | Maßnahme |
|---|---|
| **Workshop morgen** | Aktueller Stand. Passwort teilen, fertig. |
| **Nach 2–3 erfolgreichen Workshops** | Stufe 1 umsetzen. E-Mail-Login gibt dir Feedback-Kanal und Vertrauensbasis für Teilnehmer-Communication. |
| **Sobald Workshops regelmäßig laufen** | Stufe 2. Usage-Daten werden zum Verkaufsargument („Deine Teilnehmer haben in 4 h 2.300 Bilder generiert — so intensiv wird das Tool genutzt"). |
| **Falls Tool öffentlich angeboten werden soll** | Stufe 2 ist Mindestpflicht + echtes Billing (Stripe). |

---

## Offene Design-Entscheidungen für später

1. **Multi-Workshop-Trennung:** Soll eine Teilnehmer-Mail nur einmal in einer Workshop-Instanz gelten, oder persistiert die Bibliothek über Workshops hinweg? → beeinflusst, ob `sessionId = email` oder `sessionId = email + workshopId`.
2. **Credit-Reset pro Workshop:** Per Cron, per Admin-Button, oder automatisch bei erstem Login eines neuen Workshops?
3. **DSGVO:** Wenn du E-Mails speicherst, brauchst du Datenschutzhinweis im Login-Flow. Bei anonymen Sessions heute nicht nötig.
4. **Bibliothek-Cleanup:** R2 läuft voll, wenn nie gelöscht wird. Policy: automatisches Löschen X Tage nach letztem Teilnehmer-Login?
