# ADR 0002: Video (Veo 3.1) über LiteLLM statt direkt bei Google

- Datum: 2026-10-15
- Status: akzeptiert am 15.10.2026 (Rico, Entscheidungsseite Sammlung `antworten`: s1 bis s3 „passt“, f2 a, f3 a; f1 im Chat: „ich nehme b, das ist ein seminar tool, kein profitool, dann nehmen wir endframe raus, ich denke zum demonstrieren reicht startframe“)
- Bezug: ADR 0001 (Bild und Chat am Gateway, Env-Namen `MODELL_GATEWAY_URL`, `MODELL_GATEWAY_KEY`), ADR 0084 in `build-jetzt-superagents` (ein virtueller Schlüssel je App)
- Entscheidungsseite: <https://claude.ai/artifact/U6oXjjnWiPKqvBeEeJrDXf> (Sammlung `antworten`, veröffentlicht 15.10. Nacht)

## In einem Satz

Das Studio startet, fragt ab und lädt Veo-Videos über Ricos LiteLLM mit dem Schlüssel `lernen-media-studio`, so dass kein Google-Schlüssel mehr in der Umgebung liegt und Video-Kosten im Gateway neben Bild und Chat stehen; offen ist der Weg durch den Gateway: die Gemini-Durchleitung (Code bleibt, Endbild bleibt) oder `/v1/videos` (OpenAI-förmig, Endbild entfällt).

## Kontext

### Ausgangslage (gelesen 2026-10-15)

- `app/api/generate-video/start/route.ts`: `@google/genai` 1.50 direkt, `generateVideos` mit `aspectRatio`, `durationSeconds`, Startbild (`image`) und Endbild (`config.lastFrame`), Credits aus `lib/models.ts` (Lite 10, Fast 20, Standard 40), Rückbuchung bei Fehler, 429 wird als Tageskontingent gemeldet. `maxDuration = 60`.
- `app/api/generate-video/status/route.ts`: fragt `https://generativelanguage.googleapis.com/v1beta/{operationName}` mit `x-goog-api-key` ab, liest `response.generateVideoResponse.generatedSamples[0].video.uri` (oder `generatedVideos`), lädt die Datei mit `?key=` und legt sie nach R2.
- Beide Routen lesen `GOOGLE_GENERATIVE_AI_API_KEY` (oder `GEMINI_API_KEY`, `GOOGLE_API_KEY`). Rico hat den Schlüssel am 15.10. aus Vercel entfernt, Video ist live aus (ADR 0001, Nachtrag Go).
- Oberfläche (`components/video/*`): Modellwahl „Veo 3.1 Lite“, „Veo 3.1 Fast“, „Veo 3.1“, Seitenverhältnis 16:9 / 9:16, Dauer 4 / 6 / 8 s, Felder „Startframe“ und „Endframe“ (Endframe nur bei Fast und Standard, Hinweis „Endframe wird nur von Veo 3.1 Fast und Pro unterstützt“), Fortschrittstexte „Video wird vorbereitet…“ und „Gemini generiert dein Video…“.
- `lib/validation.ts` prüft `operationName` gegen `models/<x>/operations/<y>`.

### Der Gateway (gemessen 15.10., Berichte unter `docs/pruefstand/litellm/`, Details in `docs/roadmap.md`)

- LiteLLM 1.105.0. Der Schlüssel sieht die drei Veo-Einträge als `gemini/veo-3.1-lite-generate-preview`, `gemini/veo-3.1-fast-generate-preview`, `gemini/veo-3.1-generate-preview`, `mode: video_generation`, Preise 0,05 / 0,10 / 0,40 $ je Sekunde (Lite / Fast / Standard, Basisstufe; Fast und Standard haben höhere Stufen bis 0,30 und 0,60 $).
- **Weg b, `/v1/videos`:** Start sofort angenommen, 0,20 $ für 4 s Lite beim Start verbucht (`x-litellm-response-cost`), Status nach 33 s `completed`, `/content` liefert MP4 1280×720 mit Ton. Startbild als Multipart `input_reference` läuft. **Endbild geht nicht:** unbekannte Dateifelder reicht der Gateway roh weiter, Gemini antwortet 500. Erster Statusabruf 12 s nach dem Start einmal 403 „model not available for this API key“, danach normal.
- **Weg a, Gemini-Durchleitung `/gemini/v1beta/...` mit Kopf `x-goog-api-key` = virtueller Schlüssel** (Bearer wird dort abgelehnt), in drei Beinen gemessen:
  - Operation abfragen: 200 in 355 ms, Antwortform `generateVideoResponse.generatedSamples`, der Parser der Status-Route passt unverändert.
  - Datei laden: `files/<id>:download?alt=media` über den Gateway mit Kopf 200, `video/mp4`, 2,84 MB in 0,9 s. Gegenprobe Google direkt ohne Schlüssel 403. Das Studio braucht für den Download keinen Google-Schlüssel.
  - **Start (`predictLongRunning`) scheitert heute mit 403 `team_model_access_denied`,** weil die Durchleitung den Modellnamen aus der URL (`veo-3.1-lite-generate-preview`) wörtlich gegen die Modellliste des Schlüssels prüft, die den Namen mit Präfix `gemini/` führt. Mit Präfix in der URL lässt der Gateway durch, reicht sie aber unverändert an Google, dort 404. Abhilfe ist eine Umbenennung in der LiteLLM-Oberfläche (öffentlicher Name ohne Präfix, dahinterliegendes Modell `gemini/veo-…` bleibt). Das ist eine Konfiguration, kein Code.
  - **Kosten der Durchleitung: nicht gemessen,** bis der Start geht. Spend-Signal: `/key/info` ist für den Schlüssel gesperrt (nur `llm_api_routes`), jede Antwort trägt aber `x-litellm-key-spend` (Stand 0,955 $ nach allen bisherigen Läufen). Die Messung liest diesen Kopf vorher und nachher.
- Operations- und Files-Listen sind über die Durchleitung nicht modellgebunden und für den Schlüssel lesbar.

### Was `@google/genai` kann (im Paketcode geprüft 15.10.)

`new GoogleGenAI({ apiKey, httpOptions: { baseUrl } })` lenkt alle Aufrufe auf die Basisadresse und schickt den Schlüssel als Kopf `x-goog-api-key`. Damit ist die Startroute mit zwei Zeilen am Gateway. **Nicht gelaufen**, nur gelesen; die Messung mit `--sdk` holt das nach, sobald der Start geht.

## Entscheidung

Vorschlag, zur Entscheidung auf der Seite:

**Weg a, Gemini-Durchleitung**, wenn der Gateway dafür Kosten je Sekunde verbucht. Die Startroute behält `@google/genai` und bekommt `httpOptions.baseUrl = MODELL_GATEWAY_URL + '/gemini'` und `apiKey = MODELL_GATEWAY_KEY`. Die Statusroute fragt `MODELL_GATEWAY_URL/gemini/v1beta/{operationName}` ab und schreibt die Video-Adresse von `generativelanguage.googleapis.com` auf den Gateway um, Schlüssel im Kopf statt in der Adresse. Endbild, Polling, Parser und Oberfläche bleiben. Ein einmaliger 403 beim Statusabruf wird als „noch nicht fertig“ behandelt (die Oberfläche fragt ohnehin weiter). `GOOGLE_GENERATIVE_AI_API_KEY` verschwindet aus Code und `.env.example`.

**Weg b, `/v1/videos`**, wenn die Durchleitung nichts verbucht. Dann ist das Budget je App für Video wertlos, und der sichere Kostenpfad zählt mehr als das Endbild. Startroute: `POST /v1/videos` (JSON ohne Bild, Multipart `input_reference` mit Startbild), Statusroute: `GET /v1/videos/{id}` und `/content`. `supportsEndFrame` wird bei Fast und Standard auf `false` gesetzt, das Feld „Endframe“ verschwindet aus der Oberfläche, `isValidOperationName` wird durch eine Prüfung der Video-Kennung ersetzt.

In beiden Wegen: Credits 10 / 20 / 40 bleiben (Vorschlag, siehe Preis), Modellkennungen in `lib/models.ts` bleiben die Gemini-Namen ohne Präfix, Vercel braucht keine neue Variable.

## Preis & Konsequenzen

- Video hängt wie Bild und Chat am Gateway. Fällt er, fällt alles. Dafür ein Schlüssel, ein Budget, alle Kosten an einem Ort.
- **Credits gegen Kosten:** Ein Bild-Credit entspricht etwa 1,3 Cent (ADR 0001, gemessen). Lite 4 bis 8 s kostet 0,20 bis 0,40 $ und bucht 10 Credits (≈ 13 Cent); Standard 8 s kostet 3,20 $ in der Basisstufe und bucht 40 Credits (≈ 52 Cent). Video ist in Credits also fünf- bis sechsfach unterbewertet. Das ist Workshop-Pacing, kein Preis; es bleibt vorerst so, Frage auf der Seite.
- Weg a: Kostenverbuchung **nicht gemessen**. Dauer bis fertig über die Durchleitung **nicht gemessen** (über `/v1/videos`: 33 bis 37 s bei 4 s Lite).
- Weg b: Fast und Standard verlieren das Endbild, eine Funktion, die die Oberfläche heute hervorhebt. Höhere Preisstufen (Fast 0,12 / 0,30, Standard 0,60 $/s) hängen an Auflösung und Ton; welche Stufe `/v1/videos` nimmt, ist **nicht gemessen**.
- Der einmalige 403 beim ersten Statusabruf ist in Weg b gemessen, in Weg a offen. Der Code toleriert ihn in beiden Fällen.
- Bekannte Kante (Bau 15.10.): Verliert der Schlüssel das Modell **während** eines laufenden Videos, antwortet der Status dauerhaft 403, die Oberfläche wartet sieben Minuten bis „Zeitüberschreitung“, die Credits sind gebucht. Im realistischen Fall scheitert schon der Start mit 403 und bucht zurück; deshalb hingenommen (r1).

## Exit-Pfad

`git revert` des Bau-Commits stellt den Google-Direktpfad wieder her; dann müsste `GOOGLE_GENERATIVE_AI_API_KEY` zurück nach Vercel. Credits, Galerie, R2, Auth, Bild und Chat sind nicht berührt. Ein Wechsel zwischen Weg a und Weg b ist später möglich, weil beide dieselben Modellkennungen und Credits nutzen; der Unterschied liegt in den zwei Routen.

## Checkpoint

- Vor dem Bau: `node scripts/veo-durchleitung-pruefstand.mjs` nach der Umbenennung. Kippt zu Weg b, wenn `x-litellm-key-spend` nach einem fertigen Lite-Video nicht um etwa 0,20 $ gestiegen ist.
- Nach dem Bau: ein Lite-Video aus dem Live-Studio steht im LiteLLM unter dem Schlüssel `lernen-media-studio` mit Kosten größer null (Abnahmekriterium der Etappe).
- Zwei Wochen nach dem Bau: Gateway-Kosten je Video gegen die gebuchten Credits halten, Credit-Tabelle anpassen, wenn Rico das Pacing ändern will.

## Nachtrag 2026-10-15 (Nacht): Durchleitung gemessen, Kosten werden verbucht

Rico hat die drei Veo-Einträge im LiteLLM neu angelegt, öffentlicher Name ohne Präfix (die Umbenennung über „Edit“ griff nicht). Danach zwei Lite-Videos, 4 s, über die Durchleitung (`scripts/veo-durchleitung-pruefstand.mjs`, Bericht `docs/pruefstand/litellm/bericht-veo-durchleitung.md`):

| Bein | Weg | Ergebnis |
|---|---|---|
| Start | REST `predictLongRunning`, Kopf `x-goog-api-key` | 200 in 0,8 s. `numberOfVideos` im rohen Aufruf gibt 400, das SDK übersetzt das Feld |
| Start | `@google/genai` mit `httpOptions.baseUrl = GATEWAY/gemini`, `apiKey` = virtueller Schlüssel | Operation in 1,2 s, gleicher Weg wie die Studio-Route |
| Status | `GET GATEWAY/gemini/v1beta/{operationName}` alle 5 s | fertig nach 29 bis 30 s, Form `generateVideoResponse.generatedSamples`, kein 403 beim ersten Abruf |
| Download | `GET GATEWAY/gemini/v1beta/files/<id>:download?alt=media`, Kopf | 200, `video/mp4`, 1,0 bis 1,2 MB in 0,7 s; Google direkt ohne Schlüssel 403 |
| Kosten | `x-litellm-key-spend` vorher / nachher | 0,955 → 1,155 → 1,355 $, je Video genau 0,20 $ (4 s × 0,05 $). Buchung erscheint etwa zwei Minuten verzögert, nicht im Antwortkopf |

Folgen: Weg a ist belegt und wird die Empfehlung. Der Checkpoint „kippt zu Weg b, wenn der Spend nicht um 0,20 $ steigt“ ist nicht gerissen. Die Statusroute muss nur zwei Dinge ändern: Abfrage und Download auf den Gateway umschreiben, Schlüssel im Kopf. Weil die Buchung verzögert kommt, zeigt das LiteLLM-Protokoll den Start erst nach dem Ende des Videos mit Kosten; die Zeilen „unknown“ im Protokoll sind Durchleitungs-Aufrufe ohne Modell in der Adresse (Operation, Datei) und kosten nichts.

## Nachtrag 2026-10-15 (Nacht): Startbild und Endbild über die Durchleitung

Weil „Endbild bleibt“ das Argument für Weg a ist, zwei Fast-Videos über `@google/genai` mit Gateway-Adresse (Bilder 3,5 und 5,4 MB PNG aus dem Bild-Prüfstand, als Base64 im JSON-Körper, der Gateway reicht beides durch):

| Fall | Ergebnis | Spend danach |
|---|---|---|
| Fast, Startbild 1536×1024, 4 s | Operation in 3,2 s, fertig nach 41 s, 3,6 MB | +0,40 $ |
| Fast, Start- und Endbild, **4 s** | 400 von Google: „Your use case is currently not supported“ | 0 |
| Fast, Start- und Endbild, **6 s** | 400, derselbe Text | 0 |
| Fast, Start- und Endbild, **8 s** | Operation in 7,7 s, fertig nach 58 s, 3,9 MB (`veo-fast-8s-frames-durchleitung.mp4`) | +0,80 $ |

Spend gesamt 1,355 → 2,555 $, jede Buchung genau Sekunden × Sekundenpreis, auch bei Fast. Befund: Endbild läuft über die Durchleitung, aber Google nimmt Start- plus Endbild nur mit 8 s an. Das ist eine Regel von Google, nicht des Gateways, und sie gilt im Studio heute schon (die Oberfläche bietet 4/6/8 s mit Endbild an; bei 4 und 6 s muss der Direktpfad denselben 400 geliefert haben). Frage für die Seite: Dauer bei gesetztem Endbild auf 8 s festlegen oder die Ablehnung nur sauber melden.

## Nachtrag 2026-10-15 (Nacht): Antworten und Bauauftrag

- s1 bis s3: passt. f2 a: Credits bleiben 10 / 20 / 40. f3 a (Dauer springt mit Endbild auf 8 s) ist durch f1 gegenstandslos, weil das Endbild entfällt.
- f1: Rico hat auf der Seite nicht gewählt, sondern gefragt, warum das Gateway-Protokoll bei manchen Zeilen „unknown“ statt des Modells zeigt. Antwort im Chat: Bei der Durchleitung trägt nur der Start das Modell in der Adresse, Statusabfragen und Download stehen als „unknown“ mit 0 $, die Kosten erscheinen in der Startzeile ein bis zwei Minuten verzögert. Über `/v1/videos` kennt der Gateway den Vorgang selbst, jede Zeile zeigt das Modell, die Kosten stehen sofort beim Start. Daraufhin **Weg b**, Zitat im Kopf: Seminar-Werkzeug, Startbild reicht zum Zeigen, Endbild entfällt.
- Richtungen r1 bis r6: ohne Einspruch, Rico: „bau nach ihnen“. r1 gilt (403 beim ersten Statusabruf über `/v1/videos` gemessen), r6 gilt: Bau in dieser Session.
- Entscheidung damit: Startroute `POST /v1/videos` (JSON ohne Bild, Multipart `input_reference` mit Startbild), Statusroute `GET /v1/videos/{id}` und `GET /v1/videos/{id}/content`, Download nach R2 wie bisher. `supportsEndFrame` entfällt, das Feld „Endframe“ verschwindet aus dem Reiter Video, die Dauer bleibt 4 / 6 / 8 s, die Modellkennungen bleiben. Die Durchleitung bleibt als gemessener Rückweg im Exit-Pfad (zwei Zeilen in der Startroute, zwei Adressen in der Statusroute).
- Vor dem Bau wird `/v1/videos` noch einmal genau für die Felder der Routen gemessen (Dauer 6 s, Hochformat, Startbild als JPEG), weil die erste Messung nur 4 s und 1280×720 abdeckte.

## Nachtrag 2026-10-15 (Nacht): Messung `/v1/videos` für die Routenfelder und Bau

**Messung** (`scripts/veo-videos-pruefstand.mjs`, Bericht `docs/pruefstand/litellm/bericht-veo-videos.md`):

| Fall | Ergebnis |
|---|---|
| Text, `seconds: "6"`, `size: "720x1280"` | 200 in 1,7 s, Kosten 0,30 $ sofort im Antwortkopf, fertig nach 30 s, MP4 720×1280, 6,0 s, mit Ton |
| Startbild JPEG als Multipart `input_reference`, 4 s, 1280×720 | 200 in 2,7 s, 0,20 $, fertig nach 35 s, MP4 1280×720, 4,0 s, mit Ton |
| `seconds: "5"` | 400 von Google (4 bis 8), 0 $ |
| `size: "1000x1000"` | **angenommen und berechnet** (0,20 $); der Gateway prüft die Größe nicht. Das Studio schickt nur die zwei gemessenen Größen |
| Unbekanntes Modell | 403 `team_model_access_denied`, 0 $ |
| Status einer erfundenen Kennung | 500 mit OpenAI-Text; die Statusroute prüft die Kennung vorher (`video_` plus Base64) |
| 403 beim ersten Statusabruf | in diesen zwei Läufen nicht aufgetreten; r1 bleibt im Code |

Kennung: `video_` plus Base64 von `litellm:custom_llm_provider:gemini;model_id:…;video_id:models/…/operations/…`, etwa 190 Zeichen.

**Bau** (nicht committet):

| Datei | Was |
|---|---|
| `app/api/generate-video/start/route.ts` | `POST /v1/videos` über `fetch`: JSON ohne Bild, Multipart mit `input_reference` bei Startbild (Galerie oder Upload); `seconds`, `size` aus `VIDEO_SIZES`; Abbruch nach 50 s; Fehler über `describeGatewayError`, Credits zurück; Antwort `jobId` statt `operationName` |
| `app/api/generate-video/status/route.ts` | `GET /v1/videos/{id}`, 403 und 429 als „noch nicht fertig“ (r1), `failed` mit Text, `completed` → `GET …/content` → R2 wie bisher; Schlüssel im Kopf (r2) |
| `lib/gateway.ts` | `gatewayAuthHeaders()`, `gatewayVideoUrl()`, `describeGatewayError` kennt „Videogenerierung“ und das nicht freigegebene Modell (r3) |
| `lib/models.ts` | `supportsEndFrame` und `videoSupportsEndFrame` entfernt, `VIDEO_SIZES` neu, Credits 10 / 20 / 40 unverändert |
| `lib/validation.ts` | `isValidVideoJobId` ersetzt `isValidOperationName` |
| `components/video/video-tab.tsx` | Endframe-Feld, Pfeil und Hinweis „Endframe nur mit Fast/Pro“ entfernt; Galerie-Leiste „Aus Galerie als Startframe übernehmen“; „Startframe optional“; Fortschritt „Veo generiert dein Video…“; `jobId` |
| `components/video/video-settings.tsx` | Modellkennung klein unter dem Namen statt „Start + Endframe“ |
| `.env.example` | Google-Schlüssel entfernt, Veo-Namen bei den freigegebenen Modellen ergänzt |

`@google/genai` bleibt als Abhängigkeit, weil `scripts/veo-durchleitung-pruefstand.mjs --sdk` (der gemessene Rückweg) es braucht; der Studio-Code importiert es nicht mehr.

**Nachweise:** `npx tsc --noEmit` 0 Fehler; `eslint` auf den geänderten Dateien 0 Fehler, 2 bestehende `<img>`-Warnungen; `npx next build` läuft durch, beide Videorouten im Routenbaum. Kein Lauf gegen einen lokalen Server (keiner lief, Anmeldung nötig); die Felder der Routen sind eins zu eins die gemessenen. Abnahme in der Live-Umgebung über den Prüfstand.

## Nachtrag 2026-10-15 (Nacht): Go, Commit, Push

Rico: „Go: committe und pushe Etappe 2 … Danach gehe ich den Prüfstand live durch.“ Commit `849225f` auf `main`, gepusht am 15.10.2026 nachts. Vercel braucht keine neue Variable. Offen bis zum Abschluss der Etappe: Prüfstand live (<https://claude.ai/artifact/JukTgULPPPi7g6JGYKsWae>, Sammlung `ruecklaeufe`), danach die alten drei `gemini/veo-…`-Einträge im LiteLLM löschen (r4).

## Nachtrag 2026-10-15 (Nacht): Prüfstand live, Rückläufe

Rico hat alle sechs Szenarien live geprüft (Sammlung `ruecklaeufe`): S1 bis S6 „Funktioniert“, Gesamt noch offen. Video läuft im Live-Studio über den Gateway, Lite und Fast, mit Startbild aus Galerie und Upload, das Protokoll zeigt Modell und Kosten (S6). Damit ist das Abnahmekriterium der Etappe erfüllt.

**Fehler aus S4 (Notiz):** Upload eines JPEG mit 4,35 MB als Startframe endete mit „Unexpected token 'R', "Request En"… is not valid JSON“. Ursache: Vercel nimmt höchstens 4,5 MB je Anfrage an; das Bild wird als Base64 im JSON zu 5,8 MB, Vercel antwortet mit dem Text „Request Entity Too Large“ (413), die Oberfläche las ihn als JSON. Der Fehler bestand vor Etappe 2 (die Routen prüfen 10 MB, Vercel 4,5 MB) und betrifft nur Uploads, Galerie-Bilder gehen per Kennung.

**Behebung** (`components/video/video-tab.tsx`, nicht committet): Hochgeladene Fotos werden im Browser auf höchstens 2048 px Kante und etwa 3 MB verkleinert (Canvas, JPEG, Qualität absteigend ab 0,9), als Base64 rund 4 MB; Antworten des Servers werden tolerant gelesen, ein 413 erscheint als „Die Anfrage ist zu groß für den Server (höchstens 4,5 MB)“. `npx tsc --noEmit` 0 Fehler, eslint 0 Fehler. Nicht live geprüft, bis gepusht; Szenario für Rico: dasselbe 4,35-MB-JPEG noch einmal als Startframe.

Gleiche Kante im Reiter „Bearbeiten“ (bis drei Uploads je 10 MB im JSON): nicht angefasst, als Folgeaufgabe vorgeschlagen.

## Nachtrag 2026-10-15 (Nacht): Abschluss der Etappe

Upload-Behebung als Commit `1ac74c4` gepusht. Rico hat das 4,35-MB-JPEG live erneut als Startframe geprüft: läuft. Gesamt: Go, im Chat („Gesamt steht auf Go. Schließ die Etappe ab.“); auf der Prüfstand-Seite ist das Gesamt-Dokument nicht gespeichert, der Chat gilt. Etappe 2 ist erledigt: Ein Veo-Video aus dem Live-Studio steht im LiteLLM unter `lernen-media-studio` mit Kosten größer null, kein Google-Schlüssel mehr in Umgebung und Code.

Was Rico noch im Gateway tut (r4): die drei alten Einträge `gemini/veo-3.1-lite-generate-preview`, `gemini/veo-3.1-fast-generate-preview`, `gemini/veo-3.1-generate-preview` löschen und aus der Team-Liste nehmen. Als Nächstes dieselbe Upload-Grenze im Reiter „Bearbeiten“ (Vorschlag liegt als Aufgabe vor), und nach zwei Wochen der Checkpoint: Gateway-Kosten je Video gegen die 10 / 20 / 40 Credits halten.

## Nachtrag 2026-10-15 (Nacht): Credits, Richtigstellung zu F2

Rico im Chat nach dem Abschluss: „dann lass uns 500 Credits geben, da ich die teilnehmer auch danach noch bisschen üben lassen möchte, aber lass uns unbedingt die credits für video hochsetzen mit zeitbedingung“. Damit ist F2 a (10 / 20 / 40 beibehalten) überholt, es gilt F2 b, die Staffel von der Entscheidungsseite:

| Modell | 4 s | 6 s | 8 s | Echte Kosten 4 / 6 / 8 s |
|---|---|---|---|---|
| Veo 3.1 Lite | 15 | 25 | 30 | 0,20 / 0,30 / 0,40 $ |
| Veo 3.1 Fast | 30 | 45 | 60 | 0,40 / 0,60 / 0,80 $ |
| Veo 3.1 | 120 | 180 | 240 | 1,60 / 2,40 / 3,20 $ |

Ein Credit entspricht damit überall rund 1,3 Cent (Bilder gemessen, Video aus den Sekundenpreisen des Gateways; Standard ist im Studio noch nie gelaufen, der Preis 0,40 $/s ist der hinterlegte Wert). Startguthaben 500 Credits, also höchstens 6,60 $ je Person, egal welche Mischung. Vorher: 250 Credits, bei Standard-Video bis 20 $ je Person.

Bau (nicht committet): `lib/models.ts` `costs` je Dauer und `getVideoCost(modell, dauer)`, `getModelCost` nur noch für Bilder; Startroute bucht nach Dauer; Reiter Video zeigt die Credits im Einstellungs-Knopf („Veo 3.1 Lite · 16:9 · 6s · 25 Credits“), in der Modellliste für die gewählte Dauer und an jedem Dauer-Knopf („4s · 15“); `.env.example` und der Rückfall im Anmelde-Callback auf 500. Nachweise: `npx tsc --noEmit` 0 Fehler, eslint 0 Fehler. **Vercel:** `DEFAULT_CREDITS` dort auf 500 setzen (gilt nur für neue Konten, bestehende behalten ihren Stand).

Commit `e2da29b` auf `main`, gepusht 15.10.2026 nachts. `DEFAULT_CREDITS` in Vercel setzt Rico auf 500.

## Nachtrag 2026-10-15 (Nacht): Google-Guthaben leer, Fehlermeldung ergänzt

Nach dem Löschen der alten `gemini/veo-…`-Einträge meldete das Studio „Fehler bei der Videogenerierung“. Messung: Schlüssel sieht die drei neuen Namen, `/v1/videos` antwortet für alle drei mit 402 von Google, „Your prepayment credits are depleted“. Ursache ist das aufgebrauchte Guthaben bei Google AI Studio hinter dem Gateway-Schlüssel, nicht das Löschen. Rico lädt auf. `describeGatewayError` übersetzt diesen Text jetzt in „Der Anbieter hinter dem KI-Gateway hat kein Guthaben mehr (Google AI Studio)…“ mit Status 402.

## Nachtrag 2026-10-16: Upload-Grenze auch im Reiter Bearbeiten

Rico: „komm lass uns den upload beim bearbeiten noch erledigen“. Die Verkleinerung aus dem Reiter Video liegt jetzt in `lib/client-image.ts` (`bildFuerUpload(file, maxBytes)`, `antwortLesen(res)`, Budget 3 MB je Anfrage vor Base64, Kante 2048 px, JPEG mit sinkender Qualität, bei Bedarf halbe Kante). Der Reiter Video nutzt sie mit dem ganzen Budget, der Reiter Bearbeiten teilt es durch die drei möglichen Bilder (1 MB je Upload), für Dateiwahl und Drag-and-drop gleich; Serverantworten werden tolerant gelesen, ein 413 erscheint als Satz. Galerie-Bilder gehen weiter per Kennung und sind nicht betroffen. Nachweise: `npx tsc --noEmit` 0 Fehler, eslint 0 Fehler. Nicht live geprüft; Szenario für Rico: im Reiter Bearbeiten drei große Fotos (je über 3 MB) hochladen und bearbeiten.

Commit `b36687e`, gepusht 16.10.2026. Rico live geprüft: drei große Fotos laufen im Reiter Bearbeiten durch. Offen bleibt nur der Chat (`components/ai-elements/prompt-input.tsx` hängt Bilder ungebremst an), mit derselben Hilfe in wenigen Zeilen zu lösen, wenn es dort je auffällt.
