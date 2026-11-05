// Video starten über die Gemini-Durchleitung des Gateways (ADR 0003):
// POST {MODELL_GATEWAY_URL}/gemini/v1beta/interactions, Googles Interactions
// API mit Gemini Omni Flash. `background: true` gibt sofort eine
// Vorgangskennung zurück, die die Statusroute abfragt. Das Startbild geht als
// Bild-Eingabe vor dem Prompt mit. Kein Google-Schlüssel im Studio.
//
// Fortsetzen (Nachtrag 06.11.2026): Mit `extendFrom` knüpft die Anfrage über
// `previous_interaction_id` an den Vorgang eines Videos aus der Galerie an.
// Die Kennung liest der Server aus den Metadaten des Videos, nie aus der
// Anfrage. Omni gibt dann das ganze, verlängerte Video zurück.
import {
  ALLOWED_VIDEO_MODEL_IDS,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_VIDEO_ASPECT_RATIO,
  DEFAULT_VIDEO_DURATION,
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATIONS,
  VIDEO_MAX_TOTAL_SECONDS,
  VIDEO_RESOLUTION,
  extendDurationsFor,
  getVideoCost,
  resolveVideoModel,
  type VideoModelId,
  type VideoAspectRatio,
  type VideoDuration,
} from "@/lib/models";
import { getCurrentUser } from "@/lib/session";
import { spendCredits, refundCredits } from "@/lib/credits";
import { fetchImageBuffer, readMeta, canExtendVideo, r2Configured } from "@/lib/r2";
import {
  gatewayConfigured,
  gatewayGoogleHeaders,
  gatewayInteractionsUrl,
  describeGatewayError,
  GATEWAY_MISSING_MESSAGE,
} from "@/lib/gateway";
import {
  MAX_VIDEO_PROMPT_CHARS,
  MAX_UPLOAD_BYTES,
  base64ByteLength,
  isValidVideoJobId,
  isValidGalleryId,
} from "@/lib/validation";

export const maxDuration = 60;

interface ImageRefGallery {
  source: "gallery";
  id: string;
}
interface ImageRefUpload {
  source: "upload";
  data: string; // base64 (with or without data: prefix)
  mediaType?: string;
}
type ImageRef = ImageRefGallery | ImageRefUpload;

async function resolveFrame(
  ref: ImageRef,
  sub: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (ref.source === "gallery") {
    const { buffer, mediaType } = await fetchImageBuffer(sub, ref.id);
    return { buffer, mimeType: mediaType };
  }
  const cleaned = ref.data.replace(/^data:image\/\w+;base64,/, "");
  return {
    buffer: Buffer.from(cleaned, "base64"),
    mimeType: ref.mediaType || "image/png",
  };
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  if (!r2Configured) {
    return json({ error: "Storage nicht konfiguriert (R2 Env-Vars fehlen)." }, 500);
  }
  if (!gatewayConfigured) {
    return json({ error: GATEWAY_MISSING_MESSAGE }, 500);
  }

  const user = await getCurrentUser();
  if (!user) {
    return json({ error: "Keine Session — bitte neu anmelden." }, 401);
  }

  const body = (await req.json()) as {
    prompt: string;
    model?: string;
    aspectRatio?: string;
    duration?: number;
    startFrame?: ImageRef;
    extendFrom?: { id?: string };
  };

  if (!body.prompt || typeof body.prompt !== "string") {
    return json({ error: "Prompt ist erforderlich." }, 400);
  }
  if (body.prompt.length > MAX_VIDEO_PROMPT_CHARS) {
    return json(
      { error: `Prompt zu lang (max. ${MAX_VIDEO_PROMPT_CHARS} Zeichen).` },
      400
    );
  }
  if (
    body.startFrame?.source === "upload" &&
    base64ByteLength(body.startFrame.data) > MAX_UPLOAD_BYTES
  ) {
    return json(
      { error: `Startframe zu groß (max. ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).` },
      400
    );
  }

  const model: VideoModelId =
    typeof body.model === "string" && ALLOWED_VIDEO_MODEL_IDS.has(body.model)
      ? (body.model as VideoModelId)
      : DEFAULT_VIDEO_MODEL;

  const aspectRatio: VideoAspectRatio =
    body.aspectRatio && (VIDEO_ASPECT_RATIOS as readonly string[]).includes(body.aspectRatio)
      ? (body.aspectRatio as VideoAspectRatio)
      : DEFAULT_VIDEO_ASPECT_RATIO;

  const duration: VideoDuration =
    body.duration && (VIDEO_DURATIONS as readonly number[]).includes(body.duration)
      ? (body.duration as VideoDuration)
      : DEFAULT_VIDEO_DURATION;

  // Fortsetzen: alles prüfen, bevor Credits abgehen.
  let fortsetzen: { interactionId: string; aspectRatio?: string } | null = null;
  if (body.extendFrom) {
    const id = body.extendFrom.id;
    const meta = isValidGalleryId(id) ? await readMeta(user.sub, id) : null;
    if (!meta || !meta.interactionId || !canExtendVideo(meta)) {
      return json(
        {
          error:
            "Dieses Video lässt sich nicht fortsetzen. Das geht nur mit Videos, die hier seit dem 06.11.2026 entstanden und jünger als 55 Tage sind.",
        },
        400
      );
    }
    const bisher = meta.durationSec ?? 0;
    if (!extendDurationsFor(bisher).includes(duration)) {
      return json(
        {
          error: `Diese Länge geht hier nicht. Ein Video wird um 4 bis 10 Sekunden verlängert und insgesamt höchstens ${VIDEO_MAX_TOTAL_SECONDS} Sekunden lang (bisher ${bisher}).`,
        },
        400
      );
    }
    fortsetzen = { interactionId: meta.interactionId, aspectRatio: meta.aspectRatio };
  }

  const cost = getVideoCost(model, duration);
  const spend = await spendCredits(user.sub, cost);
  if (!spend.ok) {
    return json({ error: "insufficient_credits", credits: spend.remaining, cost }, 402);
  }

  let credits = spend.remaining;

  try {
    // Gemessen 05.11.2026 (scripts/omni-durchleitung-pruefstand.mjs): Dauer
    // als Text mit „s“, Auflösung und Seitenverhältnis in `response_format`,
    // Startbild als Bild-Eingabe mit Base64 (wird zum ersten Bild, auf das
    // Zielformat beschnitten). Der Gateway antwortet in rund 2 s mit der
    // Kennung. `background` braucht `store: true`.
    // Gemessen 06.11.2026 (scripts/omni-fortsetzen-pruefstand.mjs): Mit
    // `previous_interaction_id` ist `duration` die angehängte Länge, zurück
    // kommt das ganze Video. Ein Startbild gibt es beim Fortsetzen nicht.
    let input: unknown = body.prompt;
    if (body.startFrame && !fortsetzen) {
      const frame = await resolveFrame(body.startFrame, user.sub);
      input = [
        { type: "image", data: frame.buffer.toString("base64"), mime_type: frame.mimeType },
        { type: "text", text: body.prompt },
      ];
    }

    const res = await fetch(gatewayInteractionsUrl(""), {
      method: "POST",
      headers: { ...gatewayGoogleHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        model: resolveVideoModel(model),
        ...(fortsetzen ? { previous_interaction_id: fortsetzen.interactionId } : {}),
        input,
        response_format: {
          type: "video",
          // Fehlt das gemerkte Verhältnis, gilt das der Oberfläche (sonst nähme Google 16:9).
          aspect_ratio: fortsetzen?.aspectRatio ?? aspectRatio,
          resolution: VIDEO_RESOLUTION,
          duration: `${duration}s`,
        },
        background: true,
        store: true,
      }),
      signal: AbortSignal.timeout(50_000),
    });
    const text = await res.text();
    let data: { id?: string; status?: string; error?: { message?: string } } = {};
    try {
      data = JSON.parse(text);
    } catch {
      /* kein JSON, Text landet in der Fehlermeldung */
    }
    if (!res.ok) {
      throw new Error(data.error?.message || `Gateway ${res.status}: ${text.slice(0, 200)}`);
    }
    if (data.status === "failed" || data.status === "cancelled") {
      throw new Error(data.error?.message || `Anbieter meldet ${data.status}`);
    }
    if (!isValidVideoJobId(data.id)) {
      throw new Error("Gateway hat keine gültige Vorgangskennung geliefert.");
    }

    return json(
      {
        jobId: data.id,
        prompt: body.prompt,
        model,
        aspectRatio,
        duration,
        cost,
        credits,
      },
      200
    );
  } catch (error: unknown) {
    console.error("Video start error:", error);
    credits = await refundCredits(user.sub, cost);
    const beschrieben = describeGatewayError(error, "Videogenerierung");
    return json(
      { error: beschrieben.error, details: beschrieben.details, credits },
      beschrieben.status
    );
  }
}
