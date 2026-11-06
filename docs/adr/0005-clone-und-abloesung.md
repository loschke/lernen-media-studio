# ADR 0005: Die neue App wird neu gebaut, das heutige Studio läuft unverändert bis zur Abschaltung

(Titel des Entwurfs: „Die neue App entsteht als Clone, das heutige Studio läuft bis zur Ablösung weiter“. Rico hat anders entschieden, siehe Status und Nachtrag.)

- Datum: 2026-11-06
- Status: vorgeschlagen (Validator-Session 06.11.2026, Fable). Grundlage ist Ricos Gedanke vom 06.11. („dass wir quasi einen Clone umbauen und in ruhe fertig machen können, während das lernen studio hier so funktional bleibt wie bisher“), von ihm ausdrücklich zur Prüfung gestellt. Entschieden wird auf der Entscheidungsseite: f5 (Clone oder Umbau), f6 (Ablösung), f7 (Lücken im laufenden Studio), f12 (Seminar-Datum).
- Status seit 06.11.2026: **akzeptiert in geänderter Fassung.** Rico auf der Entscheidungsseite: f5 c (Neubau ohne Kopie, mit Notiz), f6 c (Abschalten ohne Weiterleitung), f7 c (das alte Studio nicht anfassen), f8 a und Chat (ai-design.guide, nicht Factory.casa), f9 b (Media Studio). Alle drei Kernfragen gegen die Empfehlung dieses Entwurfs. Es gilt der Nachtrag „Ricos Antworten“ am Ende; der Text dazwischen ist der Entwurf und bleibt als Herleitung stehen.
- Bezug: ADR 0004 (Nachtrag Validator-Session); `build-jetzt-superagents` ADR 0035 Abschnitt 2, D2 b („Neues Repo; das Media Studio bleibt bis zur Ablösung unangetastet“, 09.09.2026)
- Dieser Entwurf ist die Weiche dieses Repos. ADR 0006 bis 0008 betreffen die neue App und ziehen mit dem Clone in ihr Repo.

## In einem Satz

Die neue App wird als eigenes Repo aus dem Stand von `main` gebaut, das Studio unter `studio.lernen.diy` bleibt Ricos Seminar-Werkzeug, bis er die Ablösung ausspricht.

## Kontext

- Ricos Ziele vom 06.11. wechseln fast alles unter der Oberfläche gleichzeitig: Hosting (Vercel zu Hetzner), Datenbank (Neon zu Postgres), Speicher (R2 zu Hetzner), Bildmodelle (2.5 zu 2.6), Anmeldung (neuer Eintrag, weil nichts migriert wird), Look und Adresse. Gemessen: `lib/db.ts` hängt am Neon-Treiber, `lib/r2.ts` am R2-Endpunkt, es gibt kein `Dockerfile`.
- Das Studio ist in Benutzung: 24 Konten, das jüngste vom 05.11.2026, zusammen 8.365 Credits (gemessen 06.11.). ADR 0003 nennt ein Seminar in der Woche nach dem 05.11.; das Datum kennt nur Rico.
- Am 09.09.2026 hat Rico in build entschieden: neues Repo, das Studio bleibt bis zur Ablösung unangetastet (ADR 0035 D2 b). Entwurf A (ADR 0004) wollte das ablösen, Rico hat dem widersprochen (s3). Der Clone liegt näher an D2 b, nimmt aber den Code mit, statt neu zu bauen.
- Zwei Lücken im laufenden Studio sind an der Quelle bestätigt (ADR 0004, Nachtrag): Der Assistent prüft die Anmeldung nicht, ein gescheitertes Video wird nicht erstattet.

## Entscheidung (Vorschlag)

1. **Clone als neues Repo mit der Git-Historie von `main`** (Empfehlung zu f5). Einzelne Commits lassen sich so in beide Richtungen übernehmen. Der Repo-Name ist markenneutral, bis f8 und f9 beantwortet sind.
2. **Dieses Repo ändert sich bis zur Ablösung nur noch für den Seminarbetrieb:** Fehler, Etappe 3 (CORS-Regel am R2-Bucket, Prüfung „Fortsetzen“) und, wenn Rico bei f7 so entscheidet, die zwei Lücken. Kein neuer Look, keine Stile, keine Formeln.
3. **Nichts, was das laufende Studio berührt, geht in der Woche vor einem Seminar live.** Das gilt für einen Fix nach f7 ebenso wie für die Ablösung.
4. **Ablösung heißt** (Empfehlung zu f6): Auslöser ist Ricos Wort, nach einem Prüfstand der neuen App. Vier Wochen vorher steht im alten Studio ein Hinweis, eigene Bilder und Videos herunterzuladen. Am Stichtag leitet `studio.lernen.diy` auf die neue Adresse weiter. Konten, Guthaben, Bilder und Videos ziehen nicht um (Ricos Ziel „nichts muss migriert werden“). Vier Wochen nach dem Stichtag löscht Rico das Vercel-Projekt, die Neon-Datenbank `media-studio`, den R2-Bucket und den alten Eintrag bei id.loschke.ai. Die Fristen sind ein Vorschlag.
5. **Die Lücken im laufenden Studio** (f7): Empfehlung ist, beide jetzt als kleines eigenes Stück zu schließen, mit Tests und einer Prüfung durch Rico. Entscheidet er anders, bleibt der Assistent bis zur Ablösung ohne gültige Anmeldung erreichbar; das steht dann hier als hingenommen.

## Preis & Konsequenzen

- Zwei Stände bis zur Ablösung. Jede Korrektur am alten Studio muss von Hand in die neue App, solange sie dort noch gilt.
- Zwei Gateway-Schlüssel, zwei Speicher, zwei Einträge bei id.loschke.ai, bis das alte Studio gelöscht ist.
- 24 Konten und 8.365 Credits bleiben zurück, dazu alle Bilder und Videos der Teilnehmenden. Wer den Hinweis nicht liest, verliert sie.
- Etappe 4 dieses Repos schrumpft auf „Ablösung vorbereiten und vollziehen“. Stile, Formeln, Look und Hetzner sind Etappen der neuen App.
- build ADR 0035 bekommt nach Ricos Antwort auf f5 einen datierten Nachtrag (anderes Repo, mit seinem Go): D2 b bestätigt, mit dem Unterschied, dass der Code des Studios die Grundlage ist.
- Der Zweig `feat/exercises-tab` bleibt hier liegen und wird nicht mitgeclont, solange sein Auslöser nicht gezogen ist (Parkplatz, r10).

## Exit-Pfad

- Vor der Ablösung ist der Rückweg kostenlos: Die neue App wird nicht fertig oder nicht gewollt, das Studio läuft weiter wie heute.
- Nach dem Stichtag und vor dem Löschen: Weiterleitung entfernen, das alte Studio antwortet wieder unter seiner Adresse.
- Nach dem Löschen gibt es keinen Rückweg zu den alten Daten. Deshalb liegt das Löschen bei Rico und hat eine eigene Frist.
- Fällt f5 gegen den Clone aus (Umbau am Bestand), gilt ADR 0004 in der Fassung von Entwurf A weiter, mit `pg`, Hetzner und den Punkten aus Entwurf B Zeile 8 und 9.

## Checkpoint

- Nach dem ersten Seminar auf der neuen App: Hat jemand nach alten Bildern oder altem Guthaben gefragt? Wenn ja, die Löschfrist verlängern.
- Acht Wochen nach dem Start des Clones: Steht die Ablösung noch aus, prüfen, ob zwei Stände mehr kosten als gedacht (Zahl der von Hand übertragenen Korrekturen).

## Nachtrag 2026-11-06: Ricos Antworten, die Entscheidung in ihrer geltenden Fassung

Wortlaut und Tabelle aller Antworten stehen in ADR 0004, Nachtrag „Ricos Antworten, zweite Runde“. Was für diese Weiche gilt:

1. **Neubau statt Clone (f5 c).** Rico: Das Studio „war wirklich zusammengeschustert und hatte wenig planung und fundament, es sollte daher
   nicht die Basis für ein neuen Ansatz sein, aber wir können uns bei UX/UI und funktionen natürlich orientieren und sinnvolle ansätze
   übernehmen“. Neues Repo ohne die Git-Historie dieses Repos. Übernommen wird, was sich einzeln begründen lässt (Vorschlag der Session,
   im neuen Repo zu prüfen: die Credit-Buchhaltung aus `lib/credits.ts`, die Größen- und Modelltabelle, die Prüfungen aus `lib/validation.ts`,
   die Messberichte unter `docs/pruefstand/`). Punkt 1 des Entwurfs (Clone mit Historie) gilt nicht.
2. **Dieses Repo bleibt, wie es ist (f7 c).** Kein Fix der zwei Lücken. Ausdrücklich hingenommen bis zur Abschaltung: Der Assistent ist
   ohne gültige Anmeldung erreichbar, begrenzt durch das Budget des Gateway-Schlüssels; ein gescheitertes Video wird nicht erstattet.
   Punkt 5 des Entwurfs (Empfehlung: schließen) gilt nicht. Offen aus Etappe 3 bleibt hier nur, was Rico für die Seminare braucht.
3. **Abschalten ohne Weiterleitung (f6 c).** Auslöser bleibt Ricos Wort. Kein Hinweis in der alten App (das wäre eine Änderung an ihr),
   keine Fristen aus Punkt 4 des Entwurfs. Am Tag der Abschaltung löscht oder pausiert Rico das Vercel-Projekt; Neon-Datenbank, R2-Bucket,
   Gateway-Schlüssel und der Eintrag bei id.loschke.ai folgen, wann er will. Das nächste Seminar liegt in den nächsten zwei Wochen (f12 a,
   ohne Datum); bis dahin steht keine Abschaltung an.
4. **Dach, Adresse, Name (f8 a, Chat, f9 b).** Die neue App läuft unter ai-design.guide, Adresse `app.ai-design.guide`, Name „Media Studio“.
   Factory.casa wird es nicht: Das wird laut Rico die Factory für Assets und Dokumente, Slides, Carousels und Cheatsheets im Markenlook, per
   MCP oder in einer eigenen App. Bild und Video bleiben beim Design Guide.
5. **Neue Weiche, hier nicht entschieden:** der Zuschnitt des Backends der neuen App, ausgelöst durch Ricos Notiz („vielleicht mit Mastra
   wieder als Server, dann könnten wir auch Workflows nutzen, können wir viellcith nochmal klären“). Frage f13 auf der Entscheidungsseite,
   danach ein eigenes ADR im neuen Repo.

Preis, neu gefasst: Der Neubau kostet mehr Arbeit als ein Clone, dafür gibt es keine zwei Stände zu pflegen, das alte Studio ist
eingefroren. Die Lücke im Assistenten bleibt bis zur Abschaltung offen. Wer nach der Abschaltung die alte Adresse aufruft, bekommt einen
Fehler statt einer Weiterleitung. build ADR 0035 D2 b gilt damit wie am 09.09. geschrieben.

Exit-Pfad, neu gefasst: Bis zur Abschaltung ist das alte Studio der Rückweg. Nach der Abschaltung und vor dem Löschen der Daten lässt es
sich wieder einschalten. Der Rückweg „ADR 0004 in der Fassung von Entwurf A“ (Umbau am Bestand) ist mit f5 c geschlossen.

Checkpoint, neu gefasst: Nach dem ersten Seminar auf der neuen App sagt Rico, ob das alte Studio abgeschaltet wird. Steht die neue App
acht Wochen nach Baubeginn noch nicht für ein Seminar bereit, prüfen, ob die Lücke im Assistenten doch geschlossen werden soll.

## Nachtrag 2026-11-06 (dritte Runde der Seite): build ADR 0035 Abschnitt 2 und die Architektur-Frage

**Richtigstellung zu „build ADR 0035 D2 b gilt damit wie am 09.09. geschrieben“:** Das stimmt für D2 b, ist aber unvollständig. Abschnitt 2
hat am 09.09. mehr festgelegt (nachgelesen 06.11.2026, `build-jetzt-superagents/docs/adr/0035-…md` Zeilen 117 bis 124): D1 a („Der Dienst
ist die Richtung“, Bilderzeugung als Dienst per MCP), D3 c (mandantenfähig von Anfang an, mit Organisationen und Guthaben), D4 a (die
Design Library zieht in den Dienst, der Provider im Hub geht in Rente), D8 a (kleines Brand-Kit je Organisation). Ricos spätere
Entscheidungen sagen anderes: eine App statt eines Dienstes (06.11.), Zugang per Freigabe (f2 a), die Library bleibt beim Design Library
Studio als einzigem Schreiber (28.10.), Marken-Assets gehören zur Factory (Chat 06.11.). Gebaut wurde von Abschnitt 2 nichts. Diese
Session hält D1, D3, D4 und D8 deshalb für überholt. Das ist eine Lesart, kein Wort von Rico: Sie steht als s10 auf der Seite, und der
Nachtrag in build wird erst mit seinem Go geschrieben.

**Zur neuen Weiche (Punkt 5 oben), Befund für f13.** Nachgesehen in `build-jetzt-superagents` (Erkundung durch einen Unteragenten, die
tragenden Stellen selbst nachgeprüft):

- Aufbau: zwei Anwendungen bei Coolify (`apps/build-jetzt` als Oberfläche, `apps/agents` als Mastra-Server), eigene Datenbank für Mastra,
  `@mastra/pg` legt 43 Tabellen selbst an (ADR 0057, M4). Die Oberfläche signiert je Anfrage ein kurzlebiges Token für den Server (ADR 0092).
- Stand: `@mastra/core` 1.64.0, `@mastra/pg` 1.22.3, `mastra` 1.27.3, exakt gepinnt (`apps/agents/package.json`).
- Gewinn dort: Aufträge im Hintergrund mit Freigabe, Anhalten und Fortsetzen aus einer anderen Anfrage, Zeitpläne (ADR 0024, ADR 0079).
- Preis dort: „Ein Lauf lebt im Prozess“, Läufe überleben keinen Neustart (ADR 0024, Zeilen 308 und 385); Updates sind eingeplante Arbeit.
- Bilder gibt es dort schon als Werkzeuge des Assistenten (`bild_erstellen`, `bild_aendern`), ohne Guthaben (ADR 0035 Abschnitt 1).
- Rückweg laut build ADR 0002: „Mastra ist in Next.js integrierbar“. Nicht erprobt, hier nicht gemessen.

Gegen den bestätigten Umfang der neuen App gehalten: Bild ist ein Aufruf, Video rechnet bei Google und wird abgefragt, der Assistent ist
ein Textstrom, Feed und Bearbeitungsketten (f10) sind ein Datenmodell. Nichts davon braucht einen Ablauf mit Freigabe oder einen Zeitplan.
Empfehlung auf der Seite: ohne Mastra, mit eigenen Tabellen für Bilder und Aufträge und der Generierung in einer eigenen Schicht. Auslöser,
der Mastra hereinholt: Eine Funktion braucht einen Ablauf mit Freigabe oder einen Zeitplan, oder der Assistent soll selbst Bilder erzeugen.
Entschieden ist nichts, das ADR dazu entsteht nach f13 im neuen Repo.

## Nachtrag 2026-11-06: Ricos Antworten, dritte Runde

Gelesen aus der Sammlung `antworten` (Antworten zwischen 07:54 und 07:56 UTC).

| Punkt | Wahl | Notiz | Was daraus wird |
|---|---|---|---|
| s9 Feed und Bearbeitungsketten | Stimmt so | „ja, kann aber auch ein leicht zugängliches SidePanel sein, was auch immer“ | Die zwei Funktionen gelten, die Form ist offen (Feed bei der Eingabe oder Seitenleiste). Das Anforderungsdokument schlägt eine vor. |
| s10 Vom Beschluss vom 09.09. bleibt nur D2 b | Stimmt so | „lass build mal getrennt davon, die factory casa ist die verbindung von assets mit build, die kommt später, build läuft erstmal kann auch schon bilder generieren, passt“ | Die Lesart gilt. Die Notiz ändert die Folge: build bleibt unberührt, es gibt jetzt keinen Nachtrag in build ADR 0035. Factory.casa ist laut Rico die Verbindung von Assets mit build und kommt später; dort wird ADR 0035 Abschnitt 2 dann neu angesehen. Der Satz „wird erst mit seinem Go geschrieben“ im Nachtrag darüber heißt damit: vorerst gar nicht. |
| f14 Gelten die Richtungen ohne Einspruch | a (ja) | keine | Alle Richtungen ohne Einspruch gelten: r1, r2, r3, r7, r8, r12, r13, r15, r18, r19, r20, r22, r23, r25 bis r32. Ausnahme durch die Notiz bei s10: aus r27 entfällt der Punkt build. r28 bleibt an f13 gebunden. |
| f13 Server-Teil mit oder ohne Mastra | keine | „ich bin halt echt Mastra Fan geworden, weil es Dialog, Workflow, Tracing alles sehr einfach macht, ich tendiere für C, lass die Entscheidung aber nochmal offen, weil du anders Empfiehlst, können wir hier nochmal Vor- und Nachteile austauschen“ | Offen. Rico neigt zu c (Mastra in die Oberfläche eingebaut). Abwägung im Chat, Entscheidung danach. |

Nachgemessen für Option c (06.11.2026, mitgelieferte Doku und Code von `@mastra/core` 1.64.0 und `@mastra/pg` 1.22.3 in
`build-jetzt-superagents/node_modules`):

- Die Einbettung ist ein beschriebener Weg: Die Anleitung für Next.js ruft den Agenten direkt aus den Routen auf („importing and calling
  the agent directly from your routes“, `integrations-frameworks-next-js.md`). Der Satz „bei dir nicht erprobt und nicht gemessen“ auf der
  Seite bleibt richtig für Ricos Aufbau (Next 16, `standalone` im Container), ist aber kein Sonderweg.
- `PostgresStore` kennt `schemaName`. Die Tabellen von Mastra können damit in einem eigenen Schema derselben Datenbank liegen. Eine
  zweite Datenbank wie in build ist für c nicht nötig.
- Studio, also die Ansicht für Traces, ist eine eigene Oberfläche, die sich mit einem laufenden Mastra-Server verbindet
  (`docs-studio-deployment.md`). Neben einer Next-App läuft sie über `mastra dev` gegen dieselbe Datenbank. Für die Datenbank auf Hetzner
  heißt das: Tür auf Zeit für jeden Blick in die Traces, oder später doch ein kleiner Mastra-Server.
- Unverändert: Ein laufender Workflow lebt im Prozess und überlebt kein Deployment (build ADR 0024). Ein angehaltener liegt als Stand in
  der Datenbank und lässt sich fortsetzen.

Damit fallen bei c drei der Kosten weg, die diese Session gegen Mastra angeführt hat (zweites Deployment, zweite Datenbank, Token zwischen
zwei Programmen). Es bleiben: Updates als eingeplante Arbeit, die Tabellen von Mastra, der Umweg zum Tracing im Betrieb, und die Probe, ob
die Einbettung im Container trägt. Die Empfehlung der Session nach dieser Messung steht im Chat vom 06.11.; entschieden ist nichts.

## Nachtrag 2026-11-06: f15 entschieden, das neue Projekt ist angelegt

Rico im Chat auf die Frage „Mastra eingebaut, mit Probe und Grenze beim Guthaben?“: „Ja, eingebaut“. Damit ist Punkt 5 dieses ADR
(die neue Weiche zum Backend) entschieden: Mastra als Baustein in der Next-App, mit einer Probe als erstem Stück des Grundgerüsts und der
Grenze, dass Guthaben, Bilder und Aufträge in eigenen Tabellen und Funktionen liegen. Die Antwort steht auch in der Sammlung `antworten`
als `f15` (von der Session eingetragen, mit Vermerk). Das ADR dazu liegt im neuen Projekt.

Das neue Projekt ist angelegt: `C:\Users\losch\Projekte\ai-design-media-studio` (Richtung r25, gilt ohne Einspruch nach f14 a). Dort liegen die
Arbeitsweise, die Roadmap und fünf ADRs: 0001 Neubau unter ai-design.guide (aus diesem ADR), 0002 Betrieb auf Hetzner (aus ADR 0006),
0003 Bildmodelle, Schlüssel, Credits (aus ADR 0007), 0004 Library lesen, Stile und Formeln (aus ADR 0008), 0005 Mastra eingebaut. Die
Entwürfe 0006 bis 0008 in diesem Repo bleiben als Herleitung stehen; fortgeschrieben werden nur noch die Fassungen im neuen Projekt.
In diesem Repo bleibt aus Etappe 4 allein die Abschaltung, auf Ricos Wort.
