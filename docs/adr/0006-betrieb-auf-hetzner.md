# ADR 0006: Die neue App läuft auf Hetzner, mit Postgres im eigenen Stack und privatem Speicher

- Datum: 2026-11-06
- Status: vorgeschlagen (Validator-Session 06.11.2026, Fable). Das Ziel ist Ricos Wort vom 06.11. („umzug vollständig auf eine hetzner umgebung inkl. pg datenbank und storage, nichts muss migriert werden“). Der Zuschnitt darunter ist ein Vorschlag dieser Session, auf der Entscheidungsseite als s6, s7 und die Richtungen r13, r19, r20.
- Status seit 06.11.2026: weiter `vorgeschlagen`. Das Ziel ist akzeptiert (s6 und s7 „Stimmt so“). Der Zuschnitt ist offen: Die Richtungen r13, r19 und r20 sind unbeantwortet, und mit Ricos Entscheidung für den Neubau (f5 c) hängt die Zahl der Dienste im Stack an der Architektur-Frage f13.
- Status seit Ricos dritter Runde (06.11.2026): **akzeptiert, mit einem Vorbehalt.** Ziel durch s6 und s7, Zuschnitt durch f14 a: Die Richtungen r13, r19 und r20 gelten ohne Einspruch. Vorbehalt: Wie viele Dienste der Stack hat, steht erst nach f13 fest (bei a und c einer neben Postgres, bei b zwei).
- Bezug: ADR 0005 (Clone); `design-library-studio` (`lib/db.ts`, `lib/storage.ts`, `Dockerfile`, `compose.yaml`); `daten-show/compose.yaml`; `build-jetzt-superagents` ADR 0056 (Hetzner-Bucket) und ADR 0057 (Postgres bei Coolify); Ricos globale `CLAUDE.md` („Tür auf Zeit“)
- Dieser Entwurf zieht mit dem Clone in das neue Repo und bekommt dort seine Nummer.

## In einem Satz

Die neue App läuft als Compose-Stack bei Coolify mit eigenem Postgres, legt Bilder und Videos privat in einen eigenen Hetzner-Bucket und kennt Neon, Vercel und R2 im Code nicht mehr.

## Kontext

- Heute hängt das Studio an drei Anbietern (ADR 0004, Nachtrag): Neon-Treiber, R2-Endpunkt fest im Code, Laufzeitgrenzen von Vercel.
- Die genannte Vorlage `design-library-studio` hat die Schichten (`pg` hinter `lib/db.ts`, S3-Client mit `STORAGE_*` hinter `lib/storage.ts`, `Dockerfile`, `compose.yaml`), läuft selbst aber noch auf Vercel, Neon und R2 (gemessen 06.11.). Sie ist Vorlage für den Code, kein Beleg für den Betrieb.
- Belege für den Betrieb gibt es an anderer Stelle: `daten-show` läuft bei Coolify mit Postgres im Stack und einem einmaligen Dienst `migrate`, der vor dem Server läuft. `loschke.chat` nutzt den Hetzner-Bucket `loschke-chat` in Falkenstein; build ADR 0056 hat dort einen signierten PUT aus dem Browser (200) und CORS gemessen (greift, braucht nach einer Änderung einige Minuten).
- Das Studio liefert Bilder heute privat aus, über Adressen auf Zeit (`getSignedUrl`, acht Stunden). Das Design Library Studio liefert öffentlich aus, weil seine Bilder der offene Katalog sind.
- Regel aus Ricos globaler `CLAUDE.md`: Datenbank-Ports des Servers sind von außen zu. Zugriff von Ricos Rechner braucht die Tür auf Zeit. Databasus sichert Stack-Datenbanken über einen veröffentlichten Port, ohne Zertifikat, SSL aus.

## Entscheidung (Vorschlag)

1. **Compose-Stack bei Coolify** mit zwei Diensten nach dem Muster von `daten-show`: `web` (Next standalone) und `postgres`, dazu der einmalige Dienst `migrate`. Migrationen laufen damit im Stack, ohne Tür auf Zeit.
2. **`pg` statt Neon-Treiber**, Drizzle bleibt (`drizzle-orm/node-postgres`). Dieselbe Verbindung trägt lokal, im Stack und gegen jedes andere Postgres.
3. **Leere Datenbank, eigener Eintrag bei id.loschke.ai:** neuer Anbieter, neuer Client, neue Gruppe über einen neuen Blueprint in `loschke-id` (mit Ricos Go, anderes Repo). Niemand zieht um. Der Blueprint 04 des alten Studios bleibt bis zur Ablösung unverändert.
4. **Eigener Hetzner-Bucket, privat.** Auslieferung über Adressen auf Zeit wie heute, der S3-Client bekommt Endpunkt, Region und Adress-Stil aus der Umgebung (`STORAGE_*` wie im Design Library Studio). CORS-Regel am neuen Bucket für die neue Adresse und `localhost`, gesetzt per Kommandozeile wie in build ADR 0056.
5. **Sicherung über Databasus:** Die Datenbank des Stacks wird in Coolify veröffentlicht („Make Publicly Available“), die Hetzner-Firewall lässt den Port nur vom Server durch, Databasus verbindet ohne SSL. Wie bei Authentik (35432) und LiteLLM (45432).
6. **Gateway:** eigener virtueller Schlüssel für die neue App (ADR 0001, ADR 0007), Adresse wie bei `daten-show` aus der Umgebung.
7. **Nichts, was nur auf Vercel geht.** `maxDuration` entfällt; die Laufzeit langer Anfragen wird am Coolify-Proxy gemessen, bevor das erste Premium-Bild als Nachweis gilt.

## Preis & Konsequenzen

- Rico hat Handgriffe: Bucket bei Hetzner anlegen, Zugangsschlüssel erzeugen, DNS-Eintrag, Ressource in Coolify, Firewall-Regel für den Sicherungs-Port, Eintrag in Databasus, Schlüssel im LiteLLM. Die Schritte schreibt die Bau-Session als Klickfolge auf.
- Eine weitere Datenbank auf dem geteilten Server. Fällt der Server aus, fällt die App mit loschke.chat, Authentik und dem Gateway zusammen aus. Für ein Werkzeug mit Freigabe hingenommen.
- Direkter Blick in die Datenbank von Ricos Rechner (`psql`, `drizzle-kit studio`) braucht die Tür auf Zeit. Ein Zeitüberschreiten beim Verbinden heißt zuerst: Tür zu.
- Private Auslieferung heißt: jede Bildadresse läuft ab. Der Knopf „Letztes Bild als Startframe“ liest Bilder im Browser und braucht die CORS-Regel; ohne sie fällt er aus, wie heute am R2-Bucket.
- Die Library bleibt auf Neon und wird von Hetzner aus gelesen (ADR 0008). Zieht sie später um, ist das im Clone ein Wechsel der Umgebung.
- Nicht gemessen: eine vorsignierte Lese-Adresse am Hetzner-Bucket (der PUT ist gemessen, derselbe Mechanismus), eine Anfrage von 40 bis 120 Sekunden hinter dem Coolify-Proxy, die Größe der Sicherung. Alle drei sind die ersten Nachweise des Grundgerüsts.

## Exit-Pfad

- Datenbank und Speicher hängen nur an der Umgebung. Dasselbe Abbild läuft gegen ein anderes Postgres und jeden S3-Speicher, ein Rückweg zu Neon und R2 ist ein Wechsel der Variablen.
- Trägt der Proxy lange Anfragen nicht, bleibt der Weg, Bild und Bearbeiten wie Video in Start und Abfrage zu teilen. Das wäre eine eigene Weiche.
- Bis zur Ablösung (ADR 0005) ist das alte Studio der Rückweg für den Seminarbetrieb.

## Checkpoint

- Nach dem Grundgerüst: die drei offenen Messungen als Nachtrag mit Zahlen.
- Nach vier Wochen Betrieb: Speicherverbrauch im Bucket und Größe der Sicherung ansehen; steht eine Löschregel für alte Bilder an?
- Wenn die Hetzner-Firewall oder Databasus sich ändert: prüfen, ob die Sicherung noch läuft (letzte Ausführung in Databasus).

## Nachtrag 2026-11-06: Ricos Antworten

s6 („Die neue App läuft vollständig auf Hetzner“) und s7 („Nichts wird migriert“) sind bestätigt. Mit f5 c wird neu gebaut statt geclont:
Die Sätze oben zu „Clone“ lesen sich als „neue App“. Punkt 2 der Entscheidung (`pg`, Drizzle bleibt) und Punkt 7 (`maxDuration` entfällt)
beschreiben dann keinen Umbau mehr, sondern den Ausgangspunkt. Kommt ein Mastra-Server dazu (f13), wird aus dem Stack mit zwei Diensten
einer mit dreien, und die Frage, wo Mastra seinen eigenen Zustand ablegt, gehört in das ADR zur Architektur. Dieser Entwurf zieht in das
neue Repo und wird dort nach f13 und f14 fertig geschrieben.

## Nachtrag 2026-11-06: dritte Runde

f14 a: Richtungen gelten ohne Einspruch, damit r13 (leere Datenbank, eigener Eintrag bei id.loschke.ai), r19 (Postgres im Stack, Dienst
`migrate`, Sicherung über Databasus) und r20 (eigener Hetzner-Bucket, privat, Adressen auf Zeit). Nachgemessen für f13: `PostgresStore`
von Mastra kennt `schemaName`. Fällt f13 auf c, liegen die Tabellen von Mastra in einem eigenen Schema dieser Datenbank, und die
Sicherung deckt sie mit ab.

## Nachtrag 2026-11-06: umgezogen

Die geltende Fassung liegt seit dem 06.11.2026 im neuen Projekt `C:\Users\losch\Projekte\ai-design-media-studio` als ADR 0002 und wird nur
dort fortgeschrieben. Diese Datei bleibt als Herleitung stehen.
