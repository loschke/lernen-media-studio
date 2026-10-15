# ADR 0001: Studio an LiteLLM, Bilder über GPT Image 2.5 (Flare, Sunburst), Chat über Haiku 5.5

- Datum: 2026-10-15
- Status: akzeptiert am 15.10.2026 (Rico, Entscheidungsseite Sammlung `antworten`: s1 bis s3 „passt“, f1 a, f2 a, f3 a, f4 a; Chat: „ich bin überall deinen Empfehlungen gefolgt“)
- Bezug: ADR 0084 in `build-jetzt-superagents` (LiteLLM als Gateway, Env-Schalter, Namen `MODELL_GATEWAY_URL` und `MODELL_GATEWAY_KEY`)
- Entscheidungsseite: <https://claude.ai/artifact/12cj27SLikcxKYLQqMEQJX> (Sammlung `antworten`)

## In einem Satz

Das Studio ruft Bild und Chat nicht mehr direkt bei Google und Anthropic auf, sondern über Ricos LiteLLM (`https://litellm.sevenx.cloud`) mit einem eigenen virtuellen Schlüssel; Bilder entstehen mit `gpt-image-2.5-flare` (schnell) und `gpt-image-2.5-sunburst` (Premium, höhere Qualitätsstufe), der Chat läuft auf Haiku 5.5, Video (Veo) bleibt vorerst direkt bei Google.

## Kontext

### Was heute im Code steht (gelesen 2026-10-15)

| Stelle | Heute | Betroffen |
|---|---|---|
| `app/api/generate/route.ts` | `generateText` mit `@ai-sdk/google`, Modelle aus `lib/models.ts` (drei Gemini-Bildmodelle, Credits 1/2/5), `imageConfig: { aspectRatio, imageSize }` mit 1K/2K/4K | ja |
| `app/api/edit/route.ts` | wie oben, nur Gemini-3.x-Modelle, Bilder als `image`-Parts in einer Nutzer-Nachricht | ja |
| `app/api/chat/route.ts` | `streamText` mit `@ai-sdk/anthropic`, Modell `claude-haiku-4-5-20251001` fest im Code, Bilder als Teile der Nachricht | ja |
| `app/api/generate-video/*` | `@google/genai` direkt, Veo 3.1 | nein (Google ist nicht am Gateway, ADR 0084 Stufe 3 ungebaut) |
| `lib/credits.ts` | Credits je Aufruf aus `getModelCost`, Rückbuchung bei Fehler | bleibt, nur die Zahlen ändern sich |
| `.env.example` | `GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `DEFAULT_IMAGE_SIZE` | Anthropic-Schlüssel entfällt, Google bleibt für Veo, `DEFAULT_IMAGE_SIZE` entfällt |

### Der Gateway

- `https://litellm.sevenx.cloud` antwortet (Liveness 200 am 15.10.). Dienst in Coolify: „LiteLLM - AI-Gateway“, Projekt `build-mastra`, `running:healthy`. Die Umgebung dort hat `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` und weitere Anbieter.
- Welche Modellnamen der Gateway kennt (ob `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst` und ein Haiku-5.5-Alias eingetragen sind) und ob für sie Preise hinterlegt sind, ist **nicht gemessen**. Das Studio hat noch keinen eigenen virtuellen Schlüssel; fremde Schlüssel anderer Instanzen wurden absichtlich nicht benutzt (ADR 0084: ein Schlüssel je App mit Budget).
- Gemessen am 08.10. (ADR 0084, gegen queos Gateway): `/v1/messages` im Anthropic-Format mit Haiku liefert 200 und die Köpfe `x-litellm-response-cost` und `x-litellm-key-spend`. Das ist der Pfad, den `@ai-sdk/anthropic` mit `baseURL` nimmt.
- LiteLLM-Doku: `/v1/images/generations` und `/v1/images/edits` werden für OpenAI durchgereicht, Kosten werden erfasst. Die Edits-Doku nennt „quadratische PNG unter 4 MB“ als Grenze; das stammt erkennbar aus der DALL-E-2-Zeit und ist für GPT Image **nicht geprüft**. Das Prüfstand-Skript misst genau das.

### GPT Image 2.5 (OpenAI-Doku, gelesen 2026-10-15)

- Zwei Modelle, ein Preis: `gpt-image-2.5-flare` (kleines, schnelles Modell) und `gpt-image-2.5-sunburst` (Basismodell, auf Qualität ausgelegt). Beide: Text-Eingabe 5 $/M Token, Bild-Eingabe 8 $/M, Bild-Ausgabe 30 $/M. **Der Preis hängt nicht am Modell, sondern an Qualitätsstufe und Größe.**
- Qualitätsstufen: `auto`, `low`, `medium`, `high`, `xhigh`, `max`. OpenAI selbst: dieselbe Stufe heißt bei Flare und Sunburst nicht dieselbe Qualität oder Dauer; erst Sunburst wählen, wenn Qualität zählt, danach Flare auf Tempo prüfen.
- Ausgabe-Token je Bild 1024×1024 laut OpenAI-Rechner (von mehreren Quellen gleich zitiert, nicht selbst gemessen): low 196, medium 439, high 1 756, xhigh 3 122, max 7 024. Das sind etwa 0,006 / 0,013 / 0,053 / 0,094 / 0,21 $ je Bild, nur Ausgabe. Querformat 1536×1024 ist je Stufe etwas günstiger. Bearbeitungen kosten zusätzlich die Bild-Eingabe.
- Größe: `auto` oder `BREITExHÖHE`, Kanten Vielfache von 16, höchstens 3 840 px, Verhältnis höchstens 3:1, 655 360 bis 8 294 400 Pixel gesamt. Übliche Größen 1024×1024, 1536×1024, 1024×1536, 2048×2048, 2048×1152, 3840×2160.
- Endpunkte: `images/generations`, `images/edits`, Batch. Keine Chat- oder Responses-API.
- Dauer: Drittquelle (Astorie, Flare, 2K, je eine Messung) 10 bis 30 s bis `xhigh`, etwa 60 s bei `max`. Die Routen haben `maxDuration = 60`. Sunburst-Dauer **nicht gemessen**.

### AI SDK (im Paketcode geprüft 2026-10-15)

- Das Projekt hat `ai` 6.0.159 mit `@ai-sdk/provider` 3.0.8 (Spezifikation v3). Dazu passt `@ai-sdk/openai` **3.0.129** (Abhängigkeit `@ai-sdk/provider` 3.0.19). Die Linie 4.x (4.0.95) gehört zu AI SDK 7 (Spezifikation v4) und passt nicht.
- `@ai-sdk/openai` 3.0.129 kennt `gpt-image-2.5-flare` und `-sunburst` samt Datumsständen, die Qualitätsstufen bis `xhigh` und `max`, `background`, `outputFormat`, `inputFidelity`, und schickt Bearbeitungen mit mehreren Bildern als Multipart an `/images/edits` (`generateImage` mit `prompt: { images, text }`). `aspectRatio` wird abgelehnt, es gilt `size`.
- `createOpenAI({ baseURL: GATEWAY + '/v1', apiKey: KEY })` lenkt alles auf den Gateway, ebenso `createAnthropic({ baseURL, apiKey })` für den Chat.

## Entscheidung

Das Studio bekommt einen eigenen virtuellen Schlüssel im LiteLLM (Alias `lernen-media-studio`, Budget, nur die drei Modelle freigegeben). Die drei Routen lesen `MODELL_GATEWAY_URL` und `MODELL_GATEWAY_KEY` sowie die Modellnamen `MODELL_CHAT`, `MODELL_BILD_SCHNELL` und `MODELL_BILD_PREMIUM` aus der Umgebung (das Prüfstand-Skript liest dieselben Namen). Die Namen benennen das Angebot im Studio, nicht das Modell, anders als `BILD_MODELL_FLARE` und `BILD_MODELL_SUNBURST` in ADR 0084: Wechselt das Modell hinter „Premium“, bleibt der Name. Bild und Bearbeitung laufen über `generateImage` aus `@ai-sdk/openai` 3.x, der Chat über `@ai-sdk/anthropic` mit Gateway-Adresse. Die Gemini-Bildmodelle verschwinden aus `lib/models.ts`, Veo bleibt direkt bei Google.

Vorschlag für die Stufen, zur Entscheidung auf der Seite:

| Angebot im Studio | Modell | Stufe | Ausgabe je Bild 1024² | Credits (Vorschlag) |
|---|---|---|---|---|
| Schnell | `gpt-image-2.5-flare` | `medium` | ≈ 0,013 $ | 1 |
| Premium | `gpt-image-2.5-sunburst` | `high` | ≈ 0,053 $ | 4 |
| (optional) Premium+ | `gpt-image-2.5-sunburst` | `xhigh` | ≈ 0,094 $ | 7 |

Seitenverhältnis des Studios → Größe (alle Kanten Vielfache von 16, im erlaubten Bereich): 1:1 → 1024×1024, 3:2 → 1536×1024, 2:3 → 1024×1536, 16:9 → 2048×1152, 9:16 → 1152×2048, 4:3 → 1024×768, 3:4 → 768×1024. Der Schalter `DEFAULT_IMAGE_SIZE` (1K/2K/4K) entfällt.

## Preis & Konsequenzen

- Jeder Bildaufruf und jeder Chat-Zug geht über einen Netzknoten mehr. Fällt der Gateway, fällt das Studio bis auf Video. Dafür: ein Schlüssel, ein Budget, Nutzung und Kosten je App im Gateway sichtbar.
- Kosten im Gateway stimmen nur, wenn für `gpt-image-2.5-*` und Haiku 5.5 Preise hinterlegt sind. Fehlen sie, zeigt der Gateway 0. **Nicht gemessen**, Teil des Prüfstands.
- Die Credit-Zahlen oben sind Vorschlag aus Listenpreisen, nicht aus gemessenen Rechnungen. Nach zwei Wochen gegen die Gateway-Zahlen prüfen.
- Bearbeitung: ob der Gateway JPEG und nicht quadratische Bilder an `/images/edits` durchlässt, entscheidet, ob das Studio vor dem Senden umwandeln muss. **Nicht gemessen.**
- Dauer von Sunburst `high` und `xhigh` gegen `maxDuration = 60` **nicht gemessen**.
- Das Workshop-Material im Chat-Systemprompt nennt Gemini nicht, bleibt also gültig. Die Oberfläche zeigt heute Namen wie „Höchste Qualität“ und Credit-Zahlen aus `lib/models.ts`; sie ändern sich mit der Liste.

## Exit-Pfad

Ein `git revert` des Bau-Commits stellt die Google- und Anthropic-Direktanbindung wieder her; `GOOGLE_GENERATIVE_AI_API_KEY` bleibt ohnehin (Veo), `ANTHROPIC_API_KEY` müsste zurück in die Umgebung. Credits, Galerie, R2 und Auth sind nicht berührt. Ein Wechsel nur des Bildmodells (etwa zurück zu Gemini über den Gateway, wenn der einmal Google bedient) ist ein Eintrag in `lib/models.ts` und eine Umgebungsvariable.

## Checkpoint

- Vor dem Bau: `node scripts/litellm-pruefstand.mjs` mit dem Studio-Schlüssel. Kippt, wenn Modelle fehlen, Preise 0 sind, Edits JPEG ablehnen oder Sunburst `high` über 45 s braucht.
- Zwei Wochen nach dem Bau: Gateway „Usage“ je Schlüssel gegen die verbuchten Credits halten. Weichen Preis je Credit und Kosten je Bild um mehr als die Hälfte ab, Credit-Tabelle anpassen.

## Nachtrag 2026-10-15: Prüfstand vorbereitet

`scripts/litellm-pruefstand.mjs` liegt bereit und bricht ohne Schlüssel mit Hinweis ab (geprüft, Exit 2). Es misst Modellliste und Preise, Chat mit Text, Bild und Stream, je Stufe ein Bild mit Flare und Sunburst (gleicher Prompt), Querformat, Bearbeitung mit einem Bild, zwei Bildern, JPEG und Nicht-Quadrat, sowie die Fehlerbilder. Ergebnis landet in `docs/pruefstand/litellm/bericht.md` samt Bildern.

## Nachtrag 2026-10-15 (abends): Prüfstand gelaufen, Schlüssel `lernen-media-studio`

Vollständiger Bericht: `docs/pruefstand/litellm/bericht.md`, Bilder daneben (nicht versioniert).

**Gateway.** LiteLLM 1.105.0. Der Schlüssel sieht genau `claude-haiku-5-5`, `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst`. Preise hinterlegt: Bild-Ausgabe 30 $/M Token, Bild-Eingabe 8 $/M, Text-Eingabe 5 $/M; Haiku 5.5 mit 0,10 $/M Eingabe und 0,50 $/M Ausgabe, ab 100 000 Token Prompt 0,50 und 2,50 $/M (gegen Anthropics Preisseite geprüft am 15.10., stimmt überein). Unbekanntes Modell: 403 mit klarem Text. Falscher Schlüssel: 401. Ungültige Stufe oder Größe: 400 mit OpenAI-Text.

**Chat.** `/v1/messages` mit Text, mit Bild und gestreamt: 200 in 0,8 bis 1,2 s, Kostenkopf gesetzt (3,5 · 10⁻⁵ $ je Zug). Auffällig: Die Antwort mit Bild begann mit einem leeren `thinking`-Block. `streamText` aus `@ai-sdk/anthropic` verarbeitet das, der Chat-Code muss nichts tun.

**Bilder erzeugen, gleicher Prompt, 1024×1024.** Token und Kosten treffen die Rechnerwerte aus dem Kontext exakt.

| Modell | Stufe | Dauer | Ausgabe-Token | Kosten |
|---|---|---|---|---|
| Flare | low | 10,8 s | 196 | 0,0060 $ |
| Flare | medium | 12,7 s | 439 | 0,0133 $ |
| Flare | high | 20,6 s | 1 756 | 0,0528 $ |
| Sunburst | low | 14,5 s | 196 | 0,0060 $ |
| Sunburst | medium | 20,2 s | 439 | 0,0133 $ |
| Sunburst | high | **40,2 s** | 1 756 | 0,0528 $ |
| Flare | medium, 1536×1024 | 13,6 s | 343 | 0,0104 $ |
| Flare | medium, 2048×1152 | 13,3 s | 367 | 0,0112 $ |

Sunburst `high` liegt bei 40 s, `maxDuration = 60` der Route hält das, aber ohne viel Luft; `xhigh` und `max` wurden nicht gemessen (`--teuer`). Die PNG-Dateien sind 2,2 bis 5,4 MB (2048×1152); die Routen geben nur R2-Adressen zurück, das Vercel-Antwortlimit ist nicht berührt.

Sichtung (Fable): Flare `medium` ist für Workshop-Zwecke voll brauchbar. Sunburst `high` zeichnet Hände, Gesicht und Laternenhaus sauberer; der Abstand ist sichtbar, aber kein Sprung. Das stützt Option a in F1.

**Bilder bearbeiten: blockiert, Ursache im Gateway, nicht im Studio.** Jeder Aufruf von `/v1/images/edits` (Flare, Sunburst, ein Bild, zwei Bilder, Feld `image` und `image[]`, mit und ohne `quality`, aus Node und aus curl) endet mit 500: `litellm.InternalServerError: OpenAIException - /Hallo12`. Derselbe Fehler steht in build (ADR 0091, Messung vom 14.10.) für `gpt-6-luna` über die Responses-API. Chat-Completions und `images/generations` laufen; betroffen sind genau die Pfade, die in LiteLLM die Umgebungsvariable `OPENAI_API_BASE` lesen. Der Audit-Befund 6 in build führt `OPENAI_API_BASE` (und `ANTHROPIC_API_BASE`, `VOYAGE_API_BASE`) als Vorlagen-Reste des Coolify-Dienstes. Protokolle des Dienstes waren über den Coolify-Zugang nicht lesbar (`read:sensitive` fehlt). **Vorschlag:** `OPENAI_API_BASE` und `ANTHROPIC_API_BASE` aus der Umgebung des LiteLLM-Dienstes entfernen (oder auf `https://api.openai.com/v1` setzen), Dienst neu starten, dann `node scripts/litellm-pruefstand.mjs --nur edit`. Erst wenn das grün ist, wird die Bearbeitung gebaut. JPEG als Eingabe bleibt bis dahin ungeprüft (Datei `quelle.jpg` fehlt).

**Folgen für die Entscheidung.** F1 Option a bleibt die Empfehlung (gemessen 1,3 gegen 5,3 Cent, Verhältnis 1 zu 4). Checkpoint „Sunburst high über 45 s“ nicht gerissen (40 s), aber nah; beim Bau `maxDuration` auf 90 s heben, wenn Vercel-Plan es erlaubt. Richtung r5 (erst messen) hat sich ausgezahlt: Die Edit-Grenze aus der LiteLLM-Doku war nicht das Problem, ein Umgebungsrest war es.

## Nachtrag 2026-10-15 (spät): Bearbeiten läuft, Ursache bestätigt

Rico hat `OPENAI_API_BASE` und `ANTHROPIC_API_BASE` beim LiteLLM-Dienst in Coolify gelöscht und den Dienst neu gestartet. Danach `node scripts/litellm-pruefstand.mjs --nur edit` (Bericht `docs/pruefstand/litellm/bericht-lauf2-edit.md`; der volle erste Lauf bleibt `bericht.md`; die drei curl-Aufrufe mit echten Bildern stehen nur in der Tabelle unten) und drei Aufrufe mit echten Bildern per curl:

| Fall | Modell, Stufe | Eingabe | Ergebnis | Dauer | Token in/out | Kosten |
|---|---|---|---|---|---|---|
| ein Bild, Feld `image` | Flare medium | 1×1-PNG | 200 | 13,4 s | 33 / 515 | 0,0156 $ |
| ein Bild | Sunburst high | 1×1-PNG | 200 | **54,8 s** | 33 / 2 058 | 0,0619 $ |
| zwei Bilder, Feld `image` wiederholt | Flare medium | PNG, PNG | 200 | 12,8 s | 44 / 515 | 0,0157 $ |
| zwei Bilder, Feld `image[]` | Flare medium | PNG, PNG | 200 | 13,4 s | 44 / 515 | 0,0157 $ |
| echtes Bild, quadratisch | Flare low | PNG 1024² | 200, Ausgabe 1254×1254 | 13 s | 1 048 / 229 | |
| echtes Bild, Querformat | Flare low | PNG 1536×1024 | 200, Ausgabe 1536×1024 | 17 s | 1 560 / 158 | |
| echtes Bild, **JPEG** | Flare low | JPEG 1536×1024 | 200, Ausgabe 1536×1024 | 14 s | 1 560 / 158 | |

Befunde:
- Die Ursache war die Umgebungsvariable, wie vermutet. Der Gateway-Fehler „/Hallo12“ ist weg, ohne Änderung an Modellen oder Schlüssel.
- JPEG und Querformat gehen durch; die Grenze „quadratische PNG“ aus der LiteLLM-Doku gilt für GPT Image nicht. Das Studio muss nichts umwandeln. Beide Feldnamen für mehrere Bilder werden angenommen; `@ai-sdk/openai` schickt `image[]`.
- Ein Bild als Eingabe kostet 1 000 bis 1 600 Eingabe-Token (8 $/M), also etwa einen Cent je Referenzbild zusätzlich zur Ausgabe. Bei drei Referenzbildern (Studio-Maximum) sind das rund 3 Cent obendrauf. Für die Credit-Tabelle: Bearbeiten mit Sunburst high liegt bei etwa 7 bis 9 Cent, nicht 5.
- **Sunburst high beim Bearbeiten: 55 s.** Das reißt `maxDuration = 60` praktisch. Richtung r7 (90 s) wird damit Pflicht, oder Premium-Bearbeitung läuft auf `medium`. Steht als Frage F4 auf der Entscheidungsseite.
- Ohne `size` liefert die Bearbeitung das Seitenverhältnis der Eingabe zurück (1024² kam als 1254² zurück, `auto`). Beim Bau `size` passend zum Eingabebild setzen oder `auto` bewusst lassen.

## Nachtrag 2026-10-15: Antworten und Bauauftrag

Rico hat alle Punkte wie empfohlen beantwortet. Notiz zu F2: „Modellnamen sind irrelevant, wir bleiben bei den Klassenbezeichnungen für Nutzer, die Modelle können klein darunter stehen, wir haben dann nur noch zwei Klassen.“ Daraus folgt für die Oberfläche: zwei Angebote „Schnell“ (1 Credit) und „Premium“ (4 Credits), der Modellname steht klein darunter. F4 a: Zeitlimit der Bild- und Bearbeitungsroute auf 120 s, Premium bleibt `high` auch beim Bearbeiten.

Bau in dieser Session auf Ricos Wort („bitte so umsetzen“), weil die Vorsession den Kontext hat und der Bau klein ist. Kein eigenes Anforderungsdokument: Die Oberfläche ändert nur die Einträge der Modellwahl (Beschriftung, Credits, Modellname klein), alles andere bleibt. Nachweise folgen unten.

## Nachtrag 2026-10-15: Bau

Geändert (nicht committet):

| Datei | Was |
|---|---|
| `lib/models.ts` | Zwei Angebote `schnell` (Flare, medium, 1 Credit) und `premium` (Sunburst, high, 4 Credits), beide bearbeitungsfähig; `resolveImageModel` mit Env-Override; `ASPECT_RATIO_SIZES` statt 1K/2K/4K; Video unverändert |
| `lib/gateway.ts` (neu) | `openaiGateway()`, `anthropicGateway()`, `CHAT_MODEL`, `gatewayConfigured`, `describeGatewayError` (Budget → 402, Rate → 429, Timeout → 504, Inhaltsfilter → 422) |
| `app/api/generate/route.ts` | `generateImage` über `@ai-sdk/openai`, `size` aus dem Seitenverhältnis, `quality` aus dem Angebot, `maxDuration` 120, Abbruch nach 110 s, Credits-Rückbuchung wie vorher |
| `app/api/edit/route.ts` | `generateImage` mit `prompt: { images, text }`, keine `size` (Ergebnis behält das Eingabeformat), sonst wie Generate |
| `app/api/chat/route.ts` | Modell `anthropicGateway()(CHAT_MODEL)` statt festem Haiku 4.5, Prüfung `gatewayConfigured` |
| `components/generate/generate-settings.tsx` | Modellname klein unter dem Angebot (Ricos Notiz zu F2) |
| `components/edit/edit-tab.tsx` | nur Kommentar; der Rückfall auf das Standard-Angebot greift, wenn im Browser ein altes Kürzel gespeichert ist |
| `.env.example` | `MODELL_GATEWAY_*`, `MODELL_CHAT`, `MODELL_BILD_*`; `ANTHROPIC_API_KEY` und `DEFAULT_IMAGE_SIZE` entfallen, Google-Schlüssel bleibt für Veo |
| `package.json` | `@ai-sdk/openai` 3.0.129 |
| `scripts/litellm-sdk-probe.mjs` (neu) | Probelauf durch den SDK-Pfad der Routen |

Nachweise:
- `npx tsc --noEmit`: 0 Fehler. `eslint` auf den geänderten Dateien: 0 Fehler, 3 bestehende Warnungen (`<img>`). Die fünf bestehenden Lint-Fehler liegen in `hooks/useVideoSettings.ts` und `hooks/useGenerateSettings.ts` (setState im Effect) und waren vor dem Bau da; nicht angefasst.
- `node scripts/litellm-sdk-probe.mjs` gegen den Gateway: Erzeugen Flare medium 1536×1024 in 15,0 s (PNG, 4,2 MB); Bearbeiten mit JPEG-Eingabe über `prompt.images` in 14,6 s, Ergebnis 1536×1024 (Format bleibt, keine Umwandlung nötig); Chat gestreamt mit Bild über `createAnthropic({ baseURL })` in 2,0 s, 2 084 Eingabe-Token, Antwort beschreibt das Bild.
- Nicht geprüft in dieser Session: die Oberfläche selbst (Anmeldung nötig). Dafür der Prüfstand für Rico, Adresse in `docs/roadmap.md`.
- Offen für Rico: `ANTHROPIC_API_KEY` und `DEFAULT_IMAGE_SIZE` aus `.env.local` entfernen (Roadmap-Kriterium 4); in Vercel `MODELL_GATEWAY_URL`, `MODELL_GATEWAY_KEY` setzen und `ANTHROPIC_API_KEY` entfernen, bevor gepusht wird.
- Geprüft nach Review: Die Oberfläche zeigt bei Fehlern den Text aus `error`, sie verzweigt nicht nach Status 402; der Budget-Fehler des Gateways (402) kollidiert also nicht mit `insufficient_credits`. Der Chat rendert nur `text`-Teile; der leere `thinking`-Block, den Haiku 5.5 über den Gateway voranstellt, bleibt unsichtbar.

## Nachtrag 2026-10-15: Go, Commit, Push

Rico: „es ist grad niemand in der app, bitte commit und push“. Commit `6ebcbb2` auf `main`, gepusht am 15.10.2026 abends. Vercel-Variablen hat Rico selbst gesetzt: `MODELL_GATEWAY_URL`, `MODELL_GATEWAY_KEY`; `ANTHROPIC_API_KEY` entfernt. **Abweichung von der Roadmap:** Rico hat auch `GOOGLE_GENERATIVE_AI_API_KEY` in Vercel gelöscht, Video (Veo) ist live damit außer Betrieb, bis Veo über den Gateway läuft (nächste Etappe, Parkplatz-Auslöser gezogen). Die Prüfung der Oberfläche findet direkt in der Live-Umgebung statt, Prüfstand-Seite in `docs/roadmap.md`.
