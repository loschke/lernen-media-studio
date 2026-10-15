
---

# Prüfstand /v1/videos, 2026-10-15T21:09 gegen https://litellm.sevenx.cloud, Modell veo-3.1-lite-generate-preview

## 1. Text, 6 s, Hochformat 720x1280
POST /v1/videos {"model":"veo-3.1-lite-generate-preview","prompt":"A paper boat drifting on a calm pond at golden hour, soft ripples, cinematic","seconds":"6","size":"720x1280"}
-> 200 in 1698 ms | Kosten 0.30000000000000004 | Spend 2.855382475 | {"id":"video_bGl0ZWxsbTpjdXN0b21fbGxtX3Byb3ZpZGVyOmdlbWluaTttb2RlbF9pZDp2ZW8tMy4xLWxpdGUtZ2VuZXJhdGUtcHJldmlldzt2aWRlb19pZDptb2RlbHMvdmVvLTMuMS1saXRlLWdlbmVyYXRlLXByZXZpZXcvb3BlcmF0aW9ucy9taXRmY3FjZXo3Zno=","object":"vid
  Abruf 1 nach 8 s: 200, status=processing
  Abruf 2 nach 14 s: 200, status=processing
  Abruf 3 nach 19 s: 200, status=processing
  Abruf 4 nach 25 s: 200, status=processing
  Abruf 5 nach 30 s: 200, status=completed
  Download: 200 video/mp4, 1.7 MB in 1201 ms, Datei veo-videos-lite-6s-hochformat.mp4: 720×1280, 6.0 s, mit Ton

## 2. Startbild als JPEG (Multipart), 4 s, 1280x720
POST /v1/videos multipart {"model":"veo-3.1-lite-generate-preview","prompt":"Slow push-in, warm light, gentle camera move","seconds":"4","size":"1280x720"} + input_reference start.jpg (0.7 MB, image/jpeg)
-> 200 in 2739 ms | Kosten 0.2 | Spend 3.055382475 | {"id":"video_bGl0ZWxsbTpjdXN0b21fbGxtX3Byb3ZpZGVyOmdlbWluaTttb2RlbF9pZDp2ZW8tMy4xLWxpdGUtZ2VuZXJhdGUtcHJldmlldzt2aWRlb19pZDptb2RlbHMvdmVvLTMuMS1saXRlLWdlbmVyYXRlLXByZXZpZXcvb3BlcmF0aW9ucy9tamw2bm0zN2R6bXc=","object":"vid
  Abruf 1 nach 8 s: 200, status=processing
  Abruf 2 nach 14 s: 200, status=processing
  Abruf 3 nach 19 s: 200, status=processing
  Abruf 4 nach 24 s: 200, status=processing
  Abruf 5 nach 29 s: 200, status=processing
  Abruf 6 nach 35 s: 200, status=completed
  Download: 200 video/mp4, 4.9 MB in 1943 ms, Datei veo-videos-lite-4s-startbild-jpeg.mp4: 1280×720, 4.0 s, mit Ton

## 3. Fehlerbilder (kosten nichts, wenn der Gateway ablehnt)

## 3a. Ungültige Dauer 5 s
POST /v1/videos {"model":"veo-3.1-lite-generate-preview","prompt":"x","seconds":"5","size":"1280x720"}
-> 400 in 143 ms | Kosten 0 | Spend 2.855382475 | {"error":{"message":"litellm.BadRequestError: GeminiException BadRequestError - {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"The number value for `durationSeconds` is out of bound. Please provide a value bet

## 3b. Ungültige Größe
POST /v1/videos {"model":"veo-3.1-lite-generate-preview","prompt":"x","seconds":"4","size":"1000x1000"}
-> 200 in 1147 ms | Kosten 0.2 | Spend 3.055382475 | {"id":"video_bGl0ZWxsbTpjdXN0b21fbGxtX3Byb3ZpZGVyOmdlbWluaTttb2RlbF9pZDp2ZW8tMy4xLWxpdGUtZ2VuZXJhdGUtcHJldmlldzt2aWRlb19pZDptb2RlbHMvdmVvLTMuMS1saXRlLWdlbmVyYXRlLXByZXZpZXcvb3BlcmF0aW9ucy84OHZmNXAxYTFoM28=","object":"vid

## 3c. Unbekanntes Modell
POST /v1/videos {"model":"veo-gibt-es-nicht","prompt":"x","seconds":"4"}
-> 403 in 26 ms | Kosten – | Spend – | {"error":{"message":"The requested model 'veo-gibt-es-nicht' is not available for this API key, or the model name is invalid. Check the models available to you and try again.","type":"team_model_access_denied","param":"m
GET /v1/videos/video_gibt_es_nicht -> 500 {"error":{"message":"litellm.InternalServerError: InternalServerError: OpenAIException - Expecting value: line 1 column 1 (char 0)","type":"
GET /v1/videos/video_abc-123 -> 500 {"error":{"message":"litellm.InternalServerError: InternalServerError: OpenAIException - Expecting value: line 1 column 1 (char 0)","type":"
