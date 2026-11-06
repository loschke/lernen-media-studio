# ADR 0004: Das Media Studio wird app.ai-design.guide, mit Stilen und Formeln der Design Library

- Datum: 2026-11-06
- Status: vorgeschlagen (Vorsession 06.11.2026, Fable). Rico im Chat am 06.11.2026: „ich würde in dem Zuge der Erweiterung gern das lernen Studio in die app.ai-design.guide ändern, look and feel und domain, dann ist alles was bildgenerierung ist unter dem ai-design.guide vereint und ich könnte mir überlegen, daraus ein mini saas zu machen“. Die Antworten auf der Entscheidungsseite stehen aus.
- Status seit der Validator-Session (06.11.2026): weiter `vorgeschlagen`, in Teilen überholt. Rico hat 7 von 19 Punkten beantwortet (s1 bis s3, f1 bis f4), die Richtungen r1 bis r12 nicht. Sein Einspruch bei s3 nimmt diesem ADR den Kern („das Studio bleibt die Basis“). Was gilt, was überholt ist und welche Weichen in ADR 0005 bis 0008 weitergehen, steht im Nachtrag „Validator-Session“ am Ende. Akzeptiert ist aus diesem ADR nur, was dort unter „Von Ricos Wort gedeckt“ steht.
- Status seit Ricos zweiter Antwortrunde (06.11.2026): **überholt durch ADR 0005, ADR 0007 und ADR 0008, ohne je akzeptiert worden zu sein.** Rico hat bei f5 den Neubau gewählt („es sollte daher nicht die Basis für ein neuen Ansatz sein“). Was aus diesem ADR weiterlebt (Marke und Look von ai-design.guide, Adresse `app.ai-design.guide`, Stile und Formeln, Mini-SaaS nur vorbereiten), steht in den genannten ADRs. Alle Antworten im Nachtrag „Ricos Antworten, zweite Runde“ am Ende.
- Bezug: ADR 0001 (Gateway, ein Schlüssel je App); `loschke-id` ADR 0001 und Blueprint 04 (Anmeldung); `design-library-studio` ADR 0005 (Stile) und ADR 0007 (kleine Vorschaubilder); `ai-design-guide` ADR 0001 (Look); `build-jetzt-superagents` ADR 0035 Abschnitt 2 (Bildwerkstatt als Dienst)
- Löst ab, wenn akzeptiert: aus build ADR 0035 Abschnitt 2 den Punkt D2 b („Neues Repo; das Media Studio bleibt bis zur Ablösung unangetastet“). Der Bild-Einstieg in build (Abschnitt 1) bleibt unberührt.
- Entscheidungsseite: <https://claude.ai/artifact/H4NW2cYRG4RVRUhSETuaJa> (Quelle `docs/seiten/etappe-4-weichen.html`, Sammlung `antworten`: `s1` bis `s3`, `f1` bis `f4`, `r1` bis `r12`), veröffentlicht 06.11.2026 (Stand Vorsession; seit der Validator-Session vom 06.11.2026 `s1` bis `s8`, `f1` bis `f12`, `r1` bis `r24`)

## In einem Satz

Das Media Studio zieht unter die Marke ai-design.guide (Adresse `app.ai-design.guide`, Look der Design Library) und bekommt im Reiter „Generieren“ die Stile und danach die Formeln der Design Library als Auswahl; ein Mini-SaaS wird in dieser Etappe vorbereitet, nicht gebaut.

## Kontext

### Die Design Library (gemessen 06.11.2026)

- Quelle ist die Neon-Datenbank `cold-star-80268276` (Tabellen `image_prompt_formulas`, `image_formula_results`, `style_references`, `style_results`). `design-library-studio` schreibt, der Hub (`mcp-apps-server`, Rolle `mcp_apps_reader`) und `ai-design-guide` (`pnpm katalog`, Schnappschuss `src/data/katalog.json`) lesen. Freigabe ist `status = 'Fertig'`.
- Stand über den MCP-Zugang am 06.11.: 166 Formeln, 101 Stile, 1.794 Beispielbilder. Der Schnappschuss von ai-design.guide vom 04.11. hat 161 Formeln; am 03.11. waren es 152. Die Bibliothek wächst täglich.
- **Stile** (gemessen am Schnappschuss, 101 Einträge): alle 101 beginnen mit `[subject] [action] [environment]`, keiner hat danach eine weitere Klammer. Länge 93 bis 297 Zeichen. Alle haben Name, Familie (`illustrativ` 46, `corporate` 55), Schlagworte und ein kleines Vorschaubild (`thumbUrl`, 512 px). Die Einsetzregel steht als reine Funktion in `design-library-studio/lib/motive.ts` (`promptFuerMotiv`).
- **Formeln** (161 Einträge): 1 bis 8 Platzhalter in eckigen Klammern, meist 3 oder 4. 591 von 599 Platzhaltern haben einen Eintrag in der Legende, 153 von 161 Formeln bringen Beispiele („z. B.“) mit, eine Formel hat keine Legende. Ausgefüllte Beispiel-Prompts sind höchstens 629 Zeichen lang. 26 Formeln haben einen eigenen Stil-Platzhalter.
- Die Design Library ist seit `mcp-apps-server` ADR 0021 ein kostenloses Promo-Produkt, der ganze Katalog steht offen auf ai-design.guide. Es gibt keinen bezahlten Inhalt, den das Studio verschenken würde.

### Das Media Studio (gelesen und gemessen 06.11.2026)

- Live unter `studio.lernen.diy`, Anmeldung über `id.loschke.ai` seit 15.10.2026 (`loschke-id` Blueprint 04: Anbieter `media-studio`, Client `lernen-media-studio`, Gruppe `app-media-studio`, Rückwege fest auf `studio.lernen.diy`). Rico schaltet jede Person frei. Am 14.10. waren es 8 freigeschaltete Konten; der heutige Stand ist nicht gemessen.
- `/api/generate` nimmt einen fertigen Prompt bis 2.000 Zeichen (`lib/validation.ts`). Stiltext plus Motiv und jede ausgefüllte Formel bleiben weit darunter. Route, Credits und Modelle brauchen für die Auswahl keinen Umbau.
- Die Marke lernen.diy steht in fünf Dateien: `app/page.tsx` (Startseite), `app/app/page.tsx` (Kopfzeile, Dateiname beim Herunterladen), `app/layout.tsx` (Titel), `app/api/chat/route.ts` (Text des Assistenten), `app/globals.css` (Farben als shadcn-Variablen, Teal). `design-library-studio/app/globals.css` hat dieselben Variablen schon in Navy, Gelb und Rot.
- Kein CSP-Kopf und kein `next/image`: Vorschaubilder vom Bild-Host der Library laden ohne Änderung an der Konfiguration.
- Der Reiter „Bibliothek“ ist im Studio die Galerie der eigenen Ergebnisse. Unter ai-design.guide heißt „Library“ die Design Library.
- Die lokale `.env` zeigt noch auf `auth.loschke.ai` (abgeschaltet). Maßgeblich ist die Umgebung bei Vercel; lokal anmelden geht mit diesen Werten nicht.
- Zweig `feat/exercises-tab` (zwei Commits, 63 Dateien, nicht zusammengeführt): ein Reiter „Übungen“ entlang des 4K Frameworks.

### Der Befund vom 09.09. ist zum Teil noch offen

Build ADR 0035 hat das Studio am 09.09.2026 gesichtet („Auth und Credit-Buchhaltung sind gut, der Rest ist Prototyp“) und drei Löcher genannt. Rico hat daraufhin ein neues Repo beschlossen (D2 b). Seitdem sind Gateway (ADR 0001 bis 0003) und Authentik dazugekommen. Nachgesehen am 06.11.:

- **Offen:** `app/api/chat/route.ts` prüft die Sitzung nicht (kein Aufruf von `getCurrentUser` oder `getSessionId` in der Datei). `proxy.ts` Zeile 44 prüft nur, ob das Cookie `ms_id_token` existiert. Wer irgendeinen Cookie-Wert schickt, erreicht den Assistenten und verbraucht Budget am Gateway. Der Chat kostet zudem keine Credits.
- **Offen:** `app/api/generate-video/status/route.ts` erstattet nicht, wenn ein Video nach dem Start scheitert (kein `refundCredits` in der Datei).
- **Offen:** keine Tests, keine Drossel je Person.
- **Geschlossen oder entschärft:** Bild, Bearbeiten, Video-Start, Galerie und Credits prüfen die Sitzung in der Route selbst.

### Was für ein Mini-SaaS schon da ist

Credits mit atomarem Abzug und Erstattung (`lib/credits.ts`), Budget und Kosten je App am Gateway, Registrierung mit Mail-Code bei `id.loschke.ai`, ein gebauter Kaufweg über Stripe im Hub (`mcp-apps-server` ADR 0018, dort für Lizenzen). Was fehlt: offene Registrierung für diese App, Credits kaufen, Preisseite und rechtliche Seiten, Drossel, die geschlossenen Lücken oben.

## Entscheidung (Vorschlag)

Eine Etappe 4 in vier Stücken, das Studio bleibt die Basis:

1. **Lücken schließen.** Der Chat prüft die Sitzung, der Video-Status erstattet bei Fehlern, Tests für Credits und für den Prompt-Bau. Unabhängig davon, wie weit das SaaS geht.
2. **Umzug und Look.** Adresse `app.ai-design.guide`, Farben und Wortmarke von ai-design.guide (Variablen aus `design-library-studio/app/globals.css`, nur dunkel, Gelb für den einen Hauptknopf, Rot für Platzhalter), Startseite, Titel und Text des Assistenten neu. Derselbe Authentik-Anbieter bekommt die neuen Rückwege dazu, Konten und Credits bleiben. `studio.lernen.diy` leitet weiter.
3. **Stile.** Auswahl im Reiter „Generieren“ mit Vorschaubild, Familie und Suche. Die Person schreibt das Motiv, das Studio setzt den Stiltext nach der Regel aus `promptFuerMotiv` dahinter, der fertige Prompt bleibt sichtbar und änderbar. Die Kennung des Stils wandert in die Begleitdatei des Bildes.
4. **Formeln.** Formel wählen, ein Feld je Platzhalter, Legende als Hilfe, Beispiele als Vorbelegung. Platzhalter ohne Legende zeigen ihren Namen.

Datenweg: Das Studio liest die Library-Datenbank direkt, nur lesend, über eine Serverroute mit kurzem Zwischenspeicher (Vorschlag eine Stunde, nicht gemessen). Eigene Leserolle statt der des Hubs (Vorschlag). Der Neon-Treiber ist im Projekt, die Spalten werden mit rohem SQL gelesen wie in `ai-design-guide/scripts/katalog-ziehen.mjs`.

Mini-SaaS: eigene spätere Etappe. Bis dahin bleibt der Zugang per Freigabe.

## Preis & Konsequenzen

- Das Studio wird der dritte direkte Leser der Library-Tabellen. Eine Schemaänderung dort (Regel in `design-library-studio/CLAUDE.md`) muss das Studio künftig mitdenken; es gehört in die Leserliste dort, und der Bild-Host in die Betrachtung bei einem Speicherwechsel.
- Seminare laufen künftig unter ai-design.guide. Teilnehmende sehen eine andere Marke als auf der Kursseite von lernen.diy.
- Rico hat Handgriffe: DNS-Eintrag für `app.ai-design.guide`, Domain im Vercel-Projekt, `OIDC_REDIRECT_URI` bei Vercel, Leserolle in Neon anlegen und als Variable eintragen. Blueprint 04 mit den neuen Rückwegen wendet die Session mit Ricos Go an (wie bei Blueprint 10 für das Design Library Studio).
- **Berührt Etappe 3:** Die CORS-Regel am R2-Bucket, die für „Letztes Bild als Startframe“ noch fehlt, hängt an der Herkunft. Sie muss `https://app.ai-design.guide` nennen, und `https://studio.lernen.diy`, solange die alte Adresse noch selbst ausliefert. Wird sie vor dem Umzug nur für die alte Adresse gesetzt, bricht der Knopf mit dem Umzug.
- Nach der Annahme bekommt build ADR 0035 einen datierten Nachtrag zu D2 b (mit Ricos Go, anderes Repo).
- Repo, Vercel-Projekt und Gateway-Schlüssel behalten ihre Namen (`lernen-media-studio`). Das ist unschön, aber ein Umbenennen bricht Pfade in mehreren Projekten und den Schlüssel-Alias.
- Der Beschluss vom 09.09. (neues Repo) wird abgelöst. Sein Grund, die ungeklärte Sicherheit, wird durch Stück 1 angegangen, nicht durch einen Neubau. Was ein Neubau zusätzlich gebracht hätte (MCP-Dienst mit Karten in build), entfällt hier und bleibt ein eigener Gedanke.
- Nicht gemessen: Antwortzeit der Library-Abfrage aus Vercel, Größe der Liste im Browser (geschätzt aus dem Schnappschuss: Stile 54 KB, Formeln 177 KB ohne Beispiele), ob Authentik die Kennung `sub` bei zusätzlichen Rückwegen unverändert lässt (erwartet, weil der Anbieter derselbe bleibt).

## Exit-Pfad

- Die Auswahl ist ein Zusatz im Reiter „Generieren“. Ohne Verbindung zur Library zeigt das Studio die Auswahl nicht und arbeitet wie heute; die Variable entfernen stellt den alten Zustand her.
- Der Look hängt an Variablen und fünf Dateien, ein Revert stellt lernen.diy wieder her. `studio.lernen.diy` bleibt als Domain am Projekt und als Rückweg im Blueprint, solange nicht ausdrücklich entfernt.
- Kippt die Richtung „eine App für Seminar und ai-design.guide“, bleibt als Rückweg die Umschaltung der Marke nach Adresse (Option b der Frage f1).

## Checkpoint

- Nach Stück 3: Nutzen Personen die Stil-Auswahl? Zählbar an der Stil-Kennung in den Begleitdateien der Bilder. Vier Wochen nach dem Umzug nachsehen.
- Vor jeder Öffnung der Registrierung: Stück 1 ist nachgewiesen (Chat ohne gültige Sitzung antwortet 401, Video-Fehler erstattet, Tests laufen).
- Wenn die Library ihr Schema ändert oder den Speicher wechselt: prüfen, ob die Abfrage und die Bildadressen im Studio noch tragen.

## Nachtrag 2026-11-06: Ricos Hinweis nach Entwurf A und B, dieses ADR wartet auf die Validator-Session

Rico hat dieselbe Frage in zwei Repos gestellt. Entwurf B (Session im Repo `design-library-studio`) liegt in
`docs/entwuerfe/etappe-4-entwurf-b-aus-design-library-studio.md`. Danach hat Rico im Chat die Ziele genauer gefasst; der Wortlaut und
die Folgen stehen in `docs/entwuerfe/etappe-4-hinweis-rico-fuer-validator.md`. Kurz: Bilder mit GPT Image 2.6 Flare und Sunburst,
Betrieb vollständig auf Hetzner mit Postgres und Speicher dort, keine Migration von Bildern oder Datenbankeinträgen, und als Gedanke
zur Prüfung ein Clone, der in Ruhe umgebaut wird, während das heutige Studio für Seminare unverändert weiterläuft.

Zusatz 06.11.2026 (Validator-Session): Beide Dateien sind gelöscht. Wortlaut des Hinweises, die Tabelle aus Entwurf B und die
Messungen stehen im Nachtrag „Validator-Session“ am Ende dieser Datei.

Was davon in diesem ADR überholt ist, bis die Validator-Session beide Entwürfe zusammenführt:

- „Konten und Credits bleiben“ und der gemeinsame Authentik-Anbieter (Entscheidung, Stück 2): gilt nicht bei einem Clone ohne Migration.
- „Repo, Vercel-Projekt und Gateway-Schlüssel behalten ihre Namen“ (Preis): gilt nicht bei einem Clone auf Hetzner.
- Der Datenweg mit dem Neon-Treiber: Mit Hetzner als Ziel braucht die App `pg`, für die Library (Entwurf B, Zeile 1) und für die eigene Datenbank.
- Der CORS-Hinweis zu Etappe 3: Bei einem Clone bleibt die Regel des alten Studios bei `studio.lernen.diy`.
- „Löst ab: build ADR 0035 D2 b“: Ein Clone liegt näher an D2 b (neues Repo, Studio unangetastet) als dieser Entwurf. Ob D2 b abgelöst oder bestätigt wird, entscheidet die Zusammenführung.

Gemessen am 06.11.2026: Der Schlüssel des Studios sieht am Gateway `gpt-image-2.5-flare` und `gpt-image-2.5-sunburst`, keine 2.6-Modelle.
Die Entscheidungsseite trägt seit demselben Tag einen Hinweis, dass sie auf die Zusammenführung wartet. Antworten gibt es noch keine.

## Nachtrag 2026-11-06: Validator-Session, Zusammenführung von Entwurf A, Entwurf B, Ricos Hinweis und Ricos Antworten

Auftrag (Rico, 06.11.2026): „Entscheidungen sind ausgefüllt, es gibt weitere Anforderungen, mein Gedanke, vielleicht ist der neue Media Stack
der Auftakt für die Online Version der Factory.casa. Deshalb als nächstes die Validator Session“. Diese Session hat nichts gebaut und
nichts committet. Der Satz „Antworten gibt es noch keine“ im Nachtrag darüber galt bis zum Morgen des 06.11., seitdem nicht mehr.

### Ricos Hinweis im Wortlaut (06.11.2026, nach Entwurf A und B)

> darf ich noch einen hinweis geben für die validator session, ziel ist es die integration der stil und promptformeln in unsere studio, ziel ist der visuelle look and feel wie ai design guide studio, blau mit gelben rahmen und neue url, in dem zuge auch die neuen gpt 2.6 flare und sunburst modelle nutzen und in dem zuge auch der umzug vollständig auf eine hetzner umgebung inkl. pg datenbank und storage, nichts muss migriert werden, weder assets noch alte db einträge.
>
> Ein Gedanke war, dass wir quasi einen Clone umbauen und in ruhe fertig machen können, während das lernen studio hier so funktional bleibt wie bisher und für miene seminare bis zur ablösung enutzt werden kann, das alles wäre teil der validator prüfen inkl. der anderen punkte

Daraus sechs Ziele (Stile und Formeln im Studio; Look wie das Design Library Studio, Navy mit gelbem Rahmen; neue Adresse; GPT Image 2.6
Flare und Sunburst; Betrieb vollständig auf Hetzner mit Postgres und Speicher; keine Migration von Bildern, Videos und Datenbankeinträgen)
und ein Gedanke zur Prüfung (Clone, das heutige Studio läuft bis zur Ablösung unverändert weiter).

### Ricos Antworten auf der Entscheidungsseite (Sammlung `antworten`, gelesen 06.11.2026)

| Punkt | Wahl | Notiz | Was daraus wird |
|---|---|---|---|
| s1 Das Studio zieht unter ai-design.guide | Stimmt so (06:55 UTC) | keine | Gilt für Marke und Look. Die Adresse `app.ai-design.guide` ist wieder offen: zwei Minuten später steht bei f4 „Factory.casa“, der Hinweis sagt nur „neue url“. Widerspruch benannt, neue Frage f8. |
| s2 Stile zuerst, Formeln danach | Einspruch | „beides gleichzeitig“ | Stile und Formeln entstehen in einem Stück. Damit ist auch Entwurf B Zeile 13 geklärt. Neu als s8. |
| s3 Das Studio bleibt die Basis, Beschluss vom 09.09. abgelöst | Einspruch | „neu Diskussion im Validator Session, es gibt neue Anforderungen“ | Der Kern dieses ADR ist nicht angenommen. Mit dem Clone-Gedanken wird build ADR 0035 D2 b (neues Repo, Studio unangetastet) eher bestätigt als abgelöst. Neue Frage f5, ADR 0005. |
| f1 Was wird aus studio.lernen.diy | a (eine App, alte Adresse leitet weiter) | keine | Antwort auf die alte Frage. Sie kollidiert mit dem Clone: Dort gibt es bis zur Ablösung zwei Apps. Übrig bleibt „am Ende leitet die alte Adresse weiter“. Nicht geraten, neu gefragt als f6. |
| f2 Wie weit geht das Mini-SaaS | a (vorbereiten, nicht bauen) | keine | Gilt, vom Hinweis nicht berührt. |
| f3 Reihenfolge | a (erst Umzug und Look, dann die Auswahl) | „Look ist auch inkl. UI Verbesserungen, Ideen sind im Kopf Validator Session soll das mit aufnehmen und klären“ | Reihenfolge gilt sinngemäß für den Clone (Richtung r21). Die Ideen kennt nur Rico: neue Frage f10. |
| f4 Wie heißt die App | keine | „Validator Session, es könnte meine Factory.casa draus werden mit Bild/Video Generierung als erstes Modul“ | Nicht beantwortet. Neue Fragen f8 (Dach) und f9 (Name). |
| r1 bis r12 | keine | keine | Offen. Schweigen gilt nicht als Zustimmung, Rico hat das nicht so gesagt. |

### Von Ricos Wort gedeckt (Stand 06.11.2026)

- Marke und Look von ai-design.guide für die Bildgenerierung (s1, Hinweis: „look and feel wie ai design guide studio“). Die Adresse nicht.
- Stile und Formeln der Design Library als Auswahl im Studio, beide in einem Stück (Hinweis, s2).
- Mini-SaaS wird vorbereitet, nicht gebaut; Zugang bleibt per Freigabe (f2 a).
- GPT Image 2.6 Flare und Sunburst, Betrieb vollständig auf Hetzner, keine Migration (Hinweis). Das Wie steht in ADR 0005 bis 0007, alle `vorgeschlagen`.

Nicht gedeckt und deshalb offen: Clone oder Umbau (f5), die Ablösung (f6), ob die zwei Lücken im laufenden Studio geschlossen werden (f7),
das Dach (f8), der Name (f9), die Verbesserungen an der Bedienung (f10).

### Was in diesem ADR überholt ist (richtiggestellt, nichts entfernt)

| Stelle oben | Heute |
|---|---|
| Titel und „In einem Satz“: das Studio zieht auf `app.ai-design.guide` | Ob am Bestand umgebaut oder ein Clone gebaut wird, entscheidet f5 (ADR 0005). Die Adresse hängt an f8. |
| Entscheidung, Stück 1 „Lücken schließen“ | Teilt sich: in der neuen App von Anfang an zu (r15), im laufenden Studio Ricos Entscheidung (f7, ADR 0005). |
| Entscheidung, Stück 2: derselbe Authentik-Anbieter, Konten und Credits bleiben, `studio.lernen.diy` leitet weiter | Gilt nicht bei Clone ohne Migration: eigener Eintrag bei id.loschke.ai, leere Nutzertabelle (r13). Weiterleitung frühestens zur Ablösung (f6). |
| Entscheidung, Stück 3 und 4: erst Stile, dann Formeln | Ein Stück (s2). Fachlich unverändert, weiter in ADR 0008. |
| Datenweg: Neon-Treiber, Zwischenspeicher eine Stunde | `pg` für die Library und für die eigene Datenbank, eigene Leserolle, fünf Minuten (Vorschlag, nicht gemessen). ADR 0008 und ADR 0006. |
| Preis: Repo, Vercel-Projekt und Gateway-Schlüssel behalten ihre Namen | Gilt nicht beim Clone: neues Repo, eigener Schlüssel, kein Vercel-Projekt (r14). |
| Preis: Handgriffe DNS, Domain bei Vercel, `OIDC_REDIRECT_URI` bei Vercel | Beim Clone: DNS, Coolify, neuer Blueprint in `loschke-id` (ADR 0006). |
| Preis: Berührt Etappe 3, die CORS-Regel muss `app.ai-design.guide` nennen | Beim Clone bleibt die Regel des alten Studios bei `studio.lernen.diy` und ist allein Sache von Etappe 3. Die neue App bekommt ihre eigene Regel am neuen Speicher (ADR 0006). |
| Bezug „Löst ab: build ADR 0035 D2 b“ und Preis „Der Beschluss vom 09.09. wird abgelöst“ | Offen bis f5. Bei Clone wird D2 b bestätigt; der Nachtrag in build ADR 0035 sagt dann das, mit Ricos Go. |
| Kontext: „Am 14.10. waren es 8 freigeschaltete Konten; der heutige Stand ist nicht gemessen“ | Gemessen 06.11.2026: 24 Zeilen in `users` (Neon-Projekt `media-studio`), die jüngste vom 05.11., zusammen 8.365 Credits. |
| Checkpoint „vier Wochen nach dem Umzug“ | Zählt ab dem Start der neuen App, steht in ADR 0008. |

### Entwurf B (Session im Repo `design-library-studio`, 06.11.2026): Entscheidung je Zeile

Übereinstimmung beider Entwürfe: Formeln und Stile gehen ins Media Studio, nicht die Generierung ins Design Library Studio (Rico am
28.10.: das Studio ist kein Produkt für Dritte und der einzige Schreiber der Library); direkt und nur lesend, nur `status = 'Fertig'`,
über eine Serverroute; Auswahl im Reiter „Generieren“; die eigene Galerie braucht ein anderes Wort als „Bibliothek“; Video und Assistent
bleiben. Die Übereinstimmung „derselbe Authentik-Anbieter, Konten bleiben, technische Namen bleiben“ ist durch Ricos Hinweis überholt.

| # | Punkt in B | Entscheidung |
|---|---|---|
| 1 | `pg` statt Neon-Treiber für die Library | Übernommen und erweitert: `pg` auch für die eigene Datenbank, weil die auf Hetzner liegt (ADR 0006, ADR 0008). |
| 2 | Zwischenspeicher fünf Minuten statt einer Stunde | Übernommen als Vorschlag, nicht gemessen (ADR 0008, r18). |
| 3 | Eigene Leserolle, Skript in `design-library-studio/scripts/db/` | Übernommen. `SELECT` auf vier Tabellen, gegen Neon nur mit Ricos Go (ADR 0008, r17). |
| 4 | Mehrere ADRs statt einem | Übernommen: ADR 0005 (Clone und Ablösung), 0006 (Hetzner), 0007 (Modelle 2.6), 0008 (Library lesen). |
| 5 | Nicht kurz vor einem Seminar umstellen | Übernommen als Regel für alles, was das laufende Studio berührt: die Ablösung (f6) und ein Fix der Lücken (f7). Das Datum kennt nur Rico (f12). |
| 6 | Gelb an 55 Stellen in 16 Dateien, jede einzeln entscheiden | Übernommen, gilt der neuen App (r16), Einzelheiten im Anforderungsdokument. |
| 7 | Ungenutzte Variablen `chart-*`, `sidebar-*`, heller `:root`-Block | Übernommen, gilt der neuen App (r16). |
| 8 | CORS-Regel muss beide Adressen nennen | Geteilt: Die Regel am R2-Bucket nennt nur `studio.lernen.diy` und bleibt eine offene Aufgabe von Etappe 3. Die neue App setzt ihre eigene Regel am Hetzner-Bucket (ADR 0006). Nur wenn f5 gegen den Clone ausgeht, gilt B Zeile 8 wie geschrieben. |
| 9 | `AUTH_REQUIRED_ORG_SLUG` beim Umbenennen des Clients | Entfällt beim Clone: Der neue Eintrag bei id.loschke.ai hat von Anfang an seine eigene Kennung. Kommt zurück, falls f5 gegen den Clone ausgeht. |
| 10 | Zwei weitere Textstellen (`app/api/auth/error/route.ts`, „mit Gemini im Browser“) | Übernommen, ins Anforderungsdokument. |
| 11 | Formel und Stil zusammen in einem Prompt | Als Richtung r22: in der ersten Fassung entweder Formel oder Stil. Nicht zu verwechseln mit s2 (Baureihenfolge). |
| 12 | Zwei spätere Stücke (Stil im Reiter „Bearbeiten“, Assistent sucht in der Library) | Übernommen in den Parkplatz (r10, r23). |
| 13 | „Stile zuerst“: Ricos Wort oder Vorschlag? | Geklärt durch Ricos Einspruch bei s2: beides gleichzeitig. Es war ein Vorschlag von Entwurf A. |
| 14 | Name der App, drei „Studios“ | Als Frage f9, abhängig von f8. |
| 15 | Parkplatz: Teilnehmende reichen eigene Formeln ein | Übernommen (r23). Auslöser: Rico will es ausdrücklich. |
| 16 | Roadmap-Seite, Richtigstellung „Fortsetzen“ | Übernommen: `648cc18` liegt auf `origin/main`, die Roadmap ist richtiggestellt. Die Roadmap-Seite ist Rico vorgeschlagen (r24). |

Aus B bleibt für das Repo `design-library-studio` nach der Annahme: die neue App in die Leserliste der `CLAUDE.md`, das Skript für die
Leserolle, nichts an Tabellen oder Spalten. Messungen aus B, die weiter tragen: `variables` ist bei Formeln leer, die Platzhalter stehen nur
im `templateText`; die Legende ist Markdown mit einer Zeile je Platzhalter, teils mit, teils ohne eckige Klammern; ein Parser steht in
`ai-design-guide/scripts/katalog-ziehen.mjs` (`legendeParsen`). Blueprint 04 trägt neben den Rückwegen `meta_launch_url`, `meta_publisher`
und `meta_icon` mit lernen.diy.

### Gemessen in der Validator-Session (06.11.2026)

- **Lücke Assistent, bestätigt:** `app/api/chat/route.ts` (256 Zeilen) ruft weder `getCurrentUser` noch `getSessionId` auf. `proxy.ts` Zeile 44
  prüft nur `Boolean(request.cookies.get("ms_id_token")?.value)`. Gegenprobe: alle anderen Routen unter `app/api` außer `auth/*` rufen die
  Prüfung auf (je zwei Treffer in `credits`, `edit`, `gallery/delete`, `gallery/list`, `generate`, `generate-video/start`, `generate-video/status`).
- **Lücke Video, bestätigt:** `app/api/generate-video/status/route.ts` erkennt `failed` und `cancelled` (Zeile 81) und meldet den Grund, ruft
  aber `refundCredits` nicht auf. Gegenprobe: `generate`, `edit` und `generate-video/start` erstatten.
- **Keine Tests, keine Drossel:** kein Testordner, kein Test-Skript in `package.json`, kein Treffer für eine Drossel in `app` und `lib`.
- **Konten:** 24 Zeilen in `users`, erste 28.04.2026, jüngste 05.11.2026, Summe der Credits 8.365.
- **Vercel:** Projekt `lernen-media-studio` (`prj_hARPZthZ2oIGlsGBh0ekswgYTP72`), Team `team_g2I2wrNDX8Wxa405Hyqjm8NN`.
- **Library:** 101 Stile und 166 Formeln mit `status = 'Fertig'`, kein fertiger Stil ohne `thumbUrl`.
- **Die Vorlage läuft selbst nicht auf Hetzner:** `studio.ai-design.guide` zeigt auf Vercel (76.76.21.21), die Deployments tragen `dpl_…`,
  die Datenbank ist Neon, die Bilder liegen auf R2 (`design-library-studio/CLAUDE.md`, `compose.yaml`: „Der Bildspeicher steht nicht im Stack:
  heute R2, später Hetzner Object Storage“). `Dockerfile` und `compose.yaml` sind vorbereitet und lokal benutzt, im Betrieb nicht belegt.
- **Belegt auf Hetzner ist anderes:** `daten-show` läuft bei Coolify mit Postgres im eigenen Stack und einem einmaligen Dienst `migrate`
  vor dem Server. `loschke.chat` nutzt den Hetzner-Bucket `loschke-chat` (`fsn1.your-objectstorage.com`); build ADR 0056 hat dort gemessen:
  signierter PUT aus dem Browser 200, CORS greift und lehnt fremde Herkunft ab, eine Änderung braucht einige Minuten.
- **Gateway:** LiteLLM läuft als Dienst bei Coolify auf demselben Server. `daten-show` trägt dort `MODELL_GATEWAY_URL` und `MODELL_GATEWAY_KEY`.
- **`app.ai-design.guide`** hat keinen DNS-Eintrag. **`factory.casa`** zeigt auf Vercel und antwortet mit 404.
- **GPT Image 2.6** (aus dem Hinweis, Vorsession): Der Schlüssel des Studios sieht `claude-haiku-5-5`, `gemini-omni-1.2-flash`,
  `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst`. Keine 2.6-Modelle.
- **Was heute an Vercel, Neon und R2 hängt** (aus dem Hinweis): `lib/db.ts` (`@neondatabase/serverless`, `drizzle-orm/neon-http`), `lib/r2.ts`
  (Endpunkt fest auf `<konto>.r2.cloudflarestorage.com`, Variablen `R2_*`, `getSignedUrl`), `maxDuration` in fünf Routen (Chat 30, Bild und
  Bearbeiten 120, Video 60). Kein `Dockerfile`, kein `compose.yaml`, kein `vercel.json`, kein `after()`.

Nicht gemessen: Namen und Preise der 2.6-Modelle und ob `/images/edits` mit ihnen gleich läuft (braucht einen Schlüssel, der sie sieht,
f11); eine vorsignierte Lese-Adresse am Hetzner-Bucket (derselbe Mechanismus wie der gemessene PUT); die Laufzeit einer Anfrage von 40 bis
120 Sekunden hinter dem Coolify-Proxy; das Datum des nächsten Seminars (f12); ob unter den 24 Konten Testkonten sind.

### Factory.casa: Befund, keine Entscheidung

Factory.casa ist der öffentliche Name der `media-factory` (`loschke-ai/src/pages/arbeit/media-factory.astro`: „factory.casa – Eine
Content-Werkstatt, die misst statt hofft“). Für eine Online-Fassung liegen drei Konzepte vom August 2026 vor, keines gebaut:

- Vault `03_PROJECTS/03-B_SideProjects/Media-Factory-Online/` (15./16.08.): Vorlage zum Selbst-Hosten auf Mastra, kein SaaS, eigene Schlüssel
  je Instanz. Rico hat dort vier Entscheidungen getroffen; die Module beginnen mit Statement und Cheatsheet, Video und Animation stehen in
  Welle 3. Status „Konzept. Rico prüft in Ruhe.“
- `media-factory/docs/media-factory-online/README.md` (21.08.): gehosteter Dienst für mehrere Abnehmer (build.jetzt, Slack, MCP), zwei Spikes
  vor dem Detailplan.
- `media-factory/docs/factory-as-service/` (25.08.): Backend hinter API und MCP ohne eigene Gesamtanwendung, mit dem Satz „Der Maßstab ist
  MCP-Tauglichkeit, nicht die App“. Die Projektseite auf loschke.ai nennt als Weg „erst die Review-Seite und die MCP-Schnittstelle, dann
  Mandanten mit eigenem Branding“.

In allen dreien ist „Video“ ein Render aus einer Vorlage (Remotion), nicht ein Video aus einem Modell. Bild und Video aus Modellen stehen
dort nur im Konzept `docs/fal-anbindung/` (25.08., nicht gebaut). Ricos Notiz bei f4 (Bild- und Video-Generierung als erstes Modul) wäre
gegenüber diesen Konzepten eine neue Richtung, und sie passt nicht zu s1 und zum Look Navy und Gelb. Deshalb Frage f8 auf der Seite, mit
Empfehlung, ohne Annahme in einem ADR.

### Wie es weitergeht

Neue Weichen als eigene Entwürfe, alle `vorgeschlagen`: ADR 0005 (Clone und Ablösung), ADR 0006 (Betrieb auf Hetzner), ADR 0007 (GPT Image
2.6, Schlüssel, Credits), ADR 0008 (Library lesen, Stile und Formeln). Sie liegen hier, weil es das neue Repo noch nicht gibt, und ziehen
mit dem Clone dorthin. Die Entscheidungsseite ist auf derselben Adresse fortgeschrieben: s1 bis s3 und f1 bis f4 stehen dort als
beantwortet, neu sind s4 bis s8, f5 bis f12 und r13 bis r24; r4, r5, r6, r9 und r11 sind durch neue Richtungen ersetzt. Die beiden Dateien in
`docs/entwuerfe/` sind gelöscht, ihr Inhalt steht in diesem Nachtrag. Bis zu Ricos Antworten wird nichts gebaut.

## Nachtrag 2026-11-06: Ricos Antworten, zweite Runde

Gelesen aus der Sammlung `antworten` am 06.11.2026 (Antworten zwischen 07:34 und 07:40 UTC), dazu Ricos Wort im Chat zu f8.

| Punkt | Wahl | Notiz | Was daraus wird |
|---|---|---|---|
| s4 Stile und Formeln, Look des Design Library Studios, neue Adresse | Stimmt so | keine | Gilt. |
| s5 Bilder mit GPT Image 2.6 Flare und Sunburst | Stimmt so | keine | Gilt als Ziel. Siehe f11: Der Start läuft mit 2.5. |
| s6 Die neue App läuft vollständig auf Hetzner | Stimmt so | keine | Gilt (ADR 0006). |
| s7 Nichts wird migriert | Stimmt so | keine | Gilt. 24 Konten, 8.365 Credits und alle Medien bleiben zurück. |
| s8 Stile und Formeln werden zusammen gebaut | Stimmt so | keine | Gilt (ADR 0008). |
| f5 Clone oder Umbau | c (Neubau ohne Kopie) | „Ich würde gern die Backend Infrastruktur besser machen, vielleicht mit Mastra wieder als Server, dann könnten wir auch Workflows nutzen, können wir viellcith nochmal klären, das lernen Studio war wirklich zusammengeschustert und hatte wenig planung und fundament, es sollte daher nicht die Basis für ein neuen Ansatz sein, aber wir können uns bei UX/UI und funktionen natürlich orientieren und sinnvolle ansätze übernehmen“ | Gegen die Empfehlung (Clone). Neubau in neuem Repo, das Studio ist Vorbild für Bedienung und Funktionen, nicht Codebasis (ADR 0005, Nachtrag). Die Frage „Mastra als Server“ ist eine neue Weiche: Frage f13 auf der Seite. |
| f6 Ablösung | c (Abschalten ohne Weiterleitung) | keine | Gegen die Empfehlung (Weiterleiten mit Ankündigung). Gilt (ADR 0005, Nachtrag). |
| f7 Lücken im laufenden Studio | c (das alte Studio nicht anfassen) | keine | Gegen die Empfehlung (beide schließen). Die zwei Lücken bleiben bis zur Abschaltung offen, von Rico hingenommen (ADR 0005, Nachtrag). |
| f8 Dach | a (ai-design.guide jetzt) | Chat: „Kommando zurück bei F8, Factory.casa wird es nicht, das wird eher die Factory für Asssets und Dokumente, Slides, Carousels, Cheatsheets im Markenlook, per MCP oder in der eigenen App. Bild/Video bleiben beim design guide, dort könnten wir auch überlegen den library mcp dann um generierungsfunktionen zu erweitern, ist aber weiteres thema.“ | Gilt, und weiter als die Option: Factory.casa ist nicht „offen gehalten“, sondern ausgeschlossen. Damit ist der Widerspruch zwischen s1 und der Notiz bei f4 aufgelöst, die Adresse `app.ai-design.guide` gilt. Der Gedanke, den Library-MCP um Generierung zu erweitern, kommt auf den Parkplatz. |
| f9 Name | b (Media Studio bleibt) | keine | Gegen die Empfehlung (Bildwerkstatt). Die App heißt Media Studio. |
| f10 Verbesserungen an der Bedienung | c (mach du Vorschläge) | „Es geht um die History der Bilder, dass man eine Art Feed sieht und nicht immer den klick in die Bibliothek braucht, es geht darum dass man die Bearbeitungen und bei Mulitstep Bearbeitungen als einen Kontext und eine Entwicklung sieht und vergleichen kann“ | Wahl und Notiz zusammen: Ricos zwei Ideen sind gesetzt, weitere Vorschläge macht das Anforderungsdokument. Auf der Seite als s9 zur Bestätigung, wie die Session die Notiz liest. |
| f11 2.6-Modelle im Gateway | b (noch nicht) | „wir können erstmal mit den alten weiterarbeiten, das ist ja nur ein wert den wir dann ändern müssen“ | Start mit GPT Image 2.5, Wechsel auf 2.6 als Wert in der Umgebung. s5 bleibt das Ziel (ADR 0007, Nachtrag). |
| f12 Nächstes Seminar | a (in den nächsten zwei Wochen) | keine, das Datum fehlt | Mit f7 c berührt das Datum nur noch den Tag der Abschaltung. Rico nennt es dann. |
| r1 bis r24 | keine | keine | Weiter offen. Auf der Seite fragt f14, ob sie ohne Einspruch gelten. |

Gemessen für f10 (06.11.2026): Die Galerie des Studios besteht aus Dateien im Speicher mit je einer Begleitdatei (`lib/r2.ts`, `metaKey`,
`readMeta`). Es gibt keine Tabelle für Bilder (`drizzle/schema.ts` kennt nur `users`) und keinen Verweis von einer Bearbeitung auf ihr
Ausgangsbild (kein Treffer in `lib/r2.ts` und `app/api/edit/route.ts`). Ein Feed und eine Kette von Bearbeitungen brauchen also ein
Datenmodell, das es heute nicht gibt. Das stützt den Neubau.

Folgen für dieses ADR: Es ist überholt. Die Stücke leben weiter in ADR 0005 (Neubau, Abschaltung, Name, Dach), ADR 0006 (Hetzner),
ADR 0007 (Modelle) und ADR 0008 (Library, Stile und Formeln). Der Nachtrag in build ADR 0035 lautet jetzt schlicht: D2 b gilt wie am
09.09. geschrieben (neues Repo, das Studio bleibt bis zur Ablösung unangetastet, kopiert wird, was sich lohnt). Er wird mit Ricos Go
geschrieben, anderes Repo.

Zusatz 06.11.2026 (dritte Runde der Seite): Der Satz darüber zu build ADR 0035 ist unvollständig. Abschnitt 2 hat am 09.09. neben D2 b auch
D1 a, D3 c, D4 a und D8 a festgelegt, die Ricos spätere Entscheidungen überholt haben. Einzelheiten und Belege in ADR 0005, Nachtrag „dritte
Runde“; auf der Seite als s10. Die Entscheidungsseite steht seit demselben Tag in Runde 3 (Version `1793951497-5bc8`): offen sind s9, s10,
f13 (Server-Teil mit oder ohne Mastra), f14 (ob die Richtungen ohne Einspruch gelten) und die Richtungen selbst.
