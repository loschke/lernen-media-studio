# Roadmap lernen-media-studio

- Angelegt: 2026-10-15 (Session „LiteLLM-Umstellung“), noch nicht von Rico beschlossen
- **Führendes Dokument ist die Seite:** noch keine Roadmap-Seite. Diese Datei ist bis dahin
  der einzige Zeiger. Sobald mehr als eine Etappe ansteht, entsteht die Seite nach dem
  Skill `arbeitsweise` und wird hier eingetragen.
  Vorschlag der Validator-Session (06.11.2026, Richtung r24 auf der Entscheidungsseite): Die Seite
  entsteht im Projekt der neuen App, sobald Rico f5 (Clone) und f8 (Dach) beantwortet hat. Dieses
  Repo behält die Datei und führt dann nur noch Seminarbetrieb und Ablösung.
  Stand nach Ricos zweiter Runde (06.11.2026): f5 und f8 sind beantwortet (Neubau, ai-design.guide).
  Die Seite entsteht mit dem neuen Repo, nach der Architektur-Frage f13.

## Wo wir stehen

Etappe 1 und 2 sind gepusht und live geprüft, Etappe 3 ist gebaut und wartet auf Ricos Go. Stand je Etappe
hier, bis es eine Seite mit Sammlung `fortschritt` gibt.

| # | Etappe | Stand |
|---|---|---|
| 1 | Studio an LiteLLM: Bilder über GPT Image 2.5, Chat über Haiku 5.5 | laeuft (gepusht 15.10., Commit 6ebcbb2, Prüfung live) |
| 2 | Video (Veo) über LiteLLM | erledigt (15.10. Nacht, Commits 849225f, 5379d73, 1ac74c4, e2da29b; Prüfstand live S1 bis S6 Funktioniert, Gesamt Go im Chat). Seit 22.10.2026 außer Betrieb: Google hat die Veo-3.1-Previews abgeschaltet |
| 3 | Video mit Gemini Omni Flash über die Gemini-Durchleitung | laeuft (05.11.2026 gepusht, Commit 2d9564f; 06.11. dazu „Fortsetzen“ und „Letztes Bild als Startframe“, Commit 648cc18, gepusht; Prüfung in der Oberfläche steht aus, CORS-Regel am R2-Bucket fehlt und nennt nur `studio.lernen.diy`) |
| 4 | Neue App „Media Studio“ unter `app.ai-design.guide` als Neubau in eigenem Repo (Stile, Formeln, Look des Design Library Studios, Hetzner); in diesem Repo: nichts mehr außer Seminarbetrieb, am Ende Abschaltung | laeuft (06.11.2026: Vorsession, Validator-Session, zwei Antwortrunden von Rico. Entschieden: Neubau statt Clone (f5 c), Abschalten ohne Weiterleitung (f6 c), altes Studio bleibt unangetastet samt der zwei Lücken (f7 c), Dach ai-design.guide, nicht Factory.casa (f8 a, Chat), Name Media Studio (f9 b), Start mit GPT Image 2.5 (f11 b). ADR 0004 überholt, ADR 0005 und 0007 akzeptiert in geänderter Fassung, ADR 0006 und 0008 vorgeschlagen. Runde 3 beantwortet: s9 und s10 passt, f14 a (Richtungen gelten ohne Einspruch), ADR 0006 und 0008 damit akzeptiert. Offen ist allein f13 (Backend, Mastra), Abwägung im Chat; nichts gebaut, nichts committet) |

## Das Ziel in einem Absatz

Das Studio hängt mit einem eigenen virtuellen Schlüssel an Ricos LiteLLM. Dort sind
Nutzung, Kosten und Budget je App sichtbar, und ein Modellwechsel ist ein Eintrag im
Gateway statt ein Umbau im Studio. Bilder entstehen mit GPT Image 2.5 in zwei Angeboten
(schnell mit Flare, Premium mit Sunburst), der Chat läuft auf Haiku 5.5. Video (Veo)
lief seit Etappe 2 über die Videoschnittstelle des Gateways, ohne Google-Schlüssel und ohne Endbild.
Seit Etappe 3 (05.11.2026) erzeugt Gemini Omni Flash die Videos, über die Gemini-Durchleitung des
Gateways, weil Google Veo 3.1 abgeschaltet hat.

## Die Etappen in Baureihenfolge

| # | Etappe | Grundlage | Vorgehen | Modell |
|---|---|---|---|---|
| 1 | LiteLLM-Umstellung Bild und Chat | ADR 0001 | Entscheidungsseite, Prüfstand-Skript gegen den Gateway, Bau in drei Stücken (Bild, Bearbeitung, Chat), Prüfstand in der Oberfläche | Vorsession Fable, Bau Opus |
| 2 | Video (Veo) über LiteLLM | ADR 0002 | Messung Durchleitung gegen `/v1/videos`, Entscheidungsseite, Bau in zwei Routen, Prüfstand mit einem Lite-Video live | Vorsession und Bau Fable (Bau klein) |
| 3 | Video mit Gemini Omni Flash | ADR 0003 | Ursache gemessen, Durchleitung gemessen (`scripts/omni-durchleitung-pruefstand.mjs`), Bau in zwei Routen und Modelltabelle, Prüfung live durch Rico | eine Session, Fable |
| 4 | Neue App „Media Studio“, Abschaltung des alten Studios | ADR 0005 (akzeptiert in geänderter Fassung: Neubau), ADR 0007 (akzeptiert in geänderter Fassung: Start mit 2.5), ADR 0006 Hetzner und ADR 0008 Library lesen (vorgeschlagen, ziehen ins neue Repo), ADR 0004 (überholt) | Entscheidungsseite (dritte Runde: s9, f13, f14). Danach neues Repo mit Arbeitsweise (Roadmap-Seite, ADR zur Architektur), Anforderungsdokument mit Feed und Bearbeitungsketten, Bau in Stücken (Grundgerüst auf Hetzner, Look und Bedienung, Stile und Formeln zusammen). Hier: nichts, bis Rico die Abschaltung ausspricht | Vorsession und Validator Fable, Bau Opus; Anmeldung und Credits mit Effort hoch |

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
| 4 | Entscheidungsseite <https://claude.ai/artifact/H4NW2cYRG4RVRUhSETuaJa> (Quelle `docs/seiten/etappe-4-weichen.html`, Kennung `820ab333-ecbe-4c81-931f-b1ae3d8e5dbf`) | `antworten`: `s1` bis `s10`, `f1` bis `f15`, `r1` bis `r33`. Runde 1 (06.11.): s1 passt, s2 und s3 Einspruch, f1 a, f2 a, f3 a mit Notiz, f4 nur Notiz. Runde 2 (06.11.): s4 bis s8 passt, f5 c mit Notiz, f6 c, f7 c, f8 a (dazu Chat), f9 b, f10 c mit Notiz, f11 b mit Notiz, f12 a. Runde 3 (veröffentlicht 06.11.) offen: s9, s10, f13, f14 und die Richtungen r1 bis r3, r7, r8, r12, r13, r15, r18 bis r20, r22, r23, r25 bis r32; ersetzt sind r4 bis r6, r9 bis r11, r14, r16, r17, r21, r24. Runde 3 beantwortet (06.11.): s9 und s10 passt mit Notiz, f13 offen gelassen mit Notiz, f14 a. Runde 4 (Version `1793952079-78b5`): offen ist f15 (Mastra eingebaut, als Server oder gar nicht; Empfehlung eingebaut mit Probe und Grenze), r33 ersetzt r27. Wortlaut in ADR 0004 und ADR 0005, Nachträge |

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

Nachtrag Credits (15.10. Nacht, Commit e2da29b): Video-Credits nach Dauer (Lite 15/25/30, Fast 30/45/60,
Standard 120/180/240), Startguthaben 500, rund 1,3 Cent je Credit überall. Vercel `DEFAULT_CREDITS` = 500 (Rico).

**Etappe 3 (05.11.2026):** Videos scheiterten seit dem 22.10., weil Google die Veo-3.1-Previews abgeschaltet hat.
Nachfolger ist `gemini-omni-1.2-flash` über die Interactions API. `/v1/videos` des Gateways kann Omni nicht, die
Gemini-Durchleitung schon (Eintrag im LiteLLM mit öffentlichem Namen ohne Präfix). Gebaut nach ADR 0003, Messwerte in
`docs/pruefstand/litellm/bericht-omni-durchleitung.md`. Offen: Prüfung in der Oberfläche nach dem Push, und ob der Gateway
die Omni-Kosten auf den Schlüssel bucht (bei der Messung nicht).

**Etappe 3, Nachtrag 06.11.2026:** Omni setzt eigene Videos über `previous_interaction_id` fort (gemessen bis 12 s, laut Google bis 30 s),
das Studio merkt sich dafür Kennung und Länge je Video. Dazu der Knopf „Letztes Bild als Startframe“ im Browser. Offen bei Rico:
CORS-Regel am R2-Bucket setzen, beides live prüfen. Details ADR 0003, Nachtrag 06.11.

**Etappe 4 (06.11.2026, Vorsession):** Rico will das Studio als `app.ai-design.guide` führen (Look und Adresse von ai-design.guide) und
dabei die Stile und Formeln der Design Library als Auswahl einbauen; ein Mini-SaaS ist als Möglichkeit genannt. Gemessen: 101 Stile, alle
mit demselben Anfang `[subject] [action] [environment]`; 161 Formeln mit 1 bis 8 Platzhaltern; Prompt-Grenze und Generier-Route reichen ohne
Umbau. Offen aus der Sichtung vom 09.09. (build ADR 0035): der Chat prüft die Sitzung nicht, der Video-Status erstattet nicht. ADR 0004 ist
vorgeschlagen, die Entscheidungsseite wartet auf Rico. Bis zu seinen Antworten wird nicht gebaut. Danach: ADR auf akzeptiert mit Nachtrag,
Anforderungsdokument `docs/anforderungen-app-ai-design-guide.md`, Starterprompt. Berührt Etappe 3: die fehlende CORS-Regel am R2-Bucket
muss die neue Adresse nennen (ADR 0004, Preis).

**Etappe 4, Nachtrag 06.11.2026 (spät):** Zur selben Frage gibt es einen Entwurf B aus dem Repo `design-library-studio` und danach Ricos
Hinweis für die Validator-Session: GPT Image 2.6, Betrieb ganz auf Hetzner (Postgres und Speicher), keine Migration, als Gedanke ein Clone,
während dieses Studio für Seminare unverändert weiterläuft. Beides liegt in `docs/entwuerfe/`. ADR 0004 und die Entscheidungsseite warten
auf die Zusammenführung (Nachtrag im ADR, Hinweis auf der Seite); die Sätze oben zu Umzug und CORS gelten nur, wenn es kein Clone wird.

**Etappe 4, Validator-Session (06.11.2026):** Entwurf A, Entwurf B, Ricos Hinweis und seine sieben Antworten sind zusammengeführt. Die
beiden Dateien in `docs/entwuerfe/` sind gelöscht, ihr Inhalt steht im Nachtrag von ADR 0004 (Wortlaut des Hinweises, Entscheidung je Zeile
von Entwurf B, Messungen). Der Absatz darüber gilt damit nicht mehr als Zeiger auf diese Dateien. Neu vorgeschlagen: ADR 0005 (Clone und
Ablösung, die Weiche dieses Repos), ADR 0006 (Betrieb auf Hetzner), ADR 0007 (GPT Image 2.6, eigener Schlüssel, Credits), ADR 0008 (Library
lesen, Stile und Formeln in einem Stück). Nachgemessen: beide Lücken an der Quelle bestätigt (Assistent ohne Prüfung der Anmeldung, Video ohne
Erstattung), 24 Konten mit 8.365 Credits, das Design Library Studio läuft selbst noch auf Vercel, Neon und R2 (Vorlage für den Code, kein
Beleg für den Betrieb), Belege für Hetzner sind `daten-show` (Postgres im Stack, Dienst `migrate`) und der Bucket von loschke.chat (build
ADR 0056). Factory.casa ist der öffentliche Name der `media-factory`; drei Online-Konzepte vom August, keines gebaut, alle ohne eigene App.
Ob die neue App unter ai-design.guide oder Factory.casa läuft, fragt f8. Zwei Widersprüche in Ricos Antworten sind auf der Seite benannt
und neu gefragt: s1 (Adresse) gegen die Notiz bei f4, f1 a (eine App) gegen den Clone. Nur Rico weiß: ob die 2.6-Modelle im LiteLLM
angelegt sind (f11), das Datum des nächsten Seminars (f12), seine Ideen zur Bedienung (f10). Bis zu seinen Antworten wird nichts gebaut.
Danach: ADRs auf akzeptiert mit Nachtrag; bei Clone neues Repo anlegen (Name nach f8 und f9), ADR 0006 bis 0008 dorthin, Roadmap-Seite dort.

**Etappe 4, Ricos zweite Antwortrunde (06.11.2026):** Rico hat gegen drei Empfehlungen entschieden. Es wird neu gebaut, das Studio ist
Vorbild für Bedienung und Funktionen und nicht Codebasis (f5 c). Das alte Studio wird nicht angefasst, die zwei Lücken bleiben bis zur
Abschaltung offen (f7 c), und abgeschaltet wird ohne Weiterleitung (f6 c). Die neue App heißt Media Studio und läuft unter
`app.ai-design.guide`; Factory.casa wird es nicht, das wird die Factory für Dokumente, Slides, Carousels und Cheatsheets (f8 a, Chat, f9 b).
Gestartet wird mit GPT Image 2.5, der Wechsel auf 2.6 ist ein Wert (f11 b). Zur Bedienung: ein Feed der eigenen Bilder und Bearbeitungen
als sichtbare Kette zum Vergleichen (f10). Neu offen ist der Zuschnitt des Backends („vielleicht mit Mastra wieder als Server“): Frage f13
auf der Seite, mit dem Befund aus `build-jetzt-superagents`. Damit schrumpft Etappe 4 in diesem Repo auf die Abschaltung. Alles Weitere
gehört in das neue Repo, das nach f13 angelegt wird. Auf dem Parkplatz, neu: den Library-MCP um Generierungsfunktionen erweitern (Auslöser:
Rico nimmt das Thema auf; Repo `mcp-apps-server`).

**Etappe 4, Ricos dritte Runde (06.11.2026):** s9 passt (Feed oder Seitenleiste, die Form ist offen), s10 passt mit der Notiz, build getrennt
zu lassen: kein Nachtrag in build ADR 0035, Factory.casa ist die Verbindung von Assets mit build und kommt später. f14 a: Die Richtungen
gelten ohne Einspruch. ADR 0006 ist damit akzeptiert (Vorbehalt: Zahl der Dienste nach f13), ADR 0008 akzeptiert. Offen ist allein f13:
Rico neigt zu Mastra, eingebaut in die Oberfläche (c), und will die Abwägung im Chat. Nachgemessen dazu: Die Einbettung ist ein
beschriebener Weg, die Tabellen von Mastra passen in ein eigenes Schema derselben Datenbank, Traces im Betrieb brauchen Studio gegen die
Datenbank (Tür auf Zeit) oder später einen Mastra-Server. Einzelheiten in ADR 0005, Nachtrag dritte Runde. Nach f13: neues Repo
(`ai-design-media-studio`, r25) mit Arbeitsweise, dort das ADR zur Architektur, die Roadmap-Seite und das Anforderungsdokument.
Auf der Seite ist f13 eingefroren und als f15 neu gestellt, mit der Messung zu c und geänderter Empfehlung der Session: Mastra eingebaut,
mit einer Probe als erstem Stück des Grundgerüsts und der Grenze, dass Guthaben, Bilder und Aufträge in eigenen Tabellen und Funktionen
liegen. Rico entscheidet auf der Seite oder im Chat.

**Etappe 4, Abschluss der Vorsession (06.11.2026):** f15 ist entschieden (Rico im Chat: „Ja, eingebaut“): Mastra als Baustein in der
Next-App, mit Probe und Grenze beim Guthaben. Das neue Projekt `C:\Users\losch\Projekte\ai-design-media-studio` ist angelegt, mit Arbeitsweise, Roadmap und
fünf ADRs; die Entwürfe 0006 bis 0008 hier sind dorthin umgezogen. In diesem Repo steht aus Etappe 4 nur noch die Abschaltung des Studios
aus, auf Ricos Wort (ADR 0005). Die Dateien dieser Etappe (`docs/adr/0004` bis `0008`, `docs/seiten/`, diese Roadmap) sind uncommittet und
warten auf Ricos Go.
