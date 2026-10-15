# Prüfstand LiteLLM, 2026-10-15T18:45 gegen https://litellm.sevenx.cloud
## 1. Welche Modelle kennt der Schlüssel?
GET /v1/models -> 200
- claude-haiku-5-5
- gpt-image-2.5-flare
- gpt-image-2.5-sunburst

Preise laut Gateway ($ je 1M Token, leer = Gateway rechnet 0):
- gpt-image-2.5-sunburst -> gpt-image-2.5-sunburst | mode image_generation | in 5.00 | out –
- gpt-image-2.5-flare -> gpt-image-2.5-flare | mode image_generation | in 5.00 | out –
- claude-haiku-5-5 -> claude-haiku-5-5 | mode chat | in 0.10 | out 0.50
OK   gpt-image-2.5-flare
OK   gpt-image-2.5-sunburst
OK   claude-haiku-5-5
FEHLT claude-haiku-5.5
FEHLT claude-haiku-4-5

## 2. Chat (Haiku) über /v1/messages
Text: claude-haiku-5-5 -> 200 in 1231 ms | Kosten 3.4699999999999996e-05 | Spend 3.4699999999999996e-05
  Antwort: Das 4K-Framework ist ein Modell für Kreativitäts- und Denkfähigkeiten, das die vier Dimensionen Kreativität, kritisches Denken
Text + Bild: claude-haiku-5-5 -> 200 in 1014 ms | Kosten 3.3299999999999996e-05 | Spend 3.3299999999999996e-05
  Antwort: {"model":"claude-haiku-5-5","id":"msg_011Cg4X3kAiGLrWNsxg1kRNW","type":"message","role":"assistant","content":[{"type":"thinking","thinking":"","signature":"CAQ
Stream: claude-haiku-5-5 -> 200 in 774 ms | text/event-stream; charset=utf-8 | 9 Events

## 3. Bilder erzeugen (gleicher Prompt, Stufen im Vergleich)
flare-low-1024: gpt-image-2.5-flare low 1024x1024 -> 200 in 10.8 s | Kosten 0.00602 | Token in/out 28/196 | flare-low-1024.png
flare-medium-1024: gpt-image-2.5-flare medium 1024x1024 -> 200 in 12.7 s | Kosten 0.01331 | Token in/out 28/439 | flare-medium-1024.png
flare-high-1024: gpt-image-2.5-flare high 1024x1024 -> 200 in 20.6 s | Kosten 0.052820000000000006 | Token in/out 28/1756 | flare-high-1024.png
sunburst-low-1024: gpt-image-2.5-sunburst low 1024x1024 -> 200 in 14.5 s | Kosten 0.00602 | Token in/out 28/196 | sunburst-low-1024.png
sunburst-medium-1024: gpt-image-2.5-sunburst medium 1024x1024 -> 200 in 20.2 s | Kosten 0.01331 | Token in/out 28/439 | sunburst-medium-1024.png
sunburst-high-1024: gpt-image-2.5-sunburst high 1024x1024 -> 200 in 40.2 s | Kosten 0.052820000000000006 | Token in/out 28/1756 | sunburst-high-1024.png
flare-medium-1536x1024: gpt-image-2.5-flare medium 1536x1024 -> 200 in 13.6 s | Kosten 0.01043 | Token in/out 28/343 | flare-medium-1536x1024.png
flare-medium-2048x1152: gpt-image-2.5-flare medium 2048x1152 -> 200 in 13.3 s | Kosten 0.01115 | Token in/out 28/367 | flare-medium-2048x1152.png

## 4. Bilder bearbeiten über /v1/images/edits
edit-flare-1png: gpt-image-2.5-flare medium 1 Bild(er) als 'image' [png] -> 500 in 3.3 s | Kosten 0 | Token in/out –/– | kein Bild | litellm.InternalServerError: InternalServerError: OpenAIException - /Hallo12

LiteLLM: model group 'gpt-image-2.5-flare' failed with the error above. No fallback was attempted.
edit-sunburst-1png: gpt-image-2.5-sunburst high 1 Bild(er) als 'image' [png] -> 500 in 3.5 s | Kosten 0 | Token in/out –/– | kein Bild | litellm.InternalServerError: InternalServerError: OpenAIException - /Hallo12

LiteLLM: model group 'gpt-image-2.5-sunburst' failed with the error above. No fallback was attempted.
(quelle.jpg fehlt: JPEG-Eingabe nicht geprüft. Beliebiges Foto unter docs/pruefstand/litellm/quelle.jpg ablegen und erneut laufen lassen.)
edit-flare-nichtquadratisch: gpt-image-2.5-flare medium 1 Bild(er) als 'image' [png] -> 500 in 3.7 s | Kosten 0 | Token in/out –/– | kein Bild | litellm.InternalServerError: InternalServerError: OpenAIException - /Hallo12

LiteLLM: model group 'gpt-image-2.5-flare' failed with the error above. No fallback was attempted.
edit-flare-2bilder-image: gpt-image-2.5-flare medium 2 Bild(er) als 'image' [png,png] -> 500 in 5.1 s | Kosten 0 | Token in/out –/– | kein Bild | litellm.InternalServerError: InternalServerError: OpenAIException - /Hallo12

LiteLLM: model group 'gpt-image-2.5-flare' failed with the error above. No fallback was attempted.
edit-flare-2bilder-imagearray: gpt-image-2.5-flare medium 2 Bild(er) als 'image[]' [png,png] -> 500 in 5.3 s | Kosten 0 | Token in/out –/– | kein Bild | litellm.InternalServerError: InternalServerError: OpenAIException - /Hallo12

LiteLLM: model group 'gpt-image-2.5-flare' failed with the error above. No fallback was attempted.

## 5. Fehlerbilder (was das Studio abfangen muss)
Unbekanntes Modell: 403 | The requested model 'gpt-image-gibt-es-nicht' is not available for this API key, or the model name is invalid. Check the models available to you and try again.
Ungültige Qualität: 400 | litellm.BadRequestError: OpenAIException - Invalid value: 'hd'. Supported values are: 'low', 'medium', 'high', and 'auto'. LiteLLM: model group 'gpt-image-2.5-flare' failed with th
Ungültige Größe: 400 | litellm.BadRequestError: OpenAIException - Invalid size '100x100'. Width and height must both be divisible by 16. LiteLLM: model group 'gpt-image-2.5-flare' failed with the error a
Falscher Schlüssel: 401
