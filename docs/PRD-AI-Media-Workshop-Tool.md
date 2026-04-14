# PRD: AI Media Workshop Tool — "Bildwerkstatt"

## Kontext & Problem

Rico Loschke hält nächste Woche eine vor-Ort-Schulung zu AI Bild- und Videogenerierung bei der Stadt Dresden. Die Stadtverwaltung kann aus Compliance- und Kostengründen nicht rechtzeitig individuelle Accounts bei KI-Bildanbietern für alle Teilnehmer bereitstellen. Ohne Hands-on-Tool wird die Schulung ihren Praxisanspruch nicht erfüllen können.

## Lösungsansatz

Eine leichtgewichtige Web-App ("Bildwerkstatt"), die über einen einzelnen Gemini-API-Key betrieben wird und den Teilnehmern Bildgenerierung und Bildbearbeitung per Browser ermöglicht — ohne eigene Accounts.

## Technische Basis

**AI SDK:** Vercel AI SDK (`ai` + `@ai-sdk/google`) mit AI SDK UI (`@ai-sdk/react`)
**Modell Bildgenerierung:** `gemini-3.1-flash-image-preview` (schnell, günstig) oder `gemini-3-pro-image-preview` (höhere Qualität)
**Modell Chat:** `gemini-3-flash-preview` (Text-Only, günstigster)
**Entwicklungsumgebung:** Google Antigravity IDE
**Stack:** Next.js 16.2 (App Router) + Tailwind CSS v4 + Vercel AI SDK, deployed via Vercel
**Zugangsschutz:** Shared Passcode (Environment Variable), kein User-Auth

> **Hinweis zur Bildgenerierung im AI SDK:**
> Gemini Image-Modelle sind multimodale Output-Modelle. Im AI SDK laufen sie über `generateText` / `streamText` (nicht `generateImage`). Bilder kommen als `result.files` zurück. Das bedeutet:
> - **Chat-Modus** → `useChat` Hook + `streamText` Route (klassischer AI SDK Flow)
> - **Bildgenerierung/-bearbeitung** → `generateText` in API Route, Bilder aus `result.files` extrahieren und als base64 an Client zurückgeben
>
> Die `imageConfig` (Seitenverhältnis, Auflösung) wird über `providerOptions.google.imageConfig` gesetzt.

---

## Architektur

### Deployment
Vercel (Next.js 16.2 App Router). API-Key als `GOOGLE_GENERATIVE_AI_API_KEY` Environment Variable. Alle API-Calls laufen über Next.js API Routes — der Key ist nie im Client.

### Zugangsschutz (Shared Passcode)
Kein User-Auth-System. Stattdessen ein einfacher Passcode-Screen beim ersten Zugriff:
- Teilnehmer gibt Passcode ein (z.B. "dresden2026")
- Passcode wird gegen Environment Variable `APP_PASSCODE` geprüft (API Route)
- Bei Erfolg: Session-Token (UUID) wird in localStorage gesetzt + als Cookie
- Alle API Routes prüfen auf gültiges Session-Token
- Kein Benutzername, kein Profil, keine Registrierung

**Umsetzung:** `proxy.ts` (Next.js 16 Nachfolger von `middleware.ts`) prüft bei jedem Request auf gültigen Session-Cookie. Fehlt er → Redirect auf `/login`. Login-Page ist ein simples Passwort-Feld.

### Multi-User-Betrieb
- Session-basiertes Throttling: max 2-3 Bilder pro Minute pro Session
- Globales Rate-Limit: Serverseitige Queue, max 3 gleichzeitige API-Calls
- Visueller Counter im UI: "Du hast noch X Generierungen übrig"
- Rico kann Limits über Environment Variables steuern

---

## Features & Scope

### Modus 1: Bildgenerierung

**User Flow:**
1. Teilnehmer öffnet App im Browser
2. Gibt einen Prompt ein (Textarea)
3. Wählt Seitenverhältnis aus Dropdown/Toggle-Gruppe:
   - 1:1, 3:2, 2:3, 4:3, 3:4, 16:9, 9:16
4. Optional: Auflösung wählen (1K default, 2K optional)
5. Klickt "Generieren"
6. Bild wird angezeigt, gespeicherter Prompt daneben
7. Bild landet automatisch in der Session-Galerie
8. Download-Button pro Bild

**Technische Details:**
- API-Call: `generateText` via AI SDK mit `google('gemini-3.1-flash-image-preview')`
- Response: Bilder in `result.files` als `uint8Array`
- Bild + Prompt + Timestamp in localStorage speichern (Session-Persistenz)
- Galerie zeigt alle generierten Bilder als Grid mit Thumbnail + Prompt-Preview

**AI SDK Call (serverseitig in API Route):**
```typescript
const result = await generateText({
  model: google('gemini-3.1-flash-image-preview'),
  providerOptions: {
    google: {
      imageConfig: { aspectRatio: '16:9', imageSize: '1k' }
    }
  },
  prompt: userPrompt,
});
// Bilder: result.files.filter(f => f.mediaType?.startsWith('image/'))
```

### Modus 2: Bildbearbeitung

**User Flow — Variante A (Galerie-Bild bearbeiten):**
1. Teilnehmer wählt ein Bild aus der Galerie
2. Bild wird groß angezeigt
3. Teilnehmer gibt Bearbeitungs-Prompt ein (z.B. "Ändere den Hintergrund zu einem Sonnenuntergang")
4. API-Call mit Original-Bild + Prompt
5. Neues Bild wird angezeigt, Original bleibt in der Galerie
6. Iteratives Bearbeiten möglich (Multi-Turn)

**User Flow — Variante B (Upload + Bearbeiten):**
1. Teilnehmer lädt ein oder mehrere Bilder hoch (Drag & Drop oder File-Picker)
2. Bilder werden als Thumbnails angezeigt
3. Teilnehmer gibt Bearbeitungs-/Kombinations-Prompt ein
4. API-Call mit hochgeladenen Bildern + Prompt
5. Ergebnis wird angezeigt und in Galerie gespeichert

**Technische Details:**
- Upload: Client-seitige Konvertierung zu base64
- Maximale Dateigröße: 4MB pro Bild (Gemini-Limit beachten)
- Mehrere Bilder möglich (bis zu 14 Referenzbilder laut API)
- Multi-Turn-Editing: Conversation History clientseitig verwalten
- Thought Signatures bei Gemini 3 Modellen: Bei jedem Response die `thoughtSignature` speichern und im nächsten Turn zurücksenden

**AI SDK Call für Bildbearbeitung (serverseitig):**
```typescript
const result = await generateText({
  model: google('gemini-3.1-flash-image-preview'),
  messages: [{
    role: 'user',
    content: [
      { type: 'image', image: base64ImageData },
      { type: 'text', text: 'Ändere den Hintergrund zu einem Sonnenuntergang' },
    ],
  }],
});
// Bearbeitetes Bild: result.files[0]
```

### Modus 3: Chat / Prompt-Assistent

**Zweck:** Textbasierter Chat mit Gemini für workshop-relevante Aufgaben — Prompt-Formeln entwickeln, Bildideen brainstormen, Prompt-Übersetzungen (DE→EN), Prompt-Verbesserung.

**User Flow:**
1. Teilnehmer wechselt auf den Chat-Tab
2. Chat-Interface mit Message-History
3. Teilnehmer stellt Frage oder gibt Aufgabe ein
4. Gemini antwortet als Text
5. Conversation History bleibt erhalten (Multi-Turn)

**Technische Details:**
- Modell: `gemini-3-flash-preview` (Text-Only, schneller und günstiger als Image-Modell)
- **`useChat` Hook** von `@ai-sdk/react` verwaltet Conversation History automatisch
- System Instruction in der API Route vorkonfiguriert
- Kein Bild-Output in diesem Modus — rein textbasiert
- Streaming via `streamText` + `toDataStreamResponse`

**Frontend (Client Component):**
```typescript
'use client';
import { useChat } from '@ai-sdk/react';

export default function ChatTab() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });
  // messages rendern, form mit input + submit
}
```

**Backend (`/api/chat/route.ts`):**
```typescript
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: google('gemini-3-flash-preview'),
    system: 'Du bist ein Experte für AI-Bildgenerierung...',
    messages,
  });
  return result.toDataStreamResponse();
}
```

**Vordefinierte Quick-Actions (Buttons über dem Chat):**
- "Prompt verbessern" — Teilnehmer gibt Roh-Prompt ein, Gemini optimiert ihn
- "Prompt übersetzen" — DE→EN Übersetzung mit Fachbegriff-Erklärung
- "Bildidee entwickeln" — Brainstorming basierend auf Thema/Konzept
- "Prompt-Formel" — Strukturierte Prompt-Bausteine (Subject, Style, Lighting, Composition, etc.)

### Session-Galerie

- Grid-Layout mit Thumbnails
- Jedes Bild zeigt: Thumbnail, Prompt (abgekürzt), Timestamp
- Klick öffnet Detailansicht mit Full-Size-Bild und vollem Prompt
- Actions pro Bild: "Bearbeiten" (→ Modus 2), "Download", "Löschen"
- Persistenz via localStorage (überlebt Page-Reload, nicht Browser-Close)
- Optional: Export-Button für gesamte Galerie als ZIP

---

## Rate Limiting & Kostenmanagement

### Rate Limits (Gemini API, Free Tier)
- `gemini-3.1-flash-image-preview`: 10 RPM, 1.500 RPD
- `gemini-3-pro-image-preview`: 5 RPM, 100 RPD

### Rate Limits (Pay-as-you-go)
- Flash: 30 RPM, 10.000 RPD
- Pro: 10 RPM, 3.000 RPD

### Kosten-Kalkulation (Pay-as-you-go, 1K Auflösung)
- Flash: ~$0.039 pro Bild
- Pro: ~$0.134 pro Bild
- **Szenario:** 20 Teilnehmer × 15 Bilder = 300 Bilder
  - Flash: ~$11,70
  - Pro: ~$40,20

### Empfohlene Strategie
- Default-Modell: `gemini-3.1-flash-image-preview` (schnell, günstig, reicht für Workshop)
- Serverseitige Queue mit Throttling: max 2 gleichzeitige Requests
- Session-basiertes Limit: z.B. max 20 Bilder pro Session
- Visueller Counter im UI: "Du hast noch X Generierungen übrig"
- Admin-Toggle: Rico kann Limits live anpassen

---

## UI/UX-Konzept

### Navigation: Tab-basiert

Die App hat drei Hauptbereiche als Tabs:

```
┌─────────────────────────────────────────────────┐
│  🎨 Bildwerkstatt                    [Galerie]  │
├─────────────────────────────────────────────────┤
│  [🖼 Generieren]  [✏️ Bearbeiten]  [💬 Chat]   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Tab: Generieren                                │
│  ┌──────────────┬──────────────────────────┐    │
│  │ Prompt       │  Ergebnis                │    │
│  │ [Textarea]   │  [Generiertes Bild]      │    │
│  │              │                          │    │
│  │ Ratio:       │  Prompt: "..."           │    │
│  │ [1:1][16:9]  │  [Download][Bearbeiten]  │    │
│  │ [Generieren] │                          │    │
│  └──────────────┴──────────────────────────┘    │
│                                                 │
│  Tab: Bearbeiten                                │
│  ┌──────────────┬──────────────────────────┐    │
│  │ Quellbild(er)│  Ergebnis                │    │
│  │ [Galerie]    │  [Bearbeitetes Bild]     │    │
│  │ [📎 Upload]  │                          │    │
│  │ Prompt       │  [Download][Weiter-      │    │
│  │ [Textarea]   │   bearbeiten]            │    │
│  │ [Bearbeiten] │                          │    │
│  └──────────────┴──────────────────────────┘    │
│                                                 │
│  Tab: Chat                                      │
│  ┌─────────────────────────────────────────┐    │
│  │ Quick-Actions:                          │    │
│  │ [Prompt verbessern][Übersetzen][Formel] │    │
│  │                                         │    │
│  │ 💬 Chat-Verlauf (scrollbar)             │    │
│  │                                         │    │
│  │ [Textarea] [Senden]                     │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
├─────────────────────────────────────────────────┤
│  Galerie (Overlay/Sidebar, alle Bilder)         │
│  [img][img][img][img][img][img]                 │
└─────────────────────────────────────────────────┘
```

### Design-Prinzipien
- Mobile-first (Teilnehmer nutzen möglicherweise Smartphones)
- Große Touch-Targets für Seitenverhältnis-Auswahl
- Klarer Loading-State während Generierung (Spinner + geschätzte Wartezeit)
- Error-Handling mit verständlichen deutschen Fehlermeldungen
- Kein Login, kein Account — Session-basiert über UUID im localStorage

---

## Technischer Stack

### Packages
```json
{
  "dependencies": {
    "next": "^16.2",
    "react": "^19",
    "ai": "latest",
    "@ai-sdk/google": "latest",
    "@ai-sdk/react": "latest",
    "tailwindcss": "^4"
  }
}
```

### Next.js 16 — relevante Änderungen für dieses Projekt

**Async Request APIs (Breaking Change):**
`params` und `searchParams` in Pages/Layouts sind jetzt ausschließlich async. Synchroner Zugriff ist komplett entfernt. Betrifft uns minimal, da wir kaum dynamische Routen haben.

**`middleware.ts` → `proxy.ts` (Deprecation):**
Die Middleware-Datei heißt jetzt `proxy.ts` mit einer `proxy()`-Funktion statt `middleware()`. Edge Runtime wird in proxy.ts nicht unterstützt — Runtime ist `nodejs`. Für unseren Passcode-Schutz ist das ideal, da wir ohnehin Node.js brauchen. Falls du beim Alten bleiben willst: `middleware.ts` funktioniert weiterhin, ist aber deprecated.

**AGENTS.md (16.2):**
Neue Projekte via `create-next-app` enthalten ein `AGENTS.md`, das AI-Coding-Agents (Antigravity, Claude Code) instruiert, die gebundelte Next.js-Doku aus `node_modules/next/dist/docs/` zu lesen. Das ist für die Entwicklung in Antigravity direkt nützlich — 100% Pass-Rate auf Next.js-Evals laut Vercel.

**Browser Log Forwarding (16.2):**
Client-seitige Fehler werden automatisch ins Terminal geloggt. Hilfreich für Debugging wenn Antigravity-Agents keinen Browser-Zugriff haben. Konfigurierbar via `logging.browserToTerminal` in `next.config.ts`.

**Performance:**
~400% schnellerer Dev-Server-Start, ~50% schnelleres Rendering. Turbopack ist Default in Dev.

### Frontend
- **Next.js 16.2** (App Router, Turbopack)
- **Tailwind CSS v4** für Styling
- **`@ai-sdk/react`** — `useChat` Hook für Chat-Modus
- **React State** für Bildgenerierung/Bearbeitung (kein `useChat`, da Bilder über `generateText` laufen)
- **localStorage** für Galerie-Persistenz + Session-Token
- **File API / Drag & Drop** für Bild-Upload + Client-seitige base64-Konvertierung

### Backend (API Routes in Next.js)

**`/api/auth`** — Passcode prüfen, Session-Token ausgeben

**`/api/chat`** — Chat-Modus (klassischer AI SDK Streaming-Flow)
```typescript
// Nutzt streamText + useChat Pattern
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: google('gemini-3-flash-preview'),
    system: 'Du bist ein Experte für AI-Bildgenerierung...',
    messages,
  });
  return result.toDataStreamResponse();
}
```

**`/api/generate`** — Bildgenerierung (KEIN Streaming, da Bilder komplett zurückkommen)
```typescript
// Nutzt generateText, gibt base64-Bild zurück
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export async function POST(req: Request) {
  const { prompt, aspectRatio, imageSize } = await req.json();
  const result = await generateText({
    model: google('gemini-3.1-flash-image-preview'),
    providerOptions: {
      google: { imageConfig: { aspectRatio, imageSize } }
    },
    prompt,
  });
  const images = result.files.filter(f => f.mediaType?.startsWith('image/'));
  return Response.json({
    images: images.map(img => ({
      data: Buffer.from(img.uint8Array).toString('base64'),
      mediaType: img.mediaType,
    })),
    text: result.text,
  });
}
```

**`/api/edit`** — Bildbearbeitung (Bild + Prompt → neues Bild)
```typescript
// Sendet bestehende Bilder als Content Parts mit
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export async function POST(req: Request) {
  const { prompt, images } = await req.json(); // images: base64[]
  const result = await generateText({
    model: google('gemini-3.1-flash-image-preview'),
    messages: [{
      role: 'user',
      content: [
        ...images.map(img => ({
          type: 'image' as const,
          image: img,
        })),
        { type: 'text' as const, text: prompt },
      ],
    }],
  });
  const outputImages = result.files
    .filter(f => f.mediaType?.startsWith('image/'));
  return Response.json({
    images: outputImages.map(img => ({
      data: Buffer.from(img.uint8Array).toString('base64'),
      mediaType: img.mediaType,
    })),
    text: result.text,
  });
}
```

**Alle Routes:** Session-Token validieren, Rate-Limiting via Middleware

### Environment Variables (Vercel)
```
GOOGLE_GENERATIVE_AI_API_KEY=...
APP_PASSCODE=dresden2026
RATE_LIMIT_PER_SESSION=20
RATE_LIMIT_PER_MINUTE=3
```

> **Hinweis:** `@ai-sdk/google` liest `GOOGLE_GENERATIVE_AI_API_KEY` automatisch aus der Environment. Kein manuelles Key-Handling nötig.

### Deployment
- **Vercel** — automatisches Deployment aus Git-Repo
- Domain: z.B. `bildwerkstatt.vercel.app` oder Custom Domain

---

## Scope-Priorisierung

### Must-Have (MVP für Workshop)
- [ ] Passcode-Screen mit Session-Token
- [ ] Tab-Navigation: Generieren / Bearbeiten / Chat
- [ ] **Generieren:** Prompt-Eingabe + Seitenverhältnis-Auswahl + Bildanzeige + Download
- [ ] **Bearbeiten:** Bild aus Galerie wählen ODER hochladen + Bearbeitungs-Prompt + Ergebnis
- [ ] **Chat:** Text-Chat mit Gemini (eigenes günstigeres Modell)
- [ ] Session-Galerie mit localStorage-Persistenz
- [ ] Serverseitiger API-Key (nie im Client)
- [ ] Basis Rate-Limiting pro Session

### Should-Have
- [ ] Multi-Bild-Upload für Kombination
- [ ] Multi-Turn-Editing mit Conversation History
- [ ] Chat Quick-Actions (Prompt verbessern, Übersetzen, Formel)
- [ ] Chat System Instruction für Workshop-Kontext
- [ ] Session-Counter ("X Generierungen übrig")
- [ ] Admin-Panel (simple Seite mit Limit-Einstellungen)
- [ ] Galerie-Export als ZIP

### Nice-to-Have
- [ ] Modell-Auswahl (Flash vs. Pro)
- [ ] Prompt-Vorlagen für Workshop-Übungen
- [ ] Shared Gallery (alle Teilnehmer sehen alle Bilder)
- [ ] Prompt-History mit Favoriten

---

## Alternative Lösungsansätze

### Alternative 1: Google AI Studio direkt nutzen
Jeder Teilnehmer nutzt Google AI Studio (https://aistudio.google.com) mit eigenem Google-Account.
- **Pro:** Null Entwicklungsaufwand, voller Feature-Scope, kostenlos
- **Contra:** Erfordert Google-Account pro Teilnehmer, Stadt Dresden blockiert ggf. externe Logins, kein kontrolliertes Seminar-Erlebnis
- **Bewertung:** Prüfen, ob die Teilnehmer private Google-Accounts nutzen dürfen/können. Falls ja, ist das der schnellste Weg.

### Alternative 2: Google Colab Notebook
Ein vorbereitetes Colab-Notebook, das Teilnehmer per Link öffnen und mit einem geteilten API-Key arbeiten.
- **Pro:** Minimaler Aufwand, didaktisch wertvoll (Code sichtbar), keine Deployment-Frage
- **Contra:** Technische Hürde für Nicht-Entwickler, Google-Account nötig für Colab

### Alternative 3: Einfache HTML-Seite (kein Framework)
Eine einzige HTML-Datei mit Vanilla JS, die direkt die Gemini REST API aufruft.
- **Pro:** Maximale Einfachheit, in 2-3 Stunden baubar, keine Build-Pipeline
- **Contra:** API-Key im Client exponiert (für Workshop akzeptabel wenn temporärer Key)
- **Bewertung:** Pragmatischste Lösung, wenn die Zeit knapp wird. Key nach Workshop rotieren.

### Alternative 4: Bildwerkstatt als claude.ai React Artifact
Das Tool direkt als React-Artifact in Claude bauen, mit Anthropic API im Backend.
- **Pro:** Schnell prototypbar, kein separates Deployment
- **Contra:** Teilnehmer bräuchten Claude-Zugang, Gemini-Bildgenerierung nicht direkt nutzbar
- **Bewertung:** Nicht geeignet, da die Schulung explizit Google-AI-Tools behandelt.

---

## Offene Fragen

1. **Netzwerk vor Ort:** Gibt es WLAN für Teilnehmer? Können sie `*.vercel.app` URLs aufrufen oder gibt es ein Firmen-Proxy?
2. **Geräte:** Bringen Teilnehmer eigene Laptops/Tablets mit oder gibt es Schulungsrechner?
3. **Teilnehmerzahl:** Exakte Anzahl für Rate-Limit-Konfiguration?
4. **Dauer Praxis-Teil:** Wie viele Stunden steht für Hands-on zur Verfügung?
5. **Budget:** Bist du mit ~$15-20 API-Kosten für die Session okay? (Flash-Modell, 300 Bilder)

---

## Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Rate Limits bei gleichzeitiger Nutzung | Hoch | Mittel | Queue-System, Throttling, Flash-Modell nutzen |
| API-Ausfälle (Preview-Modell) | Niedrig | Hoch | Fallback: vorbereitete Demos, AI Studio als Backup |
| Langsame Generierung bei vielen Requests | Mittel | Mittel | Loading-States, Queue-Visualisierung |
| Kein WLAN vor Ort | Niedrig | Kritisch | Vorab klären, Fallback: Hotspot + lokaler Server |
| Kosten explodieren | Niedrig | Mittel | Harte Limits pro Session, Admin-Kill-Switch |

---

## Timeline

| Tag | Milestone |
|-----|-----------|
| Tag 1 | Projekt-Setup in Antigravity, API-Anbindung testen, MVP Bildgenerierung |
| Tag 2 | Galerie, Upload-Funktion, Bildbearbeitung |
| Tag 3 | Rate-Limiting, Error-Handling, Mobile-Optimierung |
| Tag 4 | Deployment, Smoke-Test mit realer Teilnehmerzahl |
| Tag 5 | Buffer / Bugfixes / Prompt-Vorlagen vorbereiten |
