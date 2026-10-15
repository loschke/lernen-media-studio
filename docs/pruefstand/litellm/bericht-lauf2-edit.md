# Prüfstand LiteLLM, 2026-10-15T18:56 gegen https://litellm.sevenx.cloud

## 4. Bilder bearbeiten über /v1/images/edits
(kein erzeugtes Bild vorhanden, Platzhalter 1x1 PNG, nur Interface-Prüfung)
edit-flare-1png: gpt-image-2.5-flare medium 1 Bild(er) als 'image' [png] -> 200 in 13.4 s | Kosten 0.015618 | Token in/out 33/515
edit-sunburst-1png: gpt-image-2.5-sunburst high 1 Bild(er) als 'image' [png] -> 200 in 54.8 s | Kosten 0.061908000000000005 | Token in/out 33/2058
(quelle.jpg fehlt: JPEG-Eingabe nicht geprüft. Beliebiges Foto unter docs/pruefstand/litellm/quelle.jpg ablegen und erneut laufen lassen.)
edit-flare-2bilder-image: gpt-image-2.5-flare medium 2 Bild(er) als 'image' [png,png] -> 200 in 12.8 s | Kosten 0.015676 | Token in/out 44/515
edit-flare-2bilder-imagearray: gpt-image-2.5-flare medium 2 Bild(er) als 'image[]' [png,png] -> 200 in 13.4 s | Kosten 0.015676 | Token in/out 44/515
