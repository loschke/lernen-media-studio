# Prüfstand Veo über Gemini-Durchleitung, 2026-10-15T20:52 gegen https://litellm.sevenx.cloud/gemini
Modell veo-3.1-fast-generate-preview, 4 s, 16:9, Textprompt.

## 1. Spend des Schlüssels vorher
GET /key/info -> 403 | spend – $ | Budget – | Modelle undefined

## 5. Spend des Schlüssels nachher
spend – $ | Differenz zu vorher – | erwartet bei 4 s Lite (0,05 $/s): 0.20 $
Video: nicht geladen | Dauer bis fertig: – s
spend nach weiteren 30 s: – $ | Differenz zu vorher –

## 6. Zweiter Start über @google/genai mit httpOptions.baseUrl (so wie die Studio-Route)
Startbild flare-medium-1536x1024.png (3.5 MB), Endbild flare-medium-2048x1152.png (5.4 MB), Modell veo-3.1-fast-generate-preview
-> Fehler: {"error":{"code":400,"message":"Your use case is currently not supported.  Please refer to Gemini API documentation for current model offering.","status":"INVALID_ARGUMENT"}}
