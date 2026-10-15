# Roadmap lernen-media-studio

- Angelegt: 2026-10-15 (Session „LiteLLM-Umstellung“), noch nicht von Rico beschlossen
- **Führendes Dokument ist die Seite:** noch keine Roadmap-Seite. Diese Datei ist bis dahin
  der einzige Zeiger. Sobald mehr als eine Etappe ansteht, entsteht die Seite nach dem
  Skill `arbeitsweise` und wird hier eingetragen.

## Wo wir stehen

Etappe 1 läuft (Entscheidungsseite veröffentlicht, Antworten offen). Stand je Etappe
hier, bis es eine Seite mit Sammlung `fortschritt` gibt.

| # | Etappe | Stand |
|---|---|---|
| 1 | Studio an LiteLLM: Bilder über GPT Image 2.5, Chat über Haiku 5.5 | laeuft (gebaut, im Prüfstand) |

## Das Ziel in einem Absatz

Das Studio hängt mit einem eigenen virtuellen Schlüssel an Ricos LiteLLM. Dort sind
Nutzung, Kosten und Budget je App sichtbar, und ein Modellwechsel ist ein Eintrag im
Gateway statt ein Umbau im Studio. Bilder entstehen mit GPT Image 2.5 in zwei Angeboten
(schnell mit Flare, Premium mit Sunburst), der Chat läuft auf Haiku 5.5. Video (Veo)
bleibt direkt bei Google, bis der Gateway Google bedient.

## Die Etappen in Baureihenfolge

| # | Etappe | Grundlage | Vorgehen | Modell |
|---|---|---|---|---|
| 1 | LiteLLM-Umstellung Bild und Chat | ADR 0001 | Entscheidungsseite, Prüfstand-Skript gegen den Gateway, Bau in drei Stücken (Bild, Bearbeitung, Chat), Prüfstand in der Oberfläche | Vorsession Fable, Bau Opus |

## Fertig ist die Umstellung, wenn

1. Ein Bild „Schnell“ und ein Bild „Premium“ aus dem Studio erscheinen im LiteLLM unter
   dem Schlüssel `lernen-media-studio` mit Kosten größer null.
2. Eine Bearbeitung mit hochgeladenem JPEG läuft ohne Fehler durch.
3. Der Chat antwortet gestreamt, mit Bild im Anhang, und der Zug steht im Gateway.
4. `ANTHROPIC_API_KEY` ist aus der Umgebung des Studios entfernt, Video läuft weiter.

## Parkplatz

- Veo über den Gateway. Auslöser: ADR 0084 Stufe 3 in build ist gebaut (Google am Gateway).
- Gemini-Bildmodelle als drittes Angebot. Auslöser: Rico wünscht es auf der Entscheidungsseite (F2).
- Größenwahl (2K) im Studio. Auslöser: Antwort auf F3.

## Seiten je Etappe

| Etappe | Seite | Sammlung |
|---|---|---|
| 1 | Entscheidungsseite <https://claude.ai/artifact/12cj27SLikcxKYLQqMEQJX> | `antworten`: alle beantwortet am 15.10.2026, überall Empfehlung |
| 1 | Prüfstand <https://claude.ai/artifact/MetNG8znw4FMHi993dQU2r> | `ruecklaeufe`: `s1` bis `s8`, `gesamt`. Offen seit 15.10.2026 |

## Startbereit

Etappe 1 ist gebaut (15.10.2026, nicht committet) und wartet auf Ricos Rückläufe im Prüfstand.
Danach: Go, Commit, Push, Vercel-Variablen (`MODELL_GATEWAY_URL`, `MODELL_GATEWAY_KEY` setzen,
`ANTHROPIC_API_KEY` entfernen).
