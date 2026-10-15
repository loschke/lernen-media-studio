# Roadmap lernen-media-studio

- Angelegt: 2026-10-15 (Session „LiteLLM-Umstellung“), noch nicht von Rico beschlossen
- **Führendes Dokument ist die Seite:** noch keine Roadmap-Seite. Diese Datei ist bis dahin
  der einzige Zeiger. Sobald mehr als eine Etappe ansteht, entsteht die Seite nach dem
  Skill `arbeitsweise` und wird hier eingetragen.

## Wo wir stehen

Etappe 1 und 2 sind gepusht und live geprüft. Stand je Etappe
hier, bis es eine Seite mit Sammlung `fortschritt` gibt.

| # | Etappe | Stand |
|---|---|---|
| 1 | Studio an LiteLLM: Bilder über GPT Image 2.5, Chat über Haiku 5.5 | laeuft (gepusht 15.10., Commit 6ebcbb2, Prüfung live) |
| 2 | Video (Veo) über LiteLLM | erledigt (15.10. Nacht, Commits 849225f, 5379d73, 1ac74c4; Prüfstand live S1 bis S6 Funktioniert, Gesamt Go im Chat) |

## Das Ziel in einem Absatz

Das Studio hängt mit einem eigenen virtuellen Schlüssel an Ricos LiteLLM. Dort sind
Nutzung, Kosten und Budget je App sichtbar, und ein Modellwechsel ist ein Eintrag im
Gateway statt ein Umbau im Studio. Bilder entstehen mit GPT Image 2.5 in zwei Angeboten
(schnell mit Flare, Premium mit Sunburst), der Chat läuft auf Haiku 5.5. Video (Veo)
läuft seit Etappe 2 über die Videoschnittstelle des Gateways, ohne Google-Schlüssel und ohne Endbild.

## Die Etappen in Baureihenfolge

| # | Etappe | Grundlage | Vorgehen | Modell |
|---|---|---|---|---|
| 1 | LiteLLM-Umstellung Bild und Chat | ADR 0001 | Entscheidungsseite, Prüfstand-Skript gegen den Gateway, Bau in drei Stücken (Bild, Bearbeitung, Chat), Prüfstand in der Oberfläche | Vorsession Fable, Bau Opus |
| 2 | Video (Veo) über LiteLLM | ADR 0002 | Messung Durchleitung gegen `/v1/videos`, Entscheidungsseite, Bau in zwei Routen, Prüfstand mit einem Lite-Video live | Vorsession und Bau Fable (Bau klein) |

## Fertig ist die Umstellung, wenn

1. Ein Bild „Schnell“ und ein Bild „Premium“ aus dem Studio erscheinen im LiteLLM unter
   dem Schlüssel `lernen-media-studio` mit Kosten größer null.
2. Eine Bearbeitung mit hochgeladenem JPEG läuft ohne Fehler durch.
3. Der Chat antwortet gestreamt, mit Bild im Anhang, und der Zug steht im Gateway.
4. `ANTHROPIC_API_KEY` ist aus der Umgebung des Studios entfernt, Video läuft weiter.

## Parkplatz

- ~~Veo über den Gateway.~~ Auslöser gezogen am 15.10.2026: Rico hat den Google-Schlüssel aus Vercel entfernt, Video ist live aus. Jetzt Etappe 2.
- Gemini-Bildmodelle als drittes Angebot. Auslöser: Rico wünscht es auf der Entscheidungsseite (F2).
- Größenwahl (2K) im Studio. Auslöser: Antwort auf F3.

## Seiten je Etappe

| Etappe | Seite | Sammlung |
|---|---|---|
| 1 | Entscheidungsseite <https://claude.ai/artifact/12cj27SLikcxKYLQqMEQJX> | `antworten`: alle beantwortet am 15.10.2026, überall Empfehlung |
| 1 | Prüfstand <https://claude.ai/artifact/MetNG8znw4FMHi993dQU2r> | `ruecklaeufe`: `s1` bis `s8`, `gesamt`. Offen seit 15.10.2026 |
| 2 | Entscheidungsseite <https://claude.ai/artifact/U6oXjjnWiPKqvBeEeJrDXf> | `antworten`: s1 bis s3 passt, f2 a, f3 a, f1 im Chat („b“), r1 bis r6 ohne Einspruch. Beantwortet 15.10.2026 (Nacht) |
| 2 | Prüfstand <https://claude.ai/artifact/JukTgULPPPi7g6JGYKsWae> | `ruecklaeufe`: s1 bis s6 Funktioniert (15.10.), Gesamt Go im Chat |

## Startbereit

Etappe 1 ist gepusht (15.10.2026, `6ebcbb2`), Rico prüft live mit dem Prüfstand. Etappe 2 (Veo über
LiteLLM) braucht zuerst eine Messung: Welche Video-Modelle kennt LiteLLM 1.105 für Google, über
welchen Endpunkt (`/v1/videos`? Gemini-Durchleitung?), und wie kommt das fertige Video zurück.
Danach ADR 0002 und Entscheidungsseite.
Messung 15.10. spät: LiteLLM 1.105 führt Veo als `mode: video_generation` mit Sekundenpreisen; der
Endpunkt `/v1/videos` nimmt den Auftrag an und reicht ihn an Gemini durch. Die von Rico angelegten
Kennungen `gemini/veo-3.1-fast-generate-001` und `gemini/veo-3.1-generate-001` kennt die Gemini-API
nicht (404 „not found for API version v1beta“, das sind Vertex-Kennungen). Richtig für Gemini:
`gemini/veo-3.1-fast-generate-preview`, `gemini/veo-3.1-generate-preview`, `gemini/veo-3.1-lite-generate-preview`.
Rico hat umgestellt, gemessen am 15.10. spät (Bericht: Videos und Standbilder unter `docs/pruefstand/litellm/veo-*`):
- Preise im Gateway stimmen (Lite 0,05/0,08, Fast 0,10/0,12/0,30, Standard 0,40/0,60 $ je Sekunde).
- `POST /v1/videos` (Lite, 4 s, 1280x720): Auftrag sofort angenommen, Kosten 0,20 $ beim Start verbucht,
  `GET /v1/videos/{id}` nach 33 s `completed`, `GET …/content` liefert MP4 1280×720 mit Tonspur, 3,3 MB.
  Erster Statusabruf 12 s nach dem Start gab einmal 403 „model not available for this API key“, danach
  normal: beim Bau den Status-Abruf gegen einen einmaligen 403 tolerant machen.
- Bild-zu-Video über Multipart `input_reference`: läuft, Startbild wird übernommen (37 s, 0,20 $).
- **Endbild geht über `/v1/videos` nicht:** unbekannte Dateifelder (`lastFrame`, `last_frame`) schickt der
  Gateway ungefiltert weiter, Gemini antwortet 500 „Object of type UploadFile is not JSON serializable“.
- **Gemini-Durchleitung läuft:** `GET /gemini/v1beta/models/veo-3.1-lite-generate-preview` mit Kopf
  `x-goog-api-key: <virtueller Schlüssel>` antwortet 200 (Bearer wird dort abgelehnt). Damit kann das
  Studio sein heutiges `@google/genai` behalten, nur mit `httpOptions.baseUrl = MODELL_GATEWAY_URL + '/gemini'`
  und dem virtuellen Schlüssel: Endbild, Polling und Download bleiben wie heute. Ob die Durchleitung Kosten
  je Sekunde verbucht, ist noch nicht gemessen (ein Lauf über die Durchleitung fehlt).
Weiche für ADR 0002: a) Durchleitung, Code bleibt fast gleich, Endbild bleibt, Kosten-Erfassung zu messen;
b) `/v1/videos`, OpenAI-förmig, Kosten sicher, aber Endbild entfällt (Fast und Standard verlieren eine Funktion).

Messung 15.10. (Nacht, Session „Etappe 2“, Skript `scripts/veo-durchleitung-pruefstand.mjs`, Bericht
`docs/pruefstand/litellm/bericht-veo-durchleitung.md`), Gemini-Durchleitung in drei Beinen:
- **Start blockiert durch den Modellnamen, nicht durch die Technik.** `POST /gemini/v1beta/models/veo-3.1-lite-generate-preview:predictLongRunning`
  mit `x-goog-api-key` antwortet 403 `team_model_access_denied`: Der Schlüssel kennt die drei Veo-Einträge unter dem
  öffentlichen Namen `gemini/veo-3.1-lite-generate-preview` (mit Präfix, so steht es in `/v1/models`), die Durchleitung
  prüft den Namen aus der URL wörtlich dagegen. Mit Präfix in der URL lässt der Gateway durch, reicht die URL aber
  unverändert an Google weiter, dort 404. **Abhilfe (Rico, LiteLLM-Oberfläche):** die drei Veo-Einträge umbenennen,
  öffentlicher Name ohne Präfix (`veo-3.1-lite-generate-preview`, `veo-3.1-fast-generate-preview`, `veo-3.1-generate-preview`),
  das dahinterliegende Modell (`gemini/veo-…`) bleibt. Dann passt der Name für Durchleitung und `/v1/videos` gleichermaßen,
  und das Studio kann seine heutigen Modellkennungen aus `lib/models.ts` behalten.
- **Operation abfragen läuft:** `GET /gemini/v1beta/models/veo-3.1-lite-generate-preview/operations/<id>` 200 in 355 ms,
  Antwortform `response.generateVideoResponse.generatedSamples[0].video.uri` (der Parser der Status-Route passt).
  Gemessen an der Operation des Videos vom `/v1/videos`-Lauf; Operations- und Files-Listen sind über die Durchleitung
  nicht modellgebunden und für den Schlüssel lesbar.
- **Datei laden läuft:** `GET /gemini/v1beta/files/<id>:download?alt=media` über den Gateway mit Kopf `x-goog-api-key`
  200, `video/mp4`, 2,84 MB in 0,9 s (`docs/pruefstand/litellm/veo-lite-download-durchleitung.mp4`); `?key=` geht ebenso,
  beim Bau bleibt der Kopf (der Schlüssel landet sonst in Gateway-Protokollen). Gegenprobe Google direkt ohne Schlüssel: 403.
  Damit braucht das Studio keinen Google-Schlüssel mehr, wenn die Status-Route den Download auf den Gateway umschreibt.
- **Kosten der Durchleitung: noch offen**, bis der Start geht. Spend-Signal liegt vor: Der Schlüssel darf `/key/info`
  nicht lesen (nur `llm_api_routes`), aber jede Gateway-Antwort trägt `x-litellm-key-spend` (Stand 0,955 $ nach den
  bisherigen Läufen). Nächster Schritt nach der Umbenennung: `node scripts/veo-durchleitung-pruefstand.mjs` (ein Lite-Video,
  4 s, etwa 0,20 $), danach mit `--sdk` der Pfad durch `@google/genai` mit `httpOptions.baseUrl` (zweites Video).

**Messung 15.10. (Nacht, nach Ricos Umbenennung): Durchleitung läuft vollständig und bucht Kosten.** Die Umbenennung
über „Edit“ griff nicht (öffentlicher Name blieb mit Präfix), erst drei neue Einträge ohne Präfix halfen; der Schlüssel
sieht jetzt `veo-3.1-lite-generate-preview`, `veo-3.1-fast-generate-preview`, `veo-3.1-generate-preview`.
- Start über REST `predictLongRunning`: 200 in 0,8 s. Achtung: `numberOfVideos` im rohen REST-Aufruf lehnt Google
  mit 400 ab (das SDK übersetzt den Namen, dort stört er nicht).
- Operation nach 30 s `done`, Datei 1,2 MB über den Gateway geladen (`veo-lite-4s-durchleitung.mp4`).
- **Kosten:** `x-litellm-key-spend` stieg etwa zwei Minuten nach dem Video von 0,955 auf 1,155 $, also genau 0,20 $
  für 4 s Lite. Die Buchung kommt verzögert (nicht im Kopf der Antwort, kein `x-litellm-response-cost`), aber sie kommt.
- Zweites Video über `@google/genai` mit `httpOptions: { baseUrl: MODELL_GATEWAY_URL + '/gemini' }` und dem
  virtuellen Schlüssel als `apiKey` (so wie die Studio-Route): Operation in 1,2 s, fertig nach 29 s, Datei 1,0 MB
  (`veo-lite-4s-durchleitung-sdk.mp4`). Spend danach 1,355 $, wieder plus 0,20 $.
- Kein 403 beim ersten Statusabruf, in beiden Läufen (anders als bei `/v1/videos`).
Damit ist Weg a (Durchleitung) belegt: Code bleibt, Endbild bleibt, Kosten landen beim Schlüssel. Entscheidungsseite folgt.
Nachmessung Endbild (15.10. Nacht): Startbild über die Durchleitung läuft (Fast 4 s, 0,40 $), Start- plus Endbild läuft
nur mit 8 s (Fast, 0,80 $); 4 und 6 s lehnt Google mit 400 ab, eine Google-Regel, die im Studio heute schon gilt.
Spend nach allen Läufen 2,555 $, jede Buchung exakt. Details ADR 0002.

**Stand nach dem Bau (15.10. Nacht):** Rico hat Weg b gewählt („Seminar-Werkzeug, Startbild reicht“). Gebaut und
geprüft (tsc, eslint), nicht committet: beide Videorouten auf `/v1/videos`, Endframe raus, Google-Schlüssel raus.
Fertig ist die Etappe, wenn Rico den Prüfstand live durchgeht und ein Lite-Video im LiteLLM unter `lernen-media-studio`
mit Kosten größer null steht. Danach: die alten drei `gemini/veo-…`-Einträge im LiteLLM löschen (Richtung r4).

**Etappe 2 abgeschlossen (15.10. Nacht).** Video läuft live über `/v1/videos` des Gateways, Protokoll mit Modell und
Kosten je Zeile, Startframe aus Galerie und Upload (Uploads werden im Browser auf Vercels 4,5-MB-Grenze verkleinert,
Commit 1ac74c4). Weiter geht es mit drei Dingen: Rico löscht die alten `gemini/veo-…`-Einträge im LiteLLM; der Reiter
„Bearbeiten“ bekommt dieselbe Upload-Verkleinerung (Aufgabe vorgeschlagen); nach zwei Wochen werden die Gateway-Kosten
je Video gegen die Credits 10 / 20 / 40 gehalten (Checkpoint ADR 0002).
