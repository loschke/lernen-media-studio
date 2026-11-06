# ADR 0008: Die neue App liest die Design Library direkt und bietet Stile und Formeln als Auswahl

- Datum: 2026-11-06
- Status: vorgeschlagen (Validator-Session 06.11.2026, Fable). Das Ziel ist Ricos Wort vom 06.11. („integration der stil und promptformeln in unsere studio“), die Baureihenfolge seine Notiz bei s2 („beides gleichzeitig“). Der Weg ist ein Vorschlag aus Entwurf A und Entwurf B. Auf der Entscheidungsseite: s4, s8, die Richtungen r1, r2, r3, r12, r17, r18, r22, r23.
- Status seit 06.11.2026: weiter `vorgeschlagen`. Ziel und Baureihenfolge sind akzeptiert (s4 und s8 „Stimmt so“). Der Weg ist offen: Die Richtungen r1, r2, r3, r12, r17, r18, r22 und r23 sind unbeantwortet (f14), und der Datenweg hängt an der Architektur-Frage f13.
- Status seit Ricos dritter Runde (06.11.2026): **akzeptiert.** Ziel und Reihenfolge durch s4 und s8, der Weg durch f14 a: Die Richtungen r1, r2, r3, r12, r18, r22 und r23 gelten ohne Einspruch; aus r27 gilt der Teil zum Design Library Studio (Leserliste, Lese-Zugang, je mit Ricos Go). Der Datenweg ist von f13 unabhängig: eine Serverroute mit `pg`, mit oder ohne Mastra.
- Bezug: ADR 0004 (Kontext mit den Messungen zur Library, Nachtrag Validator-Session); `design-library-studio` ADR 0005 (Stile), ADR 0007 (kleine Vorschaubilder), `CLAUDE.md` (Rollen, „Keine Schemaänderung ohne ADR“); `mcp-apps-server` ADR 0021 (Library ist kostenlos) und ADR 0026 (neue Stile erscheinen ohne Deployment)
- Dieser Entwurf zieht mit dem Clone in das neue Repo und bekommt dort seine Nummer. Er übernimmt aus ADR 0004 die Stücke 3 und 4 und den Datenweg.

## In einem Satz

Die neue App liest fertige Stile und Formeln nur lesend aus der Library-Datenbank und bietet beide im Reiter „Generieren“ als Auswahl an, gebaut in einem Stück.

## Kontext

- Gemessen 06.11.2026: 101 Stile und 166 Formeln mit `status = 'Fertig'`, jeder fertige Stil hat ein kleines Vorschaubild (`thumbUrl`, 512 px). Alle Stile beginnen mit `[subject] [action] [environment]`. Formeln haben 1 bis 8 Platzhalter; `variables` ist leer, die Platzhalter stehen nur im `templateText`, die Legende ist Markdown mit einer Zeile je Platzhalter. Einzelheiten in ADR 0004, Kontext.
- Die Einsetzregel für Stile steht als reine Funktion in `design-library-studio/lib/motive.ts` (`promptFuerMotiv`), ein Parser für die Legende in `ai-design-guide/scripts/katalog-ziehen.mjs` (`legendeParsen`).
- `/api/generate` nimmt einen fertigen Prompt bis 2.000 Zeichen. Ausgefüllte Beispiel-Prompts sind höchstens 629 Zeichen lang. Route, Credits und Modelle brauchen für die Auswahl keinen Umbau.
- Direkte Leser der Library sind heute der Hub (Rolle `mcp_apps_reader`) und `ai-design-guide`. Der Hub ist am 24.10. vom Neon-Treiber auf `pg` gewechselt, damit ein Umzug der Library ein Wechsel der Umgebung bleibt.
- Rico gibt im Design Library Studio frei und will das Ergebnis im Seminar zeigen können.

## Entscheidung (Vorschlag)

1. **Datenweg:** eine Serverroute liest mit `pg` über eine eigene Variable, nur `status = 'Fertig'`, mit rohem SQL. Zwischenspeicher fünf Minuten (Vorschlag, nicht gemessen).
2. **Eigene Leserolle** mit `SELECT` auf `image_prompt_formulas`, `image_formula_results`, `style_references`, `style_results`. Sie lässt sich entziehen, ohne den Hub zu treffen. Angelegt wird sie über ein Skript in `design-library-studio/scripts/db/`, gegen Neon nur mit Ricos Go.
3. **Stile:** Auswahl mit Vorschaubild, Familie und Suche. Die Person schreibt das Motiv, die App setzt den Stiltext nach der Regel aus `promptFuerMotiv` dahinter. Der fertige Prompt bleibt sichtbar und änderbar.
4. **Formeln:** Formel wählen, ein Feld je Platzhalter, die Legende als Hilfe am Feld, Beispiele als Vorbelegung. Platzhalter ohne Legende zeigen ihren Namen.
5. **Erste Fassung: entweder Formel oder Stil.** Viele Formeln tragen ihren Look im Text, ein Stil dahinter arbeitet dagegen. Die 26 Formeln mit eigenem Stil-Platzhalter sind der spätere Anschluss (Parkplatz).
6. **Beide in einem Stück**, nach Grundgerüst und Look (ADR 0006, r21). Die Kennung von Stil oder Formel wandert in die Begleitdatei des Bildes.
7. **Tests für die reinen Teile:** Einsetzregel, Platzhalter-Erkennung, Legenden-Parser, je mit Gegenprobe.

## Preis & Konsequenzen

- Die App wird der dritte direkte Leser der Library-Tabellen. Sie gehört in die Leserliste von `design-library-studio/CLAUDE.md`; eine Schemaänderung dort muss sie mitdenken, und ihr Bild-Host gehört in die Betrachtung bei einem Speicherwechsel der Library.
- Einsetzregel und Parser werden übernommen, nicht geteilt. Ändert sich die Regel im Design Library Studio, muss die App nachziehen. Ein gemeinsames Paket wäre eine eigene Weiche.
- Fünf Minuten Zwischenspeicher heißt: Eine Freigabe ist nach spätestens fünf Minuten in der App. Die Zahl ist nicht gemessen.
- Vorschaubilder kommen vom Bild-Host der Library (heute R2). Bekommt die App eine Content-Security-Policy, muss dieser Host darin stehen.
- Nicht gemessen: Antwortzeit der Abfrage von Hetzner zu Neon, Größe der Liste im Browser (geschätzt aus dem Schnappschuss: Stile 54 KB, Formeln 177 KB ohne Beispiele).

## Exit-Pfad

- Die Auswahl ist ein Zusatz im Reiter „Generieren“. Ohne Verbindung zur Library zeigt die App die Auswahl nicht und arbeitet wie ohne; die Variable entfernen stellt diesen Zustand her.
- Die Leserolle lässt sich im Design Library Studio entziehen.
- Wird der direkte Zugriff zum Problem (Schema, Last), bleibt der Weg über den Hub, den build.jetzt heute geht.

## Checkpoint

- Vier Wochen nach dem Start der neuen App: Nutzen Personen die Auswahl? Zählbar an den Kennungen in den Begleitdateien.
- Wenn die Library ihr Schema ändert oder den Speicher wechselt: prüfen, ob Abfrage und Bildadressen noch tragen.
- Nach dem ersten Seminar mit der Auswahl: Reichen fünf Minuten, oder braucht Rico einen Knopf „Jetzt neu laden“?

## Nachtrag 2026-11-06: Ricos Antworten

s4 und s8 sind bestätigt. Mit f5 c wird neu gebaut: Punkt 6 („nach Grundgerüst und Look“) gilt weiter, die Sätze zu „Clone“ lesen sich als
„neue App“. Neu auf dem Parkplatz, aus Ricos Wort im Chat zu f8: den Library-MCP im Hub um Generierungsfunktionen erweitern („ist aber
weiteres thema“). Auslöser: Rico nimmt das Thema auf. Das wäre ein zweiter Weg zu denselben Stilen und Formeln, außerhalb der App, und eine
eigene Weiche im Repo `mcp-apps-server`. Dieser Entwurf zieht in das neue Repo und wird dort nach f13 und f14 fertig geschrieben.

## Nachtrag 2026-11-06: dritte Runde

f14 a: Die Richtungen zu diesem ADR gelten ohne Einspruch. Fällt f13 auf c, kann der Assistent die Liste der Stile und Formeln später
als Werkzeug bekommen; das ändert an Datenweg, Leserolle und Zwischenspeicher nichts.

## Nachtrag 2026-11-06: umgezogen

Die geltende Fassung liegt seit dem 06.11.2026 im neuen Projekt `C:\Users\losch\Projekte\ai-design-media-studio` als ADR 0004 und wird nur
dort fortgeschrieben. Diese Datei bleibt als Herleitung stehen.
