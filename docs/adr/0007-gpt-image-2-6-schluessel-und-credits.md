# ADR 0007: Die neue App erzeugt Bilder mit GPT Image 2.6, über einen eigenen Gateway-Schlüssel

- Datum: 2026-11-06
- Status: vorgeschlagen (Validator-Session 06.11.2026, Fable). Das Ziel ist Ricos Wort vom 06.11. („in dem zuge auch die neuen gpt 2.6 flare und sunburst modelle nutzen“). Namen, Preise und Credits sind nicht gemessen und stehen deshalb nicht fest. Auf der Entscheidungsseite: s5 und f11.
- Status seit 06.11.2026: **akzeptiert in geänderter Fassung.** Rico: s5 „Stimmt so“ (2.6 ist das Ziel), f11 b mit Notiz „wir können erstmal mit den alten weiterarbeiten, das ist ja nur ein wert den wir dann ändern müssen“. Es gilt der Nachtrag am Ende.
- Bezug: ADR 0001 (Gateway, ein Schlüssel je App, zwei Angebote „Schnell“ und „Premium“); ADR 0005 (Clone); `docs/roadmap.md`, Messung 15.10.2026 Nacht (Modellname wörtlich, Umbenennen nur per Neuanlage)
- Dieser Entwurf zieht mit dem Clone in das neue Repo und bekommt dort seine Nummer.

## In einem Satz

Die neue App behält die zwei Angebote „Schnell“ und „Premium“, stellt sie auf GPT Image 2.6 Flare und Sunburst um und rechnet die Credits erst, wenn die Preise am Gateway gemessen sind.

## Kontext

- Das Studio rendert heute mit `gpt-image-2.5-flare` (Stufe `medium`, 1 Credit, rund 1,3 Cent) und `gpt-image-2.5-sunburst` (Stufe `high`, 4 Credits, rund 5,3 Cent), gemessen am 15.10.2026 (`lib/models.ts`). Die Oberfläche kennt Angebote, keine Modelle; das Modell je Angebot lässt sich über `MODELL_BILD_SCHNELL` und `MODELL_BILD_PREMIUM` aus der Umgebung setzen.
- Gemessen am 06.11.2026: Der Schlüssel des Studios sieht am Gateway vier Modelle, darunter keine 2.6. Ob sie im LiteLLM angelegt sind, zeigt dieser Schlüssel nicht. Das weiß nur Rico (f11).
- Die Beispielbilder der Design Library entstehen mit 2.5. Ein Stil kann mit 2.6 anders aussehen als seine Vorschau.
- Erfahrung aus Etappe 2: Der öffentliche Name im LiteLLM muss wörtlich zu dem passen, was die App schickt. Ein Umbenennen über „Edit“ griff nicht, erst neue Einträge halfen.

## Entscheidung (Vorschlag)

1. **Eigener virtueller Schlüssel für die neue App**, mit genau den Modellen, die sie braucht: die zwei 2.6-Bildmodelle, Haiku für den Assistenten, Omni für Video. Der Schlüssel des alten Studios bleibt, wie er ist.
2. **Zuerst messen, dann rechnen.** Ein Prüfstand-Skript wie in Etappe 1 misst mit dem neuen Schlüssel: die wörtlichen Modellnamen aus `/v1/models`, ein Bild je Angebot mit Kosten und Dauer, eine Bearbeitung über `/images/edits`, die Größen aus `ASPECT_RATIO_SIZES`. Erst danach stehen Modellnamen im Code und Credits in der Tabelle.
3. **Die Regel für Credits bleibt:** rund 1,3 Cent je Credit (ADR 0002, Nachtrag Credits). Die Zahl je Angebot folgt aus dem gemessenen Preis. Bis dahin gelten 1 und 4 als Platzhalter, nicht als Entscheidung.
4. **Die zwei Angebote bleiben in der Oberfläche**, der Modellname steht klein darunter. Ein drittes Angebot oder eine Größenwahl ist nicht Teil dieser Weiche.
5. **Vorschau und Ergebnis:** Nach der Messung werden drei Stile der Library mit 2.6 gegen ihre Vorschau gehalten. Weicht das Ergebnis sichtbar ab, bekommt Rico die Bilder und entscheidet, ob die Library ihre Beispiele nachzieht. Das wäre eine Aufgabe im Design Library Studio, nicht hier.

## Preis & Konsequenzen

- Rico hat Handgriffe im LiteLLM: die 2.6-Modelle anlegen, falls noch nicht geschehen, mit öffentlichem Namen ohne Präfix; einen Schlüssel für die neue App anlegen, Budget setzen.
- Ändern sich die Preise gegenüber 2.5, ändern sich die Credits je Bild oder das Startguthaben. Für Teilnehmende ist das sichtbar.
- Solange nichts gemessen ist, kann das Anforderungsdokument keine Credit-Zahlen nennen.
- Das alte Studio bleibt bis zur Ablösung bei 2.5. Im Seminar und in der neuen App entstehen bis dahin Bilder aus verschiedenen Modellen.

## Exit-Pfad

- Das Modell je Angebot ist eine Variable. Zurück auf 2.5 ist ein Wert in der Umgebung, solange der Schlüssel 2.5 sieht. Deshalb bekommt der neue Schlüssel in der Anfangszeit beide Generationen.
- Läuft `/images/edits` mit 2.6 nicht wie mit 2.5, bleibt „Bearbeiten“ vorerst bei 2.5; das wäre ein Nachtrag hier, mit Messung.

## Checkpoint

- Nach der Messung: Nachtrag mit Namen, Preisen, Dauer und den Credits je Angebot.
- Zwei Wochen nach dem Start: Kosten am Gateway je Bild gegen die Credits halten, wie in ADR 0002.

## Nachtrag 2026-11-06: Ricos Antworten, Start mit 2.5

Die 2.6-Modelle sind im Gateway noch nicht angelegt (f11 b). Rico will mit den heutigen Modellen starten und später einen Wert ändern.
Damit gilt:

- Die neue App startet mit `gpt-image-2.5-flare` und `gpt-image-2.5-sunburst` und den gemessenen Credits 1 und 4. Die Zahlen sind kein
  Platzhalter mehr, sondern der Stand zum Start.
- Das Modell je Angebot steht in der Umgebung, wie heute (`MODELL_BILD_SCHNELL`, `MODELL_BILD_PREMIUM`). Der Wechsel auf 2.6 ist ein Wert.
- Punkt 2 der Entscheidung (zuerst messen) wandert vom Baubeginn zum Tag des Wechsels: Vor dem Umstellen werden Namen, Preis, Dauer und
  `/images/edits` gemessen, und die Credits werden geprüft. „Nur ein Wert“ stimmt für das Modell; ob die Credits gleich bleiben, zeigt
  erst die Messung. Das ist die eine Stelle, an der diese Session Ricos Notiz ergänzt.
- Der eigene Gateway-Schlüssel für die neue App (Punkt 1) bleibt, er folgt aus ADR 0001. Er sieht zum Start die 2.5-Modelle, Haiku und Omni.
- Punkt 5 (Vorschau gegen Ergebnis) entfällt zum Start, weil die Beispielbilder der Library aus denselben 2.5-Modellen stammen. Er gilt am
  Tag des Wechsels.

Auslöser für den Wechsel: Rico meldet, dass die 2.6-Modelle im LiteLLM angelegt sind.

## Nachtrag 2026-11-06: umgezogen

Die geltende Fassung liegt seit dem 06.11.2026 im neuen Projekt `C:\Users\losch\Projekte\ai-design-media-studio` als ADR 0003 und wird nur
dort fortgeschrieben. Diese Datei bleibt als Herleitung stehen.
