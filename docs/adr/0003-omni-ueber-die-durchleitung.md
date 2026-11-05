# ADR 0003: Video mit Gemini Omni Flash über die Gemini-Durchleitung des Gateways

- Datum: 2026-11-05
- Status: akzeptiert am 05.11.2026 (Rico im Chat, nach der Messung: „Ja, umbauen“ auf den Vorschlag ein Modell, 720p fest, Dauern 4 / 6 / 8 / 10 / 15 s, Credits 20 / 30 / 45 / 55 / 80). Keine Entscheidungsseite: kleines Werkzeug, Seminar in der Folgewoche, eine Session.
- Bezug: ADR 0002 (Veo über `/v1/videos`), ADR 0001 (Gateway, ein Schlüssel je App)
- Löst ab: den Weg aus ADR 0002 (Videoschnittstelle `/v1/videos`) und die drei Veo-Modelle

## In einem Satz

Google hat die Veo-3.1-Previews am 22.10.2026 abgeschaltet; das Studio erzeugt Videos jetzt mit `gemini-omni-1.2-flash` über die Gemini-Durchleitung des Gateways (`/gemini/v1beta/interactions`, Googles Interactions API), mit unverändertem Ablauf aus Start und Statusabfrage und weiter ohne Google-Schlüssel.

## Kontext

### Anlass (gemessen 05.11.2026)

- Jeder Videostart im Studio endete mit „Fehler bei der Videogenerierung. Credits wurden zurückerstattet.“ Ein Start gegen den Gateway mit dem Studio-Schlüssel: 404 von Google, „models/veo-3.1-lite-generate-preview is not found for API version v1beta, or is not supported for predictLongRunning“. Alle drei Veo-Namen 404, Googles Modellliste (61 Einträge, über die Durchleitung gelesen) führt kein `veo-*` mehr.
- Googles Abschaltliste: `veo-3.1-lite-generate-preview`, `veo-3.1-fast-generate-preview`, `veo-3.1-generate-preview` abgeschaltet am 22.10.2026, Ersatz `gemini-omni-1.2-flash` (veröffentlicht 05.11.2026). `gemini-omni-1.1-flash` wird am 03.12.2026 abgeschaltet und danach auf 1.2 umgeleitet.
- Der Fehlertext war allgemein, weil `describeGatewayError` keinen Fall für „Modell nicht gefunden“ hatte.

### Die Wege (gemessen 05.11.2026, Bericht `docs/pruefstand/litellm/bericht-omni-durchleitung.md`, Skript `scripts/omni-durchleitung-pruefstand.mjs`)

| Weg | Ergebnis |
|---|---|
| `/v1/videos` mit Omni | 404 von Google, „not supported for predictLongRunning“. Die Videoschnittstelle von LiteLLM 1.105 kann nur Veo. |
| Durchleitung, Name mit Präfix (`gemini/gemini-omni-1.1-flash`) | 404 von Google („Did you mean 'gemini-omni-1.1-flash'?“). Die Durchleitung reicht den Namen aus dem Rumpf wörtlich weiter. |
| Durchleitung, Name nicht in der Modellliste des Schlüssels | 403 `team_model_access_denied` vom Gateway |
| Durchleitung, `gemini-omni-1.2-flash` (neuer Eintrag ohne Präfix) | läuft, siehe unten |

Läufe über `POST /gemini/v1beta/interactions`, Kopf `x-goog-api-key` = virtueller Schlüssel:

| Fall | Ergebnis |
|---|---|
| Text, 3 s, 360p, `background: true` | Start 200 in 1,5 s mit Kennung (`v1_` + Base64, 70 Zeichen), `GET …/interactions/{id}` nach 22 s `completed`, Video inline als Base64, 640×360, mit Ton |
| Text, 4 s, 720p, synchron | 200 nach 25,8 s, 1280×720, 2,7 MB, 23.168 Video-Token |
| Startbild JPEG, 3 s, 360p, synchron | 200 nach 20,8 s. Das Startbild wird erstes Bild, von 3:2 auf 16:9 beschnitten |
| Text, 8 s, 720p, 9:16, `background: true` | fertig nach 39 s, 720×1280, 4,0 MB, fertige Antwort 5,3 MB in 3,3 s |
| Startbild PNG 3,3 MB (Galeriegröße), 4 s, 720p, 9:16, `background: true` | Anfrage 4,4 MB angenommen in 5,5 s, fertig nach 40 s. Jeder Statusabruf trägt das Startbild mit (4,4 MB, rund 2,5 s), die fertige Antwort 10,1 MB in 4,9 s |
| Text, 15 s, 720p, 16:9, `background: true` | fertig nach 59 s, 1280×720, 5,4 MB, fertige Antwort 7,3 MB in 4,2 s, 86.880 Video-Token (rund 1,04 $) |
| Dauer 20 s | 400 von Google, „exceeds the maximum allowed 15s“, kostenlos |

Preise laut Google (05.11.2026): 12 $ je Million Video-Token, 5.792 Token je Sekunde in 720p, also rund 0,07 $ je Sekunde (360p rund 0,023 $, 1080p rund 0,10 $).

## Entscheidung

- **Weg:** Gemini-Durchleitung des Gateways zur Interactions API, `background: true` und `store: true`. Die Startroute gibt die Kennung zurück, die Statusroute fragt `GET …/interactions/{id}` ab und legt das Video aus derselben Antwort nach R2. Der Ablauf der Oberfläche bleibt.
- **Ein Modell:** `gemini-omni-1.2-flash`, in der Oberfläche „Gemini Omni Flash“. `MODELL_VIDEO` überschreibt den Namen am Gateway, ohne Umbau.
- **Feste Auflösung 720p**, 16:9 und 9:16 wie bisher. Dauern 4, 6, 8, 10 und 15 s.
- **Credits** 20 / 30 / 45 / 55 / 80 (Vorschlag aus dem Sekundenpreis, rund 1,3 Cent je Credit wie bei den Bildern; echte Kosten 0,28 / 0,42 / 0,56 / 0,70 / 1,04 $).
- **Startbild** als Bild-Eingabe vor dem Prompt (Base64 im JSON statt Multipart).
- **Fehlertext:** eigener Fall „Das Modell gibt es beim Anbieter nicht mehr“ für 404 vom Anbieter.

Verworfen: direkt zu Google (Schlüssel zurück im Studio, gegen ADR 0002; nur als Notlösung, falls die Durchleitung ausfällt), Veo auf Googles Enterprise-Plattform (andere Anmeldung, Laufzeit unsicher), ein Videomodell eines anderen Anbieters über `/v1/videos` (nicht geprüft).

## Preis & Konsequenzen

- **Der Gateway bucht die Kosten nicht** (Stand der Messung): Spend des Schlüssels 4,5 Minuten und auch 19 Minuten nach dem ersten Lauf unverändert bei 1,0071 $, bei rechnerisch rund 0,97 $ Google-Kosten (mit den späteren Läufen des Abends rund 2,30 $). Bei Veo über die Durchleitung kam die Buchung nach etwa zwei Minuten. Das Monatsbudget des Schlüssels bremst Video damit nicht; die Bremse sind die Credits im Studio. Vermutung, nicht belegt: LiteLLM 1.105 hat für das neue Modell keinen Preis.
- **Google speichert die Vorgänge.** `background: true` verlangt `store: true`. Laut Googles Doku zur Interactions API bleiben gespeicherte Vorgänge im bezahlten Tarif 55 Tage liegen: Prompt, Startbild und fertiges Video. Bei Veo gab es das so nicht. Für ein Seminar mit Bildern der Teilnehmenden ist das zu wissen; ohne Speichern ginge nur der synchrone Aufruf (20 bis 60 s in einer Anfrage, Startroute dann mit längerem Zeitlimit).
- Lite, Fast und Standard entfallen. Wer eins davon gespeichert hatte, landet beim neuen Standardmodell.
- Die Statusabfrage trägt bei einem Startbild jedes Mal das Bild mit. Mit Bildern in Galeriegröße sind das mehrere Megabyte je Abruf; gemessen unkritisch.
- Unverändert aus ADR 0002: Scheitert ein Video erst nach dem Start (Status `failed`, Filter), werden die Credits nicht zurückgebucht. Rückbuchung gibt es nur, wenn der Start scheitert.
- `@google/genai` und `@ai-sdk/google` stehen weiter ungenutzt in `package.json`.

## Exit-Pfad

- Fällt die Durchleitung aus: gleiche Anfrage direkt an `https://generativelanguage.googleapis.com/v1beta/interactions` mit einem Google-Schlüssel. Es ändern sich nur Adresse und Schlüssel in `lib/gateway.ts`.
- Kommt ein Nachfolger von Omni 1.2: Eintrag im LiteLLM ohne Präfix anlegen, beim Schlüssel freigeben, `MODELL_VIDEO` setzen.
- Lernt LiteLLM Omni über `/v1/videos`: Die Routen aus ADR 0002 stehen im Git (Commit 849225f).

## Checkpoint

- Am Tag nach dem Bau: Spend des Studio-Schlüssels in der LiteLLM-Oberfläche ansehen. Steht er weiter still, Preis für `gemini-omni-1.2-flash` im Gateway nachtragen oder das Budget für Video als unwirksam festhalten.
- Vor dem 03.12.2026 nichts zu tun: Das Studio nutzt 1.2 schon.
- Nach dem Seminar: Credits gegen die Google-Abrechnung halten.

## Nachtrag 2026-11-05: Bau

| Datei | Was |
|---|---|
| `lib/models.ts` | Ein Videomodell, Dauern 4 bis 15 s, `VIDEO_RESOLUTION`, `resolveVideoModel` (liest `MODELL_VIDEO`), `VIDEO_SIZES` entfernt |
| `lib/gateway.ts` | `gatewayGoogleHeaders()` und `gatewayInteractionsUrl()` ersetzen `gatewayAuthHeaders()` und `gatewayVideoUrl()`; Fehlerfall „nicht gefunden“ |
| `lib/validation.ts` | `isValidVideoJobId` prüft die Kennung der Interactions API (nur Zeichen, die in einem Pfadabschnitt nichts anrichten) |
| `app/api/generate-video/start/route.ts` | `POST …/interactions` mit `response_format`, `background`, `store`; Startbild als Bild-Eingabe |
| `app/api/generate-video/status/route.ts` | `GET …/interactions/{id}`, Video aus dem Schritt des Modells, Text des Modells als Hinweis, wenn kein Video kommt |
| `components/video/*` | Texte ohne „Veo“, Abfrage alle 4 s statt 7 s, Dauer-Knöpfe umbrechend |
| `.env.example` | Modellliste, Hinweis zum Namen ohne Präfix, `MODELL_VIDEO` |

Geprüft: `tsc --noEmit` ohne Fehler, `next build` läuft durch, eslint auf den geänderten Dateien ohne neue Meldungen (der Fehler in `hooks/useVideoSettings.ts` Zeile 31 bestand vorher). Die Anfragen der Routen sind mit denselben Feldern gegen den Gateway gelaufen (Tabelle oben, auch mit Startbild in Galeriegröße).

**Nicht geprüft:** die Routen im laufenden Studio mit Anmeldung, Credits und R2, und die Oberfläche im Browser. Die lokale `.env` zeigt auf `auth.loschke.ai` mit der Live-Rücksprungadresse. Das alte Login-System ist seit dem 02.11.2026 durch Authentik abgelöst, der Dienst antwortet nicht mehr; die Live-Umgebung hat offenbar eine andere Konfiguration (Rico war am 05.11. angemeldet). Lokal ist damit keine Anmeldung möglich. Die Prüfung in der Oberfläche liegt bei Rico nach dem Push.

## Nachtrag 2026-11-05 (Nacht): Go, Commit, Push

Rico: „push“. Commit `2d9564f` auf `main`, Deployment bei Vercel READY. Prüfung in der Oberfläche durch Rico steht aus (Testprompts im Chat).

## Nachtrag 2026-11-06: Video fortsetzen und letztes Bild als Startframe

Anlass (Rico): 15 Sekunden reichen nicht für sinnvolle Szenen. Üblich ist, das letzte Bild eines Videos als Startbild des nächsten zu nehmen; Omni kann Videos außerdem selbst verlängern. Rico will beides im Studio („guter Demo-Charakter, aber auch produktiv“), Go auf den Bauvorschlag im Chat: „Ja, so bauen“.

### Messung (Skript `scripts/omni-fortsetzen-pruefstand.mjs`, Bericht wie oben)

| Fall | Ergebnis |
|---|---|
| Fortsetzen über `previous_interaction_id`, 360p 16:9, +4 s | 200, fertig nach 42 s, zurück kommt das ganze Video (8,0 s) |
| Kette, noch einmal +4 s | fertig nach 63 s, 12,0 s. Übergänge an Einzelbildern geprüft: durchgehend |
| Dasselbe in 720p, 9:16 | 4 s → 8 s → 12 s, fertig nach 33 / 58 / 75 s, Dateien 3,6 / 5,6 / 7,5 MB |
| Video als Eingabe (Base64) statt Vorgang | Start 200, nach 11 s `failed`, `errors: [{code: INVALID_ARGUMENT}]`. Passt zu Googles Hinweis: Fortsetzung hochgeladener Videos ist im EWR gesperrt |
| Verbrauch | Ausgabe nur die neuen Sekunden; dazu das bisherige Video als Eingabe (720p: 23.168 Token beim ersten, 69.504 beim zweiten Schritt, zu 1,50 $ je Million 3,5 und 10 Cent) |
| Fehlerform | Gescheiterte Vorgänge tragen `errors` (Liste), nicht `error` |
| R2 | Signierte Adresse mit `Origin`-Kopf: kein `access-control-allow-origin`. Der Bucket hat keine CORS-Regel; der Schlüssel des Studios darf sie weder lesen noch setzen |

`duration` ist beim Fortsetzen die angehängte Länge (3 bis 10 s), Obergrenze 30 s gesamt. `task: extend` war nicht nötig.

### Entscheidung

- **„Fortsetzen“** am fertigen Video und an Videos in der Bibliothek. Der Server knüpft über `previous_interaction_id` an; die Kennung liest er aus den Metadaten des Videos in R2, nie aus der Anfrage. Wählbar 4, 6, 8, 10 s, solange die Gesamtlänge unter 30 s bleibt. Credits wie ein neues Video dieser Länge (20 / 30 / 45 / 55). Das verlängerte Video wird ein neuer Eintrag, das alte bleibt.
- **„Letztes Bild als Startframe“** an denselben Stellen, im Browser: Video holen, ans Ende springen, Bild auf eine Zeichenfläche, als JPEG ins Startframe-Feld. Kostet nichts, geht mit jedem Video.
- Metadaten eines Videos bekommen `interactionId`, `durationSec` (aus dem MP4-Kopf gelesen, `lib/mp4.ts`) und `aspectRatio`. Die Oberfläche bekommt nur `durationSec` und `canExtend`.

### Preis & Konsequenzen

- Fortsetzen geht nur für Videos, die seit diesem Bau entstanden sind (ältere haben keine Kennung), und nur 55 Tage lang (Googles Aufbewahrung). Danach verschwindet der Knopf.
- **„Letztes Bild als Startframe“ braucht eine CORS-Regel am R2-Bucket** (GET und HEAD für `https://studio.lernen.diy` und `http://localhost:3001`). Ohne sie meldet der Knopf „Am R2-Bucket fehlt die CORS-Regel“. Rico setzt sie bei Cloudflare.
- Die Credits decken beim Fortsetzen die Eingabekosten nicht mit ab: In 720p kostet der zweite Schritt einer Kette rund 0,38 $ statt 0,28 $, längere Ketten entsprechend mehr. Für ein Seminar-Werkzeug hingenommen (Vorschlag, nicht von Rico einzeln bestätigt).
- Der Prompt eines verlängerten Videos in der Bibliothek ist der Prompt der Fortsetzung, nicht die ganze Kette.
- Scheitert ein Video nach dem Start, steht jetzt Googles Grund in der Meldung (`errors[0].message`). Die Credits bleiben wie bisher weg.

### Bau

| Datei | Was |
|---|---|
| `lib/mp4.ts` | neu: Länge aus `moov`/`mvhd` |
| `lib/r2.ts` | Metadaten `interactionId`, `durationSec`, `aspectRatio`; `readMeta` exportiert; `canExtendVideo`; Liste liefert `durationSec` und `canExtend` |
| `lib/models.ts` | `VIDEO_EXTEND_DURATIONS`, `VIDEO_MAX_TOTAL_SECONDS`, `VIDEO_EXTEND_MAX_AGE_DAYS`, `extendDurationsFor` |
| `lib/validation.ts` | `isValidGalleryId` |
| `lib/client-image.ts` | `letztesBildAusVideo` |
| `app/api/generate-video/start/route.ts` | `extendFrom: { id }`: Prüfung vor dem Credit-Abzug, dann `previous_interaction_id` |
| `app/api/generate-video/status/route.ts` | `errors[]` lesen; Länge, Kennung und Seitenverhältnis in die Metadaten |
| `components/video/video-tab.tsx`, `video-settings.tsx` | Fortsetzen-Zustand mit eigenem Kopf, Längen und Beschriftungen; Knöpfe „Fortsetzen“ und „Letztes Bild als Startframe“ am Ergebnis |
| `components/gallery/gallery-view.tsx`, `app/app/page.tsx` | dieselben zwei Knöpfe an Videos in der Bibliothek (Kachel und Großansicht), Übergabe an den Video-Reiter |

Geprüft: `tsc --noEmit` und `next build` ohne Fehler, eslint auf den geänderten Dateien ohne Fehler. `mp4DurationSeconds` gegen neun Testvideos (3,0 bis 15,0 s richtig) mit Gegenproben (PNG, abgeschnittene Datei, leer: `null`). `letztesBildAusVideo` in Chrome (agent-browser, lokale Testseite mit dem übersetzten Modul): 640×360 und 720×1280 richtig, Bild deckungsgleich mit dem letzten Bild aus ffmpeg; fremde Herkunft ohne CORS und 404 geben die vorgesehenen Meldungen. Die Felder der Fortsetzung sind so gegen den Gateway gelaufen, wie die Startroute sie schickt.

**Nicht geprüft:** beide Knöpfe im laufenden Studio (lokal weiter keine Anmeldung möglich), die Oberfläche im Browser, und „Letztes Bild“ gegen R2, solange die CORS-Regel fehlt. Auch nicht gelaufen: eine Kette bis an die 30 s.
