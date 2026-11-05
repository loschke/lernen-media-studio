# Prüfstand Omni über die Durchleitung, 2026-11-05T22:13:29.776Z, Modell gemini-omni-1.2-flash

## Text → Video, 3 s, 360p, background=true
POST /gemini/v1beta/interactions {"model":"gemini-omni-1.2-flash","input":"Ein Papierflieger gleitet durch eine Bibliothek, eine durchgehende Einstellung, warmes Licht.","response_format":{"type":"video","aspect_ratio":"16:9","resolution":"360p","duration":"3s"},"background":true,"store":true}
-> 200 in 1.5 s | Kosten – | Spend 1.0071201499999964 | Antwort 0.00 MB
  id v1_ChdpX19zYXNXekNwRHJrZFVQNjRYcmlBYxIXaV9fc2FzV3pDcERya2RVUDY0WHJpQWM, status in_progress, usage {}
  Abruf 1 nach 9 s: 200, status=in_progress
  Abruf 2 nach 15 s: 200, status=in_progress
  Abruf 3 nach 22 s: 200, status=completed
  Teil user_input/text: Ein Papierflieger gleitet durch eine Bibliothek, eine durchgehende Einstellung, warmes Licht.
  Datei gemini-omni-1.2-flash-3s-360p-hintergrund.mp4: 1.37 MB, 640×360, 3.0 s, mit Ton

# Prüfstand Omni über die Durchleitung, 2026-11-05T22:14:04.860Z, Modell gemini-omni-1.2-flash

## Text → Video, 4 s, 720p, synchron
POST /gemini/v1beta/interactions {"model":"gemini-omni-1.2-flash","input":"Ein Papierflieger gleitet durch eine Bibliothek, eine durchgehende Einstellung, warmes Licht.","response_format":{"type":"video","aspect_ratio":"16:9","resolution":"720p","duration":"4s"},"store":false}
-> 200 in 25.8 s | Kosten – | Spend 1.0071201499999964 | Antwort 3.64 MB
  id –, status completed, usage {"total_tokens":23731,"total_input_tokens":21,"input_tokens_by_modality":[{"modality":"text","tokens":21}],"total_cached_tokens":0,"total_output_tokens":23168,"output_tokens_by_modality":[{"modality":"video","tokens":23168}],"total_tool_use_tokens":0,"total_thought_tokens":542,"initial_input_tokens"
  Datei gemini-omni-1.2-flash-4s-720p.mp4: 2.72 MB, 1280×720, 4.0 s, mit Ton

# Prüfstand Omni über die Durchleitung, 2026-11-05T22:14:30.892Z, Modell gemini-omni-1.2-flash

## Startbild → Video, 3 s, 360p, synchron
POST /gemini/v1beta/interactions {"model":"gemini-omni-1.2-flash","input":[{"type":"image","data":"<888036 Zeichen Base64>","mime_type":"image/jpeg"},{"type":"text","text":"Die Kamera fährt langsam auf das Motiv zu, leichte Bewegung im Bild."}],"response_format":{"type":"video","aspect_ratio":"16:9","resolution":"360p","duration":"3s"},"store":false}
-> 200 in 20.8 s | Kosten – | Spend 1.0071201499999964 | Antwort 2.38 MB
  id –, status completed, usage {"total_tokens":7444,"total_input_tokens":1095,"input_tokens_by_modality":[{"modality":"image","tokens":1080},{"modality":"text","tokens":15}],"total_cached_tokens":0,"total_output_tokens":5793,"output_tokens_by_modality":[{"modality":"video","tokens":5793}],"total_tool_use_tokens":0,"total_thought_
  Datei gemini-omni-1.2-flash-3s-360p-startbild.mp4: 1.78 MB, 640×360, 3.0 s, mit Ton

# Prüfstand Omni über die Durchleitung, 2026-11-05T22:14:51.935Z, Modell gemini-omni-1.2-flash

## Fehlerfall: Dauer 20 s (über der Grenze)
POST /gemini/v1beta/interactions {"model":"gemini-omni-1.2-flash","input":"Ein Papierflieger gleitet durch eine Bibliothek, eine durchgehende Einstellung, warmes Licht.","response_format":{"type":"video","aspect_ratio":"16:9","resolution":"360p","duration":"20s"},"store":false}
-> 400 in 0.5 s | Kosten – | Spend 1.0071201499999964 | Antwort 0.00 MB
  {"error":{"message":"Requested video duration 20s 0ns exceeds the maximum allowed 15s 0ns","code":"invalid_request"}}

## Fehlerfall: unbekanntes Modell
POST /gemini/v1beta/interactions {"model":"gemini-omni-gibt-es-nicht","input":"Ein Papierflieger gleitet durch eine Bibliothek, eine durchgehende Einstellung, warmes Licht.","response_format":{"type":"video","aspect_ratio":"16:9","resolution":"360p","duration":"3s"},"store":false}
-> 403 in 0.1 s | Kosten – | Spend – | Antwort 0.00 MB
  {"error":{"message":"The requested model 'gemini-omni-gibt-es-nicht' is not available for this API key, or the model name is invalid. Check the models available to you and try again.","type":"team_model_access_denied","param":"model","code":"403"}}

# Zusatzmessungen 2026-11-05 (von Hand, nicht im Skript)

## Text → Video, 8 s, 720p, hochkant (9:16), background=true
- Start 200 in 1,9 s, status in_progress, Kennung 70 Zeichen (`v1_` + Base64)
- Abrufe alle 5 s: je rund 0,8 s, `in_progress` bis 31 s, `completed` beim Abruf nach 39 s
- Fertige Antwort 5,30 MB (Video inline als Base64), Abruf 3,3 s. Ein zweiter Abruf danach liefert dasselbe noch einmal.
- Datei 3,97 MB, 720×1280, 8,0 s, mit Ton. Verbrauch 46.336 Video-Token (5.792 je Sekunde, bei 12 $ je Million rund 0,56 $)

## Startbild
- Erstes Bild des Videos verglichen mit `quelle.jpg`: Das Startbild wird als erstes Bild übernommen, vom Format 3:2 auf 16:9 beschnitten.

## Kostenbuchung am Gateway
- Spend des Studio-Schlüssels vor den Läufen (22:13:22 UTC): 1,0071201
- Spend nach vier Läufen (22:17:54 UTC, 4,5 Minuten nach dem ersten): 1,0071201, unverändert
- Rechnerische Google-Kosten der vier Läufe: rund 0,97 $ (3 s 360p, 4 s 720p, 3 s 360p, 8 s 720p)
- Befund: Die Durchleitung bucht Omni in dieser Zeit nicht auf den Schlüssel. Kein `x-litellm-response-cost` in den Antworten.

## Vorher gemessen (gleicher Abend)
- `/v1/videos` mit Omni: 404 von Google, „not supported for predictLongRunning“. Die Videoschnittstelle des Gateways kann nur Veo.
- Durchleitung mit Präfix im Namen (`gemini/gemini-omni-1.1-flash`): 404 von Google, „Did you mean 'gemini-omni-1.1-flash'?“
- Durchleitung mit Namen, der nicht in der Modellliste des Schlüssels steht: 403 `team_model_access_denied` vom Gateway
## Nach dem Bau (gleicher Abend, von Hand)
- Startbild PNG 3,3 MB (Galeriegröße), 4 s, 720p, 9:16, background=true: Anfrage 4,38 MB, Start 200 in 5,5 s, Abrufe je 4,38 MB in rund 2,5 s (die Antwort trägt das Startbild mit), fertig nach 40 s, fertige Antwort 10,11 MB in 4,9 s. Schritte: user_input[image,text] thought[] model_output[video]. Datei 4,29 MB, 720×1280, 4,0 s, mit Ton.
- Text, 15 s, 720p, 16:9, background=true: Start 200 in 1,9 s, Abrufe alle 4 s je rund 0,8 s, fertig nach 59 s, fertige Antwort 7,28 MB in 4,2 s. Datei 5,44 MB, 1280×720, 15,0 s, mit Ton. 86.880 Video-Token (rund 1,04 $).

